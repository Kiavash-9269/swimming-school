/**
 * Upserts ADMIN users. New admins get password = phone number;
 * existing admins keep their password unless ADMIN_PASSWORD_<phone> is set.
 *
 * Usage (on server):
 *   cd /var/www/swimming-school/backend
 *   node ../deploy/ubuntu/fix-mongo-and-admins.js
 *   ADMIN_PASSWORD_09301905219='...' node ../deploy/ubuntu/fix-mongo-and-admins.js
 */
const path = require("path");
const backendRoot = path.join(__dirname, "../../backend");
module.paths.unshift(path.join(backendRoot, "node_modules"));
require("dotenv").config({ path: path.join(backendRoot, ".env") });
const mongoose = require("mongoose");
const argon2 = require("argon2");

const ROLES = { USER: "USER", ADMIN: "ADMIN" };

const admins = [
  { phone: "09301905219", firstName: "Admin", lastName: "One" },
  { phone: "09379579269", firstName: "Admin", lastName: "Two" },
];

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI missing");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const users = db.collection("users");

  for (const a of admins) {
    const override = process.env[`ADMIN_PASSWORD_${a.phone}`];
    const existing = await users.findOne({ phone: a.phone });
    if (existing) {
      const $set = {
        role: ROLES.ADMIN,
        isActive: true,
        phoneVerified: true,
        firstName: existing.firstName || a.firstName,
        lastName: existing.lastName || a.lastName,
        updatedAt: new Date(),
      };
      if (override) $set.passwordHash = await argon2.hash(override, ARGON2_OPTIONS);
      await users.updateOne({ phone: a.phone }, { $set });
      console.log(`updated ADMIN ${a.phone}${override ? " (password changed)" : ""}`);
    } else {
      const password = override || a.phone;
      await users.insertOne({
        phone: a.phone,
        firstName: a.firstName,
        lastName: a.lastName,
        passwordHash: await argon2.hash(password, ARGON2_OPTIONS),
        phoneVerified: true,
        role: ROLES.ADMIN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`created ADMIN ${a.phone}`);
    }
  }

  const listed = await users
    .find({ phone: { $in: admins.map((a) => a.phone) } }, { projection: { phone: 1, role: 1, isActive: 1, firstName: 1, lastName: 1 } })
    .toArray();
  console.log(JSON.stringify(listed, null, 2));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
