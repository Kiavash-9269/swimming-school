const mongoose = require("mongoose");
const { CLASS_STATUSES, DAYS_OF_WEEK } = require("./domain.constants");

const courseClassSchema = new mongoose.Schema(
  {
    courseTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CourseTemplate",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      required: true,
      index: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    daysOfWeek: {
      type: [Number],
      required: true,
      validate: {
        validator(v) {
          return Array.isArray(v) && v.length > 0 && v.every((d) => DAYS_OF_WEEK.includes(Number(d)));
        },
        message: "daysOfWeek must be non-empty subset of 0-6",
      },
    },
    startTime: { type: String, required: true, match: /^\d{1,2}:\d{2}$/ },
    endTime: { type: String, required: true, match: /^\d{1,2}:\d{2}$/ },
    timezone: { type: String, required: true, trim: true },
    totalSessions: { type: Number, required: true, min: 1, max: 200 },
    /** Selling price (toman) — usually catalog discountPrice */
    price: { type: Number, required: true, min: 0 },
    /** Optional list/strike price (toman) for marketing display */
    listPrice: { type: Number, min: 0, default: null },
    capacity: { type: Number, required: true, min: 1, max: 500 },
    /** Confirmed/active seats */
    confirmedCount: { type: Number, default: 0, min: 0 },
    /** Active non-expired holds */
    heldCount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: Object.values(CLASS_STATUSES),
      default: CLASS_STATUSES.DRAFT,
      index: true,
    },
    /** Stable marketing/enrollment key from catalog definition */
    catalogKey: { type: String, trim: true, maxlength: 120, default: null },
    catalogGroupKey: { type: String, trim: true, maxlength: 80, default: null },
    catalogCategory: {
      type: String,
      enum: ["men", "women", "public", "hydro"],
      default: undefined,
    },
    pool: { type: String, trim: true, maxlength: 120, default: "" },
    location: { type: String, trim: true, maxlength: 200, default: "" },
    audienceLabel: { type: String, trim: true, maxlength: 200, default: "" },
  },
  { timestamps: true, collection: "course_classes" },
);

courseClassSchema.index({ status: 1, startDate: 1 });
courseClassSchema.index({ courseTemplateId: 1, status: 1 });
courseClassSchema.index({ instructorId: 1, startDate: 1 });
courseClassSchema.index(
  { catalogKey: 1 },
  { unique: true, partialFilterExpression: { catalogKey: { $type: "string" } } },
);
courseClassSchema.index({ catalogGroupKey: 1, catalogCategory: 1 });

courseClassSchema.virtual("availableSeats").get(function availableSeats() {
  return Math.max(0, this.capacity - this.confirmedCount - this.heldCount);
});

const CourseClass = mongoose.model("CourseClass", courseClassSchema);

module.exports = { CourseClass };
