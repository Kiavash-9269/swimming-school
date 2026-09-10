const { success } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../middleware/errorHandler");
const { AppError } = require("../../utils/AppError");
const { Enrollment } = require("./enrollment.model");
const { CourseTemplate } = require("../courses/courseTemplate.model");
const { CourseClass } = require("../courses/courseClass.model");
const { Discount } = require("../billing/discount.model");
const { checkEligibility } = require("./eligibility.service");
const enrollmentService = require("./enrollment.service");
const participantService = require("./participant.service");
const complianceService = require("../compliance/compliance.service");
const user360Service = require("./user360.service");
const attendanceService = require("./attendance.service");
const { logEvent } = require("../../services/logging");
const { ENROLLMENT_STATUSES } = require("../courses/domain.constants");

const { toPublicParticipant } = participantService;
const { toPublicEnrollment } = user360Service;

const createParticipant = asyncHandler(async (req, res) => {
  const participant = await participantService.createParticipant({
    ownerUserId: req.user._id,
    data: req.body,
  });
  return success(res, toPublicParticipant(participant, { includeEmergency: true, includeAge: true }), 201);
});

const listParticipants = asyncHandler(async (req, res) => {
  const rows = await participantService.listOwnerParticipants(req.user._id);
  return success(res, {
    items: rows.map((p) => toPublicParticipant(p, { includeEmergency: true, includeAge: true })),
  });
});

const getParticipant = asyncHandler(async (req, res) => {
  const participant = await participantService.getParticipantAuthorized({
    userId: req.user._id,
    role: req.user.role,
    participantId: req.params.participantId,
  });
  return success(res, toPublicParticipant(participant, { includeEmergency: true, includeAge: true }));
});

const updateParticipant = asyncHandler(async (req, res) => {
  const participant = await participantService.updateParticipant({
    userId: req.user._id,
    role: req.user.role,
    participantId: req.params.participantId,
    data: req.body,
  });
  return success(res, toPublicParticipant(participant, { includeEmergency: true, includeAge: true }));
});

const deactivateParticipant = asyncHandler(async (req, res) => {
  const participant = await participantService.deactivateParticipant({
    userId: req.user._id,
    role: req.user.role,
    participantId: req.params.participantId,
  });
  return success(res, toPublicParticipant(participant, { includeEmergency: true }));
});

const checkEligibilityHandler = asyncHandler(async (req, res) => {
  const participant = await enrollmentService.assertParticipantOwned(req.user._id, req.body.participantId);
  const courseClass = await CourseClass.findById(req.body.classId);
  if (!courseClass) {
    throw new AppError("کلاس یافت نشد", { statusCode: 404, code: "CLASS_NOT_FOUND" });
  }
  const template = await CourseTemplate.findById(courseClass.courseTemplateId);
  const result = await checkEligibility(participant, courseClass, template);
  return success(res, {
    eligible: result.eligible,
    reasons: result.reasons,
    age: result.age,
    evaluatedAt: result.evaluatedAt,
    ruleVersion: result.ruleVersion,
  });
});

const checkAvailability = asyncHandler(async (req, res) => {
  const data = await enrollmentService.checkAvailability(req.params.classId);
  return success(res, data);
});

const createReservation = asyncHandler(async (req, res) => {
  const reservation = await enrollmentService.createReservation({
    userId: req.user._id,
    classId: req.body.classId,
    participantId: req.body.participantId,
    idempotencyKey: req.body.idempotencyKey || req.headers["idempotency-key"],
  });
  return success(
    res,
    {
      id: String(reservation._id),
      classId: String(reservation.classId),
      participantId: String(reservation.participantId),
      status: reservation.status,
      expiresAt: reservation.expiresAt,
    },
    201,
  );
});

const joinWaitlist = asyncHandler(async (req, res) => {
  const entry = await enrollmentService.joinWaitlist({
    userId: req.user._id,
    classId: req.body.classId,
    participantId: req.body.participantId,
  });
  return success(
    res,
    {
      id: String(entry._id),
      classId: String(entry.classId),
      position: entry.position,
      status: entry.status,
    },
    201,
  );
});

