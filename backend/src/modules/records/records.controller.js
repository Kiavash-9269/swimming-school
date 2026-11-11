const { z } = require("zod");
const { success } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../middleware/errorHandler");
const { objectId } = require("../courses/courses.validation");
const { STROKES } = require("./studentRecord.model");
const service = require("./records.service");

const strokeEnum = z.enum(Object.values(STROKES));

const createBody = z
  .object({
    participantId: objectId,
    stroke: strokeEnum,
    distance: z.coerce.number().int().min(1).max(10000),
    timeSeconds: z.coerce.number().min(0).max(86400),
    recordDate: z.coerce.date().optional(),
    location: z.string().trim().max(120).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

const updateBody = z
  .object({
    stroke: strokeEnum.optional(),
    distance: z.coerce.number().int().min(1).max(10000).optional(),
    timeSeconds: z.coerce.number().min(0).max(86400).optional(),
    recordDate: z.coerce.date().optional(),
    location: z.string().trim().max(120).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

const idParams = z.object({ id: objectId });

const listQuery = z.object({
  q: z.string().trim().max(80).optional(),
  stroke: strokeEnum.optional(),
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});

const searchQuery = z.object({
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const listMine = asyncHandler(async (req, res) => {
  const data = await service.listMyRecords({ userId: req.user._id });
  return success(res, data);
});

const listAdmin = asyncHandler(async (req, res) => {
  const data = await service.listRecordsAdmin(req.query);
  return success(res, data);
});

const searchParticipants = asyncHandler(async (req, res) => {
  const data = await service.searchParticipants(req.query);
  return success(res, data);
});

const create = asyncHandler(async (req, res) => {
  const data = await service.createRecord({ ...req.body, adminUserId: req.user._id });
  return success(res, data, 201);
});

const update = asyncHandler(async (req, res) => {
  const data = await service.updateRecord({ recordId: req.params.id, patch: req.body });
  return success(res, data);
});

const remove = asyncHandler(async (req, res) => {
  const data = await service.deleteRecord({ recordId: req.params.id });
  return success(res, data);
});

module.exports = {
  createBody,
  updateBody,
  idParams,
  listQuery,
  searchQuery,
  listMine,
  listAdmin,
  searchParticipants,
  create,
  update,
  remove,
};
