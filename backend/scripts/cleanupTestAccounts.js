/**
 * Remove seed/sample/test accounts (not the real admin, not club imports).
 */
require("dotenv").config();
const mongoose = require("mongoose");
const { env } = require("../src/config/env");

const KEEP_PHONES = new Set(["09301905219", "09000000000"]);

const SAMPLE_PHONES = new Set([
  "09155556666",
  "09121112233",
  "09035975219", // آریا تست پیامک
]);

function isSampleUser(u) {
  if (KEEP_PHONES.has(u.phone)) return false;
  if (u.role === "ADMIN") return false;
  if (SAMPLE_PHONES.has(u.phone)) return true;
  const name = `${u.firstName || ""} ${u.lastName || ""}`;
  if (/تست|test|demo|نمونه|آزمایش|sample/i.test(name)) return true;
  // garbled seed name from earliest fixture
  if (u.phone === "09155556666") return true;
  return false;
}

async function main() {
  const dry = process.argv.includes("--dry");
  await mongoose.connect(env.MONGODB_URI);
  const db = mongoose.connection;

  const users = await db.collection("users").find({}).toArray();
  const targetUsers = users.filter(isSampleUser);

  const testParticipants = await db
    .collection("participants")
    .find({
      $or: [
        { firstName: /تست|test/i },
        { lastName: /تست|test|نمونه/i },
        { externalId: "club:5555" },
        { ownerUserId: { $in: targetUsers.map((u) => u._id) } },
      ],
    })
    .toArray();

  console.log(
    JSON.stringify(
      {
        dry,
        users: targetUsers.map((u) => ({
          id: String(u._id),
          phone: u.phone,
          name: `${u.firstName} ${u.lastName}`,
          role: u.role,
        })),
        participants: testParticipants.map((p) => ({
          id: String(p._id),
          name: `${p.firstName} ${p.lastName}`,
          phone: p.phone,
          externalId: p.externalId || "",
        })),
      },
      null,
      2,
    ),
  );

  if (dry) {
    await mongoose.disconnect();
    return;
  }

  const userIds = targetUsers.map((u) => u._id);
  const participantIds = testParticipants.map((p) => p._id);

  const enrollments = await db.collection("enrollments").deleteMany({
    $or: [
      ...(participantIds.length ? [{ participantId: { $in: participantIds } }] : []),
      ...(userIds.length ? [{ userId: { $in: userIds } }] : []),
    ],
  });
  const waitlist = await db.collection("waitlists").deleteMany({
    $or: [
      ...(participantIds.length ? [{ participantId: { $in: participantIds } }] : []),
      ...(userIds.length ? [{ userId: { $in: userIds } }] : []),
    ],
  }).catch(() => ({ deletedCount: 0 }));
  const notifs = userIds.length
    ? await db.collection("notifications").deleteMany({ userId: { $in: userIds } })
    : { deletedCount: 0 };
  const parts = participantIds.length
    ? await db.collection("participants").deleteMany({ _id: { $in: participantIds } })
    : { deletedCount: 0 };
  const userDel = userIds.length
    ? await db.collection("users").deleteMany({ _id: { $in: userIds } })
    : { deletedCount: 0 };

  console.log(
    JSON.stringify(
      {
        deletedUsers: userDel.deletedCount,
        deletedParticipants: parts.deletedCount,
        deletedEnrollments: enrollments.deletedCount,
        deletedWaitlists: waitlist.deletedCount || 0,
        deletedNotifications: notifs.deletedCount,
      },
      null,
      2,
    ),
  );
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