const confirmEnrollment = asyncHandler(async (req, res) => {
  const result = await enrollmentService.confirmEnrollmentFromReservation({
    userId: req.user._id,
    reservationId: req.body.reservationId,
    discountCode: req.body.discountCode,
    idempotencyKey: req.body.idempotencyKey || req.headers["idempotency-key"],
  });
  return success(
    res,
    {
      enrollment: toPublicEnrollment(result.enrollment),
      payment: {
        id: String(result.payment._id),
        amount: result.payment.amount,
        status: result.payment.status,
        provider: result.payment.provider,
        providerRef: result.payment.providerRef,
        authority: result.payment.authority || null,
      },
      quote: {
        basePrice: result.quote.basePrice ?? result.quote.finalPrice,
        finalPrice: result.quote.finalPrice,
        discountAmount: result.quote.discountAmount,
      },
      gateway: result.gateway || null,
      alreadyExists: Boolean(result.alreadyExists),
    },
    result.alreadyExists ? 200 : 201,
  );
});

const paymentCallback = asyncHandler(async (req, res) => {
  if (req.body.amount != null || req.body.finalAmount != null || req.body.price != null) {
    throw new AppError("مبلغ توسط سرور محاسبه می‌شود", {
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
  }

  const result = await enrollmentService.verifyPaymentAndActivate({
    paymentId: req.body.paymentId,
    providerRef: req.body.providerRef || req.body.authority,
    authority: req.body.authority || req.body.providerRef,
    success: req.body.success,
    reportedAmount: undefined,
    userId: req.user._id,
    isAdmin: req.user.role === "ADMIN",
    callbackSecret: req.headers["x-payment-callback-secret"],
  });
  return success(res, {
    alreadyProcessed: result.alreadyProcessed,
    payment: {
      id: String(result.payment._id),
      status: result.payment.status,
      amount: result.payment.amount,
    },
    enrollment: toPublicEnrollment(result.enrollment),
  });
});

const getEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findById(req.params.id);
  if (!enrollment) {
    throw new AppError("ثبت‌نام یافت نشد", { statusCode: 404, code: "ENROLLMENT_NOT_FOUND" });
  }
  const isAdmin = req.user.role === "ADMIN";
  if (!isAdmin && String(enrollment.userId) !== String(req.user._id)) {
    throw new AppError("دسترسی مجاز نیست", { statusCode: 403, code: "FORBIDDEN" });
  }
  return success(res, toPublicEnrollment(enrollment));
});

const listMyEnrollments = asyncHandler(async (req, res) => {
  const rows = await Enrollment.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(200);
  return success(res, { items: rows.map(toPublicEnrollment) });
});

const cancelEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await enrollmentService.cancelEnrollment({
    userId: req.user._id,
    enrollmentId: req.params.id,
    isAdmin: req.user.role === "ADMIN",
  });
  return success(res, toPublicEnrollment(enrollment));
});

const activateCompliance = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findById(req.params.id);
  if (!enrollment) {
    throw new AppError("ثبت‌نام یافت نشد", { statusCode: 404, code: "ENROLLMENT_NOT_FOUND" });
  }
  if (enrollment.status !== ENROLLMENT_STATUSES.PENDING_COMPLIANCE) {
    throw new AppError("ثبت‌نام در وضعیت انتظار مدارک نیست", {
      statusCode: 409,
      code: "INVALID_ENROLLMENT_STATUS",
    });
  }

  const participant = await participantService.getParticipantAuthorized({
    userId: req.user._id,
    role: "ADMIN",
    participantId: enrollment.participantId,
  });
  const courseClass = await CourseClass.findById(enrollment.classId);
  const template = await CourseTemplate.findById(courseClass.courseTemplateId);
  const eligibility = await checkEligibility(participant, courseClass, template);
  if (!eligibility.eligible) {
    throw new AppError("هنوز واجد شرایط نیست", {
      statusCode: 400,
      code: "NOT_ELIGIBLE",
      details: { reasons: eligibility.reasons },
    });
  }

  enrollment.status = ENROLLMENT_STATUSES.ACTIVE;
  enrollment.eligibilitySnapshot = {
    eligible: true,
    reasons: [],
    age: eligibility.age,
    evaluatedAt: eligibility.evaluatedAt,
    ruleVersion: eligibility.ruleVersion,
  };
  await enrollment.save();
  logEvent("ENROLLMENT_ACTIVATED", {
    enrollmentId: String(enrollment._id),
    via: "compliance_cleared",
    actorId: String(req.user._id),
  });
  try {
    const { safeEnqueue } = require("../notifications/dispatcher");
    const { NOTIFICATION_TYPES, NOTIFICATION_CHANNELS } = require("../notifications/notification.constants");
    await safeEnqueue({
      userId: enrollment.userId,
      type: NOTIFICATION_TYPES.ENROLLMENT_CONFIRMED,
      channel: NOTIFICATION_CHANNELS.SMS,
      idempotencyKey: `ENROLLMENT_CONFIRMED:${enrollment._id}`,
      refs: {
        enrollmentId: enrollment._id,
        classId: enrollment.classId,
        participantId: enrollment.participantId,
      },
    });
  } catch {
    // ignore
  }
  return success(res, toPublicEnrollment(enrollment));
});

