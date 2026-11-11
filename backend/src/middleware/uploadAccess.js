const multer = require("multer");
const { AppError } = require("../utils/AppError");
const { isAllowedAccessUpload } = require("../modules/reports/accessConvert");

/** Access DBs can hold biometric blobs; 40 MB cap keeps import practical. */
const ACCESS_MAX_BYTES = 40 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: ACCESS_MAX_BYTES,
    files: 1,
    fields: 10,
  },
  fileFilter(_req, file, cb) {
    if (!isAllowedAccessUpload(file)) {
      return cb(
        new AppError("فقط فایل اکسس (.mdb / .accdb) مجاز است.", {
          statusCode: 400,
          code: "INVALID_ACCESS_FILE",
        }),
      );
    }
    return cb(null, true);
  },
});

function singleAccessUpload(fieldName = "file") {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(
            new AppError("حجم فایل اکسس بیش از حد مجاز است (حداکثر ۴۰ مگابایت).", {
              statusCode: 413,
              code: "ACCESS_FILE_TOO_LARGE",
              details: { maxBytes: ACCESS_MAX_BYTES },
            }),
          );
        }
        return next(
          new AppError("آپلود فایل اکسس نامعتبر است.", {
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
  singleAccessUpload,
  ACCESS_MAX_BYTES,
};
