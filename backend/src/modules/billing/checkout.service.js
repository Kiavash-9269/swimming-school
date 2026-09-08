const { env } = require("../../config/env");
const { AppError } = require("../../utils/AppError");
const { logEvent, logError } = require("../../services/logging");
const {
  PAYMENT_STATUSES,
  ENROLLMENT_STATUSES,
  RESERVATION_STATUSES,
  WAITLIST_STATUSES,
} = require("../courses/domain.constants");
const { Payment } = require("./payment.model");
const { CourseClass } = require("../courses/courseClass.model");
const { Reservation } = require("../enrollments/reservation.model");
const { Enrollment } = require("../enrollments/enrollment.model");
const { WaitlistEntry } = require("../enrollments/waitlist.model");
const { validateAndQuoteDiscount, consumeDiscountUsage } = require("./discount.service");
const { assertNonNegativeMoney } = require("./money");
const { createPaymentProvider } = require("./providers/createPaymentProvider");

const paymentProvider = createPaymentProvider(env);

const OPEN_PAYMENT_STATUSES = [
  PAYMENT_STATUSES.CREATED,
  PAYMENT_STATUSES.INITIATED,
  PAYMENT_STATUSES.PENDING,
];

function toPublicPayment(doc) {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    participantId: doc.participantId ? String(doc.participantId) : null,
    enrollmentId: String(doc.enrollmentId),
    classId: doc.classId ? String(doc.classId) : null,
    reservationId: doc.reservationId ? String(doc.reservationId) : null,
    discountId: doc.discountId ? String(doc.discountId) : null,
    amount: doc.amount,
    currency: doc.currency,
    status: doc.status,
    provider: doc.provider,
    providerRef: doc.providerRef || null,
    authority: doc.authority || null,
    initiatedAt: doc.initiatedAt,
    verifiedAt: doc.verifiedAt,
    failedAt: doc.failedAt,
    expiredAt: doc.expiredAt,
    refundRequestedAt: doc.refundRequestedAt,
    refundedAt: doc.refundedAt,
    expiresAt: doc.expiresAt,
    failureCode: doc.failureCode || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function releaseHeldSeatForEnrollment(enrollment) {
  if (!enrollment?.reservationId) return false;
  const released = await Reservation.findOneAndUpdate(
    { _id: enrollment.reservationId, status: RESERVATION_STATUSES.HELD },
    { $set: { status: RESERVATION_STATUSES.RELEASED } },
    { returnDocument: "after" },
  );
  if (!released) return false;
  await CourseClass.updateOne(
    { _id: enrollment.classId, heldCount: { $gt: 0 } },
    { $inc: { heldCount: -1 } },
  );
  return true;
}

async function failPaymentAndRelease({ payment, enrollment, code, reason }) {
  const isCancel = code === "PAYMENT_CANCELLED";
  const targetStatus = isCancel ? PAYMENT_STATUSES.CANCELLED : PAYMENT_STATUSES.FAILED;
  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $in: OPEN_PAYMENT_STATUSES } },
    {
      $set: {
        status: targetStatus,
        failedAt: new Date(),
        failureCode: code || "PAYMENT_FAILED",
        failureReason: reason || "",
      },
    },
    { returnDocument: "after" },
  );

  if (claimed) {
    await Enrollment.updateOne(
      {
        _id: enrollment._id,
        status: { $in: [ENROLLMENT_STATUSES.PAYMENT_PENDING, ENROLLMENT_STATUSES.PENDING] },
      },
      { $set: { status: ENROLLMENT_STATUSES.PAYMENT_FAILED } },
    );
    await releaseHeldSeatForEnrollment(enrollment);
    logEvent(isCancel ? "PAYMENT_CANCELLED" : "PAYMENT_FAILED", {
      paymentId: String(payment._id),
      enrollmentId: String(enrollment._id),
      failureCode: code || "PAYMENT_FAILED",
    });
  }

  const freshEnrollment = await Enrollment.findById(enrollment._id);
  const freshPayment = await Payment.findById(payment._id);
  if (claimed) {
    try {
      const { onPaymentFinalized } = require("../notifications/dispatcher");
      await onPaymentFinalized(freshPayment, freshEnrollment);
    } catch {
      // notification must never affect payment failure path
    }
  }
  return { payment: freshPayment, enrollment: freshEnrollment };
}

/**
 * Finalize SUCCESS payment → ACTIVE enrollment. Claim-first for idempotency.
 * Uses ordered writes; Mongo multi-doc transactions are optional (standalone Mongo often lacks replica set).
 */
