const { z } = require("zod");
const { success } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../middleware/errorHandler");
const notificationService = require("./notification.service");
const { enqueueRegistrationDiscountSms, DEFAULT_TEST_PHONE } = require("./promoSms.service");
const { queueAdminSms } = require("./adminSms.service");
const { processNotificationBatch } = require("./notification.service");
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

const promoSmsBody = z.object({
  audience: z.enum(["test", "club_with_phone"]),
  testPhone: z
    .string()
    .trim()
    .regex(/^09\d{9}$/)
    .optional()
    .default(DEFAULT_TEST_PHONE),
  message: z.string().trim().max(400).optional(),
  campaignKey: z.string().trim().max(64).optional(),
  /** Immediate provider send (test only). Club audience always queues. */
  sendNow: z.boolean().optional().default(true),
});

const adminSmsBody = z
  .object({
    message: z.string().trim().min(1).max(400),
    audience: z.enum(["user", "users", "clinic", "all", "class"]),
    phone: z.string().trim().regex(/^09\d{9}$/).optional(),
    userIds: z.array(objectId).min(1).max(300).optional(),
    classId: objectId.optional(),
  })
  .strict()
  .refine((body) => (body.audience === "class" ? Boolean(body.classId) : true), {
    message: "classId برای ارسال به یک کلاس لازم است",
    path: ["classId"],
  })
  .refine((body) => (body.audience === "users" ? Boolean(body.userIds?.length) : true), {
    message: "حداقل یک گیرنده انتخاب کنید",
    path: ["userIds"],
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

const sendPromoSms = asyncHandler(async (req, res) => {
  const result = await enqueueRegistrationDiscountSms({
    audience: req.body.audience,
    testPhone: req.body.testPhone,
    message: req.body.message,
    campaignKey: req.body.campaignKey,
    sendNow: req.body.audience === "test" ? req.body.sendNow !== false : false,
    actorId: req.user._id,
  });
  return success(res, result, 201);
});

const sendAdminSms = asyncHandler(async (req, res) => {
  const result = await queueAdminSms({
    audience: req.body.audience,
    phone: req.body.phone,
    userIds: req.body.userIds,
    classId: req.body.classId,
    message: req.body.message,
    actorId: req.user._id,
  });

  // Deliver a small batch of *this* message right away so a single SMS is not
  // waiting for a scheduler tick; the rest stays queued for the worker.
  const { notificationIds, ...rest } = result;
  let deliveredNow = 0;
  try {
    const processed = await processNotificationBatch({
      ids: notificationIds,
      limit: Math.min(result.queued, 10),
    });
    deliveredNow = processed?.sent || 0;
  } catch {
    // Queue stays intact; the scheduler retries.
  }

  return success(res, { ...rest, deliveredNow }, 201);
});

module.exports = {
  listQuery,
  idParams,
  promoSmsBody,
  adminSmsBody,
  sendAdminSms,
  listNotifications,
  getNotification,
  retryNotification,
  listJobs,
  runJobsNow,
  runExpireReservations,
  runExpirePayments,
  runProcessNotifications,
  sendPromoSms,
};
