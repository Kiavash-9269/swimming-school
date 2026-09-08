const { z } = require("zod");
const { success } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../middleware/errorHandler");
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
  listAdminPayments,
  requestRefund,
  expirePayments,
  reconcilePayments,
  adminListQuery,
  reconcileQuery,
};
