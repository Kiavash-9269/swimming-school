const { env } = require("../../config/env");
const { AppError } = require("../../utils/AppError");
const { logEvent } = require("../../services/logging");
const { CLASS_STATUSES, GENDERS } = require("../courses/domain.constants");
const { CourseTemplate } = require("../courses/courseTemplate.model");
const { Instructor } = require("../courses/instructor.model");
const { CourseClass } = require("../courses/courseClass.model");
const { SwimmingRecord } = require("./swimmingRecord.model");
const {
  PRICING,
  CATALOG_GROUPS,
  CATEGORY_META,
  DEFAULT_SWIMMING_RECORDS,
  flattenSlots,
} = require("./catalog.definition");

const CATALOG_INSTRUCTOR_NAME = "مربی کاتالوگ";

function toPublicRecord(doc) {
  return {
    id: String(doc._id),
    event: doc.event,
    time: doc.time,
    distance: doc.distance,
    holder: doc.holder,
    type: doc.type,
    discipline: doc.discipline,
    highlight: Boolean(doc.highlight),
    sortOrder: doc.sortOrder ?? 0,
  };
}

function defaultTermDates() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 7);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 84);
  return { startDate: start, endDate: end };
}

async function ensureCatalogInstructor() {
  let instructor = await Instructor.findOne({ name: CATALOG_INSTRUCTOR_NAME, isActive: true });
  if (instructor) return instructor;
  instructor = await Instructor.create({
    name: CATALOG_INSTRUCTOR_NAME,
    phone: "",
    bio: "مربی پیش‌فرض برای کلاس‌های سینک‌شده از کاتالوگ بازاریابی",
    isActive: true,
  });
  return instructor;
}

async function ensureTemplateForSlot(slot) {
  const title =
    slot.type === "public"
      ? `سانس عمومی — ${slot.pool}`
      : slot.type === "hydro"
        ? `آب‌درمانی — ${slot.pool}`
        : `آموزش شنا ${slot.category === "women" ? "بانوان" : "آقایان"} — ${slot.level} — ${slot.pool}`;

  let template = await CourseTemplate.findOne({ title, isActive: true });
  if (template) {
    const patch = {};
    if (template.ageMin !== slot.ageMin) patch.ageMin = slot.ageMin;
    if (template.ageMax !== slot.ageMax) patch.ageMax = slot.ageMax;
    if (template.level !== slot.level) patch.level = slot.level;
    if (template.requiresMedicalApproval !== slot.requiresMedicalApproval) {
      patch.requiresMedicalApproval = slot.requiresMedicalApproval;
    }
    if (template.requiresInsurance !== slot.requiresInsurance) {
      patch.requiresInsurance = slot.requiresInsurance;
    }
    const wantedGender =
      slot.genderRestriction === GENDERS.FEMALE
        ? GENDERS.FEMALE
        : slot.genderRestriction === GENDERS.ANY
          ? GENDERS.ANY
          : GENDERS.MALE;
    if (template.genderRestriction !== wantedGender) patch.genderRestriction = wantedGender;
    if (Object.keys(patch).length) {
      template = await CourseTemplate.findByIdAndUpdate(template._id, { $set: patch }, { returnDocument: "after" });
    }
    return template;
  }

  return CourseTemplate.create({
    title,
    description: slot.description || "",
    level: slot.level,
    ageMin: slot.ageMin,
    ageMax: slot.ageMax,
    genderRestriction:
      slot.genderRestriction === GENDERS.FEMALE
        ? GENDERS.FEMALE
        : slot.genderRestriction === GENDERS.ANY
          ? GENDERS.ANY
          : GENDERS.MALE,
    requiresInsurance: Boolean(slot.requiresInsurance),
    requiresMedicalApproval: Boolean(slot.requiresMedicalApproval),
    isActive: true,
  });
}

/**
 * Upsert all catalog slots into course_classes.
 * Updates schedule/pricing/metadata; preserves status & enrollment counters.
 */
