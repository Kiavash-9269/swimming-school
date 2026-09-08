const mongoose = require("mongoose");
const { env } = require("./env");
const { logEvent, logError } = require("../services/logging");

let isConnected = false;

function sanitizeMongoUri(uri) {
  try {
    const parsed = new URL(uri);
    if (parsed.password) {
      parsed.password = "***";
    }
    if (parsed.username) {
      parsed.username = "***";
    }
    return parsed.toString();
  } catch {
    return "[invalid-mongodb-uri]";
  }
}

async function connectDatabase() {
  if (isConnected) {
    return mongoose.connection;
  }

  mongoose.set("strictQuery", true);

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    isConnected = true;
    logEvent("DATABASE_CONNECTED", {
      host: mongoose.connection.host,
      name: mongoose.connection.name,
      uri: sanitizeMongoUri(env.MONGODB_URI),
    });
    return mongoose.connection;
  } catch (error) {
    logError("DATABASE_ERROR", error, {
      uri: sanitizeMongoUri(env.MONGODB_URI),
    });
    throw error;
  }
}

async function disconnectDatabase() {
  if (!isConnected && mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.connection.close();
  isConnected = false;
  logEvent("DATABASE_DISCONNECTED");
}

function getDatabaseStatus() {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return {
    readyState: mongoose.connection.readyState,
    status: states[mongoose.connection.readyState] || "unknown",
    connected: mongoose.connection.readyState === 1,
  };
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  getDatabaseStatus,
  sanitizeMongoUri,
};
