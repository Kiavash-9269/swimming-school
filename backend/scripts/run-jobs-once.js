/**
 * One-shot background jobs for systemd timer / cron.
 * Keeps the API process free of setInterval wakeups when SCHEDULER_ENABLED=false.
 */
const { connectDatabase, disconnectDatabase } = require("../src/config/database");
const { runAllJobs } = require("../src/modules/ops/jobs");

(async () => {
  await connectDatabase();
  try {
    const results = await runAllJobs();
    if (process.env.LOG_LEVEL === "debug" || process.env.LOG_LEVEL === "info") {
      console.log(JSON.stringify(results));
    }
  } finally {
    await disconnectDatabase();
  }
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
