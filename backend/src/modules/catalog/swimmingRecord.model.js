const mongoose = require("mongoose");

const swimmingRecordSchema = new mongoose.Schema(
  {
    event: { type: String, required: true, trim: true, maxlength: 120 },
    time: { type: Number, required: true, min: 0 },
    distance: { type: Number, required: true, min: 1 },
    holder: { type: String, required: true, trim: true, maxlength: 160 },
    type: { type: String, required: true, enum: ["خارجی", "داخلی"], index: true },
    discipline: { type: String, required: true, trim: true, maxlength: 80, index: true },
    highlight: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true, collection: "swimming_records" },
);

swimmingRecordSchema.index({ event: 1 }, { unique: true });
swimmingRecordSchema.index({ discipline: 1, type: 1, distance: 1 });

const SwimmingRecord = mongoose.model("SwimmingRecord", swimmingRecordSchema);

module.exports = { SwimmingRecord };
