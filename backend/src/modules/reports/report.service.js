const mongoose = require("mongoose");
const { Participant } = require("../enrollments/participant.model");
const { Enrollment } = require("../enrollments/enrollment.model");
const { Payment } = require("../billing/payment.model");
const { Discount } = require("../billing/discount.model");
const { CourseClass } = require("../courses/courseClass.model");
const { Instructor } = require("../courses/instructor.model");
const { AttendanceRecord } = require("../enrollments/attendance.model");
const { WaitlistEntry } = require("../enrollments/waitlist.model");
const { InsuranceRecord } = require("../compliance/insurance.model");
const { MedicalDocument } = require("../compliance/medical.model");
const { User } = require("../auth/user.model");
const { ageFromBirthDate, birthDateRangeFromAge, parseUtcDateOnly } = require("../../utils/age");
const { env } = require("../../config/env");
const { AppError } = require("../../utils/AppError");
const { logEvent, logError } = require("../../services/logging");
const { buildWorkbookBuffer, sanitizeFilename } = require("./excel");
const {
  ENROLLMENT_STATUSES,
  PAYMENT_STATUSES,
  CLASS_STATUSES,
  COMPLIANCE_STATUSES,
  WAITLIST_STATUSES,
} = require("../courses/domain.constants");

/** Inclusive fromDate / toDate on UTC calendar day for createdAt-style filters. */
function createdAtRangeFilter(fromDate, toDate) {
  if (!fromDate && !toDate) return null;
  const range = {};
  if (fromDate) {
    const d = parseUtcDateOnly(fromDate);
    range.$gte = d;
  }
  if (toDate) {
    const d = parseUtcDateOnly(toDate);
    // inclusive end-of-day UTC
    range.$lte = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
  }
  return range;
}

function sortSpec(sortBy, sortDir, fallback = "createdAt") {
  const field = sortBy || fallback;
  const dir = sortDir === "asc" ? 1 : -1;
  return { [field]: dir, _id: dir };
}

function paginateMeta(page, limit, total) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const safeTotal = Number(total) || 0;
  const totalPages = safeTotal === 0 ? 0 : Math.ceil(safeTotal / safeLimit);
  return { page: safePage, limit: safeLimit, total: safeTotal, totalPages };
}

function pageLimit(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit };
}

function castObjectIdFields(filter, fields) {
  const out = { ...filter };
  for (const field of fields) {
    if (out[field] != null && typeof out[field] === "string" && mongoose.isValidObjectId(out[field])) {
      out[field] = new mongoose.Types.ObjectId(out[field]);
    }
  }
  return out;
}

function mapById(docs) {
  const map = new Map();
  for (const d of docs) map.set(String(d._id), d);
  return map;
}

async function withReportTiming(reportType, adminUserId, filters, fn) {
  const started = Date.now();
  logEvent("REPORT_REQUESTED", {
    reportType,
    adminUserId: String(adminUserId),
    filterKeys: Object.keys(filters || {}).filter((k) => filters[k] !== undefined),
  });
  try {
    const result = await fn();
    const count = Array.isArray(result?.items)
      ? result.items.length
      : Array.isArray(result?.rows)
        ? result.rows.length
        : result?.pagination?.total;
    logEvent("REPORT_COMPLETED", {
      reportType,
      adminUserId: String(adminUserId),
      durationMs: Date.now() - started,
      resultCount: count,
    });
    return result;
  } catch (err) {
    logError("REPORT_FAILED", err, {
      reportType,
      adminUserId: String(adminUserId),
      durationMs: Date.now() - started,
      failureCategory: err?.code || err?.name || "UNKNOWN",
    });
    throw err;
  }
}

/* -------------------- Participants -------------------- */

async function buildParticipantFilter(query) {
  const filter = {};
  if (query.ownerUserId) filter.ownerUserId = query.ownerUserId;
  if (query.gender) filter.gender = query.gender;
  if (query.isActive === true || query.isActive === false) filter.isActive = query.isActive;
  const createdAt = createdAtRangeFilter(query.fromDate, query.toDate);
  if (createdAt) filter.createdAt = createdAt;
  const birthRange = birthDateRangeFromAge({ ageMin: query.ageMin, ageMax: query.ageMax });
  if (birthRange) filter.birthDate = birthRange;
  if (query.q) {
    const term = escapeRegex(query.q.trim().slice(0, 80));
    filter.$or = [
      { firstName: new RegExp(term, "i") },
      { lastName: new RegExp(term, "i") },
      { phone: query.q.trim() },
    ];
  }
  return filter;
}

