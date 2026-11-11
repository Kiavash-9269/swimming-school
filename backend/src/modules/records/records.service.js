const { AppError } = require("../../utils/AppError");
const { ageFromBirthDate } = require("../../utils/age");
const { Participant } = require("../enrollments/participant.model");
const { StudentRecord } = require("./studentRecord.model");

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatTimeLabel(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 0) return "";
  const minutes = Math.floor(total / 60);
  const rest = total - minutes * 60;
  const restLabel = rest.toFixed(2).padStart(5, "0");
  return minutes > 0 ? `${minutes}:${restLabel}` : rest.toFixed(2);
}

function ageOf(birthDate) {
  if (!birthDate) return null;
  try {
    return ageFromBirthDate(birthDate);
  } catch {
    return null;
  }
}

function toPublic(doc) {
  const row = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(row._id),
    participantId: String(row.participantId),
    firstName: row.firstName || "",
    lastName: row.lastName || "",
    birthDate: row.birthDate || null,
    age: ageOf(row.birthDate),
    stroke: row.stroke,
    distance: row.distance,
    timeSeconds: row.timeSeconds,
    timeLabel: formatTimeLabel(row.timeSeconds),
    recordDate: row.recordDate || null,
    location: row.location || "",
    note: row.note || "",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function createRecord({
  participantId,
  stroke,
  distance,
  timeSeconds,
  recordDate,
  location = "",
  note = "",
  adminUserId = null,
}) {
  const participant = await Participant.findById(participantId).lean();
  if (!participant) {
    throw new AppError("شاگرد یافت نشد", { statusCode: 404, code: "PARTICIPANT_NOT_FOUND" });
  }

  const doc = await StudentRecord.create({
    ownerUserId: participant.ownerUserId,
    participantId: participant._id,
    firstName: participant.firstName,
    lastName: participant.lastName,
    birthDate: participant.birthDate || null,
    stroke,
    distance,
    timeSeconds,
    recordDate: recordDate || new Date(),
    location,
    note,
    createdBy: adminUserId,
  });

  return toPublic(doc);
}

async function updateRecord({ recordId, patch = {} }) {
  const allowed = ["stroke", "distance", "timeSeconds", "recordDate", "location", "note"];
  const set = {};
  for (const field of allowed) {
    if (patch[field] === undefined) continue;
    set[field] = patch[field];
  }
  if (!Object.keys(set).length) {
    throw new AppError("چیزی برای به‌روزرسانی ارسال نشد", {
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
  }
  const doc = await StudentRecord.findByIdAndUpdate(recordId, { $set: set }, { new: true });
  if (!doc) {
    throw new AppError("رکورد یافت نشد", { statusCode: 404, code: "RECORD_NOT_FOUND" });
  }
  return toPublic(doc);
}

async function deleteRecord({ recordId }) {
  const doc = await StudentRecord.findByIdAndDelete(recordId);
  if (!doc) {
    throw new AppError("رکورد یافت نشد", { statusCode: 404, code: "RECORD_NOT_FOUND" });
  }
  return { id: String(doc._id), deleted: true };
}

async function listMyRecords({ userId }) {
  const docs = await StudentRecord.find({ ownerUserId: userId })
    .sort({ recordDate: -1, createdAt: -1 })
    .limit(300);
  return { items: docs.map(toPublic) };
}

async function listRecordsAdmin({ q, stroke, limit = 50, page = 1 }) {
  const filter = {};
  if (stroke) filter.stroke = stroke;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ firstName: rx }, { lastName: rx }];
  }

  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
  const safePage = Math.max(1, Number(page) || 1);

  const [docs, total] = await Promise.all([
    StudentRecord.find(filter)
      .sort({ recordDate: -1, createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    StudentRecord.countDocuments(filter),
  ]);

  return { items: docs.map(toPublic), pagination: { page: safePage, limit: safeLimit, total } };
}

/** Admin picker: find the student a record belongs to. */
async function searchParticipants({ q, limit = 20 }) {
  const filter = { isActive: true };
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ firstName: rx }, { lastName: rx }, { phone: rx }, { cardNumber: rx }];
  }
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const docs = await Participant.find(filter)
    .sort({ lastName: 1, firstName: 1 })
    .limit(safeLimit)
    .lean();
  return {
    items: docs.map((p) => ({
      id: String(p._id),
      firstName: p.firstName,
      lastName: p.lastName,
      birthDate: p.birthDate || null,
      age: ageOf(p.birthDate),
      phone: p.phone || "",
      gender: p.gender || "",
    })),
  };
}

module.exports = {
  formatTimeLabel,
  createRecord,
  updateRecord,
  deleteRecord,
  listMyRecords,
  listRecordsAdmin,
  searchParticipants,
};
