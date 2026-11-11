const express = require("express");
const { authenticate, authorize } = require("../../middleware/authenticate");
const { validate } = require("../../middleware/validate");
const { createLimiter } = require("../../middleware/rateLimit");
const controller = require("./billing.controller");

const router = express.Router();
const adminLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 120 });
const refundLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 40 });
const callbackLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 300 });

/**
 * Provider/server callback — must stay BEFORE /:id routes.
 * No JWT; auth via x-payment-callback-secret only.
 */
router.post(
  "/callback",
  callbackLimiter,
  validate(controller.providerCallbackBody),
  controller.providerCallback,
);

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

router.post(
  "/card-to-card",
  authenticate,
  refundLimiter,
  validate(controller.cardToCardBody),
  controller.startCardToCard,
);

router.post(
  "/:id/confirm",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  controller.confirmCardToCard,
);

router.post(
  "/:id/reject",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(controller.rejectCardToCardBody),
  controller.rejectCardToCard,
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
