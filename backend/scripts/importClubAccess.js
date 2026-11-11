/**
 * One-shot: import Club table from a local .accdb into participants.
 * Usage: node scripts/importClubAccess.js "C:\path\to\db.accdb"
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { convertAndImportAccess } = require("../src/modules/enrollments/participantImport.service");

async function main() {
  const filePath = process.argv[2] || path.join(
    process.env.USERPROFILE || "",
    "Downloads",
    "Telegram Desktop",
    "db.accdb",
  );
  if (!fs.existsSync(filePath)) {
    console.error("File not found:", filePath);
    process.exit(1);
  }

  const buffer = fs.readFileSync(filePath);
  console.log("Reading", filePath, `(${buffer.length} bytes)`);

  await mongoose.connect(env.MONGODB_URI);
  const actorId = new mongoose.Types.ObjectId();
  const started = Date.now();
  const out = await convertAndImportAccess({
    buffer,
    originalName: path.basename(filePath),
    actorId,
    importRows: true,
  });
  console.log(JSON.stringify(out.summary, null, 2));
  console.log(`Done in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