async function finalizeSuccessfulPayment(payment, { providerRef } = {}) {
  if (payment.status === PAYMENT_STATUSES.SUCCESS) {
    const enrollment = await Enrollment.findById(payment.enrollmentId);
    if (
      enrollment?.status === ENROLLMENT_STATUSES.ACTIVE ||
      enrollment?.status === ENROLLMENT_STATUSES.PENDING_COMPLIANCE
    ) {
      return { payment, enrollment, alreadyProcessed: true };
    }
    // Recovery: payment SUCCESS but enrollment not yet ACTIVE (crash mid-finalize).
    if (enrollment) {
      return completeEnrollmentActivation(payment, enrollment, { providerRef, recovery: true });
    }
    throw new AppError("ثبت‌نام یافت نشد", { statusCode: 404, code: "ENROLLMENT_NOT_FOUND" });
  }

  if (payment.status === PAYMENT_STATUSES.REFUNDED || payment.status === PAYMENT_STATUSES.REFUND_REQUESTED) {
    throw new AppError("پرداخت قابل تأیید نیست", { statusCode: 409, code: "PAYMENT_FAILED" });
  }

  const claimed = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $in: OPEN_PAYMENT_STATUSES } },
    {
      $set: {
        status: PAYMENT_STATUSES.SUCCESS,
        verifiedAt: new Date(),
        providerRef: providerRef || payment.providerRef,
        authority: providerRef || payment.authority || payment.providerRef,
      },
    },
    { returnDocument: "after" },
  );

  if (!claimed) {
    const again = await Payment.findById(payment._id);
    const enrollment = await Enrollment.findById(again.enrollmentId);
    if (again.status === PAYMENT_STATUSES.SUCCESS) {
      if (
        enrollment?.status === ENROLLMENT_STATUSES.ACTIVE ||
        enrollment?.status === ENROLLMENT_STATUSES.PENDING_COMPLIANCE
      ) {
        return { payment: again, enrollment, alreadyProcessed: true };
      }
      if (enrollment) {
        return completeEnrollmentActivation(again, enrollment, { providerRef, recovery: true });
      }
    }
    throw new AppError("وضعیت پرداخت قابل نهایی‌سازی نیست", {
      statusCode: 409,
      code: "PAYMENT_FAILED",
    });
  }

  const enrollment = await Enrollment.findById(claimed.enrollmentId);
  if (!enrollment) {
    throw new AppError("ثبت‌نام یافت نشد", { statusCode: 404, code: "ENROLLMENT_NOT_FOUND" });
  }

  if (enrollment.status === ENROLLMENT_STATUSES.ACTIVE || enrollment.status === ENROLLMENT_STATUSES.PENDING_COMPLIANCE) {
    return { payment: claimed, enrollment, alreadyProcessed: true };
  }

  return completeEnrollmentActivation(claimed, enrollment, { providerRef, recovery: false });
}

