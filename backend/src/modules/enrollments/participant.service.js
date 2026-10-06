const { AppError } = require("../../utils/AppError");
const { logEvent } = require("../../services/logging");
const { assertValidBirthDate, ageFromBirthDate } = require("../../utils/age");
const { Participant } = require("./participant.model");
const { Enrollment } = require("./enrollment.model");
const { User, ROLES } = require("../auth/user.model");
const { hashPassword } = require("../../utils/password");
const { ENROLLMENT_STATUSES, PARTICIPANT_RELATIONS } = require("../courses/domain.constants");

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
    registeredAt: doc.registeredAt || doc.createdAt,
    createdByAdmin: Boolean(doc.createdByAdmin),
    notes: doc.notes || "",
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
  if (role === "ADMIN") {
    if (data.registeredAt != null) participant.registeredAt = data.registeredAt;
    if (data.notes != null) participant.notes = data.notes;
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

function nameConflictError() {
  return new AppError("کاربری با همین نام و نام خانوادگی با شماره دیگری ثبت شده است", {
    statusCode: 409,
    code: "NAME_EXISTS",
  });
}

/**
 * Finds the account for `accountPhone`, or creates one whose initial password is the phone itself
 * so pre-existing students can sign in and change it later.
 */
async function findOrCreateOwnerAccount({ accountPhone, firstName, lastName }) {
  const existing = await User.findOne({ phone: accountPhone });
  if (existing) return { user: existing, created: false };

  if (await User.exists({ firstName, lastName })) throw nameConflictError();

  try {
    const user = await User.create({
      phone: accountPhone,
      firstName,
      lastName,
      passwordHash: await hashPassword(accountPhone),
      phoneVerified: true,
      role: ROLES.USER,
      isActive: true,
    });
    return { user, created: true };
  } catch (error) {
    if (error?.code === 11000) {
      if (error.keyPattern?.firstName || error.keyPattern?.lastName) throw nameConflictError();
      const raced = await User.findOne({ phone: accountPhone });
      if (raced) return { user: raced, created: false };
    }
    throw error;
  }
}

async function createParticipantByAdmin({ actorId, data }) {
  try {
    assertValidBirthDate(data.birthDate);
  } catch (error) {
    throw new AppError("تاریخ تولد نامعتبر است", {
      statusCode: 400,
      code: error.code || "INVALID_BIRTH_DATE",
    });
  }

  const isSelf = data.relation === PARTICIPANT_RELATIONS.SELF;
  const ownerFirstName = isSelf ? data.firstName : data.guardianFirstName;
  const ownerLastName = isSelf ? data.lastName : data.guardianLastName;
  if (!ownerFirstName || !ownerLastName) {
    throw new AppError("نام و نام خانوادگی صاحب حساب (ولی) الزامی است", {
      statusCode: 400,
      code: "GUARDIAN_NAME_REQUIRED",
    });
  }

  const { user, created } = await findOrCreateOwnerAccount({
    accountPhone: data.accountPhone,
    firstName: ownerFirstName,
    lastName: ownerLastName,
  });

  const duplicate = await Participant.exists({
    ownerUserId: user._id,
    firstName: data.firstName,
    lastName: data.lastName,
    birthDate: data.birthDate,
  });
  if (duplicate) {
    throw new AppError("این شاگرد قبلاً برای همین حساب ثبت شده است", {
      statusCode: 409,
      code: "PARTICIPANT_EXISTS",
    });
  }

  const participant = await Participant.create({
    ownerUserId: user._id,
    firstName: data.firstName,
    lastName: data.lastName,
    birthDate: data.birthDate,
    gender: data.gender,
    relation: data.relation,
    phone: data.phone || (isSelf ? data.accountPhone : ""),
    emergencyContact: data.emergencyContact || {},
    registeredAt: data.registeredAt || new Date(),
    notes: data.notes || "",
    createdByAdmin: true,
    isActive: true,
  });

  logEvent("PARTICIPANT_CREATED_BY_ADMIN", {
    participantId: String(participant._id),
    ownerUserId: String(user._id),
    actorId: String(actorId),
    accountCreated: created,
  });

  return {
    participant,
    account: {
      id: String(user._id),
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      created,
    },
  };
}

async function listOwnerParticipants(ownerUserId, { includeInactive = false } = {}) {
  const filter = { ownerUserId };
  if (!includeInactive) filter.isActive = true;
  return Participant.find(filter).sort({ createdAt: -1 });
}

async function enrollmentSummaries(participantIds) {
  if (!participantIds.length) return new Map();
  const rows = await Enrollment.find({ participantId: { $in: participantIds } })
    .sort({ createdAt: -1 })
    .populate("classId", "title")
    .select("participantId classId status createdAt")
    .lean();

  const byParticipant = new Map();
  for (const row of rows) {
    const key = String(row.participantId);
    if (!byParticipant.has(key)) byParticipant.set(key, []);
    byParticipant.get(key).push({
      id: String(row._id),
      classId: row.classId?._id ? String(row.classId._id) : String(row.classId || ""),
      classTitle: row.classId?.title || "",
      status: row.status,
      createdAt: row.createdAt,
    });
  }
  return byParticipant;
}

async function searchParticipantsAdmin({
  q,
  gender,
  isActive,
  ownerUserId,
  enrolled,
  classId,
  registeredFrom,
  registeredTo,
  page = 1,
  limit = 20,
} = {}) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const safePage = Math.max(1, Number(page) || 1);
  const filter = {};
  const and = [];
  if (ownerUserId) filter.ownerUserId = ownerUserId;
  if (enrolled === true || enrolled === false || classId) {
    const enrolledIds = await Enrollment.distinct(
      "participantId",
      classId ? { classId } : {},
    );
    filter._id = enrolled === false && !classId ? { $nin: enrolledIds } : { $in: enrolledIds };
  }
  if (gender) filter.gender = gender;
  if (isActive === true || isActive === false) filter.isActive = isActive;
  if (q && String(q).trim()) {
    const term = String(q).trim().slice(0, 80);
    const ownerIds = /^09\d{9}$/.test(term) ? await User.distinct("_id", { phone: term }) : [];
    and.push({
      $or: [
        { firstName: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        { lastName: new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") },
        { phone: term },
        ...(ownerIds.length ? [{ ownerUserId: { $in: ownerIds } }] : []),
      ],
    });
  }
  if (registeredFrom || registeredTo) {
    const range = {};
    if (registeredFrom) range.$gte = new Date(registeredFrom);
    if (registeredTo) {
      // Inclusive end day: everything before the start of the following day.
      const end = new Date(registeredTo);
      end.setUTCDate(end.getUTCDate() + 1);
      range.$lt = end;
    }
    and.push({
      $or: [
        { registeredAt: range },
        { registeredAt: { $exists: false }, createdAt: range },
        { registeredAt: null, createdAt: range },
      ],
    });
  }
  if (and.length) filter.$and = and;

  const [items, total] = await Promise.all([
    Participant.find(filter)
      .sort({ registeredAt: -1, createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    Participant.countDocuments(filter),
  ]);

  const [summaries, owners] = await Promise.all([
    enrollmentSummaries(items.map((p) => p._id)),
    User.find({ _id: { $in: items.map((p) => p.ownerUserId) } })
      .select("phone firstName lastName")
      .lean(),
  ]);
  const ownerById = new Map(owners.map((u) => [String(u._id), u]));

  return {
    page: safePage,
    limit: safeLimit,
    total,
    items: items.map((p) => {
      const owner = ownerById.get(String(p.ownerUserId));
      return {
        ...toPublicParticipant(p, { includeEmergency: true, includeAge: true }),
        owner: owner
          ? { phone: owner.phone, firstName: owner.firstName, lastName: owner.lastName }
          : null,
        enrollments: summaries.get(String(p._id)) || [],
      };
    }),
  };
}

module.exports = {
  toPublicParticipant,
  assertParticipantOwned,
  getParticipantAuthorized,
  createParticipant,
  createParticipantByAdmin,
  updateParticipant,
  deactivateParticipant,
  listOwnerParticipants,
  searchParticipantsAdmin,
};