async function syncCatalog({ openRegistration = false } = {}) {
  const instructor = await ensureCatalogInstructor();
  const { startDate, endDate } = defaultTermDates();
  const slots = flattenSlots();
  const created = [];
  const updated = [];
  const unchanged = [];

  for (const slot of slots) {
    if (!slot.daysOfWeek?.length || !slot.startTime || !slot.endTime) {
      throw new AppError(`کاتالوگ نامعتبر: ${slot.catalogKey}`, {
        statusCode: 400,
        code: "CATALOG_SLOT_INVALID",
      });
    }

    const template = await ensureTemplateForSlot(slot);
    const existing = await CourseClass.findOne({ catalogKey: slot.catalogKey });

    const baseFields = {
      title: slot.title,
      courseTemplateId: template._id,
      instructorId: instructor._id,
      daysOfWeek: slot.daysOfWeek,
      startTime: slot.startTime,
      endTime: slot.endTime,
      timezone: env.APP_TIMEZONE,
      totalSessions: slot.totalSessions,
      capacity: slot.capacity,
      catalogKey: slot.catalogKey,
      catalogGroupKey: slot.groupKey,
      catalogCategory: slot.category,
      pool: slot.pool,
      location: slot.location,
      audienceLabel: slot.audience,
      listPrice: slot.listPrice,
    };

    if (!existing) {
      const doc = await CourseClass.create({
        ...baseFields,
        startDate,
        endDate,
        price: slot.price,
        status: openRegistration ? CLASS_STATUSES.REGISTRATION_OPEN : CLASS_STATUSES.DRAFT,
        confirmedCount: 0,
        heldCount: 0,
      });
      created.push({ catalogKey: slot.catalogKey, classId: String(doc._id), status: doc.status });
      continue;
    }

    const updates = { ...baseFields };
    // Price only while draft (same rule as updateClass)
    if (existing.status === CLASS_STATUSES.DRAFT) {
      updates.price = slot.price;
      updates.startDate = startDate;
      updates.endDate = endDate;
    }

    if (openRegistration && existing.status === CLASS_STATUSES.DRAFT) {
      updates.status = CLASS_STATUSES.PUBLISHED;
    }

    const changedKeys = Object.keys(updates).filter((key) => {
      const next = updates[key];
      const prev = existing[key];
      if (next instanceof Date && prev instanceof Date) return next.getTime() !== prev.getTime();
      if (Array.isArray(next) && Array.isArray(prev)) return JSON.stringify(next) !== JSON.stringify(prev);
      return String(next ?? "") !== String(prev ?? "");
    });

    if (!changedKeys.length) {
      unchanged.push({ catalogKey: slot.catalogKey, classId: String(existing._id), status: existing.status });
      continue;
    }

    const doc = await CourseClass.findByIdAndUpdate(existing._id, { $set: updates }, { returnDocument: "after", runValidators: true });

    if (openRegistration && doc.status === CLASS_STATUSES.PUBLISHED) {
      doc.status = CLASS_STATUSES.REGISTRATION_OPEN;
      await doc.save();
    }

    updated.push({ catalogKey: slot.catalogKey, classId: String(doc._id), status: doc.status, changed: changedKeys });
  }

  const summary = {
    slots: slots.length,
    created: created.length,
    updated: updated.length,
    unchanged: unchanged.length,
    createdItems: created,
    updatedItems: updated,
    unchangedItems: unchanged,
  };
  logEvent("CATALOG_SYNCED", summary);
  return summary;
}

async function getSyncStatus() {
  const slots = flattenSlots();
  const keys = slots.map((s) => s.catalogKey);
  const classes = await CourseClass.find({ catalogKey: { $in: keys } })
    .select("catalogKey status price listPrice title pool startTime endTime")
    .lean();
  const byKey = new Map(classes.map((c) => [c.catalogKey, c]));
  const items = slots.map((slot) => {
    const linked = byKey.get(slot.catalogKey);
    return {
      catalogKey: slot.catalogKey,
      groupKey: slot.groupKey,
      category: slot.category,
      type: slot.type,
      title: slot.title,
      pool: slot.pool,
      time: slot.time,
      price: slot.price,
      listPrice: slot.listPrice,
      linked: Boolean(linked),
      classId: linked ? String(linked._id) : null,
      status: linked?.status || null,
    };
  });
  return {
    pricing: PRICING,
    totalSlots: slots.length,
    linkedCount: items.filter((i) => i.linked).length,
    missingCount: items.filter((i) => !i.linked).length,
    items,
  };
}