async function completeEnrollmentActivation(payment, enrollment, { recovery = false } = {}) {
  if (
    [
      ENROLLMENT_STATUSES.CANCELLED,
      ENROLLMENT_STATUSES.REFUNDED,
      ENROLLMENT_STATUSES.COMPLETED,
      ENROLLMENT_STATUSES.EXPIRED,
    ].includes(enrollment.status)
  ) {
    logEvent("PAYMENT_RECONCILIATION_REQUIRED", {
      paymentId: String(payment._id),
      enrollmentId: String(enrollment._id),
      reason: "ENROLLMENT_TERMINAL",
      enrollmentStatus: enrollment.status,
    });
    return { payment, enrollment, alreadyProcessed: false, reconciliationRequired: true };
  }

  const reservation = enrollment.reservationId
    ? await Reservation.findById(enrollment.reservationId)
    : null;

  if (reservation?.status === RESERVATION_STATUSES.HELD) {
    const confirmed = await Reservation.findOneAndUpdate(
      { _id: reservation._id, status: RESERVATION_STATUSES.HELD },
      { $set: { status: RESERVATION_STATUSES.CONFIRMED } },
      { returnDocument: "after" },
    );
    if (confirmed) {
      await CourseClass.updateOne(
        { _id: enrollment.classId, heldCount: { $gt: 0 } },
        { $inc: { heldCount: -1, confirmedCount: 1 } },
      );
    }
  } else if (reservation?.status === RESERVATION_STATUSES.CONFIRMED) {
    // already confirmed — do not double consume
  } else if (
    [ENROLLMENT_STATUSES.PAYMENT_PENDING, ENROLLMENT_STATUSES.PENDING].includes(enrollment.status)
  ) {
    const seat = await CourseClass.findOneAndUpdate(
      {
        _id: enrollment.classId,
        $expr: {
          $lt: [{ $add: ["$confirmedCount", "$heldCount"] }, "$capacity"],
        },
      },
      { $inc: { confirmedCount: 1 } },
      { returnDocument: "after" },
    );
    if (!seat) {
      await Payment.updateOne(
        { _id: payment._id },
        {
          $set: {
            status: PAYMENT_STATUSES.FAILED,
            failedAt: new Date(),
            failureCode: "CAPACITY_UNAVAILABLE",
            failureReason: "No capacity at finalization",
          },
        },
      );
      throw new AppError("ظرفیت در لحظه نهایی‌سازی موجود نبود", {
        statusCode: 409,
        code: "COURSE_FULL",
      });
    }
  }

  // Re-evaluate eligibility at activation — payment SUCCESS stays even if compliance fails.
  const { Participant } = require("../enrollments/participant.model");
  const { CourseTemplate } = require("../courses/courseTemplate.model");
  const {
    checkEligibility,
    toEligibilitySnapshot,
  } = require("../enrollments/eligibility.service");

  const participant = await Participant.findById(enrollment.participantId);
  const courseClass = await CourseClass.findById(enrollment.classId);
  const template = courseClass
    ? await CourseTemplate.findById(courseClass.courseTemplateId)
    : null;
  let targetStatus = ENROLLMENT_STATUSES.ACTIVE;
  let eligibilitySnapshot = enrollment.eligibilitySnapshot || null;
  if (participant && courseClass && template) {
    const eligibility = await checkEligibility(participant, courseClass, template);
    eligibilitySnapshot = toEligibilitySnapshot(eligibility);
    if (!eligibility.eligible) {
      targetStatus = ENROLLMENT_STATUSES.PENDING_COMPLIANCE;
    }
  }

  const activated = await Enrollment.findOneAndUpdate(
    {
      _id: enrollment._id,
      status: {
        $nin: [ENROLLMENT_STATUSES.ACTIVE, ENROLLMENT_STATUSES.CANCELLED, ENROLLMENT_STATUSES.REFUNDED],
      },
    },
    {
      $set: {
        status: targetStatus,
        confirmedAt: new Date(),
        paymentId: payment._id,
        eligibilitySnapshot,
      },
    },
    { returnDocument: "after" },
  );

  const finalEnrollment = activated || (await Enrollment.findById(enrollment._id));

  if (finalEnrollment.discountId) {
    const consumeClaim = await Payment.findOneAndUpdate(
      {
        _id: payment._id,
        "metadata.discountConsumed": { $ne: true },
      },
      { $set: { "metadata.discountConsumed": true } },
      { returnDocument: "after" },
    );
    if (consumeClaim) {
      const consumed = await consumeDiscountUsage(finalEnrollment.discountId);
      if (!consumed) {
        logEvent("DISCOUNT_CONSUME_SKIPPED", {
          discountId: String(finalEnrollment.discountId),
          paymentId: String(payment._id),
          reason: "limit_reached_or_inactive",
        });
      } else {
        logEvent("DISCOUNT_CONSUMED", {
          discountId: String(finalEnrollment.discountId),
          paymentId: String(payment._id),
          enrollmentId: String(finalEnrollment._id),
        });
      }
    }
  }

  await WaitlistEntry.updateMany(
    {
      classId: finalEnrollment.classId,
      participantId: finalEnrollment.participantId,
      status: { $in: [WAITLIST_STATUSES.WAITING, WAITLIST_STATUSES.OFFERED] },
    },
    { $set: { status: WAITLIST_STATUSES.ACCEPTED } },
  );

  if (!recovery) {
    logEvent("PAYMENT_SUCCESS", {
      paymentId: String(payment._id),
      enrollmentId: String(finalEnrollment._id),
      amount: payment.amount,
    });
  }
  logEvent(
    finalEnrollment.status === ENROLLMENT_STATUSES.PENDING_COMPLIANCE
      ? "ENROLLMENT_PENDING_COMPLIANCE"
      : "ENROLLMENT_ACTIVATED",
    {
      enrollmentId: String(finalEnrollment._id),
      classId: String(finalEnrollment.classId),
      via: recovery ? "payment_recovery" : "payment",
      status: finalEnrollment.status,
    },
  );

  const finalPayment = await Payment.findById(payment._id);
  try {
    const { onPaymentFinalized } = require("../notifications/dispatcher");
    await onPaymentFinalized(finalPayment, finalEnrollment);
  } catch {
    // ignore
  }

  return {
    payment: finalPayment,
    enrollment: finalEnrollment,
    alreadyProcessed: recovery,
  };
}

/**
 * Checkout: reservation → quote → enrollment PAYMENT_PENDING → payment INITIATED/PENDING
 * Amount is always server-calculated. Client amounts are ignored.
 */