async function latestComplianceByParticipant(participantIds) {
  if (!participantIds.length) {
    return { insurance: new Map(), medical: new Map() };
  }
  const ids = participantIds.map((id) => new mongoose.Types.ObjectId(String(id)));
  const [insAgg, medAgg] = await Promise.all([
    InsuranceRecord.aggregate([
      { $match: { participantId: { $in: ids } } },
      { $sort: { updatedAt: -1 } },
      { $group: { _id: "$participantId", status: { $first: "$status" }, expiresAt: { $first: "$expiresAt" } } },
    ]),
    MedicalDocument.aggregate([
      { $match: { participantId: { $in: ids } } },
      { $sort: { updatedAt: -1 } },
      { $group: { _id: "$participantId", status: { $first: "$status" }, expiresAt: { $first: "$expiresAt" } } },
    ]),
  ]);
  return {
    insurance: mapById(insAgg.map((r) => ({ _id: r._id, status: r.status, expiresAt: r.expiresAt }))),
    medical: mapById(medAgg.map((r) => ({ _id: r._id, status: r.status, expiresAt: r.expiresAt }))),
  };
}

function complianceLabel(rec, now = new Date()) {
  if (!rec) return "MISSING";
  if (rec.status === COMPLIANCE_STATUSES.REJECTED) return "REJECTED";
  if (rec.status === COMPLIANCE_STATUSES.PENDING) return "PENDING";
  if (rec.status === COMPLIANCE_STATUSES.EXPIRED) return "EXPIRED";
  if (rec.status === COMPLIANCE_STATUSES.APPROVED) {
    if (rec.expiresAt && parseUtcDateOnly(rec.expiresAt).getTime() < parseUtcDateOnly(now).getTime()) {
      return "EXPIRED";
    }
    return "APPROVED";
  }
  return rec.status || "UNKNOWN";
}

async function reportParticipants(query, { adminUserId }) {
  return withReportTiming("participants", adminUserId, query, async () => {
    const filter = await buildParticipantFilter(query);
    const { page, limit } = pageLimit(query);
    const [rows, total] = await Promise.all([
      Participant.find(filter)
        .sort(sortSpec(query.sortBy, query.sortDir, "createdAt"))
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Participant.countDocuments(filter),
    ]);

    const participantIds = rows.map((r) => r._id);
    const [enrollmentCounts, compliance] = await Promise.all([
      Enrollment.aggregate([
        { $match: { participantId: { $in: participantIds } } },
        { $group: { _id: "$participantId", count: { $sum: 1 } } },
      ]),
      latestComplianceByParticipant(participantIds),
    ]);
    const enrollMap = new Map(enrollmentCounts.map((e) => [String(e._id), e.count]));

    const items = rows.map((p) => {
      const ec = p.emergencyContact || {};
      const hasEmergency = Boolean(ec.name || ec.phone);
      const ins = compliance.insurance.get(String(p._id));
      const med = compliance.medical.get(String(p._id));
      return {
        id: String(p._id),
        ownerUserId: String(p.ownerUserId),
        firstName: p.firstName,
        lastName: p.lastName,
        birthDate: p.birthDate ? parseUtcDateOnly(p.birthDate).toISOString().slice(0, 10) : null,
        age: ageFromBirthDate(p.birthDate),
        gender: p.gender,
        relation: p.relation,
        phone: p.phone || "",
        isActive: p.isActive,
        createdAt: p.createdAt,
        hasEmergencyContact: hasEmergency,
        insuranceStatus: complianceLabel(ins),
        medicalStatus: complianceLabel(med),
        enrollmentCount: enrollMap.get(String(p._id)) || 0,
      };
    });

    return { items, pagination: paginateMeta(page, limit, total) };
  });
}

/* -------------------- Enrollments -------------------- */

