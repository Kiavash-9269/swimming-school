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
  const data = await coursesService.getCourseTemplate(req.params.id, {
    isAdmin: req.user?.role === "ADMIN",
  });
  return success(res, data);
});

const listTemplates = asyncHandler(async (req, res) => {
  const isAdmin = req.user?.role === "ADMIN";
  const data = await coursesService.listCourseTemplates({
    activeOnly: isAdmin ? req.query.activeOnly === "true" : true,
  });
  return success(res, { items: data });
});

const createInstructor = asyncHandler(async (req, res) => {
  const data = await coursesService.createInstructor(req.body);
  return success(res, data, 201);
});

const updateInstructor = asyncHandler(async (req, res) => {
  const data = await coursesService.updateInstructor(req.params.id, req.body);
  return success(res, data);
});

const listInstructors = asyncHandler(async (req, res) => {
  const activeOnly = req.query.activeOnly === false ? false : true;
  const data = await coursesService.listInstructors({ activeOnly });
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
  const data = await coursesService.getClass(req.params.id, {
    isAdmin: req.user?.role === "ADMIN",
  });
  return success(res, data);
});

const listClasses = asyncHandler(async (req, res) => {
  const data = await coursesService.listClasses({
    ...req.query,
    isAdmin: req.user?.role === "ADMIN",
  });
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

const startClass = asyncHandler(async (req, res) => {
  const data = await coursesService.startClass(req.params.id);
  return success(res, data);
});

const completeClass = asyncHandler(async (req, res) => {
  const data = await coursesService.completeClass(req.params.id);
  return success(res, data);
});

const archiveClass = asyncHandler(async (req, res) => {
  const data = await coursesService.archiveClass(req.params.id);
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

const getMyInstructor = asyncHandler(async (req, res) => {
  const data = await coursesService.getMyInstructor(req.user._id);
  return success(res, data);
});

const listMyClasses = asyncHandler(async (req, res) => {
  const data = await coursesService.listMyClasses(req.user._id, { status: req.query.status });
  return success(res, { items: data });
});

module.exports = {
  createTemplate,
  updateTemplate,
  getTemplate,
  listTemplates,
  createInstructor,
  updateInstructor,
  listInstructors,
  getMyInstructor,
  listMyClasses,
  createClass,
  updateClass,
  getClass,
  listClasses,
  publishClass,
  openRegistration,
  closeRegistration,
  cancelClass,
  startClass,
  completeClass,
  archiveClass,
  generateSessions,
  listSessions,
  getSchedule,
  getCapacity,
};
