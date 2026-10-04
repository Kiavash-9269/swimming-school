const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const names = (await mongoose.connection.db.listCollections().toArray()).map((c) => c.name);
  console.log("collections", names);
  for (const name of names) {
    if (!/otp/i.test(name)) continue;
    const r = await mongoose.connection.db.collection(name).deleteMany({});
    console.log("cleared", name, r.deletedCount);
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
