const { logError, logEvent } = require("../../services/logging");
const { enqueueNotification } = require("./notification.service");
const { NOTIFICATION_TYPES, NOTIFICATION_CHANNELS } = require("./notification.constants");

/**
 * Central domain → notification dispatch.
 * Failures are logged and NEVER thrown to business callers (safeEnqueue).
 */
async function safeEnqueue(args) {
  try {
    return await enqueueNotification(args);
  } catch (error) {
    logError("NOTIFICATION_ENQUEUE_FAILED", error, {
      type: args?.type,
      idempotencyKey: args?.idempotencyKey,
      userId: args?.userId ? String(args.userId) : null,
    });
    return null;
  }
}

async function onPaymentFinalized(payment, enrollment) {
  if (!payment?.userId) return;
  const status = payment.status;
  if (status === "SUCCESS") {
    await safeEnqueue({
      userId: payment.userId,
      type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
      channel: NOTIFICATION_CHANNELS.SMS,
      idempotencyKey: `PAYMENT_SUCCESS:${payment._id}`,
      refs: {
        paymentId: payment._id,
        enrollmentId: enrollment?._id || payment.enrollmentId,
        classId: payment.classId,
        participantId: payment.participantId,
      },
    });
    if (enrollment?.status === "ACTIVE") {
      await safeEnqueue({
        userId: payment.userId,
        type: NOTIFICATION_TYPES.ENROLLMENT_CONFIRMED,
        channel: NOTIFICATION_CHANNELS.SMS,
        idempotencyKey: `ENROLLMENT_CONFIRMED:${enrollment._id}`,
        refs: {
          enrollmentId: enrollment._id,
          paymentId: payment._id,
          classId: enrollment.classId,
          participantId: enrollment.participantId,
        },
      });
    } else if (enrollment?.status === "PENDING_COMPLIANCE") {
      await safeEnqueue({
        userId: payment.userId,
        type: NOTIFICATION_TYPES.ENROLLMENT_PENDING_COMPLIANCE,
        channel: NOTIFICATION_CHANNELS.SMS,
        idempotencyKey: `ENROLLMENT_PENDING_COMPLIANCE:${enrollment._id}`,
        refs: {
          enrollmentId: enrollment._id,
          paymentId: payment._id,
          classId: enrollment.classId,
          participantId: enrollment.participantId,
        },
      });
    }
    return;
  }

  if (status === "FAILED") {
    await safeEnqueue({
      userId: payment.userId,
      type: NOTIFICATION_TYPES.PAYMENT_FAILED,
      channel: NOTIFICATION_CHANNELS.SMS,
      idempotencyKey: `PAYMENT_FAILED:${payment._id}`,
      refs: { paymentId: payment._id, enrollmentId: payment.enrollmentId },
    });
  }

  if (status === "EXPIRED") {
    await safeEnqueue({
      userId: payment.userId,
      type: NOTIFICATION_TYPES.PAYMENT_EXPIRED,
      channel: NOTIFICATION_CHANNELS.SMS,
      idempotencyKey: `PAYMENT_EXPIRED:${payment._id}`,
      refs: { paymentId: payment._id, enrollmentId: payment.enrollmentId },
    });
  }
}

async function onEnrollmentCancelled(enrollment) {
  if (!enrollment?.userId) return;
  await safeEnqueue({
    userId: enrollment.userId,
    type: NOTIFICATION_TYPES.ENROLLMENT_CANCELLED,
    channel: NOTIFICATION_CHANNELS.SMS,
    idempotencyKey: `ENROLLMENT_CANCELLED:${enrollment._id}`,
    refs: {
      enrollmentId: enrollment._id,
      classId: enrollment.classId,
      participantId: enrollment.participantId,
    },
  });
}

async function onEnrollmentRefunded(enrollment, payment) {
  if (!enrollment?.userId) return;
  await safeEnqueue({
    userId: enrollment.userId,
    type: NOTIFICATION_TYPES.ENROLLMENT_REFUNDED,
    channel: NOTIFICATION_CHANNELS.SMS,
    idempotencyKey: `ENROLLMENT_REFUNDED:${enrollment._id}`,
    refs: {
      enrollmentId: enrollment._id,
      paymentId: payment?._id,
      classId: enrollment.classId,
    },
  });
}

async function onDocumentReviewed({ kind, document, decision }) {
  const { Participant } = require("../enrollments/participant.model");
  const participant = await Participant.findById(document.participantId).select("ownerUserId");
  if (!participant?.ownerUserId) return;

  const type =
    decision === "APPROVED" ? NOTIFICATION_TYPES.DOCUMENT_APPROVED : NOTIFICATION_TYPES.DOCUMENT_REJECTED;

  await safeEnqueue({
    userId: participant.ownerUserId,
    type,
    channel: NOTIFICATION_CHANNELS.SMS,
    idempotencyKey: `${type}:${kind}:${document._id}:${decision}`,
    refs: {
      participantId: document.participantId,
      documentId: document._id,
    },
    templateVars: { rejectionHint: decision === "REJECTED" },
  });
}

async function onWaitlistPromoted({ waitlist }) {
  if (!waitlist?.userId) return;
  await safeEnqueue({
    userId: waitlist.userId,
    type: NOTIFICATION_TYPES.WAITLIST_AVAILABLE,
    channel: NOTIFICATION_CHANNELS.SMS,
    idempotencyKey: `WAITLIST_AVAILABLE:${waitlist._id}`,
    refs: {
      waitlistId: waitlist._id,
      classId: waitlist.classId,
      participantId: waitlist.participantId,
    },
  });
  logEvent("WAITLIST_NOTIFICATION_DISPATCHED", {
    waitlistId: String(waitlist._id),
    classId: String(waitlist.classId),
  });
}

module.exports = {
  safeEnqueue,
  onPaymentFinalized,
  onEnrollmentCancelled,
  onEnrollmentRefunded,
  onDocumentReviewed,
  onWaitlistPromoted,
  NOTIFICATION_TYPES,
};
