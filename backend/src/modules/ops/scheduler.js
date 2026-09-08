const { env } = require("../../config/env");
const { logEvent, logError } = require("../../services/logging");
const { runAllJobs } = require("./jobs");

let timer = null;
let running = false;
let stopping = false;

function startScheduler() {
  if (!env.SCHEDULER_ENABLED) {
    logEvent("SCHEDULER_DISABLED", {});
    return { started: false };
  }
  if (timer) return { started: true, already: true };

  stopping = false;
  const interval = env.SCHEDULER_INTERVAL_MS || 15000;

  const tick = async () => {
    if (stopping || running) return;
    running = true;
    try {
      await runAllJobs();
    } catch (error) {
      logError("SCHEDULER_TICK_FAILED", error, {});
    } finally {
      running = false;
    }
  };

  // Initial delayed tick so boot isn't blocked
  timer = setInterval(tick, interval);
  if (typeof timer.unref === "function") timer.unref();
  logEvent("SCHEDULER_STARTED", { intervalMs: interval });
  return { started: true };
}

async function stopScheduler({ waitForCurrent = true, timeoutMs = 8000 } = {}) {
  stopping = true;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  logEvent("SCHEDULER_STOPPING", {});

  if (waitForCurrent && running) {
    const start = Date.now();
    while (running && Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  logEvent("SCHEDULER_STOPPED", { interrupted: running });
  running = false;
  return { stopped: true };
}

function getSchedulerStatus() {
  return {
    enabled: Boolean(env.SCHEDULER_ENABLED),
    running,
    stopping,
    hasTimer: Boolean(timer),
    intervalMs: env.SCHEDULER_INTERVAL_MS,
  };
}

module.exports = {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
};
