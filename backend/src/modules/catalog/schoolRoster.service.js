const mongoose = require("mongoose");
const { AppError } = require("../../utils/AppError");
const { logEvent } = require("../../services/logging");
const { SchoolMember } = require("./schoolMember.model");

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toPublicMember(doc) {
  return {
    id: String(doc._id),
    externalMemberId: doc.externalMemberId,
    sourceList: doc.sourceList,
    phone: doc.phone || "",
    fullName: doc.fullName,
    firstName: doc.firstName,
    lastName: doc.lastName,
    gender: doc.gender,
    birthDateJalali: doc.birthDateJalali || "",
    membershipDateJalali: doc.membershipDateJalali || "",
    nickname: doc.nickname || "",
    fatherName: doc.fatherName || "",
    address: doc.address || "",
    keypadId: doc.keypadId || "",
    registered: Boolean(doc.registeredAt),
    registeredAt: doc.registeredAt || null,
  };
}

async function listRoster({ q, gender, registered, page = 1, limit = 20 } = {}) {
  const filter = {};
  const term = String(q || "").trim().slice(0, 80);
  if (term) {
    const parts = term.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      filter.firstName = new RegExp(escapeRegex(parts.slice(0, -1).join(" ")), "i");
      filter.lastName = new RegExp(escapeRegex(parts[parts.length - 1]), "i");
    } else {
      const rx = new RegExp(escapeRegex(term), "i");
      filter.$or = [{ firstName: rx }, { lastName: rx }, { fullName: rx }, { phone: term }];
    }
  }
  if (gender === "MALE" || gender === "FEMALE") filter.gender = gender;
  if (registered === true) filter.registeredAt = { $ne: null };
  if (registered === false) filter.registeredAt = null;

  const skip = (page - 1) * limit;
  const [rows, total] = await Promise.all([
    SchoolMember.find(filter).sort({ lastName: 1, firstName: 1 }).skip(skip).limit(limit).lean(),
    SchoolMember.countDocuments(filter),
  ]);

  return {
    items: rows.map(toPublicMember),
    total,
    page,
    limit,
  };
}

async function registerMember({ memberId, actorId }) {
  if (!mongoose.isValidObjectId(memberId)) {
    throw new AppError("شناسه عضو نامعتبر است", { statusCode: 400, code: "VALIDATION_ERROR" });
  }

  const existing = await SchoolMember.findById(memberId);
  if (!existing) {
    throw new AppError("این نام در فهرست مدرسه پیدا نشد", { statusCode: 404, code: "MEMBER_NOT_FOUND" });
  }
  if (existing.registeredAt) return toPublicMember(existing);

  existing.registeredAt = new Date();
  existing.registeredBy = actorId;
  await existing.save();

  logEvent("SCHOOL_MEMBER_REGISTERED", {
    memberId: String(existing._id),
    actorId: String(actorId),
    gender: existing.gender,
  });

  return toPublicMember(existing);
}

async function replaceRoster(members) {
  if (!Array.isArray(members) || !members.length) {
    throw new AppError("فهرست اعضا خالی است", { statusCode: 400, code: "VALIDATION_ERROR" });
  }
  await SchoolMember.deleteMany({});
  await SchoolMember.insertMany(members, { ordered: false });
  return SchoolMember.countDocuments();
}

module.exports = {
  listRoster,
  registerMember,
  replaceRoster,
  toPublicMember,
};
