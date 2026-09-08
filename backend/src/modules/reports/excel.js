const ExcelJS = require("exceljs");
const { AppError } = require("../../utils/AppError");
const { env } = require("../../config/env");

const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function sanitizeCell(value) {
  if (value == null) return "";
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "boolean") return value ? "true" : "false";
  let text = String(value);
  if (FORMULA_PREFIX.test(text)) {
    text = `'${text}`;
  }
  return text;
}

function sanitizeFilename(name) {
  return String(name || "report")
    .replace(/[^\w.\u0600-\u06FF-]+/g, "_")
    .slice(0, 80);
}

/**
 * Build an XLSX buffer from columns + rows.
 * Enforces EXPORT_MAX_ROWS.
 */
async function buildWorkbookBuffer({ sheetName, columns, rows }) {
  const max = env.EXPORT_MAX_ROWS || 5000;
  if (rows.length > max) {
    throw new AppError(`Export exceeds maximum of ${max} rows`, {
      statusCode: 413,
      code: "EXPORT_TOO_LARGE",
      details: { max, count: rows.length },
    });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "swimming-school";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(String(sheetName || "Report").slice(0, 31));

  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width || 18,
  }));

  for (const row of rows) {
    const out = {};
    for (const col of columns) {
      out[col.key] = sanitizeCell(row[col.key]);
    }
    sheet.addRow(out);
  }

  sheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

module.exports = {
  sanitizeCell,
  sanitizeFilename,
  buildWorkbookBuffer,
  FORMULA_PREFIX,
};
