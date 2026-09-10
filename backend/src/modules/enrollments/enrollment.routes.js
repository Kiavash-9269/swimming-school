const express = require("express");
const { authenticate, authorize } = require("../../middleware/authenticate");
const { validate } = require("../../middleware/validate");
const { createLimiter } = require("../../middleware/rateLimit");
const { singleDocumentUpload } = require("../../middleware/upload");
const controller = require("./enrollment.controller");
const {
  participantBody,
  participantUpdateBody,
  reservationBody,
  waitlistBody,
  confirmEnrollmentBody,
  paymentCallbackBody,
  eligibilityBody,
  discountBody,
  complianceSubmitBody,
  documentReviewBody,
  medicalProfileBody,
  attendanceBody,
  attendanceSubmitBody,
  paginationQuery,
} = require("./enrollment.validation");

const router = express.Router();
const enrollLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 60 });
const paymentLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 120 });
const adminLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 120 });
const documentUploadLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 30 });
const documentDownloadLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 60 });

router.post("/participants", authenticate, enrollLimiter, validate(participantBody), controller.createParticipant);
router.get("/participants", authenticate, controller.listParticipants);
router.get("/participants/:participantId", authenticate, controller.getParticipant);
router.patch(
  "/participants/:participantId",
  authenticate,
  enrollLimiter,
  validate(participantUpdateBody),
  controller.updateParticipant,
);
router.post(
  "/participants/:participantId/deactivate",
  authenticate,
  enrollLimiter,
  controller.deactivateParticipant,
);

router.post(
  "/participants/:participantId/insurance",
  authenticate,
  validate(complianceSubmitBody),
  controller.setInsuranceStatus,
);
router.post(
  "/participants/:participantId/insurance/upload",
  authenticate,
  documentUploadLimiter,
  singleDocumentUpload("file"),
  controller.uploadInsuranceDocument,
);
router.get("/participants/:participantId/insurance", authenticate, controller.listInsurance);
router.post(
  "/participants/:participantId/medical",
  authenticate,
  validate(complianceSubmitBody),
  controller.setMedicalStatus,
);
router.post(
  "/participants/:participantId/medical/upload",
  authenticate,
  documentUploadLimiter,
  singleDocumentUpload("file"),
  controller.uploadMedicalDocument,
);
router.get("/participants/:participantId/medical", authenticate, controller.listMedicalDocuments);
router.get("/participants/:participantId/medical-profile", authenticate, controller.getMedicalProfile);
router.put(
  "/participants/:participantId/medical-profile",
  authenticate,
  validate(medicalProfileBody),
  controller.upsertMedicalProfile,
);

router.get("/documents/insurance/:documentId", authenticate, controller.getInsuranceDocument);
router.get("/documents/medical/:documentId", authenticate, controller.getMedicalDocument);
router.get(
  "/documents/insurance/:documentId/content",
  authenticate,
  documentDownloadLimiter,
  controller.downloadInsuranceDocument,
);
router.get(
  "/documents/medical/:documentId/content",
  authenticate,
  documentDownloadLimiter,
  controller.downloadMedicalDocument,
);

router.get(
  "/admin/documents/pending",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(paginationQuery, "query"),
  controller.listPendingDocuments,
);
router.post(
  "/admin/documents/insurance/:documentId/review",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(documentReviewBody),
  controller.reviewInsurance,
);
router.post(
  "/admin/documents/medical/:documentId/review",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(documentReviewBody),
  controller.reviewMedical,
);
router.get(
  "/admin/users/search",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(paginationQuery, "query"),
  controller.adminSearchUsers,
);
router.get(
  "/admin/participants/search",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(paginationQuery, "query"),
  controller.adminSearchParticipants,
);
router.post(
  "/admin/enrollments/:id/activate-compliance",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  controller.activateCompliance,
);

router.post("/eligibility/check", authenticate, validate(eligibilityBody), controller.checkEligibilityHandler);
router.get("/classes/:classId/availability", authenticate, controller.checkAvailability);

router.post("/reservations", authenticate, enrollLimiter, validate(reservationBody), controller.createReservation);
router.post("/waitlist", authenticate, enrollLimiter, validate(waitlistBody), controller.joinWaitlist);
router.post("/confirm", authenticate, enrollLimiter, validate(confirmEnrollmentBody), controller.confirmEnrollment);

router.post(
  "/payments/callback",
  authenticate,
  paymentLimiter,
  validate(paymentCallbackBody),
  controller.paymentCallback,
);

router.post("/discounts", authenticate, authorize("ADMIN"), validate(discountBody), controller.createDiscount);

router.post("/attendance", authenticate, enrollLimiter, validate(attendanceBody), controller.markAttendance);
router.post(
  "/attendance/submit-session",
  authenticate,
  enrollLimiter,
  validate(attendanceSubmitBody),
  controller.submitSessionAttendance,
);
router.get("/classes/:classId/attendance", authenticate, controller.listClassAttendance);
router.get("/classes/:classId/roster", authenticate, controller.listClassRoster);

router.get("/users/me/360", authenticate, controller.getUser360);
router.get("/users/:userId/360", authenticate, authorize("ADMIN"), controller.getUser360);

router.get("/me", authenticate, controller.listMyEnrollments);
router.get("/:id", authenticate, controller.getEnrollment);
router.post("/:id/cancel", authenticate, enrollLimiter, controller.cancelEnrollment);

module.exports = router;
