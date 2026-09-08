const mongoose = require("mongoose");

const schedulerLockSchema = new mongoose.Schema(
  {
    jobName: { type: String, required: true, unique: true },
    lockedUntil: { type: Date, required: true },
    lockedBy: { type: String, default: "" },
    lastStartedAt: { type: Date, default: null },
    lastCompletedAt: { type: Date, default: null },
    lastError: { type: String, default: "" },
  },
  { timestamps: true },
);

const SchedulerLock = mongoose.model("SchedulerLock", schedulerLockSchema);

/**
 * Atomic multi-instance job claim.
 */
async function tryAcquireJobLock(jobName, ttlMs, lockedBy = "worker") {
  const now = new Date();
  const lockedUntil = new Date(now.getTime() + ttlMs);

  let doc = await SchedulerLock.findOneAndUpdate(
    { jobName, lockedUntil: { $lte: now } },
    {
      $set: {
        lockedUntil,
        lockedBy,
        lastStartedAt: now,
        lastError: "",
      },
    },
    { returnDocument: "after" },
  );

  if (doc) return doc;

  try {
    doc = await SchedulerLock.create({
      jobName,
      lockedUntil,
      lockedBy,
      lastStartedAt: now,
    });
    return doc;
  } catch (error) {
    if (error?.code !== 11000) throw error;
    // Another instance created or holds the lock — try reclaim if expired
    return SchedulerLock.findOneAndUpdate(
      { jobName, lockedUntil: { $lte: now } },
      {
        $set: {
          lockedUntil,
          lockedBy,
          lastStartedAt: now,
          lastError: "",
        },
      },
      { returnDocument: "after" },
    );
  }
}

async function releaseJobLock(jobName, lockedBy, errorMessage = "") {
  await SchedulerLock.updateOne(
    { jobName, lockedBy },
    {
      $set: {
        lockedUntil: new Date(0),
        lastCompletedAt: new Date(),
        lastError: String(errorMessage || "").slice(0, 240),
      },
    },
  );
}

async function listJobLocks() {
  const rows = await SchedulerLock.find({}).sort({ jobName: 1 }).limit(50);
  return rows.map((r) => ({
    jobName: r.jobName,
    lockedUntil: r.lockedUntil,
    lockedBy: r.lockedBy,
    lastStartedAt: r.lastStartedAt,
    lastCompletedAt: r.lastCompletedAt,
    lastError: r.lastError || "",
  }));
}

module.exports = {
  SchedulerLock,
  tryAcquireJobLock,
  releaseJobLock,
  listJobLocks,
};
