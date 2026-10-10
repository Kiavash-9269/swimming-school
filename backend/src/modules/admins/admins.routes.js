const express = require("express");
const { z } = require("zod");
const { authenticate, authorize } = require("../../middleware/authenticate");
const { validate } = require("../../middleware/validate");
const { createLimiter } = require("../../middleware/rateLimit");
const { asyncHandler } = require("../../middleware/errorHandler");
const { success } = require("../../utils/apiResponse");
const { phoneSchema, nameSchema } = require("../auth/auth.validation");
const { requireSuperAdmin } = require("./superAdmin");
const adminsService = require("./admins.service");

const optionalName = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  nameSchema.optional(),
);

const addAdminBody = z.object({
  phone: phoneSchema,
  firstName: optionalName,
  lastName: optionalName,
});

const router = express.Router();
const limiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 60 });

router.use(authenticate, authorize("ADMIN"), requireSuperAdmin, limiter);

router.get(
  "/",
  asyncHandler(async (_req, res) => success(res, { items: await adminsService.listAdmins() })),
);

router.post(
  "/",
  validate(addAdminBody),
  asyncHandler(async (req, res) => {
    const data = await adminsService.addAdmin(req.body);
    return success(res, data, data.created ? 201 : 200);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => success(res, await adminsService.revokeAdmin(req.params.id))),
);

module.exports = router;