async function reportEnrollments(query, { adminUserId }) {
  return withReportTiming("enrollments", adminUserId, query, async () => {
    const filter = {};
    if (query.classId) filter.classId = query.classId;
    if (query.participantId) filter.participantId = query.participantId;
    if (query.userId) filter.userId = query.userId;
    if (query.status) filter.status = query.status;
    const createdAt = createdAtRangeFilter(query.fromDate, query.toDate);
    if (createdAt) filter.createdAt = createdAt;

    if (query.courseTemplateId || query.instructorId) {
      const classFilter = {};
      if (query.courseTemplateId) classFilter.courseTemplateId = query.courseTemplateId;
      if (query.instructorId) classFilter.instructorId = query.instructorId;
      const classes = await CourseClass.find(classFilter).select("_id").lean();
      const matchedIds = classes.map((c) => String(c._id));
      if (query.classId) {
        if (!matchedIds.includes(String(query.classId))) {
          return { items: [], pagination: paginateMeta(query.page, query.limit, 0) };
        }
        filter.classId = query.classId;
      } else {
        filter.classId = { $in: classes.map((c) => c._id) };
      }
    }

    const { page, limit } = pageLimit(query);
    const [rows, total] = await Promise.all([
      Enrollment.find(filter)
        .sort(sortSpec(query.sortBy, query.sortDir, "createdAt"))
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Enrollment.countDocuments(filter),
    ]);

    const classIds = [...new Set(rows.map((r) => String(r.classId)))];
    const participantIds = [...new Set(rows.map((r) => String(r.participantId)))];
    const [classes, participants] = await Promise.all([
      CourseClass.find({ _id: { $in: classIds } })
        .select("title instructorId courseTemplateId price startDate endDate")
        .lean(),
      Participant.find({ _id: { $in: participantIds } })
        .select("firstName lastName ownerUserId")
        .lean(),
    ]);
    const classMap = mapById(classes);
    const partMap = mapById(participants);
    const instructorIds = [...new Set(classes.map((c) => String(c.instructorId)))];
    const instructors = await Instructor.find({ _id: { $in: instructorIds } }).select("name").lean();
    const instrMap = mapById(instructors);

    const items = rows.map((e) => {
      const cls = classMap.get(String(e.classId));
      const part = partMap.get(String(e.participantId));
      const instructor = cls ? instrMap.get(String(cls.instructorId)) : null;
      const snap = e.eligibilitySnapshot || {};
      return {
        id: String(e._id),
        participantId: String(e.participantId),
        participantName: part ? `${part.firstName} ${part.lastName}` : null,
        ownerUserId: String(e.userId),
        classId: String(e.classId),
        classTitle: cls?.title || null,
        instructorId: cls ? String(cls.instructorId) : null,
        instructorName: instructor?.name || null,
        status: e.status,
        paymentId: e.paymentId ? String(e.paymentId) : null,
        discountId: e.discountId ? String(e.discountId) : null,
        basePrice: e.basePrice,
        discountAmount: e.discountAmount,
        finalAmount: e.finalAmount,
        priceCharged: e.priceCharged,
        currency: "IRR",
        eligibilityEligible: snap.eligible,
        eligibilityReasons: snap.reasons || [],
        eligibilityAge: snap.age,
        eligibilityEvaluatedAt: snap.evaluatedAt || null,
        createdAt: e.createdAt,
        confirmedAt: e.confirmedAt,
        cancelledAt: e.cancelledAt,
        /** CURRENT class price — not historical; for comparison only */
        currentClassPrice: cls?.price ?? null,
      };
    });

    return { items, pagination: paginateMeta(page, limit, total) };
  });
}

/* -------------------- Payments -------------------- */

