const mongoose = require("mongoose");
const { DISCOUNT_TYPES, DISCOUNT_SCOPES } = require("../courses/domain.constants");

const discountSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    type: { type: String, enum: Object.values(DISCOUNT_TYPES), required: true },
    value: { type: Number, required: true, min: 0 },
    scope: {
      type: String,
      enum: Object.values(DISCOUNT_SCOPES),
      default: DISCOUNT_SCOPES.ALL_CLASSES,
    },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "CourseClass", default: null },
    courseTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: "CourseTemplate", default: null },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    usageLimit: { type: Number, default: null, min: 1 },
    perUserLimit: { type: Number, default: 1, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    minimumAmount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

discountSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

const Discount = mongoose.model("Discount", discountSchema);

module.exports = { Discount };
