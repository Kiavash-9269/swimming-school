const { z } = require("zod");
const { GENDERS, CLASS_STATUSES, DAYS_OF_WEEK } = require("./domain.constants");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "شناسه نامعتبر است");

const courseTemplateFields = {
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).optional().default(""),
  level: z.string().trim().min(1).max(80),
  ageMin: z.coerce.number().int().min(0).max(120),
  ageMax: z.coerce.number().int().min(0).max(120),
  genderRestriction: z.enum([GENDERS.MALE, GENDERS.FEMALE]).default(GENDERS.MALE),
  prerequisites: z.array(objectId).optional().default([]),
  requiresInsurance: z.boolean().optional().default(false),
  requiresMedicalApproval: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
};

function refineAges(data, ctx) {
  if (data.ageMin != null && data.ageMax != null && data.ageMax < data.ageMin) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ageMax"], message: "ageMax must be >= ageMin" });
  }
}

const courseTemplateBody = z.object(courseTemplateFields).superRefine(refineAges);
const courseTemplateUpdate = z.object({
  title: courseTemplateFields.title.optional(),
  description: courseTemplateFields.description,
  level: courseTemplateFields.level.optional(),
  ageMin: courseTemplateFields.ageMin.optional(),
  ageMax: courseTemplateFields.ageMax.optional(),
  genderRestriction: z.enum([GENDERS.MALE, GENDERS.FEMALE]).optional(),
  prerequisites: z.array(objectId).optional(),
  requiresInsurance: z.boolean().optional(),
  requiresMedicalApproval: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).superRefine(refineAges);

/** Empty string / whitespace → null so admin forms can leave userId blank. */
const optionalNullableObjectId = z.preprocess((value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
}, objectId.nullable().optional());

const instructorBody = z.object({
  userId: optionalNullableObjectId,
  name: z.string().trim().min(2, "نام مربی حداقل ۲ کاراکتر باشد").max(160),
  phone: z.string().trim().max(20).optional().default(""),
  bio: z.string().trim().max(2000).optional().default(""),
  isActive: z.boolean().optional().default(true),
});

const instructorUpdate = z
  .object({
    userId: optionalNullableObjectId,
    name: z.string().trim().min(2, "نام مربی حداقل ۲ کاراکتر باشد").max(160).optional(),
    phone: z.string().trim().max(20).optional(),
    bio: z.string().trim().max(2000).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "حداقل یک فیلد برای به‌روزرسانی لازم است",
  });

const listInstructorsQuery = z
  .object({
    activeOnly: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => (v == null ? undefined : v === "true")),
  })
  .strict();

const classBody = z
  .object({
    courseTemplateId: objectId,
    title: z.string().trim().min(2).max(200),
    instructorId: objectId,
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    daysOfWeek: z.array(z.coerce.number().int()).min(1),
    startTime: z.string().regex(/^\d{1,2}:\d{2}$/),
    endTime: z.string().regex(/^\d{1,2}:\d{2}$/),
    timezone: z.string().trim().min(1).optional(),
    totalSessions: z.coerce.number().int().min(1).max(200),
    price: z.coerce.number().min(0),
    capacity: z.coerce.number().int().min(1).max(500),
  })
  .superRefine((data, ctx) => {
    if (!data.daysOfWeek.every((d) => DAYS_OF_WEEK.includes(d))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["daysOfWeek"], message: "daysOfWeek must be 0-6" });
    }
  });

const classUpdate = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  instructorId: objectId.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  daysOfWeek: z.array(z.coerce.number().int()).min(1).optional(),
  startTime: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{1,2}:\d{2}$/).optional(),
  timezone: z.string().trim().min(1).optional(),
  totalSessions: z.coerce.number().int().min(1).max(200).optional(),
  price: z.coerce.number().min(0).optional(),
  capacity: z.coerce.number().int().min(1).max(500).optional(),
});

const listClassesQuery = z.object({
  status: z
    .enum([
      CLASS_STATUSES.DRAFT,
      CLASS_STATUSES.PUBLISHED,
      CLASS_STATUSES.REGISTRATION_OPEN,
      CLASS_STATUSES.REGISTRATION_CLOSED,
      CLASS_STATUSES.IN_PROGRESS,
      CLASS_STATUSES.COMPLETED,
      CLASS_STATUSES.CANCELLED,
      CLASS_STATUSES.ARCHIVED,
    ])
    .optional(),
  courseTemplateId: objectId.optional(),
});

/** Secure instructor-scoped class list — status filter only (no client instructorId). */
const myClassesQuery = z
  .object({
    status: listClassesQuery.shape.status,
  })
  .strict();

module.exports = {
  objectId,
  courseTemplateBody,
  courseTemplateUpdate,
  instructorBody,
  instructorUpdate,
  listInstructorsQuery,
  classBody,
  classUpdate,
  listClassesQuery,
  myClassesQuery,
};
