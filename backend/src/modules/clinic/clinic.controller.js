const { z } = require("zod");
const { success } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../middleware/errorHandler");
const { objectId } = require("../courses/courses.validation");
const { GENDERS } = require("../courses/domain.constants");
const { CLINIC_STATUSES, CLINIC_PAYMENT_STATUSES } = require("./clinicRegistration.model");
const service = require("./clinic.service");

const clinicFieldsSchema = {
  title: z.string().trim().min(1).max(120),
  subtitle: z.string().trim().max(160),
  description: z.string().trim().max(1500),
  priceToman: z.coerce.number().int().min(0).max(500000000),
  startDate: z.string().trim().max(60),
  endDate: z.string().trim().max(60),
  schedule: z.string().trim().max(200),
  location: z.string().trim().max(200),
  capacity: z.coerce.number().int().min(0).max(10000),
  phone: z.string().trim().max(20),
  notice: z.string().trim().max(600),
  enabled: z.boolean(),
};

const optionalClinicFields = Object.fromEntries(
  Object.entries(clinicFieldsSchema).map(([key, schema]) => [key, schema.optional()]),
);

/** Create: only the title is required; everything else falls back to defaults. */
const clinicCreateBody = z
  .object({ ...optionalClinicFields, title: clinicFieldsSchema.title })
  .strict();

const clinicUpdateBody = z.object(optionalClinicFields).strict();

const registerBody = z
  .object({
    clinicId: objectId,
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
  clinicId: objectId.optional(),
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

const listAdminClinics = asyncHandler(async (_req, res) => {
  const items = await service.listClinics();
  return success(res, { items });
});

const createClinic = asyncHandler(async (req, res) => {
  const clinic = await service.createClinic({ body: req.body, actorId: req.user._id });
  return success(res, { clinic }, 201);
});

const updateClinic = asyncHandler(async (req, res) => {
  const clinic = await service.updateClinic({ clinicId: req.params.id, patch: req.body });
  return success(res, { clinic });
});

const deleteClinic = asyncHandler(async (req, res) => {
  const result = await service.deleteClinic({ clinicId: req.params.id });
  return success(res, result);
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
  clinicCreateBody,
  clinicUpdateBody,
  listAdminClinics,
  createClinic,
  updateClinic,
  deleteClinic,
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