async function initiateCheckout({
  userId,
  reservationId,
  discountCode,
  idempotencyKey,
  // intentionally ignore any client amount fields
}) {
  const { expireHeldReservations } = require("../enrollments/enrollment.service");
  await expireHeldReservations();

  if (idempotencyKey) {
    const existingEnrollment = await Enrollment.findOne({ idempotencyKey });
    if (existingEnrollment) {
      if (String(existingEnrollment.reservationId) !== String(reservationId)) {
        throw new AppError("کلید یکتایی با درخواست متفاوت استفاده شده است", {
          statusCode: 409,
          code: "IDEMPOTENCY_KEY_REUSE",
        });
      }

      const payment = existingEnrollment.paymentId
        ? await Payment.findById(existingEnrollment.paymentId)
        : await Payment.findOne({ enrollmentId: existingEnrollment._id });

      const storedDiscount = payment?.metadata?.checkoutFingerprint?.discountCode;
      const incomingDiscount = discountCode ? String(discountCode).trim().toUpperCase() : "";
      if (storedDiscount != null && String(storedDiscount) !== incomingDiscount) {
        throw new AppError("کلید یکتایی با درخواست متفاوت استفاده شده است", {
          statusCode: 409,
          code: "IDEMPOTENCY_KEY_REUSE",
        });
      }

      logEvent("CHECKOUT_IDEMPOTENCY_HIT", {
        enrollmentId: String(existingEnrollment._id),
        paymentId: payment ? String(payment._id) : null,
      });
      return {
        enrollment: existingEnrollment,
        payment,
        quote: {
          basePrice: existingEnrollment.basePrice ?? existingEnrollment.priceCharged,
          finalPrice: existingEnrollment.finalAmount ?? existingEnrollment.priceCharged,
          discountAmount: existingEnrollment.discountAmount ?? 0,
        },
        gateway: {
          requiresRedirect: payment?.amount > 0,
          redirectUrl: payment?.metadata?.redirectUrl || null,
          authority: payment?.authority || null,
          zeroAmount: payment?.amount === 0,
        },
        alreadyExists: true,
      };
    }

    const existingPayment = await Payment.findOne({ idempotencyKey: `pay_${idempotencyKey}` });
    if (existingPayment) {
      const fp = existingPayment.metadata?.checkoutFingerprint || {};
      if (fp.reservationId && String(fp.reservationId) !== String(reservationId)) {
        throw new AppError("کلید یکتایی با درخواست متفاوت استفاده شده است", {
          statusCode: 409,
          code: "IDEMPOTENCY_KEY_REUSE",
        });
      }
      const incomingDiscount = discountCode ? String(discountCode).trim().toUpperCase() : "";
      if (fp.discountCode != null && String(fp.discountCode) !== incomingDiscount) {
        throw new AppError("کلید یکتایی با درخواست متفاوت استفاده شده است", {
          statusCode: 409,
          code: "IDEMPOTENCY_KEY_REUSE",
        });
      }
      const enrollment = await Enrollment.findById(existingPayment.enrollmentId);
      return {
        enrollment,
        payment: existingPayment,
        quote: {
          basePrice: existingPayment.amount,
          finalPrice: existingPayment.amount,
          discountAmount: 0,
        },
        gateway: {
          requiresRedirect: existingPayment.amount > 0,
          redirectUrl: existingPayment.metadata?.redirectUrl || null,
          authority: existingPayment.authority || null,
          zeroAmount: existingPayment.amount === 0,
        },
        alreadyExists: true,
      };
    }
  }

  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    throw new AppError("رزرو یافت نشد", { statusCode: 404, code: "RESERVATION_NOT_FOUND" });
  }
  if (String(reservation.userId) !== String(userId)) {
    throw new AppError("دسترسی مجاز نیست", { statusCode: 403, code: "FORBIDDEN" });
  }
  if (reservation.status !== RESERVATION_STATUSES.HELD) {
    throw new AppError("رزرو معتبر نیست", { statusCode: 409, code: "RESERVATION_EXPIRED" });
  }
  if (reservation.expiresAt.getTime() <= Date.now()) {
    await expireHeldReservations(reservation.classId);
    throw new AppError("رزرو منقضی شده است", {
      statusCode: 409,
      code: "RESERVATION_EXPIRED",
    });
  }

  const courseClass = await CourseClass.findById(reservation.classId);
  if (!courseClass) {
    throw new AppError("کلاس یافت نشد", { statusCode: 404, code: "CLASS_NOT_FOUND" });
  }

  const { Participant } = require("../enrollments/participant.model");
  const { CourseTemplate } = require("../courses/courseTemplate.model");
  const {
    checkEligibility,
    toEligibilitySnapshot,
  } = require("../enrollments/eligibility.service");

  const participant = await Participant.findById(reservation.participantId);
  if (!participant || !participant.isActive) {
    throw new AppError("شرکت‌کننده یافت نشد", { statusCode: 404, code: "PARTICIPANT_NOT_FOUND" });
  }
  const template = await CourseTemplate.findById(courseClass.courseTemplateId);
  const eligibility = await checkEligibility(participant, courseClass, template);
  if (!eligibility.eligible) {
    throw new AppError("واجد شرایط ثبت‌نام نیست", {
      statusCode: 400,
      code: "NOT_ELIGIBLE",
      details: { reasons: eligibility.reasons },
    });
  }

  const quote = await validateAndQuoteDiscount({
    code: discountCode,
    userId,
    courseClass,
    price: courseClass.price,
  });
  const amount = assertNonNegativeMoney(quote.finalPrice);
  const basePrice = assertNonNegativeMoney(quote.basePrice ?? courseClass.price);
  const discountAmount = assertNonNegativeMoney(quote.discountAmount ?? 0);
  const eligibilitySnapshot = toEligibilitySnapshot(eligibility);

  let enrollment;
  try {
    enrollment = await Enrollment.create({
      userId,
      participantId: reservation.participantId,
      classId: reservation.classId,
      status: ENROLLMENT_STATUSES.PAYMENT_PENDING,
      reservationId: reservation._id,
      discountId: quote.discount?._id || null,
      priceCharged: amount,
      basePrice,
      discountAmount,
      finalAmount: amount,
      eligibilitySnapshot,
      reservedAt: reservation.createdAt,
      idempotencyKey: idempotencyKey || null,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError("ثبت‌نام تکراری", {
        statusCode: 409,
        code: "ENROLLMENT_ALREADY_EXISTS",
      });
    }
    throw error;
  }

  logEvent("CHECKOUT_CREATED", {
    enrollmentId: String(enrollment._id),
    classId: String(reservation.classId),
    userId: String(userId),
    amount,
  });

  const payment = await Payment.create({
    userId,
    participantId: reservation.participantId,
    enrollmentId: enrollment._id,
    classId: reservation.classId,
    reservationId: reservation._id,
    discountId: quote.discount?._id || null,
    amount,
    currency: "IRR",
    status: PAYMENT_STATUSES.CREATED,
    provider: env.PAYMENT_PROVIDER,
    idempotencyKey: `pay_${idempotencyKey || String(enrollment._id)}`,
    expiresAt: reservation.expiresAt,
    metadata: {
      checkoutFingerprint: {
        reservationId: String(reservationId),
        discountCode: discountCode ? String(discountCode).trim().toUpperCase() : "",
      },
    },
  });

  enrollment.paymentId = payment._id;
  await enrollment.save();

  const started = Date.now();
  let gateway;
  try {
    gateway = await paymentProvider.createPayment({
      amount,
      paymentId: payment._id,
      idempotencyKey: payment.idempotencyKey,
    });
  } catch (error) {
    logError("PAYMENT_INITIATION_FAILED", error, { paymentId: String(payment._id) });
    await failPaymentAndRelease({
      payment,
      enrollment,
      code: "GATEWAY_INIT_FAILED",
      reason: "provider_create_failed",
    });
    throw error;
  }

  const initiated = await Payment.findOneAndUpdate(
    { _id: payment._id, status: PAYMENT_STATUSES.CREATED },
    {
      $set: {
        status: amount === 0 ? PAYMENT_STATUSES.PENDING : PAYMENT_STATUSES.INITIATED,
        initiatedAt: new Date(),
        providerRef: gateway.providerRef || "",
        authority: gateway.authority || gateway.providerRef || "",
        "metadata.redirectUrl": gateway.redirectUrl || null,
        "metadata.requiresRedirect": Boolean(gateway.requiresRedirect),
        "metadata.initiationLatencyMs": Date.now() - started,
      },
    },
    { returnDocument: "after" },
  );

  logEvent("PAYMENT_INITIATED", {
    paymentId: String(payment._id),
    enrollmentId: String(enrollment._id),
    amount,
    zeroAmount: amount === 0,
    latencyMs: Date.now() - started,
  });

  // Zero-amount: no gateway; finalize immediately (idempotent).
  if (amount === 0) {
    const finalized = await finalizeSuccessfulPayment(initiated || payment, {
      providerRef: gateway.providerRef,
    });
    return {
      enrollment: finalized.enrollment,
      payment: finalized.payment,
      quote,
      gateway: {
        requiresRedirect: false,
        redirectUrl: null,
        authority: finalized.payment.authority,
        zeroAmount: true,
      },
      alreadyExists: false,
    };
  }

  return {
    enrollment,
    payment: initiated || payment,
    quote,
    gateway: {
      requiresRedirect: true,
      redirectUrl: gateway.redirectUrl,
      authority: gateway.authority || gateway.providerRef,
      zeroAmount: false,
    },
    alreadyExists: false,
  };
}

