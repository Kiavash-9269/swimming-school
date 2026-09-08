const mongoose = require("mongoose");

const instructorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    phone: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, maxlength: 2000, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

instructorSchema.index({ isActive: 1, name: 1 });

const Instructor = mongoose.model("Instructor", instructorSchema);

module.exports = { Instructor };
