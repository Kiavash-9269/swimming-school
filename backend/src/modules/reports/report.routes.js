const express = require("express");
const { authenticate, authorize } = require("../../middleware/authenticate");
const { validate } = require("../../middleware/validate");
const { createLimiter } = require("../../middleware/rateLimit");
const controller = require("./report.controller");
const {
  participantReportQuery,
  enrollmentReportQuery,
  paymentReportQuery,
  classReportQuery,
  attendanceReportQuery,
  waitlistReportQuery,
  discountReportQuery,
  complianceReportQuery,
} = require("./report.validation");

const router = express.Router();

const adminLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 120 });
const exportLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 20 });

router.use(authenticate, authorize("ADMIN"));

router.get("/dashboard", adminLimiter, controller.dashboard);

router.get("/participants", adminLimiter, validate(participantReportQuery, "query"), controller.participants);
router.get(
  "/participants/export",
  exportLimiter,
  validate(participantReportQuery, "query"),
  controller.exportParticipants,
);

router.get("/enrollments", adminLimiter, validate(enrollmentReportQuery, "query"), controller.enrollments);
router.get(
  "/enrollments/export",
  exportLimiter,
  validate(enrollmentReportQuery, "query"),
  controller.exportEnrollments,
);

router.get("/payments", adminLimiter, validate(paymentReportQuery, "query"), controller.payments);
router.get("/payments/export", exportLimiter, validate(paymentReportQuery, "query"), controller.exportPayments);

router.get("/classes", adminLimiter, validate(classReportQuery, "query"), controller.classes);
router.get("/classes/export", exportLimiter, validate(classReportQuery, "query"), controller.exportClasses);

router.get("/attendance", adminLimiter, validate(attendanceReportQuery, "query"), controller.attendance);
router.get(
  "/attendance/export",
  exportLimiter,
  validate(attendanceReportQuery, "query"),
  controller.exportAttendance,
);

router.get("/waitlist", adminLimiter, validate(waitlistReportQuery, "query"), controller.waitlist);
router.get("/waitlist/export", exportLimiter, validate(waitlistReportQuery, "query"), controller.exportWaitlist);

router.get("/discounts", adminLimiter, validate(discountReportQuery, "query"), controller.discounts);
router.get("/compliance", adminLimiter, validate(complianceReportQuery, "query"), controller.compliance);

module.exports = router;
