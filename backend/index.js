const { startServer } = require("./src/server");
const { logError } = require("./src/services/logging");

startServer().catch((error) => {
  logError("UNEXPECTED_ERROR", error, { phase: "startup" });
  process.exit(1);
});
