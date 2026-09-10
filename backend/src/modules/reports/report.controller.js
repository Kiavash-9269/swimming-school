const { success } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../middleware/errorHandler");
const reportService = require("./report.service");

function sendWorkbook(res, { buffer, filename }) {
  const safeName = String(filename || "report.xlsx");
  // HTTP headers must stay ASCII; expose Persian name via RFC 5987 filename*.
  const asciiFallback = safeName.replace(/[^\x20-\x7E]+/g, "_") || "report.xlsx";
  const encoded = encodeURIComponent(safeName).replace(/['()]/g, escape);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`,
  );
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(buffer);
}

const dashboard = asyncHandler(async (req, res) => {
  const data = await reportService.reportDashboard({ adminUserId: req.user._id });
  return success(res, data);
});

const participants = asyncHandler(async (req, res) => {
  const data = await reportService.reportParticipants(req.query, { adminUserId: req.user._id });
  return success(res, data);
});

const enrollments = asyncHandler(async (req, res) => {
  const data = await reportService.reportEnrollments(req.query, { adminUserId: req.user._id });
  return success(res, data);
});

const payments = asyncHandler(async (req, res) => {
  const data = await reportService.reportPayments(req.query, { adminUserId: req.user._id });
  return success(res, data);
});

const classes = asyncHandler(async (req, res) => {
  const data = await reportService.reportClasses(req.query, { adminUserId: req.user._id });
  return success(res, data);
});

const attendance = asyncHandler(async (req, res) => {
  const data = await reportService.reportAttendance(req.query, { adminUserId: req.user._id });
  return success(res, data);
});

const waitlist = asyncHandler(async (req, res) => {
  const data = await reportService.reportWaitlist(req.query, { adminUserId: req.user._id });
  return success(res, data);
});

const discounts = asyncHandler(async (req, res) => {
  const data = await reportService.reportDiscounts(req.query, { adminUserId: req.user._id });
  return success(res, data);
});

const compliance = asyncHandler(async (req, res) => {
  const data = await reportService.reportCompliance(req.query, { adminUserId: req.user._id });
  return success(res, data);
});

const exportParticipants = asyncHandler(async (req, res) => {
  const out = await reportService.exportReport("participants", req.query, {
    adminUserId: req.user._id,
  });
  return sendWorkbook(res, out);
});

const exportEnrollments = asyncHandler(async (req, res) => {
  const out = await reportService.exportReport("enrollments", req.query, {
    adminUserId: req.user._id,
  });
  return sendWorkbook(res, out);
});

const exportPayments = asyncHandler(async (req, res) => {
  const out = await reportService.exportReport("payments", req.query, {
    adminUserId: req.user._id,
  });
  return sendWorkbook(res, out);
});

const exportAttendance = asyncHandler(async (req, res) => {
  const out = await reportService.exportReport("attendance", req.query, {
    adminUserId: req.user._id,
  });
  return sendWorkbook(res, out);
});

const exportClasses = asyncHandler(async (req, res) => {
  const out = await reportService.exportReport("classes", req.query, {
    adminUserId: req.user._id,
  });
  return sendWorkbook(res, out);
});

const exportWaitlist = asyncHandler(async (req, res) => {
  const out = await reportService.exportReport("waitlist", req.query, {
    adminUserId: req.user._id,
  });
  return sendWorkbook(res, out);
});

module.exports = {
  dashboard,
  participants,
  enrollments,
  payments,
  classes,
  attendance,
  waitlist,
  discounts,
  compliance,
  exportParticipants,
  exportEnrollments,
  exportPayments,
  exportAttendance,
  exportClasses,
  exportWaitlist,
};
