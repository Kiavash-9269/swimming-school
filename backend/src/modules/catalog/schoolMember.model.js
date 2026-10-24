const mongoose = require("mongoose");

const schoolMemberSchema = new mongoose.Schema(
  {
    externalMemberId: { type: String, required: true, trim: true, maxlength: 40, unique: true },
    sourceList: { type: String, required: true, enum: ["women", "men"], index: true },
    phone: { type: String, trim: true, maxlength: 11, default: "" },
    fullName: { type: String, required: true, trim: true, maxlength: 160 },
    firstName: { type: String, required: true, trim: true, maxlength: 80 },
    lastName: { type: String, required: true, trim: true, maxlength: 80 },
    gender: { type: String, required: true, enum: ["MALE", "FEMALE"], index: true },
    birthDateJalali: { type: String, trim: true, maxlength: 20, default: "" },
    membershipDateJalali: { type: String, trim: true, maxlength: 20, default: "" },
    updatedAtJalali: { type: String, trim: true, maxlength: 20, default: "" },
    nickname: { type: String, trim: true, maxlength: 80, default: "" },
    fatherName: { type: String, trim: true, maxlength: 80, default: "" },
    address: { type: String, trim: true, maxlength: 300, default: "" },
    keypadId: { type: String, trim: true, maxlength: 40, default: "" },
    registeredAt: { type: Date, default: null, index: true },
    registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, collection: "school_members" },
);

schoolMemberSchema.index({ lastName: 1, firstName: 1 });
schoolMemberSchema.index({ fullName: 1 });

const SchoolMember = mongoose.model("SchoolMember", schoolMemberSchema);

module.exports = { SchoolMember };
