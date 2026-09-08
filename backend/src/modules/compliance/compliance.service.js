const { AppError } = require("../../utils/AppError");
const { logEvent, logError } = require("../../services/logging");
const { COMPLIANCE_STATUSES } = require("../courses/domain.constants");
const { InsuranceRecord } = require("./insurance.model");
const { MedicalDocument } = require("./medical.model");
const { MedicalProfile } = require("./medicalProfile.model");
const {
  registerDocumentMetadata,
  validateUploadedBuffer,
  contentDispositionFilename,
  sanitizeOriginalFilename,
} = require("./documentStorage");
const { getDocumentStorage } = require("./storage/createDocumentStorage");
const { assertParticipantOwned } = require("../enrollments/participant.service");
const { Participant } = require("../enrollments/participant.model");

async function resolveParticipantAccess({ userId, role, participantId }) {
  if (role === "ADMIN") {
    const participant = await Participant.findById(participantId);
    if (!participant) {
      throw new AppError("شرکت‌کننده یافت نشد", { statusCode: 404, code: "PARTICIPANT_NOT_FOUND" });
    }
    return participant;
  }
  return assertParticipantOwned(userId, participantId);
}

function toPublicInsurance(doc) {
  return {
    id: String(doc._id),
    participantId: String(doc.participantId),
    status: doc.status,
    providerName: doc.providerName || "",
    policyRef: doc.policyRef || "",
    startDate: doc.startDate,
    expiresAt: doc.expiresAt,
    hasDocument: Boolean(doc.storageKey),
    persisted: Boolean(doc.persisted),
    originalFilename: doc.originalFilename || "",
    mimeType: doc.mimeType || "",
    sizeBytes: doc.sizeBytes || 0,
    rejectionReason: doc.rejectionReason || "",
    reviewedAt: doc.reviewedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    // never: storageKey, filesystem paths, checksum
  };
}

