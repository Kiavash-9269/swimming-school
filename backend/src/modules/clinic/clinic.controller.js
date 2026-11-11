const { z } = require("zod");
const { success } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../middleware/errorHandler");
const { objectId } = require("../courses/courses.validation");
const { GENDERS } = require("../courses/domain.constants");
const { CLINIC_STATUSES, CLINIC_PAYMENT_STATUSES } = require("./clinicRegistration.model");
const service = require("./clinic.service");

const registerBody = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    phone: z.string().trim().regex(/^09\d{9}$/),
    birthDate: z.coerce.date(),
    gender: z.enum(Object.values(GENDERS)).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

const reportPaidBody = z
  .object({
    trackingCode: z.string().trim().max(60).optional(),
    note: z.string().trim().max(300).optional(),
  })
  .strict();

const idParams = z.object({ id: objectId });

const adminListQuery = z.object({
  status: z.enum(Object.values(CLINIC_STATUSES)).optional(),
  paymentStatus: z.enum(Object.values(CLINIC_PAYMENT_STATUSES)).optional(),
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

const adminUpdateBody = z
  .object({
    status: z.enum(Object.values(CLINIC_STATUSES)).optional(),
    paymentStatus: z.enum(Object.values(CLINIC_PAYMENT_STATUSES)).optional(),
    adminNote: z.string().trim().max(500).optional(),
  })
  .strict();

const getPublic = asyncHandler(async (_req, res) => {
  const data = await service.getPublicInfo();
  return success(res, data);
});

const register = asyncHandler(async (req, res) => {
  const data = await service.register({ ...req.body, userId: req.user._id });
  return success(res, data, 201);
});

const listMine = asyncHandler(async (req, res) => {
  const data = await service.listMine({ userId: req.user._id });
  return success(res, data);
});

const reportPaid = asyncHandler(async (req, res) => {
  const data = await service.reportPaid({
    registrationId: req.params.id,
    userId: req.user._id,
    trackingCode: req.body.trackingCode,
    note: req.body.note,
  });
  return success(res, data);
});

const listAdmin = asyncHandler(async (req, res) => {
  const data = await service.listAdmin(req.query);
  return success(res, data);
});

const updateRegistration = asyncHandler(async (req, res) => {
  const data = await service.updateRegistration({
    registrationId: req.params.id,
    patch: req.body,
    adminUserId: req.user._id,
  });
  return success(res, data);
});

module.exports = {
  registerBody,
  reportPaidBody,
  idParams,
  adminListQuery,
  adminUpdateBody,
  getPublic,
  register,
  listMine,
  reportPaid,
  listAdmin,
  updateRegistration,
};