/**
 * Verify payment via provider then finalize. Never trust client success alone.
 */
async function verifyAndActivatePayment({
  paymentId,
  userId,
  isAdmin = false,
  authority,
  providerRef,
  reportedAmount,
  intentSuccess = true,
  callbackSecret,
}) {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new AppError("پرداخت یافت نشد", { statusCode: 404, code: "PAYMENT_REQUIRED" });
  }

  logEvent("PAYMENT_CALLBACK_RECEIVED", {
    paymentId: String(payment._id),
    status: payment.status,
    hasAuthority: Boolean(authority || providerRef),
    intentSuccess: Boolean(intentSuccess),
  });

  const secret = env.PAYMENT_CALLBACK_SECRET;
  const secretOk = secret && callbackSecret && callbackSecret === secret;
  if (!isAdmin && !secretOk && userId && String(payment.userId) !== String(userId)) {
    throw new AppError("دسترسی مجاز نیست", { statusCode: 403, code: "FORBIDDEN" });
  }

  if (payment.status === PAYMENT_STATUSES.SUCCESS) {
    const enrollment = await Enrollment.findById(payment.enrollmentId);
    if (
      enrollment?.status === ENROLLMENT_STATUSES.ACTIVE ||
      enrollment?.status === ENROLLMENT_STATUSES.PENDING_COMPLIANCE
    ) {
      return { payment, enrollment, alreadyProcessed: true };
    }
    if (enrollment) {
      return completeEnrollmentActivation(payment, enrollment, { recovery: true });
    }
    throw new AppError("ثبت‌نام یافت نشد", { statusCode: 404, code: "ENROLLMENT_NOT_FOUND" });
  }

  /** Late / terminal policy: local EXPIRED/FAILED/CANCELLED/REFUNDED wins — never flip to SUCCESS. */
  const terminalBlocked = [
    PAYMENT_STATUSES.EXPIRED,
    PAYMENT_STATUSES.FAILED,
    PAYMENT_STATUSES.CANCELLED,
    PAYMENT_STATUSES.REFUNDED,
    PAYMENT_STATUSES.REFUND_REQUESTED,
  ];
  if (terminalBlocked.includes(payment.status)) {
    logEvent("PAYMENT_RECONCILIATION_REQUIRED", {
      paymentId: String(payment._id),
      reason: "LATE_OR_TERMINAL_CALLBACK",
      status: payment.status,
    });
    throw new AppError("پرداخت در وضعیت نهایی است و قابل تأیید مجدد نیست", {
      statusCode: 409,
      code: "PAYMENT_TERMINAL",
      details: { status: payment.status, policy: "LOCAL_TERMINAL_WINS" },
    });
  }

  logEvent("PAYMENT_VERIFICATION_STARTED", {
    paymentId: String(payment._id),
  });

  const verifyStarted = Date.now();
  let verification;
  try {
    verification = await paymentProvider.verifyPayment({
      payment,
      authority: authority || providerRef,
      providerRef: providerRef || authority,
      reportedAmount,
      intentSuccess,
    });
  } catch (error) {
    logError("PAYMENT_VERIFICATION_FAILED", error, { paymentId: String(payment._id) });
    throw error;
  }

  logEvent("PAYMENT_VERIFICATION_ATTEMPTED", {
    paymentId: String(payment._id),
    ok: verification.ok,
    latencyMs: Date.now() - verifyStarted,
    code: verification.code || null,
  });

  const enrollment = await Enrollment.findById(payment.enrollmentId);
  if (!enrollment) {
    throw new AppError("ثبت‌نام یافت نشد", { statusCode: 404, code: "ENROLLMENT_NOT_FOUND" });
  }

  if (!verification.ok) {
    await failPaymentAndRelease({
      payment,
      enrollment,
      code: verification.code || "PAYMENT_FAILED",
      reason: verification.reason || "",
    });
    throw new AppError("پرداخت ناموفق بود", {
      statusCode: 402,
      code: "PAYMENT_FAILED",
      details: { reason: verification.code || verification.reason },
    });
  }

  if (Number(verification.amount) !== Number(payment.amount)) {
    logEvent("PAYMENT_AMOUNT_MISMATCH", {
      paymentId: String(payment._id),
      expected: payment.amount,
      // do not log unverified provider raw payloads
    });
    await failPaymentAndRelease({
      payment,
      enrollment,
      code: "AMOUNT_MISMATCH",
      reason: "verified_amount_mismatch",
    });
    throw new AppError("مبلغ پرداخت با انتظار سیستم مطابقت ندارد", {
      statusCode: 402,
      code: "PAYMENT_FAILED",
      details: { reason: "AMOUNT_MISMATCH" },
    });
  }

  if (payment.status === PAYMENT_STATUSES.INITIATED || payment.status === PAYMENT_STATUSES.CREATED) {
    await Payment.updateOne(
      { _id: payment._id, status: { $in: [PAYMENT_STATUSES.INITIATED, PAYMENT_STATUSES.CREATED] } },
      { $set: { status: PAYMENT_STATUSES.PENDING } },
    );
  }

  const fresh = await Payment.findById(payment._id);
  return finalizeSuccessfulPayment(fresh, {
    providerRef: verification.providerRef || providerRef || authority,
  });
}

