const express = require("express");
const { authenticate, authorize } = require("../../middleware/authenticate");
const { validate } = require("../../middleware/validate");
const { createLimiter } = require("../../middleware/rateLimit");
const controller = require("./billing.controller");

const router = express.Router();
const adminLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 120 });
const refundLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 40 });

router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(controller.adminListQuery, "query"),
  controller.listAdminPayments,
);

router.post(
  "/jobs/expire",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  controller.expirePayments,
);

router.get(
  "/jobs/reconcile",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(controller.reconcileQuery, "query"),
  controller.reconcilePayments,
);

router.get("/:id", authenticate, controller.getPayment);

router.post(
  "/:id/refund",
  authenticate,
  authorize("ADMIN"),
  refundLimiter,
  controller.requestRefund,
);

module.exports = router;
