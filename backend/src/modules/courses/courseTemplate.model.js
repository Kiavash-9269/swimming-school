const mongoose = require("mongoose");
const { GENDERS } = require("./domain.constants");

const courseTemplateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 4000, default: "" },
    level: { type: String, required: true, trim: true, maxlength: 80 },
    ageMin: { type: Number, required: true, min: 0, max: 120 },
    ageMax: { type: Number, required: true, min: 0, max: 120 },
    genderRestriction: {
      type: String,
      enum: Object.values(GENDERS),
      default: GENDERS.ANY,
    },
    prerequisites: [{ type: mongoose.Schema.Types.ObjectId, ref: "CourseTemplate" }],
    requiresInsurance: { type: Boolean, default: false },
    requiresMedicalApproval: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

courseTemplateSchema.index({ isActive: 1, level: 1 });
courseTemplateSchema.index({ title: 1 });

courseTemplateSchema.pre("validate", function validateAges() {
  if (this.ageMax < this.ageMin) {
    this.invalidate("ageMax", "ageMax must be >= ageMin");
  }
});

const CourseTemplate = mongoose.model("CourseTemplate", courseTemplateSchema);

module.exports = { CourseTemplate };
