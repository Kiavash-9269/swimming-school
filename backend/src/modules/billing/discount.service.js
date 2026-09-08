const { AppError } = require("../../utils/AppError");
const { DISCOUNT_TYPES, DISCOUNT_SCOPES, ENROLLMENT_STATUSES } = require("../courses/domain.constants");
const { Discount } = require("./discount.model");
const { Enrollment } = require("../enrollments/enrollment.model");
const { applyDiscount, assertNonNegativeMoney } = require("./money");

function computeDiscountedAmount(price, discount) {
  if (discount.type === DISCOUNT_TYPES.PERCENTAGE && Number(discount.value) > 100) {
    throw new AppError("درصد تخفیف نامعتبر است", {
      statusCode: 400,
      code: "INVALID_DISCOUNT",
      details: { reason: "PERCENTAGE_GT_100" },
    });
  }
  return applyDiscount(price, discount);
}

async function validateAndQuoteDiscount({ code, userId, courseClass, price }) {
  const base = assertNonNegativeMoney(price);
  if (!code) {
    return { discount: null, finalPrice: base, discountAmount: 0, basePrice: base };
  }

  const discount = await Discount.findOne({ code: String(code).trim().toUpperCase() });
  if (!discount || !discount.isActive) {
    throw new AppError("کد تخفیف نامعتبر است", {
      statusCode: 400,
      code: "INVALID_DISCOUNT",
    });
  }

  const now = new Date();
  if (now < discount.startDate || now > discount.endDate) {
    throw new AppError("کد تخفیف منقضی شده است", {
      statusCode: 400,
      code: "DISCOUNT_EXPIRED",
    });
  }

  if (discount.minimumAmount > 0 && base < discount.minimumAmount) {
    throw new AppError("مبلغ خرید برای این تخفیف کافی نیست", {
      statusCode: 400,
      code: "INVALID_DISCOUNT",
      details: { reason: "MINIMUM_AMOUNT" },
    });
  }

  if (discount.scope === DISCOUNT_SCOPES.SPECIFIC_CLASS) {
    if (String(discount.classId) !== String(courseClass._id)) {
      throw new AppError("کد تخفیف برای این کلاس معتبر نیست", {
        statusCode: 400,
        code: "INVALID_DISCOUNT",
      });
    }
  }
  if (discount.scope === DISCOUNT_SCOPES.SPECIFIC_COURSE_TEMPLATE) {
    if (String(discount.courseTemplateId) !== String(courseClass.courseTemplateId)) {
      throw new AppError("کد تخفیف برای این دوره معتبر نیست", {
        statusCode: 400,
        code: "INVALID_DISCOUNT",
      });
    }
  }

  if (discount.usageLimit != null && discount.usedCount >= discount.usageLimit) {
    throw new AppError("سقف استفاده از کد تخفیف تکمیل شده است", {
      statusCode: 400,
      code: "DISCOUNT_USAGE_LIMIT_REACHED",
    });
  }

  const userUsage = await Enrollment.countDocuments({
    userId,
    discountId: discount._id,
    status: {
      $in: [
        ENROLLMENT_STATUSES.PAYMENT_PENDING,
        ENROLLMENT_STATUSES.PAID,
        ENROLLMENT_STATUSES.ACTIVE,
        ENROLLMENT_STATUSES.COMPLETED,
      ],
    },
  });
  if (userUsage >= discount.perUserLimit) {
    throw new AppError("سقف استفاده کاربر از این کد تکمیل شده است", {
      statusCode: 400,
      code: "DISCOUNT_USAGE_LIMIT_REACHED",
    });
  }

  const finalPrice = computeDiscountedAmount(base, discount);
  return {
    discount,
    finalPrice,
    discountAmount: Math.max(0, base - finalPrice),
    basePrice: base,
  };
}

async function consumeDiscountUsage(discountId) {
  if (!discountId) return true;
  const updated = await Discount.findOneAndUpdate(
    {
      _id: discountId,
      isActive: true,
      $or: [{ usageLimit: null }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }],
    },
    { $inc: { usedCount: 1 } },
    { returnDocument: "after" },
  );
  return Boolean(updated);
}

module.exports = {
  computeDiscountedAmount,
  validateAndQuoteDiscount,
  consumeDiscountUsage,
};