async function expireOpenPayments() {
  const now = new Date();
  const expired = await Payment.find({
    status: { $in: OPEN_PAYMENT_STATUSES },
    expiresAt: { $lte: now },
  }).limit(100);

  for (const payment of expired) {
    const claimed = await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $in: OPEN_PAYMENT_STATUSES } },
      {
        $set: {
          status: PAYMENT_STATUSES.EXPIRED,
          expiredAt: now,
          failureCode: "PAYMENT_EXPIRED",
        },
      },
      { returnDocument: "after" },
    );
    if (!claimed) continue;

    const enrollment = await Enrollment.findById(payment.enrollmentId);
    if (enrollment) {
      await Enrollment.updateOne(
        {
          _id: enrollment._id,
          status: ENROLLMENT_STATUSES.PAYMENT_PENDING,
        },
        { $set: { status: ENROLLMENT_STATUSES.EXPIRED } },
      );
      await releaseHeldSeatForEnrollment(enrollment);
    }
    logEvent("PAYMENT_EXPIRED", {
      paymentId: String(payment._id),
      enrollmentId: String(payment.enrollmentId),
    });
    try {
      const { onPaymentFinalized } = require("../notifications/dispatcher");
      await onPaymentFinalized(claimed, enrollment);
    } catch {
      // ignore
    }
  }
}

