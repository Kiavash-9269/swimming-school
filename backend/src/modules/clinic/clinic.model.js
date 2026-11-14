const mongoose = require("mongoose");

/**
 * A swim clinic program. Admins create/edit/delete these from the admin panel;
 * families register against a specific clinic (ClinicRegistration.clinicId).
 */
const clinicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    subtitle: { type: String, trim: true, maxlength: 160, default: "" },
    description: { type: String, trim: true, maxlength: 1500, default: "" },
    priceToman: { type: Number, min: 0, default: 0 },
    startDate: { type: String, trim: true, maxlength: 60, default: "" },
    endDate: { type: String, trim: true, maxlength: 60, default: "" },
    schedule: { type: String, trim: true, maxlength: 200, default: "" },
    location: { type: String, trim: true, maxlength: 200, default: "" },
    capacity: { type: Number, min: 0, max: 10000, default: 0 },
    phone: { type: String, trim: true, maxlength: 20, default: "" },
    notice: { type: String, trim: true, maxlength: 600, default: "" },
    /** When false the clinic stays visible but its registration form is closed. */
    enabled: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, collection: "clinics" },
);

clinicSchema.index({ createdAt: -1 });

const Clinic = mongoose.model("Clinic", clinicSchema);

module.exports = { Clinic };
