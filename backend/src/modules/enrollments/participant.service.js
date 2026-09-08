const { AppError } = require("../../utils/AppError");
const { logEvent } = require("../../services/logging");
const { assertValidBirthDate, ageFromBirthDate } = require("../../utils/age");
const { Participant } = require("./participant.model");
const { Enrollment } = require("./enrollment.model");
const { ENROLLMENT_STATUSES } = require("../courses/domain.constants");

const ACTIVE_HISTORY_BLOCKING = [
  ENROLLMENT_STATUSES.PENDING,
  ENROLLMENT_STATUSES.PAYMENT_PENDING,
  ENROLLMENT_STATUSES.PAID,
  ENROLLMENT_STATUSES.ACTIVE,
  ENROLLMENT_STATUSES.PENDING_COMPLIANCE,
  ENROLLMENT_STATUSES.WAITLISTED,
];

function toPublicParticipant(doc, { includeEmergency = false, includeAge = false, asOf = new Date() } = {}) {
  if (!doc) return null;
  const base = {
    id: String(doc._id),
    ownerUserId: String(doc.ownerUserId),
    firstName: doc.firstName,
    lastName: doc.lastName,
    birthDate: doc.birthDate,
    gender: doc.gender,
    relation: doc.relation,
    phone: doc.phone || "",
    isActive: doc.isActive,
    deactivatedAt: doc.deactivatedAt || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
  if (includeAge) {
    try {
      base.age = ageFromBirthDate(doc.birthDate, asOf);
    } catch {
      base.age = null;
    }
  }
  if (includeEmergency) {
    base.emergencyContact = {
      name: doc.emergencyContact?.name || "",
      phone: doc.emergencyContact?.phone || "",
      relationship: doc.emergencyContact?.relationship || "",
    };
  }
  return base;
}

async function assertParticipantOwned(userId, participantId) {
  const participant = await Participant.findOne({ _id: participantId, ownerUserId: userId });
  if (!participant) {
    // Distinguish not found vs inactive vs forbidden carefully for IDOR
    const any = await Participant.findById(participantId);
    if (!any) {
      throw new AppError("شرکت‌کننده یافت نشد", { statusCode: 404, code: "PARTICIPANT_NOT_FOUND" });
    }
    throw new AppError("دسترسی به این شرکت‌کننده مجاز نیست", {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }
  if (!participant.isActive) {
    throw new AppError("شرکت‌کننده یافت نشد", {
      statusCode: 404,
      code: "PARTICIPANT_NOT_FOUND",
    });
  }
  return participant;
}

async function getParticipantAuthorized({ userId, role, participantId }) {
  if (role === "ADMIN") {
    const participant = await Participant.findById(participantId);
    if (!participant) {
      throw new AppError("شرکت‌کننده یافت نشد", { statusCode: 404, code: "PARTICIPANT_NOT_FOUND" });
    }
    return participant;
  }
  return assertParticipantOwned(userId, participantId);
}

async function createParticipant({ ownerUserId, data }) {
  try {
    assertValidBirthDate(data.birthDate);
  } catch (error) {
    throw new AppError("تاریخ تولد نامعتبر است", {
      statusCode: 400,
      code: error.code || "INVALID_BIRTH_DATE",
    });
  }

  const participant = await Participant.create({
    ownerUserId,
    firstName: data.firstName,
    lastName: data.lastName,
    birthDate: data.birthDate,
    gender: data.gender,
    relation: data.relation,
    phone: data.phone || "",
    emergencyContact: data.emergencyContact || {},
    isActive: true,
  });

  logEvent("PARTICIPANT_CREATED", {
    participantId: String(participant._id),
    userId: String(ownerUserId),
    relation: participant.relation,
  });

  return participant;
}

async function updateParticipant({ userId, role, participantId, data }) {
  const participant = await getParticipantAuthorized({ userId, role, participantId });
  if (!participant.isActive && role !== "ADMIN") {
    throw new AppError("شرکت‌کننده غیرفعال است", { statusCode: 409, code: "PARTICIPANT_INACTIVE" });
  }

  if (data.birthDate != null) {
    try {
      assertValidBirthDate(data.birthDate);
    } catch (error) {
      throw new AppError("تاریخ تولد نامعتبر است", {
        statusCode: 400,
        code: error.code || "INVALID_BIRTH_DATE",
      });
    }
    participant.birthDate = data.birthDate;
  }
  if (data.firstName != null) participant.firstName = data.firstName;
  if (data.lastName != null) participant.lastName = data.lastName;
  if (data.gender != null) participant.gender = data.gender;
  if (data.relation != null) participant.relation = data.relation;
  if (data.phone != null) participant.phone = data.phone;
  if (data.emergencyContact != null) {
    participant.emergencyContact = {
      name: data.emergencyContact.name || "",
      phone: data.emergencyContact.phone || "",
      relationship: data.emergencyContact.relationship || "",
    };
  }

  await participant.save();
  logEvent("PARTICIPANT_UPDATED", {
    participantId: String(participant._id),
    actorId: String(userId),
  });
  return participant;
}

async function deactivateParticipant({ userId, role, participantId }) {
  const participant = await getParticipantAuthorized({ userId, role, participantId });
  if (!participant.isActive) return participant;

  const blocking = await Enrollment.exists({
    participantId: participant._id,
    status: { $in: ACTIVE_HISTORY_BLOCKING },
  });
  if (blocking && role !== "ADMIN") {
    throw new AppError("امکان غیرفعال‌سازی به دلیل ثبت‌نام فعال وجود ندارد", {
      statusCode: 409,
      code: "PARTICIPANT_HAS_ACTIVE_ENROLLMENT",
    });
  }

  participant.isActive = false;
  participant.deactivatedAt = new Date();
  await participant.save();
  logEvent("PARTICIPANT_DEACTIVATED", {
    participantId: String(participant._id),
    actorId: String(userId),
  });
  return participant;
}

async function listOwnerParticipants(ownerUserId, { includeInactive = false } = {}) {
  const filter = { ownerUserId };
  if (!includeInactive) filter.isActive = true;
  return Participant.find(filter).sort({ createdAt: -1 });
}

async function searchParticipantsAdmin({
  q,
  gender,
  isActive,
  ownerUserId,
  page = 1,
  limit = 20,
} = {}) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const safePage = Math.max(1, Number(page) || 1);
  const filter = {};
  if (ownerUserId) filter.ownerUserId = ownerUserId;
  if (gender) filter.gender = gender;
  if (isActive === true || isActive === false) filter.isActive = isActive;
  if (q && String(q).trim()) {
    const term = String(q).trim().slice(0, 80);
    filter.$or = [
      { firstName: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
      { lastName: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
      { phone: term },
    ];
  }

  const [items, total] = await Promise.all([
    Participant.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    Participant.countDocuments(filter),
  ]);

  return {
    page: safePage,
    limit: safeLimit,
    total,
    items: items.map((p) => toPublicParticipant(p, { includeEmergency: true, includeAge: true })),
  };
}

module.exports = {
  toPublicParticipant,
  assertParticipantOwned,
  getParticipantAuthorized,
  createParticipant,
  updateParticipant,
  deactivateParticipant,
  listOwnerParticipants,
  searchParticipantsAdmin,
};
