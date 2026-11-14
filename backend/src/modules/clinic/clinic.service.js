const { AppError } = require("../../utils/AppError");
const { ageFromBirthDate, assertValidBirthDate } = require("../../utils/age");
const { Clinic } = require("./clinic.model");
const {
  ClinicRegistration,
  CLINIC_STATUSES,
  CLINIC_PAYMENT_STATUSES,
} = require("./clinicRegistration.model");

const CLINIC_FIELDS = [
  "title",
  "subtitle",
  "description",
  "priceToman",
  "startDate",
  "endDate",
  "schedule",
  "location",
  "capacity",
  "phone",
  "notice",
  "enabled",
];

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

function pickClinicFields(body = {}) {
  const out = {};
  for (const field of CLINIC_FIELDS) {
    if (body[field] !== undefined) out[field] = body[field];
  }
  return out;
}

function toClinic(doc, { registered = 0, confirmed = 0 } = {}) {
  const row = doc.toObject ? doc.toObject() : doc;
  const capacity = Number(row.capacity || 0);
  const taken = Number(registered || 0);
  return {
    id: String(row._id),
    title: row.title || "",
    subtitle: row.subtitle || "",
    description: row.description || "",
    priceToman: Number(row.priceToman || 0),
    startDate: row.startDate || "",
    endDate: row.endDate || "",
    schedule: row.schedule || "",
    location: row.location || "",
    capacity,
    phone: row.phone || "",
    notice: row.notice || "",
    enabled: Boolean(row.enabled),
    registered: taken,
    confirmed: Number(confirmed || 0),
    remaining: capacity > 0 ? Math.max(0, capacity - taken) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toPublic(doc) {
  const row = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(row._id),
    clinicId: row.clinicId ? String(row.clinicId) : null,
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

async function withCounts(doc) {
  const [registered, confirmed] = await Promise.all([
    ClinicRegistration.countDocuments({
      clinicId: doc._id,
      status: { $ne: CLINIC_STATUSES.CANCELLED },
    }),
    ClinicRegistration.countDocuments({
      clinicId: doc._id,
      status: CLINIC_STATUSES.CONFIRMED,
    }),
  ]);
  return toClinic(doc, { registered, confirmed });
}

/** Every clinic, newest first, with its registration counts. */
async function listClinics() {
  const docs = await Clinic.find({}).sort({ createdAt: -1 });
  return Promise.all(docs.map(withCounts));
}

/** Public page: clinics are always listed; `enabled` only controls registration. */
async function getPublicInfo() {
  const clinics = await listClinics();
  return {
    clinics,
    registered: clinics.reduce((sum, row) => sum + Number(row.registered || 0), 0),
    confirmed: clinics.reduce((sum, row) => sum + Number(row.confirmed || 0), 0),
  };
}

async function createClinic({ body = {}, actorId = null }) {
  const fields = pickClinicFields(body);
  if (!fields.title) {
    throw new AppError("عنوان کلینیک الزامی است", {
      statusCode: 400,
      code: "CLINIC_TITLE_REQUIRED",
    });
  }
  const doc = await Clinic.create({ ...fields, createdBy: actorId || null });
  return withCounts(doc);
}

async function updateClinic({ clinicId, patch = {} }) {
  const doc = await Clinic.findById(clinicId);
  if (!doc) {
    throw new AppError("کلینیک یافت نشد", { statusCode: 404, code: "CLINIC_NOT_FOUND" });
  }
  Object.assign(doc, pickClinicFields(patch));
  await doc.save();
  return withCounts(doc);
}

/**
 * Deleting a clinic keeps its registrations as records: they are detached
 * (clinicId = null) but keep the title/price snapshot.
 */
async function deleteClinic({ clinicId }) {
  const doc = await Clinic.findById(clinicId);
  if (!doc) {
    throw new AppError("کلینیک یافت نشد", { statusCode: 404, code: "CLINIC_NOT_FOUND" });
  }
  const detached = await ClinicRegistration.updateMany(
    { clinicId: doc._id },
    { $set: { clinicId: null } },
  );
  await doc.deleteOne();
  return {
    deleted: true,
    id: String(clinicId),
    detachedRegistrations: detached.modifiedCount || 0,
  };
}

async function register({
  clinicId,
  userId,
  firstName,
  lastName,
  phone,
  birthDate,
  gender = null,
  note = "",
}) {
  if (!clinicId) {
    throw new AppError("کلینیک را انتخاب کنید", {
      statusCode: 400,
      code: "CLINIC_REQUIRED",
    });
  }

  const clinic = await Clinic.findById(clinicId);
  if (!clinic) {
    throw new AppError("کلینیک یافت نشد", { statusCode: 404, code: "CLINIC_NOT_FOUND" });
  }
  if (!clinic.enabled) {
    throw new AppError("ثبت‌نام این کلینیک در حال حاضر بسته است", {
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

  if (Number(clinic.capacity) > 0) {
    const taken = await ClinicRegistration.countDocuments({
      clinicId: clinic._id,
      status: { $ne: CLINIC_STATUSES.CANCELLED },
    });
    if (taken >= Number(clinic.capacity)) {
      throw new AppError("ظرفیت کلینیک تکمیل شده است", {
        statusCode: 409,
        code: "CLINIC_FULL",
      });
    }
  }

  const duplicate = await ClinicRegistration.findOne({
    clinicId: clinic._id,
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
    clinicId: clinic._id,
    userId,
    firstName,
    lastName,
    phone,
    birthDate,
    gender: gender || null,
    note,
    priceToman: Number(clinic.priceToman || 0),
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

async function listAdmin({ status, paymentStatus, clinicId, q, limit = 50, page = 1 }) {
  const filter = {};
  if (status) filter.status = status;
  if (paymentStatus) filter.paymentStatus = paymentStatus;
  if (clinicId) filter.clinicId = clinicId;
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
  CLINIC_FIELDS,
  listClinics,
  getPublicInfo,
  createClinic,
  updateClinic,
  deleteClinic,
  register,
  listMine,
  reportPaid,
  listAdmin,
  updateRegistration,
  smsTargets,
  toPublic,
};
