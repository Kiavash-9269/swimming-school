const mongoose = require("mongoose");

/**
 * Editable site settings owned by admins (card-to-card info, clinic program).
 * One document per key so admins can change prices/dates without a deploy.
 */
const siteSettingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, maxlength: 60 },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true, collection: "site_settings" },
);

const SiteSetting = mongoose.model("SiteSetting", siteSettingSchema);

module.exports = { SiteSetting };
