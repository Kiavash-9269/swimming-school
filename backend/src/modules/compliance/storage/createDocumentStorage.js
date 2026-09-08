const { createLocalDocumentStorage } = require("./localDocumentStorage");
const { env } = require("../../../config/env");

let singleton = null;

function createDocumentStorage(options = {}) {
  const provider = options.provider || env.DOCUMENT_STORAGE_PROVIDER || "local";
  if (provider === "local") {
    return createLocalDocumentStorage({ rootDir: options.rootDir || env.DOCUMENT_STORAGE_ROOT });
  }
  throw new Error(`Unsupported document storage provider: ${provider}`);
}

function getDocumentStorage() {
  if (!singleton) {
    singleton = createDocumentStorage();
  }
  return singleton;
}

/** Test helper — reset singleton (e.g. after changing env root). */
function resetDocumentStorage() {
  singleton = null;
}

module.exports = {
  createDocumentStorage,
  getDocumentStorage,
  resetDocumentStorage,
};
