const express = require("express");
const { authenticate, authorize } = require("../../middleware/authenticate");
const { validate } = require("../../middleware/validate");
const { createLimiter } = require("../../middleware/rateLimit");
const controller = require("./records.controller");

const router = express.Router();
const adminLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 180 });

router.get("/me", authenticate, controller.listMine);

router.get(
  "/admin/participants",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(controller.searchQuery, "query"),
  controller.searchParticipants,
);
router.get(
  "/admin",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(controller.listQuery, "query"),
  controller.listAdmin,
);
router.post(
  "/admin",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(controller.createBody),
  controller.create,
);
router.patch(
  "/admin/:id",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(controller.idParams, "params"),
  validate(controller.updateBody),
  controller.update,
);
router.delete(
  "/admin/:id",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(controller.idParams, "params"),
  controller.remove,
);

module.exports = router;