async function getMarketingCatalog() {
  const slots = flattenSlots();
  const classes = await CourseClass.find({
    catalogKey: { $in: slots.map((s) => s.catalogKey) },
  })
    .select("catalogKey status price listPrice")
    .lean();
  const byKey = new Map(classes.map((c) => [c.catalogKey, c]));

  const groups = CATALOG_GROUPS.map((group) => {
    const pricing = PRICING[group.type] || PRICING.school;
    if (!group.schedule?.length) {
      const linked = byKey.get(group.groupKey);
      return {
        id: group.id,
        groupKey: group.groupKey,
        classId: linked ? String(linked._id) : null,
        classStatus: linked?.status || null,
        pool: group.pool,
        poolImageKey: group.poolImageKey,
        location: group.location,
        description: group.description,
        type: group.type,
        category: group.category,
        pricing: {
          price: linked?.listPrice ?? pricing.price,
          discountPrice: linked?.price ?? pricing.discountPrice,
        },
        schedule: [],
      };
    }

    return {
      id: group.id,
      groupKey: group.groupKey,
      classId: null,
      classStatus: null,
      pool: group.pool,
      poolImageKey: group.poolImageKey,
      location: group.location,
      description: group.description,
      type: group.type,
      category: group.category,
      pricing: {
        price: pricing.price,
        discountPrice: pricing.discountPrice,
      },
      schedule: group.schedule.map((schedule) => ({
        id: schedule.id,
        days: schedule.days,
        time: schedule.time,
        sessions: schedule.sessions.map((session) => {
          const catalogKey = `${group.groupKey}:${schedule.id}:${session.id}`;
          const linked = byKey.get(catalogKey);
          return {
            id: session.id,
            label: session.label,
            day: session.day,
            audience: session.audience,
            catalogKey,
            classId: linked ? String(linked._id) : null,
            classStatus: linked?.status || null,
            price: linked?.price ?? pricing.discountPrice,
            listPrice: linked?.listPrice ?? pricing.price,
          };
        }),
      })),
    };
  });

  const byCategory = {};
  for (const meta of Object.values(CATEGORY_META)) {
    byCategory[meta.id] = {
      ...meta,
      items: groups.filter((g) => g.category === meta.id),
    };
  }

  return {
    pricing: PRICING,
    categories: byCategory,
    groups,
    updatedAt: "1405-07 / 2026-10",
  };
}

async function ensureDefaultRecords() {
  const count = await SwimmingRecord.countDocuments();
  if (count > 0) return { seeded: false, count };
  const docs = DEFAULT_SWIMMING_RECORDS.map((row, index) => ({
    ...row,
    highlight: Boolean(row.highlight),
    sortOrder: index,
  }));
  await SwimmingRecord.insertMany(docs);
  return { seeded: true, count: docs.length };
}

async function listRecords() {
  await ensureDefaultRecords();
  const rows = await SwimmingRecord.find().sort({ sortOrder: 1, discipline: 1, distance: 1 }).lean();
  return { items: rows.map(toPublicRecord), total: rows.length };
}

async function replaceRecords(items) {
  if (!Array.isArray(items) || items.length < 1) {
    throw new AppError("لیست رکوردها خالی است", { statusCode: 400, code: "VALIDATION_ERROR" });
  }

  const normalized = items.map((row, index) => ({
    event: String(row.event || "").trim(),
    time: Number(row.time),
    distance: Number(row.distance),
    holder: String(row.holder || "").trim(),
    type: row.type,
    discipline: String(row.discipline || "").trim(),
    highlight: Boolean(row.highlight),
    sortOrder: row.sortOrder != null ? Number(row.sortOrder) : index,
  }));

  for (const row of normalized) {
    if (!row.event || !row.holder || !row.discipline) {
      throw new AppError("فیلدهای event/holder/discipline الزامی است", {
        statusCode: 400,
        code: "VALIDATION_ERROR",
      });
    }
    if (!["خارجی", "داخلی"].includes(row.type)) {
      throw new AppError("type باید خارجی یا داخلی باشد", { statusCode: 400, code: "VALIDATION_ERROR" });
    }
    if (!(row.time >= 0) || !(row.distance >= 1)) {
      throw new AppError("time/distance نامعتبر است", { statusCode: 400, code: "VALIDATION_ERROR" });
    }
  }

  await SwimmingRecord.deleteMany({});
  const inserted = await SwimmingRecord.insertMany(normalized);
  logEvent("SWIMMING_RECORDS_REPLACED", { count: inserted.length });
  return { items: inserted.map(toPublicRecord), total: inserted.length };
}

async function resetRecordsToDefault() {
  await SwimmingRecord.deleteMany({});
  return replaceRecords(DEFAULT_SWIMMING_RECORDS);
}

module.exports = {
  syncCatalog,
  getSyncStatus,
  getMarketingCatalog,
  listRecords,
  replaceRecords,
  resetRecordsToDefault,
  ensureDefaultRecords,
  PRICING,
  flattenSlots,
};
