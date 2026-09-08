const { env } = require("./config/env");
const { connectDatabase, disconnectDatabase } = require("./config/database");
const { createApp } = require("./app");
const { logEvent, logError, logger } = require("./services/logging");
const { startScheduler, stopScheduler } = require("./modules/ops/scheduler");

async function startServer() {
  await connectDatabase();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logEvent("SERVER_STARTED", {
      port: env.PORT,
      environment: env.NODE_ENV,
      version: env.APP_VERSION,
    });
  });

  startScheduler();

  let shuttingDown = false;

  async function shutdown(signal) {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logEvent("SERVER_SHUTDOWN", { signal });

    try {
      await stopScheduler({ waitForCurrent: true, timeoutMs: 8000 });
    } catch (error) {
      logError("UNEXPECTED_ERROR", error, { phase: "scheduler_shutdown" });
    }

    server.close(async () => {
      try {
        await disconnectDatabase();
        logger.flush?.();
        process.exit(0);
      } catch (error) {
        logError("UNEXPECTED_ERROR", error, { phase: "shutdown" });
        process.exit(1);
      }
    });

    setTimeout(() => {
      process.exit(1);
    }, 10000).unref();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logError("UNEXPECTED_ERROR", reason instanceof Error ? reason : new Error(String(reason)), {
      type: "unhandledRejection",
    });
  });

  process.on("uncaughtException", (error) => {
    logError("UNEXPECTED_ERROR", error, { type: "uncaughtException" });
    shutdown("uncaughtException");
  });

  return server;
}

if (require.main === module) {
  startServer().catch((error) => {
    logError("UNEXPECTED_ERROR", error, { phase: "startup" });
    process.exit(1);
  });
}

module.exports = {
  startServer,
};
