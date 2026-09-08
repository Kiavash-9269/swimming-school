const mongoose = require("mongoose");

let memoryServer = null;

function assertTestDatabaseName(dbName) {
  if (!dbName || !String(dbName).toLowerCase().includes("test")) {
    throw new Error(
      `Refusing test operations on non-test database "${dbName}". Name must include "test".`,
    );
  }
}

async function setupTestDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  let uri;

  // Prefer in-memory Mongo when available.
  try {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri("swimming-school-test");
  } catch (error) {
    memoryServer = null;
    uri = process.env.TEST_MONGODB_URI;
    if (!uri) {
      throw new Error(
        `MongoMemoryServer unavailable (${error.message}). Set TEST_MONGODB_URI to an isolated test database (name must include "test").`,
      );
    }
  }

  // Never allow silent use of the development DB.
  const dbNameMatch = uri.match(/\/([^/?]+)(\?|$)/);
  const dbName = dbNameMatch?.[1] || "";
  assertTestDatabaseName(dbName);

  process.env.MONGODB_URI = uri;
  await mongoose.connect(uri);
  assertTestDatabaseName(mongoose.connection.name);
  return mongoose.connection;
}

async function clearDatabase() {
  assertTestDatabaseName(mongoose.connection.name);
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

async function teardownTestDatabase() {
  if (mongoose.connection.readyState !== 0) {
    assertTestDatabaseName(mongoose.connection.name);
    await mongoose.connection.dropDatabase().catch(() => {});
    await mongoose.connection.close().catch(() => {});
  }
  if (memoryServer) {
    await memoryServer.stop().catch(() => {});
    memoryServer = null;
  }
}

module.exports = {
  setupTestDatabase,
  clearDatabase,
  teardownTestDatabase,
  assertTestDatabaseName,
};
