const { AppError } = require("../../utils/AppError");
const { logEvent } = require("../../services/logging");
const { User } = require("../auth/user.model");
const { Participant } = require("./participant.model");
const { Enrollment } = require("./enrollment.model");
const { Payment } = require("../billing/payment.model");
const { InsuranceRecord } = require("../compliance/insurance.model");
const { MedicalDocument } = require("../compliance/medical.model");
const { AttendanceRecord } = require("./attendance.model");
const { Discount } = require("../billing/discount.model");
const { toPublicParticipant } = require("./participant.service");
const { toPublicInsurance, toPublicMedicalDocument } = require("../compliance/compliance.service");

function toPublicEnrollment(doc) {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    participantId: String(doc.participantId),
    classId: String(doc.classId),
    status: doc.status,
    paymentId: doc.paymentId ? String(doc.paymentId) : null,
    discountId: doc.discountId ? String(doc.discountId) : null,
    reservationId: doc.reservationId ? String(doc.reservationId) : null,
    priceCharged: doc.priceCharged,
    basePrice: doc.basePrice ?? doc.priceCharged,
    discountAmount: doc.discountAmount ?? 0,
    finalAmount: doc.finalAmount ?? doc.priceCharged,
    eligibilitySnapshot: doc.eligibilitySnapshot
      ? {
          eligible: doc.eligibilitySnapshot.eligible,
          reasons: doc.eligibilitySnapshot.reasons || [],
          age: doc.eligibilitySnapshot.age,
          evaluatedAt: doc.eligibilitySnapshot.evaluatedAt,
          ruleVersion: doc.eligibilitySnapshot.ruleVersion,
        }
      : null,
    reservedAt: doc.reservedAt,
    confirmedAt: doc.confirmedAt,
    cancelledAt: doc.cancelledAt,
    completedAt: doc.completedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Bounded User 360 aggregation — no arbitrary Mongo queries from client.
 */
async function buildUser360({ targetUserId, actorRole, actorId, includeSensitive = false }) {
  const user = await User.findById(targetUserId).select(
    "phone firstName lastName role phoneVerified isActive createdAt updatedAt",
  );
  if (!user) {
    throw new AppError("کاربر یافت نشد", { statusCode: 404, code: "USER_NOT_FOUND" });
  }

  const participants = await Participant.find({ ownerUserId: targetUserId })
    .sort({ createdAt: -1 })
    .limit(100);
  const participantIds = participants.map((p) => p._id);

  const [enrollments, payments, insurance, medical, attendance, discountIds] = await Promise.all([
    Enrollment.find({ userId: targetUserId }).sort({ createdAt: -1 }).limit(100),
    Payment.find({ userId: targetUserId })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("-metadata -failureReason"),
    InsuranceRecord.find({ participantId: { $in: participantIds } })
      .sort({ updatedAt: -1 })
      .limit(50),
    MedicalDocument.find({ participantId: { $in: participantIds } })
      .sort({ updatedAt: -1 })
      .limit(50),
    AttendanceRecord.find({ participantId: { $in: participantIds } })
      .sort({ updatedAt: -1 })
      .limit(100)
      .select("classId sessionId participantId status markedAt"),
    Enrollment.find({ userId: targetUserId, discountId: { $ne: null } })
      .distinct("discountId"),
  ]);

  const discounts = await Discount.find({ _id: { $in: discountIds } })
    .select("code type value isActive")
    .limit(50);

  if (actorRole === "ADMIN") {
    logEvent("ADMIN_USER_360_ACCESS", {
      targetUserId: String(targetUserId),
      actorId: String(actorId),
    });
  }

  const payload = {
    userId: String(targetUserId),
    account: {
      id: String(user._id),
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phoneVerified: user.phoneVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
    participants: participants.map((p) =>
      toPublicParticipant(p, {
        includeEmergency: includeSensitive || actorRole === "ADMIN",
        includeAge: true,
      }),
    ),
    enrollments: {
      active: enrollments
        .filter((e) => ["ACTIVE", "PAYMENT_PENDING", "PENDING_COMPLIANCE", "PAID"].includes(e.status))
        .map(toPublicEnrollment),
      historical: enrollments
        .filter((e) => ["COMPLETED", "CANCELLED", "REFUNDED", "EXPIRED", "PAYMENT_FAILED"].includes(e.status))
        .map(toPublicEnrollment),
      all: enrollments.map(toPublicEnrollment),
    },
    payments: payments.map((p) => ({
      id: String(p._id),
      enrollmentId: String(p.enrollmentId),
      amount: p.amount,
      status: p.status,
      provider: p.provider,
      createdAt: p.createdAt,
      verifiedAt: p.verifiedAt,
    })),
    discounts: discounts.map((d) => ({
      id: String(d._id),
      code: d.code,
      type: d.type,
      value: d.value,
      isActive: d.isActive,
    })),
    insurance: insurance.map(toPublicInsurance),
    medical: medical.map(toPublicMedicalDocument),
    medicalDocuments: medical.map(toPublicMedicalDocument),
    attendance: attendance.map((r) => ({
      id: String(r._id),
      classId: String(r.classId),
      sessionId: String(r.sessionId),
      participantId: String(r.participantId),
      status: r.status,
      markedAt: r.markedAt,
    })),
  };

  // Self 360: keep medical status only (no profile notes). Already metadata-only.
  return payload;
}

async function searchUsersAdmin({ q, page = 1, limit = 20 } = {}) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const safePage = Math.max(1, Number(page) || 1);
  const filter = {};
  if (q && String(q).trim()) {
    const term = String(q).trim().slice(0, 80);
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { phone: term },
      { firstName: new RegExp(escaped, "i") },
      { lastName: new RegExp(escaped, "i") },
    ];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .select("phone firstName lastName role isActive createdAt")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    User.countDocuments(filter),
  ]);

  return {
    page: safePage,
    limit: safeLimit,
    total,
    items: items.map((u) => ({
      id: String(u._id),
      phone: u.phone,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
    })),
  };
}

module.exports = {
  buildUser360,
  searchUsersAdmin,
  toPublicEnrollment,
};
