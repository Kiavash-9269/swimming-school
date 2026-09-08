const mongoose = require("mongoose");

const GRANT_TYPES = {
  REGISTER: "REGISTER",
  RESET_PASSWORD: "RESET_PASSWORD",
};

const authGrantSchema = new mongoose.Schema(
  {
    jti: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(GRANT_TYPES),
      required: true,
    },
    phone: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

authGrantSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
authGrantSchema.index({ phone: 1, type: 1, createdAt: -1 });

const AuthGrant = mongoose.model("AuthGrant", authGrantSchema);

module.exports = {
  AuthGrant,
  GRANT_TYPES,
};