function toPublicMedicalDocument(doc) {
  return {
    id: String(doc._id),
    participantId: String(doc.participantId),
    status: doc.status,
    documentType: doc.documentType,
    hasDocument: Boolean(doc.storageKey),
    persisted: Boolean(doc.persisted),
    originalFilename: doc.originalFilename || "",
    mimeType: doc.mimeType || "",
    sizeBytes: doc.sizeBytes || 0,
    rejectionReason: doc.rejectionReason || "",
    expiresAt: doc.expiresAt,
    reviewedAt: doc.reviewedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toPublicMedicalProfile(doc) {
  if (!doc) return null;
  return {
    participantId: String(doc.participantId),
    hasMedicalCondition: Boolean(doc.hasMedicalCondition),
    allergies: doc.allergies || "",
    medications: doc.medications || "",
    notes: doc.notes || "",
    approvalStatus: doc.approvalStatus,
    reviewedAt: doc.reviewedAt,
    updatedAt: doc.updatedAt,
  };
}

async function submitInsurance({ userId, role, participantId, body }) {
  const participant = await resolveParticipantAccess({ userId, role, participantId });
  const status = body.status || COMPLIANCE_STATUSES.PENDING;
  if (status !== COMPLIANCE_STATUSES.PENDING && role !== "ADMIN") {
    throw new AppError("فقط ادمین می‌تواند وضعیت را تأیید کند", {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }

  let fileMeta = null;
  if (body.originalFilename || body.mimeType || body.sizeBytes) {
    fileMeta = registerDocumentMetadata({
      originalFilename: body.originalFilename,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
    });
  }

  const record = await InsuranceRecord.create({
    participantId: participant._id,
    status,
    providerName: body.providerName || "",
    policyRef: body.policyRef || "",
    startDate: body.startDate || null,
    expiresAt: body.expiresAt || null,
    notes: role === "ADMIN" ? body.notes || "" : "",
    storageKey: fileMeta?.storageKey || "",
    originalFilename: fileMeta?.originalFilename || "",
    mimeType: fileMeta?.mimeType || "",
    sizeBytes: fileMeta?.sizeBytes || 0,
    persisted: false,
    reviewedBy: role === "ADMIN" && status !== COMPLIANCE_STATUSES.PENDING ? userId : null,
    reviewedAt: role === "ADMIN" && status !== COMPLIANCE_STATUSES.PENDING ? new Date() : null,
  });

  logEvent("INSURANCE_STATUS_CHANGED", {
    insuranceId: String(record._id),
    participantId: String(participant._id),
    status: record.status,
    actorId: String(userId),
    hasDocument: Boolean(record.storageKey),
  });

  return {
    record: toPublicInsurance(record),
    storage: fileMeta
      ? { persisted: false, limitation: fileMeta.limitation }
      : null,
  };
}

async function submitMedicalDocument({ userId, role, participantId, body }) {
  const participant = await resolveParticipantAccess({ userId, role, participantId });
  const status = body.status || COMPLIANCE_STATUSES.PENDING;
  if (status !== COMPLIANCE_STATUSES.PENDING && role !== "ADMIN") {
    throw new AppError("فقط ادمین می‌تواند وضعیت را تأیید کند", {
      statusCode: 403,
      code: "FORBIDDEN",
    });
  }

  let fileMeta = null;
  if (body.originalFilename || body.mimeType || body.sizeBytes) {
    fileMeta = registerDocumentMetadata({
      originalFilename: body.originalFilename,
      mimeType: body.mimeType,
      sizeBytes: body.sizeBytes,
    });
  }

  const record = await MedicalDocument.create({
    participantId: participant._id,
    status,
    documentType: body.documentType || "MEDICAL_CLEARANCE",
    storageKey: fileMeta?.storageKey || "",
    originalFilename: fileMeta?.originalFilename || "",
    mimeType: fileMeta?.mimeType || "",
    sizeBytes: fileMeta?.sizeBytes || 0,
    persisted: false,
    expiresAt: body.expiresAt || null,
    reviewedBy: role === "ADMIN" && status !== COMPLIANCE_STATUSES.PENDING ? userId : null,
    reviewedAt: role === "ADMIN" && status !== COMPLIANCE_STATUSES.PENDING ? new Date() : null,
  });

  logEvent("MEDICAL_STATUS_CHANGED", {
    medicalId: String(record._id),
    participantId: String(participant._id),
    status: record.status,
    actorId: String(userId),
    hasDocument: Boolean(record.storageKey),
  });

  return {
    record: toPublicMedicalDocument(record),
    storage: fileMeta
      ? { persisted: false, limitation: fileMeta.limitation }
      : null,
  };
}

/**
 * Multipart upload with real blob persistence.
 * Order: validate → write file → create DB → cleanup file if DB fails.
 * Always creates a NEW PENDING document (never overwrites approved history).
 */
async function uploadDocumentFile({ kind, userId, role, participantId, file, fields = {} }) {
  const started = Date.now();
  const participant = await resolveParticipantAccess({ userId, role, participantId });
  if (!file || !file.buffer) {
    throw new AppError("فایل الزامی است", { statusCode: 400, code: "FILE_REQUIRED" });
  }

  const validated = validateUploadedBuffer({
    buffer: file.buffer,
    originalFilename: file.originalname || fields.originalFilename,
    claimedMime: file.mimetype,
  });

  const storage = getDocumentStorage();
  let stored = null;
  try {
    stored = await storage.put({ kind, buffer: validated.buffer });

    const Model = kind === "insurance" ? InsuranceRecord : MedicalDocument;
    const payload =
      kind === "insurance"
        ? {
            participantId: participant._id,
            status: COMPLIANCE_STATUSES.PENDING,
            providerName: String(fields.providerName || "").slice(0, 120),
            policyRef: String(fields.policyRef || "").slice(0, 120),
            startDate: fields.startDate ? new Date(fields.startDate) : null,
            expiresAt: fields.expiresAt ? new Date(fields.expiresAt) : null,
            notes: "",
            storageKey: stored.storageKey,
            originalFilename: validated.originalFilename,
            mimeType: validated.mimeType,
            sizeBytes: validated.sizeBytes,
            checksumSha256: validated.checksumSha256,
            persisted: true,
          }
        : {
            participantId: participant._id,
            status: COMPLIANCE_STATUSES.PENDING,
            documentType: String(fields.documentType || "MEDICAL_CLEARANCE").slice(0, 80),
            storageKey: stored.storageKey,
            originalFilename: validated.originalFilename,
            mimeType: validated.mimeType,
            sizeBytes: validated.sizeBytes,
            checksumSha256: validated.checksumSha256,
            persisted: true,
            expiresAt: fields.expiresAt ? new Date(fields.expiresAt) : null,
          };

    const record = await Model.create(payload);

    logEvent("DOCUMENT_UPLOADED", {
      kind,
      documentId: String(record._id),
      participantId: String(participant._id),
      actorId: String(userId),
      mimeType: validated.mimeType,
      sizeBytes: validated.sizeBytes,
      durationMs: Date.now() - started,
      persisted: true,
    });

    return {
      record: kind === "insurance" ? toPublicInsurance(record) : toPublicMedicalDocument(record),
      storage: { persisted: true, provider: storage.provider },
    };
  } catch (err) {
    if (stored?.storageKey) {
      await storage.delete(stored.storageKey).catch(() => {});
    }
    logError("DOCUMENT_UPLOAD_FAILED", err, {
      kind,
      participantId: String(participantId),
      actorId: String(userId),
      failureCategory: err?.code || err?.name || "UNKNOWN",
      durationMs: Date.now() - started,
    });
    throw err;
  }
}

/** Stream authorized document bytes. Owner or ADMIN only — never instructor privilege. */
async function openDocumentContent({ kind, documentId, userId, role }) {
  const Model = kind === "insurance" ? InsuranceRecord : MedicalDocument;
  const doc = await Model.findById(documentId);
  if (!doc) {
    throw new AppError("سند یافت نشد", { statusCode: 404, code: "DOCUMENT_NOT_FOUND" });
  }
  await resolveParticipantAccess({ userId, role, participantId: doc.participantId });

  if (!doc.persisted || !doc.storageKey) {
    throw new AppError("فایل سند در دسترس نیست", {
      statusCode: 404,
      code: "DOCUMENT_FILE_MISSING",
    });
  }

  const storage = getDocumentStorage();
  const exists = await storage.exists(doc.storageKey);
  if (!exists) {
    logEvent("DOCUMENT_STORAGE_MISSING", {
      kind,
      documentId: String(doc._id),
      participantId: String(doc.participantId),
    });
    throw new AppError("فایل سند در دسترس نیست", {
      statusCode: 404,
      code: "DOCUMENT_FILE_MISSING",
    });
  }

  const safeName = sanitizeOriginalFilename(doc.originalFilename || "document");
  logEvent("DOCUMENT_DOWNLOAD", {
    kind,
    documentId: String(doc._id),
    participantId: String(doc.participantId),
    actorId: String(userId),
    sizeBytes: doc.sizeBytes,
  });

  return {
    stream: storage.getStream(doc.storageKey),
    mimeType: doc.mimeType || "application/octet-stream",
    sizeBytes: doc.sizeBytes || undefined,
    contentDisposition: contentDispositionFilename(safeName),
  };
}

async function reviewDocument({ kind, documentId, adminUserId, decision, rejectionReason }) {
  const Model = kind === "insurance" ? InsuranceRecord : MedicalDocument;
  if (![COMPLIANCE_STATUSES.APPROVED, COMPLIANCE_STATUSES.REJECTED].includes(decision)) {
    throw new AppError("تصمیم نامعتبر است", { statusCode: 400, code: "VALIDATION_ERROR" });
  }
  if (decision === COMPLIANCE_STATUSES.REJECTED && !String(rejectionReason || "").trim()) {
    throw new AppError("دلیل رد الزامی است", { statusCode: 400, code: "VALIDATION_ERROR" });
  }

  const existing = await Model.findById(documentId);
  if (!existing) {
    throw new AppError("سند یافت نشد", { statusCode: 404, code: "DOCUMENT_NOT_FOUND" });
  }
  if (
    decision === COMPLIANCE_STATUSES.APPROVED &&
    existing.storageKey &&
    !existing.persisted
  ) {
    throw new AppError("سند فایل واقعی ندارد و قابل تأیید نیست", {
      statusCode: 409,
      code: "DOCUMENT_NOT_PERSISTED",
    });
  }

  const claimed = await Model.findOneAndUpdate(
    { _id: documentId, status: COMPLIANCE_STATUSES.PENDING },
    {
      $set: {
        status: decision,
        rejectionReason:
          decision === COMPLIANCE_STATUSES.REJECTED ? String(rejectionReason).trim().slice(0, 500) : "",
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  if (!claimed) {
    return {
      record: kind === "insurance" ? toPublicInsurance(existing) : toPublicMedicalDocument(existing),
      alreadyProcessed: true,
    };
  }

  logEvent(decision === COMPLIANCE_STATUSES.APPROVED ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED", {
    kind,
    documentId: String(claimed._id),
    participantId: String(claimed.participantId),
    actorId: String(adminUserId),
  });

  try {
    const { onDocumentReviewed } = require("../notifications/dispatcher");
    await onDocumentReviewed({ kind, document: claimed, decision });
  } catch {
    // notification failure must never roll back review
  }

  return {
    record: kind === "insurance" ? toPublicInsurance(claimed) : toPublicMedicalDocument(claimed),
    alreadyProcessed: false,
  };
}

async function listPendingDocuments({ limit = 50, page = 1 } = {}) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const safePage = Math.max(1, Number(page) || 1);
  const skip = (safePage - 1) * safeLimit;

  const [insurance, medical, insuranceTotal, medicalTotal] = await Promise.all([
    InsuranceRecord.find({ status: COMPLIANCE_STATUSES.PENDING })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(safeLimit),
    MedicalDocument.find({ status: COMPLIANCE_STATUSES.PENDING })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(safeLimit),
    InsuranceRecord.countDocuments({ status: COMPLIANCE_STATUSES.PENDING }),
    MedicalDocument.countDocuments({ status: COMPLIANCE_STATUSES.PENDING }),
  ]);

  return {
    page: safePage,
    limit: safeLimit,
    insuranceTotal,
    medicalTotal,
    insurance: insurance.map(toPublicInsurance),
    medical: medical.map(toPublicMedicalDocument),
  };
}

async function getMedicalProfile({ userId, role, participantId }) {
  await resolveParticipantAccess({ userId, role, participantId });
  const profile = await MedicalProfile.findOne({ participantId });
  return toPublicMedicalProfile(profile);
}

async function upsertMedicalProfile({ userId, role, participantId, body }) {
  await resolveParticipantAccess({ userId, role, participantId });
  const update = {
    hasMedicalCondition: Boolean(body.hasMedicalCondition),
    allergies: String(body.allergies || "").slice(0, 500),
    medications: String(body.medications || "").slice(0, 500),
    notes: String(body.notes || "").slice(0, 1000),
  };
  if (role === "ADMIN" && body.approvalStatus) {
    update.approvalStatus = body.approvalStatus;
    update.reviewedBy = userId;
    update.reviewedAt = new Date();
  }

  const profile = await MedicalProfile.findOneAndUpdate(
    { participantId },
    { $set: update, $setOnInsert: { participantId } },
    { upsert: true, returnDocument: "after" },
  );

  logEvent("MEDICAL_PROFILE_UPDATED", {
    participantId: String(participantId),
    actorId: String(userId),
    hasMedicalCondition: update.hasMedicalCondition,
  });

  return toPublicMedicalProfile(profile);
}

async function listParticipantInsurance({ userId, role, participantId }) {
  await resolveParticipantAccess({ userId, role, participantId });
  const rows = await InsuranceRecord.find({ participantId }).sort({ createdAt: -1 }).limit(50);
  return rows.map(toPublicInsurance);
}

async function listParticipantMedicalDocuments({ userId, role, participantId }) {
  await resolveParticipantAccess({ userId, role, participantId });
  const rows = await MedicalDocument.find({ participantId }).sort({ createdAt: -1 }).limit(50);
  return rows.map(toPublicMedicalDocument);
}

async function getDocumentForAuthorized({ kind, documentId, userId, role }) {
  const Model = kind === "insurance" ? InsuranceRecord : MedicalDocument;
  const doc = await Model.findById(documentId);
  if (!doc) {
    throw new AppError("سند یافت نشد", { statusCode: 404, code: "DOCUMENT_NOT_FOUND" });
  }
  await resolveParticipantAccess({ userId, role, participantId: doc.participantId });
  return kind === "insurance" ? toPublicInsurance(doc) : toPublicMedicalDocument(doc);
}

module.exports = {
  resolveParticipantAccess,
  toPublicInsurance,
  toPublicMedicalDocument,
  toPublicMedicalProfile,
  submitInsurance,
  submitMedicalDocument,
  uploadDocumentFile,
  openDocumentContent,
  reviewDocument,
  listPendingDocuments,
  getMedicalProfile,
  upsertMedicalProfile,
  listParticipantInsurance,
  listParticipantMedicalDocuments,
  getDocumentForAuthorized,
};
