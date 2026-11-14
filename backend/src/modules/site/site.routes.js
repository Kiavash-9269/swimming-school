const express = require("express");
const { authenticate, authorize } = require("../../middleware/authenticate");
const { validate } = require("../../middleware/validate");
const { createLimiter } = require("../../middleware/rateLimit");
const controller = require("./site.controller");

const router = express.Router();
const adminLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 120 });

router.get("/public", controller.getPublicSettings);
router.get("/payment-qr.png", controller.getPaymentQr);

router.get("/admin", authenticate, authorize("ADMIN"), adminLimiter, controller.getAdminSettings);
router.put(
  "/admin/card-to-card",
  authenticate,
  authorize("ADMIN"),
  adminLimiter,
  validate(controller.cardToCardBody),
  controller.putCardToCard,
);
module.exports = router;
