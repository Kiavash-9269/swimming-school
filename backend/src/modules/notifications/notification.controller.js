const { z } = require("zod");
const { success } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../middleware/errorHandler");
const notificationService = require("./notification.service");
const { getSchedulerStatus } = require("../ops/scheduler");
const { listJobLocks } = require("../ops/schedulerLock.model");
const { runAllJobs, jobExpireReservations, jobExpirePayments, jobProcessNotifications } = require("../ops/jobs");
const {
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
} = require("./notification.constants");
const { objectId } = require("../courses/courses.validation");

const listQuery = z.object({
  status: z.enum(Object.values(NOTIFICATION_STATUSES)).optional(),
  type: z.enum(Object.values(NOTIFICATION_TYPES)).optional(),
  channel: z.enum(Object.values(NOTIFICATION_CHANNELS)).optional(),
  userId: objectId.optional(),
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const idParams = z.object({
  id: objectId,
});

const listNotifications = asyncHandler(async (req, res) => {
  const data = await notificationService.listNotificationsAdmin(req.query);
  return success(res, data);
});

const getNotification = asyncHandler(async (req, res) => {
  const data = await notificationService.getNotificationAdmin(req.params.id);
  return success(res, data);
});

const retryNotification = asyncHandler(async (req, res) => {
  const data = await notificationService.adminRetryNotification({
    notificationId: req.params.id,
    adminUserId: req.user._id,
  });
  return success(res, data);
});

const listJobs = asyncHandler(async (_req, res) => {
  const locks = await listJobLocks();
  return success(res, {
    scheduler: getSchedulerStatus(),
    jobs: locks,
  });
});

const runJobsNow = asyncHandler(async (_req, res) => {
  const results = await runAllJobs();
  return success(res, { results });
});

const runExpireReservations = asyncHandler(async (_req, res) => {
  const result = await jobExpireReservations();
  return success(res, result);
});

const runExpirePayments = asyncHandler(async (_req, res) => {
  const result = await jobExpirePayments();
  return success(res, result);
});

const runProcessNotifications = asyncHandler(async (_req, res) => {
  const result = await jobProcessNotifications();
  return success(res, result);
});

module.exports = {
  listQuery,
  idParams,
  listNotifications,
  getNotification,
  retryNotification,
  listJobs,
  runJobsNow,
  runExpireReservations,
  runExpirePayments,
  runProcessNotifications,
};
