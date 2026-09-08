const multer = require("multer");
const { AppError } = require("../utils/AppError");
const { MAX_FILE_BYTES, ALLOWED_MIME } = require("../modules/compliance/documentStorage");
const { env } = require("../config/env");

const maxBytes = Math.min(Number(env.DOCUMENT_MAX_BYTES) || MAX_FILE_BYTES, MAX_FILE_BYTES);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: maxBytes,
    files: 1,
    fields: 20,
  },
  fileFilter(_req, file, cb) {
    const mime = String(file.mimetype || "").toLowerCase();
    if (!ALLOWED_MIME.has(mime) && mime !== "image/jpg") {
      return cb(
        new AppError("نوع فایل مجاز نیست", {
          statusCode: 400,
          code: "INVALID_FILE_TYPE",
        }),
      );
    }
    return cb(null, true);
  },
});

function singleDocumentUpload(fieldName = "file") {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(
            new AppError("حجم فایل بیش از حد مجاز است", {
              statusCode: 413,
              code: "DOCUMENT_TOO_LARGE",
              details: { maxBytes },
            }),
          );
        }
        return next(
          new AppError("آپلود نامعتبر است", {
            statusCode: 400,
            code: "UPLOAD_ERROR",
            details: { multerCode: err.code },
          }),
        );
      }
      return next(err);
    });
  };
}

module.exports = {
  singleDocumentUpload,
  maxBytes,
};
