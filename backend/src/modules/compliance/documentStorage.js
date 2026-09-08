const crypto = require("crypto");
const path = require("path");
const { AppError } = require("../../utils/AppError");

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MiB

const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);

const MIME_BY_EXT = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

const FORBIDDEN_EXT = new Set([
  ".exe",
  ".bat",
  ".cmd",
  ".sh",
  ".js",
  ".mjs",
  ".cjs",
  ".php",
  ".html",
  ".htm",
  ".svg",
  ".dll",
  ".com",
  ".msi",
  ".ps1",
  ".webp", // dropped from allowlist — Phase 7 explicit PDF/JPEG/PNG only
  ".zip",
  ".rar",
  ".7z",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
]);

/**
 * Detect MIME from magic bytes. Returns null if unknown.
 */
function detectMimeFromBuffer(buf) {
  if (!buf || buf.length < 4) return null;
  // PDF
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) {
    return "application/pdf";
  }
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return "image/png";
  }
  return null;
}

function sanitizeOriginalFilename(name) {
  let raw = String(name || "document")
    .replace(/[\r\n\0\x1b]/g, "")
    .slice(0, 180);
  const base = path.basename(raw).replace(/[^\w.\u0600-\u06FF-]+/g, "_");
  if (!base || base === "." || base === "..") {
    return "document";
  }
  if (base.includes("..") || base.includes("/") || base.includes("\\")) {
    throw new AppError("نام فایل نامعتبر است", {
      statusCode: 400,
      code: "INVALID_FILENAME",
    });
  }
  return base.slice(0, 120);
}

function contentDispositionFilename(safeName) {
  // RFC 5987-ish ASCII fallback + UTF-8 filename*
  const ascii = String(safeName)
    .replace(/[^\x20-\x7E]/g, "_")
    .replace(/["\\]/g, "_")
    .slice(0, 100) || "document";
  const encoded = encodeURIComponent(safeName);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

function assertSafeDocumentMeta({ originalFilename, mimeType, sizeBytes }) {
  const safeName = sanitizeOriginalFilename(originalFilename);
  const ext = path.extname(safeName).toLowerCase();
  if (FORBIDDEN_EXT.has(ext)) {
    throw new AppError("نوع فایل مجاز نیست", {
      statusCode: 400,
      code: "INVALID_FILE_TYPE",
    });
  }

  const mime = String(mimeType || "").toLowerCase().trim();
  if (!ALLOWED_MIME.has(mime)) {
    throw new AppError("نوع فایل مجاز نیست", {
      statusCode: 400,
      code: "INVALID_FILE_TYPE",
    });
  }

  if (ext && MIME_BY_EXT[ext] && MIME_BY_EXT[ext] !== mime) {
    throw new AppError("پسوند فایل با نوع محتوا همخوانی ندارد", {
      statusCode: 400,
      code: "INVALID_FILE_TYPE",
    });
  }

  const size = Number(sizeBytes);
  if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_BYTES) {
    throw new AppError("حجم فایل نامعتبر است", {
      statusCode: 400,
      code: "INVALID_FILE_SIZE",
    });
  }

  return { originalFilename: safeName, mimeType: mime, sizeBytes: Math.round(size) };
}

/**
 * Legacy metadata registration WITHOUT blob persistence.
 * Kept for JSON-only compliance submits (Phase 4 compat).
 */
function registerDocumentMetadata(input) {
  const meta = assertSafeDocumentMeta(input);
  const storageKey = `doc_${crypto.randomBytes(16).toString("hex")}`;
  return {
    storageKey,
    originalFilename: meta.originalFilename,
    mimeType: meta.mimeType,
    sizeBytes: meta.sizeBytes,
    persisted: false,
    limitation: "METADATA_ONLY_NO_BLOB_STORAGE",
  };
}

/**
 * Validate buffer for real upload: size, magic bytes, mime consistency.
 */
function validateUploadedBuffer({ buffer, originalFilename, claimedMime }) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new AppError("فایل خالی مجاز نیست", {
      statusCode: 400,
      code: "EMPTY_FILE",
    });
  }
  if (buffer.length > MAX_FILE_BYTES) {
    throw new AppError("حجم فایل بیش از حد مجاز است", {
      statusCode: 413,
      code: "DOCUMENT_TOO_LARGE",
      details: { maxBytes: MAX_FILE_BYTES },
    });
  }

  const detected = detectMimeFromBuffer(buffer);
  if (!detected || !ALLOWED_MIME.has(detected)) {
    throw new AppError("نوع فایل مجاز نیست", {
      statusCode: 400,
      code: "INVALID_FILE_TYPE",
    });
  }

  const claimed = String(claimedMime || "").toLowerCase().trim();
  if (claimed && claimed !== detected && !(claimed === "image/jpg" && detected === "image/jpeg")) {
    throw new AppError("نوع اعلام‌شده با محتوای فایل همخوانی ندارد", {
      statusCode: 400,
      code: "MIME_MISMATCH",
    });
  }

  const meta = assertSafeDocumentMeta({
    originalFilename: originalFilename || `document.${detected === "application/pdf" ? "pdf" : detected === "image/png" ? "png" : "jpg"}`,
    mimeType: detected,
    sizeBytes: buffer.length,
  });

  const checksumSha256 = crypto.createHash("sha256").update(buffer).digest("hex");

  return {
    ...meta,
    checksumSha256,
    buffer,
  };
}

module.exports = {
  MAX_FILE_BYTES,
  ALLOWED_MIME,
  FORBIDDEN_EXT,
  sanitizeOriginalFilename,
  contentDispositionFilename,
  assertSafeDocumentMeta,
  registerDocumentMetadata,
  detectMimeFromBuffer,
  validateUploadedBuffer,
};