async function reportPayments(query, { adminUserId }) {
  return withReportTiming("payments", adminUserId, query, async () => {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.provider) filter.provider = query.provider;
    if (query.userId) filter.userId = query.userId;
    if (query.enrollmentId) filter.enrollmentId = query.enrollmentId;
    if (query.classId) filter.classId = query.classId;
    const createdAt = createdAtRangeFilter(query.fromDate, query.toDate);
    if (createdAt) filter.createdAt = createdAt;

    const { page, limit } = pageLimit(query);
    const aggFilter = castObjectIdFields(filter, [
      "userId",
      "enrollmentId",
      "classId",
      "participantId",
    ]);
    const [rows, total, summaryAgg] = await Promise.all([
      Payment.find(filter)
        .select(
          "userId participantId enrollmentId classId amount currency status provider providerRef authority createdAt verifiedAt failedAt expiredAt refundedAt failureCode failureReason",
        )
        .sort(sortSpec(query.sortBy, query.sortDir, "createdAt"))
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Payment.countDocuments(filter),
      Payment.aggregate([
        { $match: aggFilter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    const byStatus = {};
    for (const s of Object.values(PAYMENT_STATUSES)) {
      byStatus[s] = { count: 0, totalAmount: 0 };
    }
    for (const row of summaryAgg) {
      byStatus[row._id] = { count: row.count, totalAmount: row.totalAmount };
    }

    const summary = {
      totalCount: total,
      successfulCount: byStatus[PAYMENT_STATUSES.SUCCESS]?.count || 0,
      failedCount: byStatus[PAYMENT_STATUSES.FAILED]?.count || 0,
      pendingCount:
        (byStatus[PAYMENT_STATUSES.PENDING]?.count || 0) +
        (byStatus[PAYMENT_STATUSES.CREATED]?.count || 0) +
        (byStatus[PAYMENT_STATUSES.INITIATED]?.count || 0),
      expiredCount: byStatus[PAYMENT_STATUSES.EXPIRED]?.count || 0,
      refundedCount: byStatus[PAYMENT_STATUSES.REFUNDED]?.count || 0,
      totalSuccessfulAmount: byStatus[PAYMENT_STATUSES.SUCCESS]?.totalAmount || 0,
      totalRefundedAmount: byStatus[PAYMENT_STATUSES.REFUNDED]?.totalAmount || 0,
      currency: "IRR",
      byStatus,
    };

    const items = rows.map((p) => ({
      id: String(p._id),
      userId: String(p.userId),
      participantId: p.participantId ? String(p.participantId) : null,
      enrollmentId: String(p.enrollmentId),
      classId: p.classId ? String(p.classId) : null,
      amount: p.amount,
      currency: p.currency || "IRR",
      status: p.status,
      provider: p.provider,
      providerRef: p.providerRef || "",
      createdAt: p.createdAt,
      verifiedAt: p.verifiedAt,
      failedAt: p.failedAt,
      expiredAt: p.expiredAt,
      refundedAt: p.refundedAt,
      failureCode: p.failureCode || "",
      failureReason: p.failureReason || "",
    }));

    return { items, pagination: paginateMeta(page, limit, total), summary };
  });
}

/* -------------------- Classes -------------------- */

async function reportClasses(query, { adminUserId }) {
  return withReportTiming("classes", adminUserId, query, async () => {
    const filter = {};
    if (query.status) filter.status = query.status;
    if (query.instructorId) filter.instructorId = query.instructorId;
    if (query.courseTemplateId) filter.courseTemplateId = query.courseTemplateId;
    if (query.fromDate || query.toDate) {
      // filter by class startDate inclusive range
      const range = {};
      if (query.fromDate) range.$gte = parseUtcDateOnly(query.fromDate);
      if (query.toDate) {
        const d = parseUtcDateOnly(query.toDate);
        range.$lte = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
      }
      filter.startDate = range;
    }

    const { page, limit } = pageLimit(query);
    const [rows, total] = await Promise.all([
      CourseClass.find(filter)
        .sort(sortSpec(query.sortBy, query.sortDir, "startDate"))
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CourseClass.countDocuments(filter),
    ]);

    const classIds = rows.map((r) => r._id);
    const instructorIds = [...new Set(rows.map((r) => String(r.instructorId)))];
    const [instructors, waitlistCounts, enrollmentCounts] = await Promise.all([
      Instructor.find({ _id: { $in: instructorIds } }).select("name").lean(),
      WaitlistEntry.aggregate([
        {
          $match: {
            classId: { $in: classIds },
            status: { $in: [WAITLIST_STATUSES.WAITING, WAITLIST_STATUSES.OFFERED] },
          },
        },
        { $group: { _id: "$classId", count: { $sum: 1 } } },
      ]),
      Enrollment.aggregate([
        {
          $match: {
            classId: { $in: classIds },
            status: {
              $in: [
                ENROLLMENT_STATUSES.ACTIVE,
                ENROLLMENT_STATUSES.PAID,
                ENROLLMENT_STATUSES.PENDING_COMPLIANCE,
                ENROLLMENT_STATUSES.COMPLETED,
              ],
            },
          },
        },
        { $group: { _id: "$classId", count: { $sum: 1 } } },
      ]),
    ]);
    const instrMap = mapById(instructors);
    const wlMap = new Map(waitlistCounts.map((w) => [String(w._id), w.count]));
    const enMap = new Map(enrollmentCounts.map((e) => [String(e._id), e.count]));

    const items = rows.map((c) => {
      const remaining = Math.max(0, c.capacity - c.confirmedCount - c.heldCount);
      return {
        id: String(c._id),
        title: c.title,
        courseTemplateId: String(c.courseTemplateId),
        instructorId: String(c.instructorId),
        instructorName: instrMap.get(String(c.instructorId))?.name || null,
        startDate: c.startDate,
        endDate: c.endDate,
        totalSessions: c.totalSessions,
        price: c.price,
        currency: "IRR",
        capacity: c.capacity,
        confirmedCount: c.confirmedCount,
        heldCount: c.heldCount,
        remainingCapacity: remaining,
        isFull: remaining === 0,
        waitlistCount: wlMap.get(String(c._id)) || 0,
        confirmedEnrollmentCount: enMap.get(String(c._id)) || 0,
        status: c.status,
        createdAt: c.createdAt,
      };
    });

    return { items, pagination: paginateMeta(page, limit, total) };
  });
}

/* -------------------- Attendance -------------------- */

async function reportAttendance(query, { adminUserId }) {
  return withReportTiming("attendance", adminUserId, query, async () => {
    const filter = {};
    if (query.classId) filter.classId = query.classId;
    if (query.sessionId) filter.sessionId = query.sessionId;
    if (query.participantId) filter.participantId = query.participantId;
    if (query.status) filter.status = query.status;
    const createdAt = createdAtRangeFilter(query.fromDate, query.toDate);
    if (createdAt) filter.createdAt = createdAt;

    const { page, limit } = pageLimit(query);
    const aggFilter = castObjectIdFields(filter, ["classId", "sessionId", "participantId"]);
    const [rows, total, summaryAgg] = await Promise.all([
      AttendanceRecord.find(filter)
        .sort(sortSpec(query.sortBy, query.sortDir, "markedAt"))
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AttendanceRecord.countDocuments(filter),
      AttendanceRecord.aggregate([
        { $match: aggFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
    ]);

    const participantIds = [...new Set(rows.map((r) => String(r.participantId)))];
    const participants = await Participant.find({ _id: { $in: participantIds } })
      .select("firstName lastName")
      .lean();
    const partMap = mapById(participants);

    const summary = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0, UNKNOWN: 0 };
    for (const row of summaryAgg) {
      if (summary[row._id] !== undefined) summary[row._id] = row.count;
    }

    const items = rows.map((a) => {
      const p = partMap.get(String(a.participantId));
      return {
        id: String(a._id),
        classId: String(a.classId),
        sessionId: String(a.sessionId),
        participantId: String(a.participantId),
        participantName: p ? `${p.firstName} ${p.lastName}` : null,
        enrollmentId: String(a.enrollmentId),
        status: a.status,
        markedAt: a.markedAt,
        createdAt: a.createdAt,
      };
    });

    return { items, pagination: paginateMeta(page, limit, total), summary };
  });
}

/* -------------------- Waitlist -------------------- */

async function reportWaitlist(query, { adminUserId }) {
  return withReportTiming("waitlist", adminUserId, query, async () => {
    const filter = {};
    if (query.classId) filter.classId = query.classId;
    if (query.status) filter.status = query.status;
    if (query.participantId) filter.participantId = query.participantId;
    const createdAt = createdAtRangeFilter(query.fromDate, query.toDate);
    if (createdAt) filter.createdAt = createdAt;

    const { page, limit } = pageLimit(query);
    const [rows, total] = await Promise.all([
      WaitlistEntry.find(filter)
        .sort(sortSpec(query.sortBy, query.sortDir, "position"))
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      WaitlistEntry.countDocuments(filter),
    ]);

    const participantIds = [...new Set(rows.map((r) => String(r.participantId)))];
    const classIds = [...new Set(rows.map((r) => String(r.classId)))];
    const [participants, classes] = await Promise.all([
      Participant.find({ _id: { $in: participantIds } }).select("firstName lastName").lean(),
      CourseClass.find({ _id: { $in: classIds } }).select("title").lean(),
    ]);
    const partMap = mapById(participants);
    const classMap = mapById(classes);

    const items = rows.map((w) => {
      const p = partMap.get(String(w.participantId));
      return {
        id: String(w._id),
        classId: String(w.classId),
        classTitle: classMap.get(String(w.classId))?.title || null,
        userId: String(w.userId),
        participantId: String(w.participantId),
        participantName: p ? `${p.firstName} ${p.lastName}` : null,
        position: w.position,
        status: w.status,
        notifiedAt: w.notifiedAt,
        expiresAt: w.expiresAt,
        createdAt: w.createdAt,
      };
    });

    return { items, pagination: paginateMeta(page, limit, total) };
  });
}

/* -------------------- Discounts -------------------- */

async function reportDiscounts(query, { adminUserId }) {
  return withReportTiming("discounts", adminUserId, query, async () => {
    const filter = {};
    if (query.isActive === true || query.isActive === false) filter.isActive = query.isActive;
    const createdAt = createdAtRangeFilter(query.fromDate, query.toDate);
    if (createdAt) filter.createdAt = createdAt;

    const { page, limit } = pageLimit(query);
    const [rows, total] = await Promise.all([
      Discount.find(filter)
        .sort(sortSpec(query.sortBy, query.sortDir, "createdAt"))
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Discount.countDocuments(filter),
    ]);

    const items = rows.map((d) => ({
      id: String(d._id),
      code: d.code,
      type: d.type,
      value: d.value,
      scope: d.scope,
      classId: d.classId ? String(d.classId) : null,
      courseTemplateId: d.courseTemplateId ? String(d.courseTemplateId) : null,
      startDate: d.startDate,
      endDate: d.endDate,
      usageLimit: d.usageLimit,
      perUserLimit: d.perUserLimit,
      usedCount: d.usedCount,
      minimumAmount: d.minimumAmount,
      isActive: d.isActive,
      createdAt: d.createdAt,
    }));

    return { items, pagination: paginateMeta(page, limit, total) };
  });
}

/* -------------------- Compliance -------------------- */

async function reportCompliance(query, { adminUserId }) {
  return withReportTiming("compliance", adminUserId, query, async () => {
    const { page, limit } = pageLimit(query);
    const kind = query.kind || "both";
    const createdAt = createdAtRangeFilter(query.fromDate, query.toDate);

    async function fetchKind(Model, documentKind) {
      const filter = {};
      if (query.status) filter.status = query.status;
      if (query.participantId) filter.participantId = query.participantId;
      if (createdAt) filter.createdAt = createdAt;
      const [rows, total] = await Promise.all([
        Model.find(filter)
          .select(
            "participantId status providerName policyRef startDate expiresAt rejectionReason uploadedAt reviewedAt createdAt updatedAt documentType originalFilename mimeType sizeBytes",
          )
          .sort(sortSpec(query.sortBy, query.sortDir, "updatedAt"))
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Model.countDocuments(filter),
      ]);
      const participantIds = [...new Set(rows.map((r) => String(r.participantId)))];
      const participants = await Participant.find({ _id: { $in: participantIds } })
        .select("firstName lastName ownerUserId")
        .lean();
      const partMap = mapById(participants);
      return {
        total,
        items: rows.map((r) => {
          const p = partMap.get(String(r.participantId));
          return {
            id: String(r._id),
            kind: documentKind,
            participantId: String(r.participantId),
            participantName: p ? `${p.firstName} ${p.lastName}` : null,
            ownerUserId: p ? String(p.ownerUserId) : null,
            status: r.status,
            complianceLabel: complianceLabel(r),
            providerName: r.providerName || undefined,
            policyRef: r.policyRef || undefined,
            documentType: r.documentType || undefined,
            originalFilename: r.originalFilename || "",
            mimeType: r.mimeType || "",
            sizeBytes: r.sizeBytes || 0,
            startDate: r.startDate || null,
            expiresAt: r.expiresAt || null,
            rejectionReason: r.rejectionReason || "",
            uploadedAt: r.uploadedAt || null,
            reviewedAt: r.reviewedAt || null,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            // intentionally omit storageKey
          };
        }),
      };
    }

    if (kind === "insurance") {
      const data = await fetchKind(InsuranceRecord, "insurance");
      return { items: data.items, pagination: paginateMeta(page, limit, data.total) };
    }
    if (kind === "medical") {
      const data = await fetchKind(MedicalDocument, "medical");
      return { items: data.items, pagination: paginateMeta(page, limit, data.total) };
    }

    // both: merge per-kind page windows (documented limitation — prefer kind=insurance|medical)
    const [ins, med] = await Promise.all([
      fetchKind(InsuranceRecord, "insurance"),
      fetchKind(MedicalDocument, "medical"),
    ]);
    const merged = [...ins.items, ...med.items].sort((a, b) => {
      const av = new Date(a.updatedAt || a.createdAt).getTime();
      const bv = new Date(b.updatedAt || b.createdAt).getTime();
      return query.sortDir === "asc" ? av - bv : bv - av;
    });
    const total = ins.total + med.total;
    return {
      items: merged.slice(0, limit),
      pagination: paginateMeta(page, limit, total),
      note: "kind=both merges per-kind page windows; use kind=insurance|medical for exact pagination",
    };
  });
}

/* -------------------- Dashboard -------------------- */

async function reportDashboard({ adminUserId }) {
  return withReportTiming("dashboard", adminUserId, {}, async () => {
    const activeEnrollmentStatuses = [
      ENROLLMENT_STATUSES.ACTIVE,
      ENROLLMENT_STATUSES.PAID,
      ENROLLMENT_STATUSES.PENDING_COMPLIANCE,
    ];
    const activeClassStatuses = [
      CLASS_STATUSES.PUBLISHED,
      CLASS_STATUSES.REGISTRATION_OPEN,
      CLASS_STATUSES.REGISTRATION_CLOSED,
      CLASS_STATUSES.IN_PROGRESS,
    ];

    const [
      users,
      participants,
      activeParticipants,
      courses,
      activeClasses,
      enrollments,
      activeEnrollments,
      pendingComplianceEnrollments,
      waitlistCount,
      paymentStats,
      pendingInsurance,
      pendingMedical,
    ] = await Promise.all([
      User.countDocuments({}),
      Participant.countDocuments({}),
      Participant.countDocuments({ isActive: true }),
      CourseClass.countDocuments({}),
      CourseClass.countDocuments({ status: { $in: activeClassStatuses } }),
      Enrollment.countDocuments({}),
      Enrollment.countDocuments({ status: { $in: activeEnrollmentStatuses } }),
      Enrollment.countDocuments({ status: ENROLLMENT_STATUSES.PENDING_COMPLIANCE }),
      WaitlistEntry.countDocuments({
        status: { $in: [WAITLIST_STATUSES.WAITING, WAITLIST_STATUSES.OFFERED] },
      }),
      Payment.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
      ]),
      InsuranceRecord.countDocuments({ status: COMPLIANCE_STATUSES.PENDING }),
      MedicalDocument.countDocuments({ status: COMPLIANCE_STATUSES.PENDING }),
    ]);

    const byStatus = {};
    for (const row of paymentStats) {
      byStatus[row._id] = { count: row.count, totalAmount: row.totalAmount };
    }

    return {
      users,
      participants,
      activeParticipants,
      courses,
      activeClasses,
      enrollments,
      activeEnrollments,
      pendingCompliance: pendingComplianceEnrollments,
      pendingInsuranceDocuments: pendingInsurance,
      pendingMedicalDocuments: pendingMedical,
      waitlistCount,
      payments: paymentStats.reduce((s, r) => s + r.count, 0),
      successfulPayments: byStatus[PAYMENT_STATUSES.SUCCESS]?.count || 0,
      revenue: byStatus[PAYMENT_STATUSES.SUCCESS]?.totalAmount || 0,
      currency: "IRR",
      paymentByStatus: byStatus,
    };
  });
}

/* -------------------- Exports -------------------- */

const EXPORT_COLUMNS = {
  participants: [
    { key: "id", header: "Participant ID", width: 26 },
    { key: "ownerUserId", header: "Owner User ID", width: 26 },
    { key: "firstName", header: "First Name", width: 16 },
    { key: "lastName", header: "Last Name", width: 16 },
    { key: "birthDate", header: "Birth Date", width: 14 },
    { key: "age", header: "Age", width: 8 },
    { key: "gender", header: "Gender", width: 10 },
    { key: "relation", header: "Relation", width: 10 },
    { key: "phone", header: "Phone", width: 14 },
    { key: "isActive", header: "Active", width: 10 },
    { key: "hasEmergencyContact", header: "Emergency Contact", width: 16 },
    { key: "insuranceStatus", header: "Insurance Status", width: 16 },
    { key: "medicalStatus", header: "Medical Status", width: 16 },
    { key: "enrollmentCount", header: "Enrollments", width: 12 },
    { key: "createdAt", header: "Created At", width: 22 },
  ],
  enrollments: [
    { key: "id", header: "Enrollment ID", width: 26 },
    { key: "participantName", header: "Participant", width: 20 },
    { key: "ownerUserId", header: "Owner User ID", width: 26 },
    { key: "classTitle", header: "Class", width: 24 },
    { key: "instructorName", header: "Instructor", width: 18 },
    { key: "status", header: "Status", width: 18 },
    { key: "basePrice", header: "Base Price (IRR)", width: 16 },
    { key: "discountAmount", header: "Discount (IRR)", width: 14 },
    { key: "finalAmount", header: "Final Amount (IRR)", width: 16 },
    { key: "priceCharged", header: "Price Charged (IRR)", width: 16 },
    { key: "eligibilityEligible", header: "Eligible At Reg", width: 14 },
    { key: "createdAt", header: "Registered At", width: 22 },
    { key: "confirmedAt", header: "Confirmed At", width: 22 },
    { key: "cancelledAt", header: "Cancelled At", width: 22 },
  ],
  payments: [
    { key: "id", header: "Payment ID", width: 26 },
    { key: "userId", header: "User ID", width: 26 },
    { key: "enrollmentId", header: "Enrollment ID", width: 26 },
    { key: "classId", header: "Class ID", width: 26 },
    { key: "amount", header: "Amount (IRR)", width: 14 },
    { key: "status", header: "Status", width: 16 },
    { key: "provider", header: "Provider", width: 12 },
    { key: "providerRef", header: "Provider Ref", width: 20 },
    { key: "createdAt", header: "Created At", width: 22 },
    { key: "verifiedAt", header: "Verified At", width: 22 },
  ],
  attendance: [
    { key: "id", header: "Attendance ID", width: 26 },
    { key: "classId", header: "Class ID", width: 26 },
    { key: "sessionId", header: "Session ID", width: 26 },
    { key: "participantName", header: "Participant", width: 20 },
    { key: "status", header: "Status", width: 12 },
    { key: "markedAt", header: "Marked At", width: 22 },
  ],
  classes: [
    { key: "id", header: "Class ID", width: 26 },
    { key: "title", header: "Title", width: 28 },
    { key: "instructorName", header: "Instructor", width: 18 },
    { key: "startDate", header: "Start Date", width: 14 },
    { key: "endDate", header: "End Date", width: 14 },
    { key: "totalSessions", header: "Sessions", width: 10 },
    { key: "price", header: "Price (IRR)", width: 14 },
    { key: "capacity", header: "Capacity", width: 10 },
    { key: "confirmedCount", header: "Confirmed", width: 12 },
    { key: "heldCount", header: "Held", width: 10 },
    { key: "remainingCapacity", header: "Remaining", width: 12 },
    { key: "waitlistCount", header: "Waitlist", width: 10 },
    { key: "status", header: "Status", width: 18 },
  ],
  waitlist: [
    { key: "id", header: "Waitlist ID", width: 26 },
    { key: "classTitle", header: "Class", width: 24 },
    { key: "participantName", header: "Participant", width: 20 },
    { key: "position", header: "Position", width: 10 },
    { key: "status", header: "Status", width: 12 },
    { key: "notifiedAt", header: "Notified At", width: 22 },
    { key: "expiresAt", header: "Expires At", width: 22 },
    { key: "createdAt", header: "Created At", width: 22 },
  ],
};

async function exportReport(reportType, query, { adminUserId }) {
  const started = Date.now();
  logEvent("EXPORT_REQUESTED", {
    reportType,
    adminUserId: String(adminUserId),
    filterKeys: Object.keys(query || {}).filter((k) => query[k] !== undefined),
  });

  try {
    const max = env.EXPORT_MAX_ROWS || 5000;
    const exportQuery = { ...query, page: 1, limit: max };

    let data;
    switch (reportType) {
      case "participants":
        data = await reportParticipants(exportQuery, { adminUserId });
        break;
      case "enrollments":
        data = await reportEnrollments(exportQuery, { adminUserId });
        break;
      case "payments":
        data = await reportPayments(exportQuery, { adminUserId });
        break;
      case "attendance":
        data = await reportAttendance(exportQuery, { adminUserId });
        break;
      case "classes":
        data = await reportClasses(exportQuery, { adminUserId });
        break;
      case "waitlist":
        data = await reportWaitlist(exportQuery, { adminUserId });
        break;
      default:
        throw new AppError("Unknown export type", { statusCode: 400, code: "BAD_REQUEST" });
    }

    if (data.pagination.total > max) {
      throw new AppError(`Export exceeds maximum of ${max} rows`, {
        statusCode: 413,
        code: "EXPORT_TOO_LARGE",
        details: { max, count: data.pagination.total },
      });
    }

    const columns = EXPORT_COLUMNS[reportType];
    const buffer = await buildWorkbookBuffer({
      sheetName: reportType,
      columns,
      rows: data.items,
    });

    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = sanitizeFilename(`${reportType}-report-${dateStamp}.xlsx`);

    logEvent("EXPORT_COMPLETED", {
      reportType,
      adminUserId: String(adminUserId),
      durationMs: Date.now() - started,
      rowCount: data.items.length,
    });

    return { buffer, filename, rowCount: data.items.length };
  } catch (err) {
    if (err?.code === "EXPORT_TOO_LARGE") {
      logEvent("EXPORT_REJECTED_LIMIT", {
        reportType,
        adminUserId: String(adminUserId),
        durationMs: Date.now() - started,
        failureCategory: "EXPORT_TOO_LARGE",
      });
    } else {
      logError("EXPORT_FAILED", err, {
        reportType,
        adminUserId: String(adminUserId),
        durationMs: Date.now() - started,
        failureCategory: err?.code || err?.name || "UNKNOWN",
      });
    }
    throw err;
  }
}

module.exports = {
  reportParticipants,
  reportEnrollments,
  reportPayments,
  reportClasses,
  reportAttendance,
  reportWaitlist,
  reportDiscounts,
  reportCompliance,
  reportDashboard,
  exportReport,
  createdAtRangeFilter,
  EXPORT_COLUMNS,
};
