const express = require("express");
const { authenticate, authorize } = require("../../middleware/authenticate");
const { validate } = require("../../middleware/validate");
const { createLimiter } = require("../../middleware/rateLimit");
const controller = require("./catalog.controller");
const { replaceRecordsBody, syncCatalogBody } = require("./catalog.validation");

const router = express.Router();
const adminWriteLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 60 });

router.get("/marketing", controller.getMarketing);
router.get("/records", controller.getRecords);

router.get("/sync/status", authenticate, authorize("ADMIN"), controller.getSyncStatus);
router.post(
  "/sync",
  authenticate,
  authorize("ADMIN"),
  adminWriteLimiter,
  validate(syncCatalogBody),
  controller.postSync,
);

router.put(
  "/records",
  authenticate,
  authorize("ADMIN"),
  adminWriteLimiter,
  validate(replaceRecordsBody),
  controller.putRecords,
);
router.post(
  "/records/reset",
  authenticate,
  authorize("ADMIN"),
  adminWriteLimiter,
  controller.resetRecords,
);

module.exports = router;
