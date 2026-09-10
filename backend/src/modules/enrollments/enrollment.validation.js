const { z } = require("zod");
const { GENDERS, PARTICIPANT_RELATIONS, COMPLIANCE_STATUSES } = require("../courses/domain.constants");
const { objectId } = require("../courses/courses.validation");

const iranianPhone = z
  .string()
  .trim()
  .regex(/^09\d{9}$/, "Invalid Iranian mobile number");

const emergencyContactSchema = z
  .object({
    name: z.string().trim().max(120).optional().default(""),
    phone: z
      .string()
      .trim()
      .max(11)
      .optional()
      .default("")
      .refine((v) => !v || /^09\d{9}$/.test(v), "Invalid Iranian mobile number"),
    relationship: z.string().trim().max(60).optional().default(""),
  })
  .strict();

const participantBody = z
  .object({
    firstName: z.string().trim().min(2).max(80),
    lastName: z.string().trim().min(2).max(80),
    birthDate: z.coerce.date(),
    gender: z.enum([GENDERS.MALE, GENDERS.FEMALE]),
    relation: z.enum(Object.values(PARTICIPANT_RELATIONS)).optional().default(PARTICIPANT_RELATIONS.SELF),
    phone: z
      .string()
      .trim()
      .max(11)
      .optional()
      .default("")
      .refine((v) => !v || /^09\d{9}$/.test(v), "Invalid Iranian mobile number"),
    emergencyContact: emergencyContactSchema.optional(),
  })
  .strict();

const participantUpdateBody = z
  .object({
    firstName: z.string().trim().min(2).max(80).optional(),
    lastName: z.string().trim().min(2).max(80).optional(),
    birthDate: z.coerce.date().optional(),
    gender: z.enum([GENDERS.MALE, GENDERS.FEMALE]).optional(),
    relation: z.enum(Object.values(PARTICIPANT_RELATIONS)).optional(),
    phone: z
      .string()
      .trim()
      .max(11)
      .optional()
      .refine((v) => v == null || v === "" || /^09\d{9}$/.test(v), "Invalid Iranian mobile number"),
    emergencyContact: emergencyContactSchema.optional(),
  })
  .strict();

const reservationBody = z.object({
  classId: objectId,
  participantId: objectId,
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});

const waitlistBody = z.object({
  classId: objectId,
  participantId: objectId,
});

const paymentCallbackBody = z
  .object({
    paymentId: objectId,
    success: z.boolean(),
    providerRef: z.string().trim().max(120).optional(),
    authority: z.string().trim().max(120).optional(),
  })
  .strict();

const confirmEnrollmentBody = z
  .object({
    reservationId: objectId,
    discountCode: z.string().trim().max(64).optional(),
    idempotencyKey: z.string().trim().min(8).max(120).optional(),
  })
  .strict();

const eligibilityBody = z.object({
  classId: objectId,
  participantId: objectId,
});

const discountBody = z.object({
  code: z.string().trim().min(3).max(64),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.coerce.number().min(0),
  scope: z.enum(["ALL_CLASSES", "SPECIFIC_CLASS", "SPECIFIC_COURSE_TEMPLATE"]).optional(),
  classId: objectId.optional().nullable(),
  courseTemplateId: objectId.optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  usageLimit: z.coerce.number().int().min(1).optional().nullable(),
  perUserLimit: z.coerce.number().int().min(1).optional().default(1),
  minimumAmount: z.coerce.number().min(0).optional().default(0),
  isActive: z.boolean().optional().default(true),
});

const complianceSubmitBody = z
  .object({
    status: z.enum(Object.values(COMPLIANCE_STATUSES)).optional().default(COMPLIANCE_STATUSES.PENDING),
    providerName: z.string().trim().max(120).optional(),
    policyRef: z.string().trim().max(120).optional(),
    documentType: z.string().trim().max(80).optional(),
    startDate: z.coerce.date().optional().nullable(),
    expiresAt: z.coerce.date().optional().nullable(),
    notes: z.string().trim().max(500).optional(),
    originalFilename: z.string().trim().max(180).optional(),
    mimeType: z.string().trim().max(80).optional(),
    sizeBytes: z.coerce.number().int().positive().max(5 * 1024 * 1024).optional(),
  })
  .strict();

const documentReviewBody = z
  .object({
    decision: z.enum([COMPLIANCE_STATUSES.APPROVED, COMPLIANCE_STATUSES.REJECTED]),
    rejectionReason: z.string().trim().max(500).optional(),
  })
  .strict();

const medicalProfileBody = z
  .object({
    hasMedicalCondition: z.boolean().optional().default(false),
    allergies: z.string().trim().max(500).optional().default(""),
    medications: z.string().trim().max(500).optional().default(""),
    notes: z.string().trim().max(1000).optional().default(""),
    approvalStatus: z.enum(["NONE", "PENDING", "APPROVED", "REJECTED", "EXPIRED"]).optional(),
  })
  .strict();

const attendanceBody = z
  .object({
    classId: objectId,
    sessionId: objectId,
    participantId: objectId,
    status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED", "UNKNOWN"]),
    notifyAbsent: z.boolean().optional().default(true),
  })
  .strict();

const attendanceSubmitBody = z
  .object({
    classId: objectId,
    sessionId: objectId,
    marks: z
      .array(
        z
          .object({
            participantId: objectId,
            status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED"]),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict();

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().trim().max(80).optional(),
  gender: z.enum([GENDERS.MALE, GENDERS.FEMALE]).optional(),
  isActive: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  ownerUserId: objectId.optional(),
  status: z.string().trim().max(40).optional(),
  classId: objectId.optional(),
});

module.exports = {
  iranianPhone,
  emergencyContactSchema,
  participantBody,
  participantUpdateBody,
  reservationBody,
  waitlistBody,
  confirmEnrollmentBody,
  paymentCallbackBody,
  eligibilityBody,
  discountBody,
  complianceSubmitBody,
  documentReviewBody,
  medicalProfileBody,
  attendanceBody,
  attendanceSubmitBody,
  paginationQuery,
};
