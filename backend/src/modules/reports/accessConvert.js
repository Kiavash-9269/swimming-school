const ExcelJS = require("exceljs");
const { AppError } = require("../../utils/AppError");
const { env } = require("../../config/env");
const { sanitizeCell, sanitizeFilename } = require("./excel");

const ACCESS_UPLOAD_MIME = new Set([
  "application/vnd.ms-access",
  "application/x-msaccess",
  "application/msaccess",
  "application/mdb",
  "application/x-mdb",
  "application/vnd.ms-access.database",
  "application/octet-stream",
]);

const ACCESS_EXTENSIONS = new Set([".mdb", ".accdb"]);

function assertAccessFilename(originalName = "") {
  const lower = String(originalName).toLowerCase();
  const dot = lower.lastIndexOf(".");
  const ext = dot >= 0 ? lower.slice(dot) : "";
  if (!ACCESS_EXTENSIONS.has(ext)) {
    throw new AppError("فقط فایل اکسس با پسوند .mdb یا .accdb مجاز است.", {
      statusCode: 400,
      code: "INVALID_ACCESS_FILE",
    });
  }
  return ext;
}

function isAllowedAccessUpload({ originalname, mimetype }) {
  const lower = String(originalname || "").toLowerCase();
  const extOk = [...ACCESS_EXTENSIONS].some((e) => lower.endsWith(e));
  const mime = String(mimetype || "").toLowerCase();
  return extOk && (ACCESS_UPLOAD_MIME.has(mime) || mime === "" || mime === "application/octet-stream");
}

/** Serialize Access cell values for Excel / import (binary → base64). */
function serializeAccessValue(value) {
  if (value == null) return "";
  if (Buffer.isBuffer(value)) return value.toString("base64");
  if (value instanceof Uint8Array) return Buffer.from(value).toString("base64");
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 19);
  }
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return String(value);
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Read user tables from an Access (.mdb / .accdb) buffer via mdb-reader.
 * @param {Buffer} buffer
 * @param {{ maxRows?: number, tableNames?: string[], onTooLarge?: 'throw'|'skip' }} [options]
 * @returns {Promise<Array<{ name: string, columns: string[], rows: object[] }>>}
 */
async function readAccessTables(buffer, { maxRows, tableNames: onlyTables, onTooLarge = "throw" } = {}) {
  if (!buffer || !buffer.length) {
    throw new AppError("فایل اکسس خالی است.", { statusCode: 400, code: "EMPTY_ACCESS_FILE" });
  }

  let MDBReader;
  try {
    ({ default: MDBReader } = await import("mdb-reader"));
  } catch (error) {
    throw new AppError("موتور خواندن فایل اکسس در دسترس نیست.", {
      statusCode: 501,
      code: "ACCESS_CONVERT_UNAVAILABLE",
      details: { message: String(error?.message || error).slice(0, 200) },
    });
  }

  let reader;
  try {
    reader = new MDBReader(Buffer.from(buffer));
  } catch (error) {
    throw new AppError("فایل اکسس خوانده نشد؛ ممکن است خراب یا رمزدار باشد.", {
      statusCode: 400,
      code: "ACCESS_READ_FAILED",
      details: { message: String(error?.message || error).slice(0, 300) },
    });
  }

  const hardCap = Math.max(env.EXPORT_MAX_ROWS || 5000, Number(maxRows) || 0);
  const limit = Math.min(Number(maxRows) || hardCap, hardCap);
  const onlySet = Array.isArray(onlyTables) && onlyTables.length
    ? new Set(onlyTables.map((n) => String(n).toLowerCase()))
    : null;

  let tableNames = reader.getTableNames({
    normalTables: true,
    systemTables: false,
    linkedTables: false,
  });
  if (onlySet) {
    tableNames = tableNames.filter((n) => onlySet.has(String(n).toLowerCase()));
  }

  if (!tableNames.length) {
    throw new AppError("هیچ جدولی در فایل اکسس پیدا نشد.", {
      statusCode: 400,
      code: "ACCESS_NO_TABLES",
    });
  }

  const tables = [];
  for (const name of tableNames) {
    let table;
    try {
      table = reader.getTable(name);
    } catch {
      continue;
    }
    const columnNames = table.getColumnNames();
    if (!columnNames.length) continue;

    const rawRows = table.getData({ rowLimit: limit + 1 });
    if (rawRows.length > limit) {
      if (onTooLarge === "skip") continue;
      throw new AppError(`جدول «${name}» بیش از ${limit} ردیف دارد؛ فایل را کوچک‌تر کنید.`, {
        statusCode: 413,
        code: "EXPORT_TOO_LARGE",
        details: { table: name, max: limit },
      });
    }

    const rows = rawRows.map((row) => {
      const out = {};
      for (const col of columnNames) {
        out[col] = serializeAccessValue(row[col]);
      }
      return out;
    });

    tables.push({ name, columns: columnNames, rows });
  }

  if (!tables.length) {
    throw new AppError("هیچ دادهٔ قابل خواندنی در فایل اکسس نبود.", {
      statusCode: 400,
      code: "ACCESS_NO_DATA",
    });
  }

  return tables;
}

