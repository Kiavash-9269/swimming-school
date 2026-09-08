const { z } = require("zod");
const { objectId } = require("../courses/courses.validation");
const {
  GENDERS,
  ENROLLMENT_STATUSES,
  PAYMENT_STATUSES,
  COMPLIANCE_STATUSES,
  WAITLIST_STATUSES,
  CLASS_STATUSES,
} = require("../courses/domain.constants");

const sortDir = z.enum(["asc", "desc"]).optional().default("desc");

const paginationFields = {
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  sortDir,
};

function withDateRangeRefine(schema) {
  return schema.superRefine((data, ctx) => {
    if (data.fromDate && data.toDate && data.fromDate.getTime() > data.toDate.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toDate"],
        message: "toDate must be >= fromDate",
      });
    }
  });
}

const participantReportQuery = withDateRangeRefine(
  z
    .object({
      ...paginationFields,
      gender: z.enum([GENDERS.MALE, GENDERS.FEMALE]).optional(),
      isActive: z
        .enum(["true", "false"])
        .optional()
        .transform((v) => (v === undefined ? undefined : v === "true")),
      ownerUserId: objectId.optional(),
      ageMin: z.coerce.number().int().min(0).max(120).optional(),
      ageMax: z.coerce.number().int().min(0).max(120).optional(),
      q: z.string().trim().max(80).optional(),
      sortBy: z.enum(["createdAt", "birthDate", "firstName", "lastName"]).optional().default("createdAt"),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.ageMin != null && data.ageMax != null && data.ageMax < data.ageMin) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ageMax"], message: "ageMax must be >= ageMin" });
      }
    }),
);

const enrollmentReportQuery = withDateRangeRefine(
  z
    .object({
      ...paginationFields,
      classId: objectId.optional(),
      courseTemplateId: objectId.optional(),
      instructorId: objectId.optional(),
      participantId: objectId.optional(),
      userId: objectId.optional(),
      status: z.enum(Object.values(ENROLLMENT_STATUSES)).optional(),
      sortBy: z
        .enum(["createdAt", "confirmedAt", "finalAmount", "priceCharged", "status"])
        .optional()
        .default("createdAt"),
    })
    .strict(),
);

const paymentReportQuery = withDateRangeRefine(
  z
    .object({
      ...paginationFields,
      status: z.enum(Object.values(PAYMENT_STATUSES)).optional(),
      provider: z.string().trim().max(40).optional(),
      userId: objectId.optional(),
      enrollmentId: objectId.optional(),
      classId: objectId.optional(),
      sortBy: z.enum(["createdAt", "amount", "verifiedAt", "status"]).optional().default("createdAt"),
    })
    .strict(),
);

const classReportQuery = withDateRangeRefine(
  z
    .object({
      ...paginationFields,
      status: z.enum(Object.values(CLASS_STATUSES)).optional(),
      instructorId: objectId.optional(),
      courseTemplateId: objectId.optional(),
      sortBy: z.enum(["createdAt", "startDate", "price", "capacity", "title"]).optional().default("startDate"),
    })
    .strict(),
);

const attendanceReportQuery = withDateRangeRefine(
  z
    .object({
      ...paginationFields,
      classId: objectId.optional(),
      sessionId: objectId.optional(),
      participantId: objectId.optional(),
      status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED", "UNKNOWN"]).optional(),
      sortBy: z.enum(["createdAt", "markedAt", "status"]).optional().default("markedAt"),
    })
    .strict(),
);

const waitlistReportQuery = withDateRangeRefine(
  z
    .object({
      ...paginationFields,
      classId: objectId.optional(),
      status: z.enum(Object.values(WAITLIST_STATUSES)).optional(),
      participantId: objectId.optional(),
      sortBy: z.enum(["createdAt", "position", "status"]).optional().default("position"),
    })
    .strict(),
);

const discountReportQuery = withDateRangeRefine(
  z
    .object({
      ...paginationFields,
      isActive: z
        .enum(["true", "false"])
        .optional()
        .transform((v) => (v === undefined ? undefined : v === "true")),
      sortBy: z.enum(["createdAt", "code", "usedCount"]).optional().default("createdAt"),
    })
    .strict(),
);

const complianceReportQuery = withDateRangeRefine(
  z
    .object({
      ...paginationFields,
      kind: z.enum(["insurance", "medical", "both"]).optional().default("both"),
      status: z.enum(Object.values(COMPLIANCE_STATUSES)).optional(),
      participantId: objectId.optional(),
      sortBy: z.enum(["createdAt", "updatedAt", "status"]).optional().default("updatedAt"),
    })
    .strict(),
);

module.exports = {
  participantReportQuery,
  enrollmentReportQuery,
  paymentReportQuery,
  classReportQuery,
  attendanceReportQuery,
  waitlistReportQuery,
  discountReportQuery,
  complianceReportQuery,
};
