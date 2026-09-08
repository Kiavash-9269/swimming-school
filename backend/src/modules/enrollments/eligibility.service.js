const { AppError } = require("../../utils/AppError");
const { ageFromBirthDate, assertValidBirthDate } = require("../../utils/age");
const { GENDERS, COMPLIANCE_STATUSES, ENROLLMENT_STATUSES, CLASS_STATUSES } = require("../courses/domain.constants");
const { CourseTemplate } = require("../courses/courseTemplate.model");
const { CourseClass } = require("../courses/courseClass.model");
const { Enrollment } = require("./enrollment.model");
const { InsuranceRecord } = require("../compliance/insurance.model");
const { MedicalDocument } = require("../compliance/medical.model");

const RULE_VERSION = "eligibility-v1";

/**
 * Insurance must be APPROVED and cover the evaluation instant (and ideally class start).
 */
function isInsuranceValidForPeriod(record, { asOf = new Date(), classStart = null } = {}) {
  if (!record || record.status !== COMPLIANCE_STATUSES.APPROVED) return false;
  // Metadata-only fake storageKey must never count as compliance approval.
  if (record.storageKey && !record.persisted) return false;
  const instant = asOf.getTime();
  if (record.startDate && new Date(record.startDate).getTime() > instant) return false;
  if (record.expiresAt && new Date(record.expiresAt).getTime() <= instant) return false;
  if (classStart) {
    const start = new Date(classStart).getTime();
    if (record.expiresAt && new Date(record.expiresAt).getTime() <= start) return false;
    if (record.startDate && new Date(record.startDate).getTime() > start) return false;
  }
  return true;
}

function isMedicalValid(record, asOf = new Date()) {
  if (!record || record.status !== COMPLIANCE_STATUSES.APPROVED) return false;
  if (record.storageKey && !record.persisted) return false;
  if (record.expiresAt && new Date(record.expiresAt).getTime() <= asOf.getTime()) return false;
  return true;
}

/**
 * @returns {{ eligible: boolean, reasons: string[], age: number, evaluatedAt: Date, ruleVersion: string }}
 */
async function checkEligibility(participant, courseClass, courseTemplate, { asOf = new Date() } = {}) {
  const reasons = [];
  const evaluatedAt = asOf;

  if (!participant?.isActive) {
    reasons.push("PARTICIPANT_INACTIVE");
  }

  try {
    assertValidBirthDate(participant.birthDate, asOf);
  } catch {
    reasons.push("INVALID_BIRTH_DATE");
  }

  const template = courseTemplate || (await CourseTemplate.findById(courseClass.courseTemplateId));
  if (!template) {
    throw new AppError("Course template not found", {
      statusCode: 404,
      code: "COURSE_NOT_FOUND",
    });
  }

  if (
    ![CLASS_STATUSES.REGISTRATION_OPEN, CLASS_STATUSES.IN_PROGRESS].includes(courseClass.status) &&
    courseClass.status !== CLASS_STATUSES.PUBLISHED
  ) {
    // Soft signal — reservation layer also gates REGISTRATION_OPEN
  }

  const age = ageFromBirthDate(participant.birthDate, asOf);
  if (age < template.ageMin || age > template.ageMax) {
    reasons.push("AGE_NOT_ALLOWED");
  }

  if (template.genderRestriction && template.genderRestriction !== GENDERS.ANY) {
    if (participant.gender !== template.genderRestriction) {
      reasons.push("GENDER_NOT_ALLOWED");
    }
  }

  if (template.prerequisites?.length) {
    for (const prereqId of template.prerequisites) {
      const classIds = await CourseClass.find({ courseTemplateId: prereqId }).distinct("_id");
      if (!classIds.length) {
        reasons.push("PREREQUISITE_NOT_COMPLETED");
        break;
      }
      const completed = await Enrollment.exists({
        participantId: participant._id,
        classId: { $in: classIds },
        status: ENROLLMENT_STATUSES.COMPLETED,
      });
      if (!completed) {
        reasons.push("PREREQUISITE_NOT_COMPLETED");
        break;
      }
    }
  }

  if (template.requiresInsurance) {
    const insurance = await InsuranceRecord.findOne({
      participantId: participant._id,
      status: COMPLIANCE_STATUSES.APPROVED,
    }).sort({ updatedAt: -1 });
    if (!isInsuranceValidForPeriod(insurance, { asOf, classStart: courseClass.startDate })) {
      reasons.push("INSURANCE_REQUIRED");
    }
  }

  if (template.requiresMedicalApproval) {
    const medical = await MedicalDocument.findOne({
      participantId: participant._id,
      status: COMPLIANCE_STATUSES.APPROVED,
    }).sort({ updatedAt: -1 });
    if (!isMedicalValid(medical, asOf)) {
      reasons.push("MEDICAL_APPROVAL_REQUIRED");
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    age,
    evaluatedAt,
    ruleVersion: RULE_VERSION,
  };
}

function toEligibilitySnapshot(result) {
  return {
    eligible: result.eligible,
    reasons: [...result.reasons],
    age: result.age,
    evaluatedAt: result.evaluatedAt || new Date(),
    ruleVersion: result.ruleVersion || RULE_VERSION,
  };
}

module.exports = {
  checkEligibility,
  ageFromBirthDate,
  assertValidBirthDate,
  isInsuranceValidForPeriod,
  isMedicalValid,
  toEligibilitySnapshot,
  RULE_VERSION,
};
