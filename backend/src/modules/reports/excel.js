const ExcelJS = require("exceljs");
const { AppError } = require("../../utils/AppError");
const { env } = require("../../config/env");

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function sanitizeCell(value) {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "boolean") return value ? "بله" : "خیر";
  let text = String(value);
  if (FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }
  return text;
}

function sanitizeFilename(name) {
  return String(name || "گزارش")
    .replace(/[^\w.\u0600-\u06FF-]+/g, "_")
    .slice(0, 80);
}

/**
 * Build an XLSX buffer from columns + rows.
 * Persian RTL sheet by default for admin exports.
 * Enforces EXPORT_MAX_ROWS.
 */
async function buildWorkbookBuffer({ sheetName, columns, rows, rightToLeft = true }) {
  const max = env.EXPORT_MAX_ROWS || 5000;
  if (rows.length > max) {
    throw new AppError(`Export exceeds maximum of ${max} rows`, {
      statusCode: 413,
      code: "EXPORT_TOO_LARGE",
      details: { max, count: rows.length },
    });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "مدرسه شنا";
  workbook.created = new Date();
  const safeName = String(sheetName || "گزارش").slice(0, 31);
  const sheet = workbook.addWorksheet(safeName, {
    views: [{ rightToLeft: Boolean(rightToLeft), state: "normal", activeCell: "A1" }],
  });

  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width || 18,
    style: {
      alignment: { horizontal: "right", vertical: "middle", readingOrder: "rtl" },
    },
  }));

  for (const row of rows) {
    const out = {};
    for (const col of columns) {
      out[col.key] = sanitizeCell(row[col.key]);
    }
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

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = {
  sanitizeCell,
  sanitizeFilename,
  buildWorkbookBuffer,
  FORMULA_PREFIX,
};