async function getPaymentForUser({ paymentId, userId, isAdmin = false }) {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new AppError("پرداخت یافت نشد", { statusCode: 404, code: "PAYMENT_REQUIRED" });
  }
  if (!isAdmin && String(payment.userId) !== String(userId)) {
    throw new AppError("دسترسی مجاز نیست", { statusCode: 403, code: "FORBIDDEN" });
  }
  return toPublicPayment(payment);
}

async function listPaymentsAdmin({ status, userId, classId, limit = 50 } = {}) {
  const filter = {};
  if (status) filter.status = status;
  if (userId) filter.userId = userId;
  if (classId) filter.classId = classId;
  const rows = await Payment.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(200, Number(limit) || 50));
  return rows.map(toPublicPayment);
}

/**
 * Refund foundation — claim-first SUCCESS → REFUND_REQUESTED → REFUNDED.
 * Mock refunds immediately; Zarinpal remains deferred (leaves REFUND_REQUESTED).
 */
async function requestRefund({ paymentId, adminUserId }) {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new AppError("پرداخت یافت نشد", { statusCode: 404, code: "PAYMENT_REQUIRED" });
  }
  if (payment.status === PAYMENT_STATUSES.REFUNDED) {
    return { payment: toPublicPayment(payment), alreadyProcessed: true };
  }

  let claimed = null;
  if (payment.status === PAYMENT_STATUSES.SUCCESS) {
    claimed = await Payment.findOneAndUpdate(
      { _id: payment._id, status: PAYMENT_STATUSES.SUCCESS },
      {
        $set: {
          status: PAYMENT_STATUSES.REFUND_REQUESTED,
          refundRequestedAt: new Date(),
        },
      },
      { returnDocument: "after" },
    );
    if (!claimed) {
      const again = await Payment.findById(payment._id);
      if (again.status === PAYMENT_STATUSES.REFUNDED) {
        return { payment: toPublicPayment(again), alreadyProcessed: true };
      }
      if (again.status !== PAYMENT_STATUSES.REFUND_REQUESTED) {
        throw new AppError("فقط پرداخت موفق قابل استرداد است", {
          statusCode: 409,
          code: "PAYMENT_FAILED",
        });
      }
      claimed = again;
    } else {
      logEvent("REFUND_REQUESTED", {
        paymentId: String(payment._id),
        by: String(adminUserId),
      });
    }
  } else if (payment.status === PAYMENT_STATUSES.REFUND_REQUESTED) {
    claimed = payment;
  } else {
    throw new AppError("فقط پرداخت موفق قابل استرداد است", {
      statusCode: 409,
      code: "PAYMENT_FAILED",
    });
  }

  const result = await paymentProvider.refund({ payment: claimed });
  if (!result.ok) {
    logEvent("REFUND_FAILED", {
      paymentId: String(payment._id),
      reason: result.reason || "PROVIDER_REFUND_FAILED",
      deferred: Boolean(result.deferred),
    });
    throw new AppError("استرداد ناموفق بود", {
      statusCode: 502,
      code: "REFUND_FAILED",
      details: { reason: result.reason || null, deferred: Boolean(result.deferred) },
    });
  }

  const refunded = await Payment.findOneAndUpdate(
    { _id: payment._id, status: PAYMENT_STATUSES.REFUND_REQUESTED },
    {
      $set: {
        status: PAYMENT_STATUSES.REFUNDED,
        refundedAt: new Date(),
        "metadata.refundRef": result.refundRef,
      },
    },
    { returnDocument: "after" },
  );

  if (!refunded) {
    const again = await Payment.findById(payment._id);
    if (again?.status === PAYMENT_STATUSES.REFUNDED) {
      return { payment: toPublicPayment(again), alreadyProcessed: true };
    }
    throw new AppError("استرداد در وضعیت نامعتبر است", {
      statusCode: 409,
      code: "REFUND_FAILED",
    });
  }

  const seatHoldingEnrollment = await Enrollment.findOneAndUpdate(
    {
      _id: payment.enrollmentId,
      status: {
        $in: [ENROLLMENT_STATUSES.ACTIVE, ENROLLMENT_STATUSES.PENDING_COMPLIANCE],
      },
    },
    { $set: { status: ENROLLMENT_STATUSES.REFUNDED } },
  );

  if (seatHoldingEnrollment) {
    await CourseClass.updateOne(
      { _id: payment.classId, confirmedCount: { $gt: 0 } },
      { $inc: { confirmedCount: -1 } },
    );
  } else {
    // Enrollment already CANCELLED (seat released) or otherwise terminal — never double-decrement.
    await Enrollment.updateOne(
      {
        _id: payment.enrollmentId,
        status: ENROLLMENT_STATUSES.CANCELLED,
      },
      { $set: { status: ENROLLMENT_STATUSES.REFUNDED } },
    );
  }

  logEvent("REFUND_SUCCEEDED", {
    paymentId: String(payment._id),
    refundRef: result.refundRef,
  });

  try {
    const enrollment = await Enrollment.findById(payment.enrollmentId);
    const { onEnrollmentRefunded } = require("../notifications/dispatcher");
    await onEnrollmentRefunded(enrollment, refunded);
  } catch {
    // ignore
  }

  return { payment: toPublicPayment(refunded), alreadyProcessed: false };
}

