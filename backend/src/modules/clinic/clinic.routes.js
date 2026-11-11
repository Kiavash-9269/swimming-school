const express = require("express");
const { authenticate, authorize } = require("../../middleware/authenticate");
const { validate } = require("../../middleware/validate");
const { createLimiter } = require("../../middleware/rateLimit");
const controller = require("./clinic.controller");

const router = express.Router();
const registerLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 30 });
const adminLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 180 });

router.get("/", controller.getPublic);

router.post(
  "/register",
  authenticate,
  registerLimiter,
  validate(controller.registerBody),
  controller.register,
);
router.get("/me", authenticate, controller.listMine);
router.post(
  "/me/:id/paid",
  authenticate,
  registerLimiter,
  validate(controller.idParams, "params"),
  validate(controller.reportPaidBody),
  controller.reportPaid,
);

router.get(
  "/admin",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(controller.adminListQuery, "query"),
  controller.listAdmin,
);
router.patch(
  "/admin/:id",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(controller.idParams, "params"),
  validate(controller.adminUpdateBody),
  controller.updateRegistration,
);

module.exports = router;
