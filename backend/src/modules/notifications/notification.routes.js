const express = require("express");
const { authenticate, authorize } = require("../../middleware/authenticate");
const { validate } = require("../../middleware/validate");
const { createLimiter } = require("../../middleware/rateLimit");
const controller = require("./notification.controller");

const router = express.Router();
const adminLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 120 });

router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(controller.listQuery, "query"),
  controller.listNotifications,
);

router.get("/jobs", authenticate, authorize("ADMIN"), adminLimiter, controller.listJobs);

router.post("/jobs/run", authenticate, authorize("ADMIN"), adminLimiter, controller.runJobsNow);
router.post(
  "/jobs/expire-reservations",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  controller.runExpireReservations,
);
router.post(
  "/jobs/expire-payments",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  controller.runExpirePayments,
);
router.post(
  "/jobs/process-notifications",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  controller.runProcessNotifications,
);

router.get("/:id", authenticate, authorize("ADMIN"), adminLimiter, controller.getNotification);
router.post("/:id/retry", authenticate, authorize("ADMIN"), adminLimiter, controller.retryNotification);

module.exports = router;
