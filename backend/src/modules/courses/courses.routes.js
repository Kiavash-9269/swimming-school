const express = require("express");
const { authenticate, authorize } = require("../../middleware/authenticate");
const { validate } = require("../../middleware/validate");
const { createLimiter } = require("../../middleware/rateLimit");
const controller = require("./courses.controller");
const {
  courseTemplateBody,
  courseTemplateUpdate,
  instructorBody,
  classBody,
  classUpdate,
  listClassesQuery,
} = require("./courses.validation");

const router = express.Router();
const adminWriteLimiter = createLimiter({ windowMs: 15 * 60 * 1000, max: 120 });

router.get("/templates", controller.listTemplates);
router.get("/templates/:id", controller.getTemplate);
router.post(
  "/templates",
  authenticate,
  authorize("ADMIN"),
  adminWriteLimiter,
  validate(courseTemplateBody),
  controller.createTemplate,
);
router.patch(
  "/templates/:id",
  authenticate,
  authorize("ADMIN"),
  adminWriteLimiter,
  validate(courseTemplateUpdate),
  controller.updateTemplate,
);

router.get("/instructors", authenticate, authorize("ADMIN"), controller.listInstructors);
router.post(
  "/instructors",
  authenticate,
  authorize("ADMIN"),
  adminWriteLimiter,
  validate(instructorBody),
  controller.createInstructor,
);

router.get("/classes", validate(listClassesQuery, "query"), controller.listClasses);
router.get("/classes/:id", controller.getClass);
router.get("/classes/:id/capacity", controller.getCapacity);
router.get("/classes/:id/schedule", controller.getSchedule);
router.get("/classes/:id/sessions", controller.listSessions);

router.post(
  "/classes",
  authenticate,
  authorize("ADMIN"),
  adminWriteLimiter,
  validate(classBody),
  controller.createClass,
);
router.patch(
  "/classes/:id",
  authenticate,
  authorize("ADMIN"),
  adminWriteLimiter,
  validate(classUpdate),
  controller.updateClass,
);
router.post(
  "/classes/:id/publish",
  authenticate,
  authorize("ADMIN"),
  adminWriteLimiter,
  controller.publishClass,
);
router.post(
  "/classes/:id/open-registration",
  authenticate,
  authorize("ADMIN"),
  adminWriteLimiter,
  controller.openRegistration,
);
router.post(
  "/classes/:id/close-registration",
  authenticate,
  authorize("ADMIN"),
  adminWriteLimiter,
  controller.closeRegistration,
);
router.post(
  "/classes/:id/cancel",
  authenticate,
  authorize("ADMIN"),
  adminWriteLimiter,
  controller.cancelClass,
);
router.post(
  "/classes/:id/generate-sessions",
  authenticate,
  authorize("ADMIN"),
  adminWriteLimiter,
  controller.generateSessions,
);

module.exports = router;