/**
 * Build a multi-sheet XLSX from Access tables (one sheet per table).
 */
async function buildAccessWorkbookBuffer(tables) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "مدرسه شنا";
  workbook.created = new Date();

  const usedSheetNames = new Set();
  for (const table of tables) {
    let sheetName = String(table.name || "Sheet").replace(/[\\/*?:\[\]]/g, "_").slice(0, 31) || "Sheet";
    let suffix = 2;
    while (usedSheetNames.has(sheetName.toLowerCase())) {
      const tail = `_${suffix++}`;
      sheetName = `${sheetName.slice(0, Math.max(1, 31 - tail.length))}${tail}`;
    }
    usedSheetNames.add(sheetName.toLowerCase());

    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ rightToLeft: true, state: "normal", activeCell: "A1" }],
    });

    const columns = (table.columns || []).map((header, i) => ({
      header: String(header || `ستون${i + 1}`),
      key: `c${i}`,
      width: Math.min(40, Math.max(12, String(header || "").length + 4)),
      style: {
        alignment: { horizontal: "right", vertical: "middle", readingOrder: "rtl" },
      },
    }));
    sheet.columns = columns;

    for (const row of table.rows || []) {
      const out = {};
      (table.columns || []).forEach((header, i) => {
        out[`c${i}`] = sanitizeCell(row[header]);
      });
      sheet.addRow(out);
    }

    const header = sheet.getRow(1);
    header.font = { bold: true, name: "Tahoma", size: 11 };
    header.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rtl", wrapText: true };
    header.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" },
      };
    });
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.alignment = { horizontal: "right", vertical: "middle", readingOrder: "rtl" };
      row.font = { name: "Tahoma", size: 10 };
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

async function convertAccessBufferToExcel(buffer, { originalName, tableNames, maxRows, onTooLarge } = {}) {
  assertAccessFilename(originalName || "import.mdb");
  const tables = await readAccessTables(buffer, { tableNames, maxRows, onTooLarge });
  const xlsx = await buildAccessWorkbookBuffer(tables);
  const base = String(originalName || "access")
    .replace(/\.(mdb|accdb)$/i, "")
    .slice(0, 40);
  const dateStamp = new Date().toISOString().slice(0, 10);
  return {
    buffer: xlsx,
    filename: sanitizeFilename(`${base || "access"}-${dateStamp}.xlsx`),
    tables,
    tableCount: tables.length,
    rowCount: tables.reduce((n, t) => n + (t.rows?.length || 0), 0),
  };
}

module.exports = {
  ACCESS_UPLOAD_MIME,
  ACCESS_EXTENSIONS,
  assertAccessFilename,
  isAllowedAccessUpload,
  serializeAccessValue,
  readAccessTables,
  buildAccessWorkbookBuffer,
  convertAccessBufferToExcel,
};
