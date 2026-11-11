const { AppError } = require("../../utils/AppError");
const { ageFromBirthDate, assertValidBirthDate } = require("../../utils/age");
const settings = require("../site/siteSetting.service");
const {
  ClinicRegistration,
  CLINIC_STATUSES,
  CLINIC_PAYMENT_STATUSES,
} = require("./clinicRegistration.model");

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    firstName: row.firstName || "",
    lastName: row.lastName || "",
    phone: row.phone || "",
    birthDate: row.birthDate || null,
    age: ageOf(row.birthDate),
    gender: row.gender || null,
    note: row.note || "",
    status: row.status,
    paymentStatus: row.paymentStatus,
    trackingCode: row.trackingCode || "",
    paymentNote: row.paymentNote || "",
    reportedPaidAt: row.reportedPaidAt || null,
    reviewedAt: row.reviewedAt || null,
    adminNote: row.adminNote || "",
    priceToman: Number(row.priceToman || 0),
    clinicTitle: row.clinicTitle || "",
    createdAt: row.createdAt,
  };
}

async function getPublicInfo() {
  const clinic = settings.publicClinic(await settings.getClinic());
  const [registered, confirmed] = await Promise.all([
    ClinicRegistration.countDocuments({ status: { $ne: CLINIC_STATUSES.CANCELLED } }),
    ClinicRegistration.countDocuments({ status: CLINIC_STATUSES.CONFIRMED }),
  ]);
  const remaining =
    clinic.capacity > 0 ? Math.max(0, clinic.capacity - registered) : null;
  return { clinic, registered, confirmed, remaining };
}

async function register({ userId, firstName, lastName, phone, birthDate, gender = null, note = "" }) {
  const clinic = settings.publicClinic(await settings.getClinic());
  if (!clinic.enabled) {
    throw new AppError("ثبت‌نام کلینیک در حال حاضر فعال نیست", {
      statusCode: 400,
      code: "CLINIC_DISABLED",
    });
  }

  try {
    assertValidBirthDate(birthDate);
  } catch {
    throw new AppError("تاریخ تولد نامعتبر است", {
      statusCode: 400,
      code: "INVALID_BIRTH_DATE",
    });
  }

  if (clinic.capacity > 0) {
    const taken = await ClinicRegistration.countDocuments({
      status: { $ne: CLINIC_STATUSES.CANCELLED },
    });
    if (taken >= clinic.capacity) {
      throw new AppError("ظرفیت کلینیک تکمیل شده است", {
        statusCode: 409,
        code: "CLINIC_FULL",
      });
    }
  }

  const duplicate = await ClinicRegistration.findOne({
    userId,
    phone,
    firstName,
    lastName,
    status: { $ne: CLINIC_STATUSES.CANCELLED },
  }).lean();
  if (duplicate) {
    throw new AppError("این ثبت‌نام کلینیک قبلاً ثبت شده است", {
      statusCode: 409,
      code: "CLINIC_ALREADY_REGISTERED",
    });
  }

  const doc = await ClinicRegistration.create({
    userId,
    firstName,
    lastName,
    phone,
    birthDate,
    gender: gender || null,
    note,
    priceToman: clinic.priceToman,
    clinicTitle: clinic.title,
  });

  return toPublic(doc);
}

async function listMine({ userId }) {
  const docs = await ClinicRegistration.find({ userId })
    .sort({ createdAt: -1 })
    .limit(50);
  return { items: docs.map(toPublic) };
}

async function reportPaid({ registrationId, userId, trackingCode = "", note = "" }) {
  const doc = await ClinicRegistration.findById(registrationId);
  if (!doc) {
    throw new AppError("ثبت‌نام کلینیک یافت نشد", {
      statusCode: 404,
      code: "CLINIC_REGISTRATION_NOT_FOUND",
    });
  }
  if (String(doc.userId) !== String(userId)) {
    throw new AppError("دسترسی مجاز نیست", { statusCode: 403, code: "FORBIDDEN" });
  }
  if (doc.status === CLINIC_STATUSES.CANCELLED) {
    throw new AppError("این ثبت‌نام لغو شده است", {
      statusCode: 409,
      code: "CLINIC_REGISTRATION_CANCELLED",
    });
  }
  if (doc.paymentStatus === CLINIC_PAYMENT_STATUSES.PAID) {
    return { registration: toPublic(doc), alreadyPaid: true };
  }

  doc.paymentStatus = CLINIC_PAYMENT_STATUSES.AWAITING_REVIEW;
  doc.trackingCode = String(trackingCode || "").slice(0, 60);
  doc.paymentNote = String(note || "").slice(0, 300);
  doc.reportedPaidAt = new Date();
  await doc.save();

  return { registration: toPublic(doc), alreadyPaid: false };
}

async function listAdmin({ status, paymentStatus, q, limit = 50, page = 1 }) {
  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ firstName: rx }, { lastName: rx }, { phone: rx }, { trackingCode: rx }];
  }

  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 50));
  const safePage = Math.max(1, Number(page) || 1);

  const [docs, total, pending, awaiting, confirmed, paid] = await Promise.all([
    ClinicRegistration.find(filter)
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    ClinicRegistration.countDocuments(filter),
    ClinicRegistration.countDocuments({ status: CLINIC_STATUSES.PENDING }),
    ClinicRegistration.countDocuments({
      paymentStatus: CLINIC_PAYMENT_STATUSES.AWAITING_REVIEW,
    }),
    ClinicRegistration.countDocuments({ status: CLINIC_STATUSES.CONFIRMED }),
    ClinicRegistration.countDocuments({ paymentStatus: CLINIC_PAYMENT_STATUSES.PAID }),
  ]);

  return {
    items: docs.map(toPublic),
    counts: { total, pending, awaitingReview: awaiting, confirmed, paid },
    pagination: { page: safePage, limit: safeLimit, total },
  };
}

async function updateRegistration({ registrationId, patch = {}, adminUserId }) {
  const doc = await ClinicRegistration.findById(registrationId);
  if (!doc) {
    throw new AppError("ثبت‌نام کلینیک یافت نشد", {
      statusCode: 404,
      code: "CLINIC_REGISTRATION_NOT_FOUND",
    });
  }

  if (patch.status) doc.status = patch.status;
  if (patch.paymentStatus) {
    doc.paymentStatus = patch.paymentStatus;
    if (patch.paymentStatus === CLINIC_PAYMENT_STATUSES.PAID && doc.status === CLINIC_STATUSES.PENDING) {
      doc.status = CLINIC_STATUSES.CONFIRMED;
    }
  }
  if (patch.adminNote !== undefined) doc.adminNote = patch.adminNote;
  doc.reviewedAt = new Date();
  await doc.save();

  return toPublic(doc);
}

/** Phone list of every non-cancelled clinic registration (for group SMS). */
async function smsTargets() {
  const docs = await ClinicRegistration.find({ status: { $ne: CLINIC_STATUSES.CANCELLED } })
    .select("userId phone firstName lastName")
    .lean();
  const unique = new Map();
  for (const doc of docs) {
    if (!doc.phone) continue;
    unique.set(`${String(doc.userId)}:${doc.phone}`, {
      userId: String(doc.userId),
      phone: doc.phone,
    });
  }
  return [...unique.values()];
}

module.exports = {
  getPublicInfo,
  register,
  listMine,
  reportPaid,
  listAdmin,
  updateRegistration,
  smsTargets,
  toPublic,
};
