/**
 * One-off: move the single clinic stored in site_settings into the new clinics
 * collection, so existing data shows up in the admin clinics list.
 *   node scripts/seedClinicFromSettings.js
 */
require("dotenv").config();
const mongoose = require("mongoose");

(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const existing = await db.collection("clinics").countDocuments();
  if (existing > 0) {
    console.log(JSON.stringify({ skipped: true, reason: "clinics already exist", count: existing }));
    await mongoose.disconnect();
    return;
  }

  const setting = await db.collection("site_settings").findOne({ key: "clinic" });
  const v = setting?.value || {};
  if (!v.title) {
    console.log(JSON.stringify({ skipped: true, reason: "no clinic settings to seed" }));
    await mongoose.disconnect();
    return;
  }

  const now = new Date();
  const doc = {
    title: v.title || "کلینیک شنا",
    subtitle: v.subtitle || "",
    description: v.description || "",
    priceToman: Number(v.priceToman || 0),
    startDate: v.startDate || "",
    endDate: v.endDate || "",
    schedule: v.schedule || "",
    location: v.location || "",
    capacity: Number(v.capacity || 0),
    phone: v.phone || "",
    notice: v.notice || "",
    enabled: Boolean(v.enabled),
    createdBy: null,
    createdAt: now,
    updatedAt: now,
    __v: 0,
  };

  const result = await db.collection("clinics").insertOne(doc);
  console.log(
    JSON.stringify({ seeded: true, id: result.insertedId.toString(), title: doc.title, enabled: doc.enabled }),
  );
  await mongoose.disconnect();
})().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