const createDiscount = asyncHandler(async (req, res) => {
  const discount = await Discount.create({
    ...req.body,
    code: String(req.body.code).trim().toUpperCase(),
  });
  logEvent("DISCOUNT_CREATED", { discountId: String(discount._id), code: discount.code });
  return success(
    res,
    {
      id: String(discount._id),
      code: discount.code,
      type: discount.type,
      value: discount.value,
      scope: discount.scope,
      isActive: discount.isActive,
    },
    201,
  );
});

const setInsuranceStatus = asyncHandler(async (req, res) => {
  const result = await complianceService.submitInsurance({
    userId: req.user._id,
    role: req.user.role,
    participantId: req.params.participantId,
    body: req.body,
  });
  return success(res, { ...result.record, storage: result.storage }, 201);
});

const setMedicalStatus = asyncHandler(async (req, res) => {
  const result = await complianceService.submitMedicalDocument({
    userId: req.user._id,
    role: req.user.role,
    participantId: req.params.participantId,
    body: req.body,
  });
  return success(res, { ...result.record, storage: result.storage }, 201);
});

const getMedicalProfile = asyncHandler(async (req, res) => {
  const profile = await complianceService.getMedicalProfile({
    userId: req.user._id,
    role: req.user.role,
    participantId: req.params.participantId,
  });
  return success(res, profile || { participantId: req.params.participantId, approvalStatus: "NONE" });
});

const upsertMedicalProfile = asyncHandler(async (req, res) => {
  const profile = await complianceService.upsertMedicalProfile({
    userId: req.user._id,
    role: req.user.role,
    participantId: req.params.participantId,
    body: req.body,
  });
  return success(res, profile);
});

const listInsurance = asyncHandler(async (req, res) => {
  const items = await complianceService.listParticipantInsurance({
    userId: req.user._id,
    role: req.user.role,
    participantId: req.params.participantId,
  });
  return success(res, { items });
});

const listMedicalDocuments = asyncHandler(async (req, res) => {
  const items = await complianceService.listParticipantMedicalDocuments({
    userId: req.user._id,
    role: req.user.role,
    participantId: req.params.participantId,
  });
  return success(res, { items });
});

const reviewInsurance = asyncHandler(async (req, res) => {
  const result = await complianceService.reviewDocument({
    kind: "insurance",
    documentId: req.params.documentId,
    adminUserId: req.user._id,
    decision: req.body.decision,
    rejectionReason: req.body.rejectionReason,
  });
  return success(res, result);
});

const reviewMedical = asyncHandler(async (req, res) => {
  const result = await complianceService.reviewDocument({
    kind: "medical",
    documentId: req.params.documentId,
    adminUserId: req.user._id,
    decision: req.body.decision,
    rejectionReason: req.body.rejectionReason,
  });
  return success(res, result);
});

const listPendingDocuments = asyncHandler(async (req, res) => {
  const data = await complianceService.listPendingDocuments({
    page: req.query.page,
    limit: req.query.limit,
  });
  return success(res, data);
});

const getInsuranceDocument = asyncHandler(async (req, res) => {
  const record = await complianceService.getDocumentForAuthorized({
    kind: "insurance",
    documentId: req.params.documentId,
    userId: req.user._id,
    role: req.user.role,
  });
  return success(res, record);
});

const getMedicalDocument = asyncHandler(async (req, res) => {
  const record = await complianceService.getDocumentForAuthorized({
    kind: "medical",
    documentId: req.params.documentId,
    userId: req.user._id,
    role: req.user.role,
  });
  return success(res, record);
});

const uploadInsuranceDocument = asyncHandler(async (req, res) => {
  const result = await complianceService.uploadDocumentFile({
    kind: "insurance",
    userId: req.user._id,
    role: req.user.role,
    participantId: req.params.participantId,
    file: req.file,
    fields: req.body || {},
  });
  return success(res, { ...result.record, storage: result.storage }, 201);
});

