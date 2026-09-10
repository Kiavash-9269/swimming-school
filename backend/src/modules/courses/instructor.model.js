const mongoose = require("mongoose");

const instructorSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    phone: { type: String, trim: true, default: "" },
    bio: { type: String, trim: true, maxlength: 2000, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

instructorSchema.index({ isActive: 1, name: 1 });
// At most one instructor document may hold a given userId (active or inactive).
instructorSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } },
);

const Instructor = mongoose.model("Instructor", instructorSchema);

module.exports = { Instructor };
