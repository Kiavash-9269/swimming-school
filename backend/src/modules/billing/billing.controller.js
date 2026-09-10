const { z } = require("zod");
const { success } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../middleware/errorHandler");
const { AppError } = require("../../utils/AppError");
const { objectId } = require("../courses/courses.validation");
const checkout = require("./checkout.service");
const { PAYMENT_STATUSES } = require("../courses/domain.constants");

const getPayment = asyncHandler(async (req, res) => {
  const data = await checkout.getPaymentForUser({
    paymentId: req.params.id,
    userId: req.user._id,
    isAdmin: req.user.role === "ADMIN",
  });
  return success(res, data);
});

const providerCallbackBody = z
  .object({
    paymentId: objectId,
    success: z.boolean().optional().default(true),
    providerRef: z.string().trim().max(120).optional(),
    authority: z.string().trim().max(120).optional(),
  })
  .strict();

/**
 * Server-to-server / provider callback — NO user JWT.
 * Requires x-payment-callback-secret matching PAYMENT_CALLBACK_SECRET.
 * Still verifies with provider; never trusts success alone.
 */
const providerCallback = asyncHandler(async (req, res) => {
  if (req.body.amount != null || req.body.finalAmount != null || req.body.price != null) {
    throw new AppError("مبلغ توسط سرور محاسبه می‌شود", {
      statusCode: 400,
      code: "VALIDATION_ERROR",
    });
  }

  const result = await checkout.verifyAndActivatePayment({
    paymentId: req.body.paymentId,
    providerRef: req.body.providerRef || req.body.authority,
    authority: req.body.authority || req.body.providerRef,
    intentSuccess: req.body.success !== false,
    reportedAmount: undefined,
    userId: null,
    isAdmin: false,
    callbackSecret: req.headers["x-payment-callback-secret"],
  });

  return success(res, {
    alreadyProcessed: Boolean(result.alreadyProcessed),
    payment: {
      id: String(result.payment._id || result.payment.id),
      status: result.payment.status,
      amount: result.payment.amount,
    },
    enrollment: result.enrollment
      ? {
          id: String(result.enrollment._id || result.enrollment.id),
          status: result.enrollment.status,
        }
      : null,
  });
});

const listAdminPayments = asyncHandler(async (req, res) => {
  const data = await checkout.listPaymentsAdmin({
    status: req.query.status,
    userId: req.query.userId,
    classId: req.query.classId,
    limit: req.query.limit,
  });
  return success(res, { items: data });
});

const requestRefund = asyncHandler(async (req, res) => {
  const result = await checkout.requestRefund({
    paymentId: req.params.id,
    adminUserId: req.user._id,
  });
  return success(res, result);
});

const expirePayments = asyncHandler(async (_req, res) => {
  await checkout.expireOpenPayments();
  return success(res, { ok: true });
});

const reconcilePayments = asyncHandler(async (req, res) => {
  const data = await checkout.reconcilePayments({
    limit: req.query.limit,
  });
  return success(res, data);
});

const adminListQuery = z.object({
  status: z
    .enum([
      PAYMENT_STATUSES.CREATED,
      PAYMENT_STATUSES.INITIATED,
      PAYMENT_STATUSES.PENDING,
      PAYMENT_STATUSES.SUCCESS,
      PAYMENT_STATUSES.FAILED,
      PAYMENT_STATUSES.CANCELLED,
      PAYMENT_STATUSES.EXPIRED,
      PAYMENT_STATUSES.REFUNDED,
      PAYMENT_STATUSES.REFUND_REQUESTED,
    ])
    .optional(),
  userId: objectId.optional(),
  classId: objectId.optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

const reconcileQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

module.exports = {
  getPayment,
  providerCallback,
  providerCallbackBody,
  listAdminPayments,
  requestRefund,
  expirePayments,
  reconcilePayments,
  adminListQuery,
  reconcileQuery,
};
