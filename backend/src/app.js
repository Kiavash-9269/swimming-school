const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const pinoHttp = require("pino-http");
const { env } = require("./config/env");
const { logger } = require("./services/logging");
const { getDatabaseStatus } = require("./config/database");
const { errorHandler } = require("./middleware/errorHandler");
const { notFoundHandler } = require("./middleware/notFound");
const authRoutes = require("./modules/auth/auth.routes");

function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );

  const allowedOrigins = new Set([env.FRONTEND_URL]);
  // localhost and 127.0.0.1 are different browser origins; allow both in non-production.
  if (env.NODE_ENV !== "production") {
    try {
      const primary = new URL(env.FRONTEND_URL);
      const altHost = primary.hostname === "localhost" ? "127.0.0.1" : "localhost";
      allowedOrigins.add(`${primary.protocol}//${altHost}${primary.port ? `:${primary.port}` : ""}`);
    } catch {
      // ignore invalid twin origin construction
    }
  }

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  app.use(cookieParser());

  app.use(
    pinoHttp({
      logger,
      autoLogging: env.NODE_ENV !== "test",
      customProps: () => ({ service: "swimming-school-api" }),
    }),
  );

  app.get("/api/health", (req, res) => {
    const db = getDatabaseStatus();
    const healthy = db.connected;

    return res.status(healthy ? 200 : 503).json({
      success: healthy,
      data: {
        status: healthy ? "ok" : "degraded",
        environment: env.NODE_ENV,
        version: env.APP_VERSION,
        database: {
          status: db.status,
          connected: db.connected,
        },
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use("/api/auth", authRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
