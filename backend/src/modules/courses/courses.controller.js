const { success } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../middleware/errorHandler");
const coursesService = require("./courses.service");
const { checkAvailability } = require("../enrollments/enrollment.service");

const createTemplate = asyncHandler(async (req, res) => {
  const data = await coursesService.createCourseTemplate(req.body);
  return success(res, data, 201);
});

const updateTemplate = asyncHandler(async (req, res) => {
  const data = await coursesService.updateCourseTemplate(req.params.id, req.body);
  return success(res, data);
});

const getTemplate = asyncHandler(async (req, res) => {
  const data = await coursesService.getCourseTemplate(req.params.id);
  return success(res, data);
});

const listTemplates = asyncHandler(async (req, res) => {
  const data = await coursesService.listCourseTemplates({
    activeOnly: req.query.activeOnly === "true",
  });
  return success(res, { items: data });
});

const createInstructor = asyncHandler(async (req, res) => {
  const data = await coursesService.createInstructor(req.body);
  return success(res, data, 201);
});

const listInstructors = asyncHandler(async (_req, res) => {
  const data = await coursesService.listInstructors();
  return success(res, { items: data });
});

const createClass = asyncHandler(async (req, res) => {
  const data = await coursesService.createClass(req.body);
  return success(res, data, 201);
});

const updateClass = asyncHandler(async (req, res) => {
  const data = await coursesService.updateClass(req.params.id, req.body);
  return success(res, data);
});

const getClass = asyncHandler(async (req, res) => {
  const data = await coursesService.getClass(req.params.id);
  return success(res, data);
});

const listClasses = asyncHandler(async (req, res) => {
  const data = await coursesService.listClasses(req.query);
  return success(res, { items: data });
});

const publishClass = asyncHandler(async (req, res) => {
  const data = await coursesService.publishClass(req.params.id);
  return success(res, data);
});

const openRegistration = asyncHandler(async (req, res) => {
  const data = await coursesService.openRegistration(req.params.id);
  return success(res, data);
});

const closeRegistration = asyncHandler(async (req, res) => {
  const data = await coursesService.closeRegistration(req.params.id);
  return success(res, data);
});

const cancelClass = asyncHandler(async (req, res) => {
  const data = await coursesService.cancelClass(req.params.id);
  return success(res, data);
});

const generateSessions = asyncHandler(async (req, res) => {
  const data = await coursesService.generateSessionsForClass(req.params.id);
  return success(res, { items: data });
});

const listSessions = asyncHandler(async (req, res) => {
  const data = await coursesService.listSessions(req.params.id);
  return success(res, { items: data });
});

const getSchedule = asyncHandler(async (req, res) => {
  const data = await coursesService.getClassSchedule(req.params.id);
  return success(res, data);
});

const getCapacity = asyncHandler(async (req, res) => {
  const data = await checkAvailability(req.params.id);
  return success(res, data);
});

module.exports = {
  createTemplate,
  updateTemplate,
  getTemplate,
  listTemplates,
  createInstructor,
  listInstructors,
  createClass,
  updateClass,
  getClass,
  listClasses,
  publishClass,
  openRegistration,
  closeRegistration,
  cancelClass,
  generateSessions,
  listSessions,
  getSchedule,
  getCapacity,
};