const uploadMedicalDocument = asyncHandler(async (req, res) => {
  const result = await complianceService.uploadDocumentFile({
    kind: "medical",
    userId: req.user._id,
    role: req.user.role,
    participantId: req.params.participantId,
    file: req.file,
    fields: req.body || {},
  });
  return success(res, { ...result.record, storage: result.storage }, 201);
});

function pipeDocumentContent(kind) {
  return asyncHandler(async (req, res) => {
    const content = await complianceService.openDocumentContent({
      kind,
      documentId: req.params.documentId,
      userId: req.user._id,
      role: req.user.role,
    });
    res.setHeader("Content-Type", content.mimeType);
    res.setHeader("Content-Disposition", content.contentDisposition);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (content.sizeBytes) {
      res.setHeader("Content-Length", String(content.sizeBytes));
    }
    content.stream.on("error", () => {
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.destroy();
      }
    });
    content.stream.pipe(res);
  });
}

const downloadInsuranceDocument = pipeDocumentContent("insurance");
const downloadMedicalDocument = pipeDocumentContent("medical");

const getUser360 = asyncHandler(async (req, res) => {
  const targetUserId =
    req.user.role === "ADMIN" && req.params.userId ? req.params.userId : String(req.user._id);
  if (req.user.role !== "ADMIN" && targetUserId !== String(req.user._id)) {
    throw new AppError("دسترسی مجاز نیست", { statusCode: 403, code: "FORBIDDEN" });
  }
  const data = await user360Service.buildUser360({
    targetUserId,
    actorRole: req.user.role,
    actorId: req.user._id,
    includeSensitive: req.user.role === "ADMIN",
  });
  return success(res, data);
});

const adminSearchUsers = asyncHandler(async (req, res) => {
  const data = await user360Service.searchUsersAdmin({
    q: req.query.q,
    page: req.query.page,
    limit: req.query.limit,
  });
  return success(res, data);
});

const adminSearchParticipants = asyncHandler(async (req, res) => {
  const data = await participantService.searchParticipantsAdmin({
    q: req.query.q,
    gender: req.query.gender,
    isActive: req.query.isActive,
    ownerUserId: req.query.ownerUserId,
    page: req.query.page,
    limit: req.query.limit,
  });
  return success(res, data);
});

const markAttendance = asyncHandler(async (req, res) => {
  const record = await attendanceService.markAttendance({
    user: req.user,
    classId: req.body.classId,
    sessionId: req.body.sessionId,
    participantId: req.body.participantId,
    status: req.body.status,
    notifyAbsent: req.body.notifyAbsent !== false,
  });
  return success(res, record, 201);
});

const submitSessionAttendance = asyncHandler(async (req, res) => {
  const data = await attendanceService.submitSessionAttendance({
    user: req.user,
    classId: req.body.classId,
    sessionId: req.body.sessionId,
    marks: req.body.marks,
  });
  return success(res, data, 201);
});

const listClassAttendance = asyncHandler(async (req, res) => {
  const items = await attendanceService.listClassAttendance({
    user: req.user,
    classId: req.params.classId,
    limit: req.query.limit,
  });
  return success(res, { items });
});

const listClassRoster = asyncHandler(async (req, res) => {
  const data = await enrollmentService.listClassRoster({
    user: req.user,
    classId: req.params.classId,
  });
  return success(res, data);
});

module.exports = {
  createParticipant,
  listParticipants,
  getParticipant,
  updateParticipant,
  deactivateParticipant,
  checkEligibilityHandler,
  checkAvailability,
  createReservation,
  joinWaitlist,
  confirmEnrollment,
  paymentCallback,
  getEnrollment,
  listMyEnrollments,
  cancelEnrollment,
  activateCompliance,
  createDiscount,
  setInsuranceStatus,
  setMedicalStatus,
  getMedicalProfile,
  upsertMedicalProfile,
  listInsurance,
  listMedicalDocuments,
  reviewInsurance,
  reviewMedical,
  listPendingDocuments,
  getInsuranceDocument,
  getMedicalDocument,
  uploadInsuranceDocument,
  uploadMedicalDocument,
  downloadInsuranceDocument,
  downloadMedicalDocument,
  getUser360,
  adminSearchUsers,
  adminSearchParticipants,
  markAttendance,
  submitSessionAttendance,
  listClassAttendance,
  listClassRoster,
  toPublicEnrollment,
  toPublicParticipant,
};
