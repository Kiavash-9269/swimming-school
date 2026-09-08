const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { pipeline } = require("stream/promises");
const { createReadStream, createWriteStream } = require("fs");
const { AppError } = require("../../../utils/AppError");
const { env } = require("../../../config/env");

/**
 * Local filesystem document storage.
 * Keys are opaque: "{kind}/{randomId}" — never user-controlled paths.
 */
function createLocalDocumentStorage({ rootDir } = {}) {
  const root = path.resolve(rootDir || env.DOCUMENT_STORAGE_ROOT);

  function assertSafeKey(storageKey) {
    const key = String(storageKey || "");
    if (!/^(medical|insurance)\/[a-f0-9]{32}$/i.test(key)) {
      throw new AppError("کلید ذخیره نامعتبر است", {
        statusCode: 400,
        code: "INVALID_STORAGE_KEY",
      });
    }
    const absolute = path.resolve(root, key);
    const relative = path.relative(root, absolute);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new AppError("مسیر ذخیره نامعتبر است", {
        statusCode: 400,
        code: "INVALID_STORAGE_PATH",
      });
    }
    return absolute;
  }

  async function ensureRoot() {
    await fsp.mkdir(path.join(root, "medical"), { recursive: true });
    await fsp.mkdir(path.join(root, "insurance"), { recursive: true });
    await fsp.mkdir(path.join(root, ".tmp"), { recursive: true });
  }

  async function put({ kind, sourcePath, buffer }) {
    await ensureRoot();
    const id = crypto.randomBytes(16).toString("hex");
    const storageKey = `${kind}/${id}`;
    const dest = assertSafeKey(storageKey);
    const tmp = path.join(root, ".tmp", `${id}.partial`);

    try {
      if (buffer) {
        await fsp.writeFile(tmp, buffer);
      } else if (sourcePath) {
        await pipeline(createReadStream(sourcePath), createWriteStream(tmp));
      } else {
        throw new AppError("منبع فایل موجود نیست", {
          statusCode: 400,
          code: "INVALID_FILE",
        });
      }

      const stat = await fsp.stat(tmp);
      if (!stat.size) {
        await fsp.unlink(tmp).catch(() => {});
        throw new AppError("فایل خالی مجاز نیست", {
          statusCode: 400,
          code: "EMPTY_FILE",
        });
      }

      await fsp.rename(tmp, dest);
      return { storageKey, sizeBytes: stat.size, absolutePath: dest };
    } catch (err) {
      await fsp.unlink(tmp).catch(() => {});
      throw err;
    }
  }

  async function exists(storageKey) {
    try {
      const absolute = assertSafeKey(storageKey);
      await fsp.access(absolute, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  async function metadata(storageKey) {
    const absolute = assertSafeKey(storageKey);
    const stat = await fsp.stat(absolute);
    return { sizeBytes: stat.size, mtime: stat.mtime };
  }

  function getStream(storageKey) {
    const absolute = assertSafeKey(storageKey);
    return createReadStream(absolute);
  }

  async function getBuffer(storageKey) {
    const absolute = assertSafeKey(storageKey);
    return fsp.readFile(absolute);
  }

  async function remove(storageKey) {
    const absolute = assertSafeKey(storageKey);
    await fsp.unlink(absolute).catch((err) => {
      if (err.code !== "ENOENT") throw err;
    });
    return true;
  }

  return {
    provider: "local",
    root,
    put,
    exists,
    metadata,
    getStream,
    getBuffer,
    delete: remove,
    remove,
    assertSafeKey,
    ensureRoot,
  };
}

module.exports = { createLocalDocumentStorage };