/**
 * Detect-only reconciliation — never blindly mutates money states.
 * Policy: DETECT → RECORD findings → admin review.
 */
async function reconcilePayments({ limit = 50 } = {}) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 50));
  const now = Date.now();
  const staleMs = 60 * 60 * 1000; // 1 hour
  const findings = [];

  const staleOpen = await Payment.find({
    status: { $in: OPEN_PAYMENT_STATUSES },
    $or: [{ expiresAt: { $lte: new Date(now) } }, { createdAt: { $lte: new Date(now - staleMs) } }],
  })
    .sort({ createdAt: 1 })
    .limit(safeLimit)
    .select("_id status enrollmentId amount expiresAt createdAt")
    .lean();

  for (const p of staleOpen) {
    findings.push({
      type: "STALE_OPEN_PAYMENT",
      paymentId: String(p._id),
      status: p.status,
      enrollmentId: String(p.enrollmentId),
      severity: "medium",
    });
  }

  const successPayments = await Payment.find({ status: PAYMENT_STATUSES.SUCCESS })
    .sort({ updatedAt: -1 })
    .limit(safeLimit)
    .select("_id enrollmentId amount")
    .lean();

  for (const p of successPayments) {
    const enrollment = await Enrollment.findById(p.enrollmentId).select("status").lean();
    if (
      !enrollment ||
      ![
        ENROLLMENT_STATUSES.ACTIVE,
        ENROLLMENT_STATUSES.PENDING_COMPLIANCE,
        ENROLLMENT_STATUSES.COMPLETED,
        ENROLLMENT_STATUSES.REFUNDED,
      ].includes(enrollment.status)
    ) {
      findings.push({
        type: "SUCCESS_WITHOUT_FINAL_ENROLLMENT",
        paymentId: String(p._id),
        enrollmentId: String(p.enrollmentId),
        enrollmentStatus: enrollment?.status || null,
        severity: "high",
      });
    }
  }

  const stuckRefunds = await Payment.find({ status: PAYMENT_STATUSES.REFUND_REQUESTED })
    .sort({ refundRequestedAt: 1 })
    .limit(safeLimit)
    .select("_id enrollmentId refundRequestedAt")
    .lean();

  for (const p of stuckRefunds) {
    findings.push({
      type: "REFUND_REQUESTED_UNRESOLVED",
      paymentId: String(p._id),
      enrollmentId: String(p.enrollmentId),
      severity: "high",
    });
  }

  logEvent("PAYMENT_RECONCILIATION_SCAN", {
    findingCount: findings.length,
    limit: safeLimit,
  });

  return {
    scannedAt: new Date().toISOString(),
    findingCount: findings.length,
    findings: findings.slice(0, safeLimit),
    policy: "DETECT_ONLY_NO_AUTO_MUTATION",
  };
}

module.exports = {
  paymentProvider,
  toPublicPayment,
  releaseHeldSeatForEnrollment,
  failPaymentAndRelease,
  finalizeSuccessfulPayment,
  initiateCheckout,
  verifyAndActivatePayment,
  expireOpenPayments,
  getPaymentForUser,
  listPaymentsAdmin,
  requestRefund,
  reconcilePayments,
  OPEN_PAYMENT_STATUSES,
};
