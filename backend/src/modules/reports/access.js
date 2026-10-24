const { spawn } = require("node:child_process");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { AppError } = require("../../utils/AppError");
const { env } = require("../../config/env");
const { sanitizeCell } = require("./excel");

/**
 * Access (.mdb) export — same columns/rows as the Excel export.
 *
 * Node writes a UTF-8 CSV, then the bundled Java helper (Jackcess,
 * backend/vendor/access-export/mdb-export.jar) turns it into a real
 * Microsoft Access (Jet 4 / Access 2000+) database file. Requires a
 * Java 8+ runtime (`java` on PATH) on the host.
 */

const JAR_PATH = path.join(__dirname, "../../../vendor/access-export/mdb-export.jar");
const ACCESS_MIME = "application/vnd.ms-access";
const RUN_TIMEOUT_MS = 30_000;

function csvEscape(value) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function unavailable(detail) {
  return new AppError("خروجی اکسس (.mdb) روی این سرور در دسترس نیست؛ خروجی اکسل را بگیرید.", {
    statusCode: 501,
    code: "ACCESS_EXPORT_UNAVAILABLE",
    details: { detail },
  });
}

function runHelper(args) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn("java", ["-jar", JAR_PATH, ...args], { windowsHide: true });
    } catch (error) {
      reject(unavailable(`java spawn failed: ${error.message}`));
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(
        new AppError("ساخت خروجی اکسس بیش از حد طول کشید.", {
          statusCode: 504,
          code: "ACCESS_EXPORT_TIMEOUT",
        }),
      );
    }, RUN_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(unavailable(error.code === "ENOENT" ? "java not found" : error.message));
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
      } else if (/ENOENT/.test(stderr) || /Error: Could not find or load main class/.test(stderr)) {
        reject(unavailable(`helper exited ${code}`));
      } else {
        reject(
          new AppError("ساخت فایل اکسس با خطا مواجه شد.", {
            statusCode: 500,
            code: "ACCESS_EXPORT_FAILED",
            details: { exitCode: code, stderr: stderr.slice(0, 500) },
          }),
        );
      }
    });
  });
}

/**
 * Build an MDB buffer from columns + rows (same shape as buildWorkbookBuffer).
 * Enforces EXPORT_MAX_ROWS.
 */
async function buildMdbBuffer({ columns, rows, sheetName = "Export" }) {
  const max = env.EXPORT_MAX_ROWS || 5000;
  if (rows.length > max) {
    throw new AppError(`Export exceeds maximum of ${max} rows`, {
      statusCode: 413,
      code: "EXPORT_TOO_LARGE",
      details: { max, count: rows.length },
    });
  }

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mdb-export-"));
  const csvPath = path.join(dir, "data.csv");
  const outPath = path.join(dir, "export.mdb");
  try {
    const lines = [columns.map((c) => csvEscape(c.header)).join(",")];
    for (const row of rows) {
      lines.push(columns.map((c) => csvEscape(sanitizeCell(row[c.key]))).join(","));
    }
    await fs.writeFile(csvPath, lines.join("\r\n"), "utf8");

    await runHelper([outPath, csvPath, String(sheetName || "Export").slice(0, 64)]);

    return await fs.readFile(outPath);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error?.code === "ENOENT") throw unavailable("helper jar missing");
    throw new AppError("ساخت فایل اکسس با خطا مواجه شد.", {
      statusCode: 500,
      code: "ACCESS_EXPORT_FAILED",
      details: { message: String(error?.message || error).slice(0, 300) },
    });
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

function sendMdb(res, { buffer, filename }) {
  const safeName = String(filename || "report.mdb");
  const asciiFallback = safeName.replace(/[^\x20-\x7E]+/g, "_") || "report.mdb";
  const encoded = encodeURIComponent(safeName).replace(/['()]/g, escape);
  res.setHeader("Content-Type", ACCESS_MIME);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`,
  );
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(buffer);
}

/** True when the request asked for the Access flavor of the export. */
function wantsAccess(format) {
  return format === "access";
}

module.exports = {
  buildMdbBuffer,
  sendMdb,
  wantsAccess,
  ACCESS_MIME,
};
