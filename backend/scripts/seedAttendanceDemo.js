/**
 * Dev seed: separate male/female courses + matching enrollments for attendance/SMS.
 *
 * Usage (from backend/):
 *   node scripts/seedAttendanceDemo.js
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const { env } = require("../src/config/env");
const { hashPassword } = require("../src/utils/password");
const { User, ROLES } = require("../src/modules/auth/user.model");
const { CourseTemplate } = require("../src/modules/courses/courseTemplate.model");
const { Instructor } = require("../src/modules/courses/instructor.model");
const { CourseClass } = require("../src/modules/courses/courseClass.model");
const { ClassSession } = require("../src/modules/courses/classSession.model");
const { Participant } = require("../src/modules/enrollments/participant.model");
const { Enrollment } = require("../src/modules/enrollments/enrollment.model");
const {
  CLASS_STATUSES,
  SESSION_STATUSES,
  ENROLLMENT_STATUSES,
  GENDERS,
  PARTICIPANT_RELATIONS,
} = require("../src/modules/courses/domain.constants");

const SMS_TEST_PHONE = "09035975219";
const DEMO_PASSWORD = "Test1234!";

function dayStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return dayStart(x);
}

async function upsertUser({ phone, firstName, lastName, role }) {
  let user = await User.findOne({ phone });
  if (!user) {
    const existingName = await User.findOne({ firstName, lastName });
    if (existingName) {
      user = existingName;
      user.phone = phone;
      user.role = role;
      user.phoneVerified = true;
      user.isActive = true;
      await user.save();
      return user;
    }
    return User.create({
      phone,
      firstName,
      lastName,
      passwordHash: await hashPassword(DEMO_PASSWORD),
      phoneVerified: true,
      role,
      isActive: true,
    });
  }
  user.firstName = firstName;
  user.lastName = lastName;
  user.role = role;
  user.phoneVerified = true;
  user.isActive = true;
  await user.save();
  return user;
}

async function upsertTemplate({ title, genderRestriction, description }) {
  let template = await CourseTemplate.findOne({ title });
  if (!template) {
    template = await CourseTemplate.create({
      title,
      description,
      level: "مقدماتی",
      ageMin: 5,
      ageMax: 50,
      genderRestriction,
      prerequisites: [],
      requiresInsurance: false,
      requiresMedicalApproval: false,
      isActive: true,
    });
  } else {
    template.genderRestriction = genderRestriction;
    template.description = description;
    template.isActive = true;
    await template.save();
  }
  return template;
}

async function upsertClass({ title, template, instructor, startTime, endTime }) {
  const today = dayStart(new Date());
  let courseClass = await CourseClass.findOne({ title });
  if (!courseClass) {
    courseClass = await CourseClass.create({
      courseTemplateId: template._id,
      title,
      instructorId: instructor._id,
      startDate: today,
      endDate: addDays(today, 28),
      daysOfWeek: [0, 2, 4],
      startTime,
      endTime,
      timezone: "Asia/Tehran",
      totalSessions: 6,
      price: 1500000,
      capacity: 20,
      confirmedCount: 0,
      heldCount: 0,
      status: CLASS_STATUSES.REGISTRATION_OPEN,
    });
  } else {
    courseClass.courseTemplateId = template._id;
    courseClass.instructorId = instructor._id;
    courseClass.startTime = startTime;
    courseClass.endTime = endTime;
    courseClass.status = CLASS_STATUSES.REGISTRATION_OPEN;
    courseClass.heldCount = 0;
    await courseClass.save();
  }

  const sessionSpecs = [
    { sessionNumber: 1, date: addDays(today, -2) },
    { sessionNumber: 2, date: today },
    { sessionNumber: 3, date: addDays(today, 2) },
    { sessionNumber: 4, date: addDays(today, 4) },
  ];
  for (const spec of sessionSpecs) {
    await ClassSession.findOneAndUpdate(
      { classId: courseClass._id, sessionNumber: spec.sessionNumber },
      {
        $set: {
          classId: courseClass._id,
          sessionNumber: spec.sessionNumber,
          date: spec.date,
          startTime,
          endTime,
          status: SESSION_STATUSES.SCHEDULED,
        },
      },
      { upsert: true },
    );
  }
  return courseClass;
}

async function upsertParticipant(owner, data) {
  let participant = await Participant.findOne({
    ownerUserId: owner._id,
    firstName: data.firstName,
    lastName: data.lastName,
  });
  if (!participant) {
    participant = await Participant.create({
      ownerUserId: owner._id,
      firstName: data.firstName,
      lastName: data.lastName,
      birthDate: data.birthDate,
      gender: data.gender,
      relation: PARTICIPANT_RELATIONS.CHILD,
      phone: data.phone || "",
      emergencyContact: {
        name: `${owner.firstName} ${owner.lastName}`,
        phone: owner.phone,
        relationship: "سرپرست",
      },
      isActive: true,
    });
  } else {
    participant.gender = data.gender;
    participant.phone = data.phone || participant.phone || "";
    participant.isActive = true;
    await participant.save();
  }
  return participant;
}

async function enrollActive(user, participant, courseClass) {
  await Enrollment.findOneAndUpdate(
    { classId: courseClass._id, participantId: participant._id },
    {
      $set: {
        userId: user._id,
        participantId: participant._id,
        classId: courseClass._id,
        status: ENROLLMENT_STATUSES.ACTIVE,
        priceCharged: courseClass.price,
        basePrice: courseClass.price,
        discountAmount: 0,
        finalAmount: courseClass.price,
        confirmedAt: new Date(),
        eligibilitySnapshot: {
          eligible: true,
          reasons: [],
          age: null,
          evaluatedAt: new Date(),
          ruleVersion: "eligibility-v1",
        },
      },
      $setOnInsert: {
        idempotencyKey: `seed-att-${String(courseClass._id)}-${String(participant._id)}`,
      },
    },
    { upsert: true },
  );
}

async function main() {
  await mongoose.connect(env.MONGODB_URI);
  console.log("Connected:", env.MONGODB_URI);

  const smsUser = await upsertUser({
    phone: SMS_TEST_PHONE,
    firstName: "سرپرست",
    lastName: "تست پیامک",
    role: ROLES.USER,
  });
  const otherUser = await upsertUser({
    phone: "09121112233",
    firstName: "والد",
    lastName: "نمونه",
    role: ROLES.USER,
  });

  let instructor = await Instructor.findOne({ phone: "09120001111", isActive: true });
  if (!instructor) {
    instructor = await Instructor.create({
      name: "مربی دمو",
      phone: "09120001111",
      bio: "مربی نمونه",
      isActive: true,
      userId: null,
    });
  }

  // Fix legacy mixed / ANY demo course
  await CourseTemplate.updateMany(
    { title: "دوره مقدماتی شنا (دمو)" },
    { $set: { genderRestriction: GENDERS.MALE, title: "دوره مقدماتی مردانه (دمو)" } },
  );
  await CourseClass.updateMany(
    { title: "کلاس دمو حضور و غیاب" },
    { $set: { title: "کلاس مردانه دمو" } },
  );
  await CourseTemplate.updateMany(
    { genderRestriction: GENDERS.ANY },
    { $set: { genderRestriction: GENDERS.MALE } },
  );

  const maleTemplate = await upsertTemplate({
    title: "دوره مقدماتی مردانه (دمو)",
    genderRestriction: GENDERS.MALE,
    description: "فقط آقایان — دمو حضور و غیاب",
  });
  const femaleTemplate = await upsertTemplate({
    title: "دوره مقدماتی زنانه (دمو)",
    genderRestriction: GENDERS.FEMALE,
    description: "فقط بانوان — دمو حضور و غیاب",
  });

  const maleClass = await upsertClass({
    title: "کلاس مردانه دمو",
    template: maleTemplate,
    instructor,
    startTime: "17:00",
    endTime: "18:00",
  });
  const femaleClass = await upsertClass({
    title: "کلاس زنانه دمو",
    template: femaleTemplate,
    instructor,
    startTime: "18:00",
    endTime: "19:00",
  });

  // Remove mismatched female enrollments from male class (and reverse)
  const allParts = await Participant.find({}).select("_id gender").lean();
  const femaleIds = allParts.filter((p) => p.gender === GENDERS.FEMALE).map((p) => p._id);
  const maleIds = allParts.filter((p) => p.gender === GENDERS.MALE).map((p) => p._id);
  await Enrollment.deleteMany({ classId: maleClass._id, participantId: { $in: femaleIds } });
  await Enrollment.deleteMany({ classId: femaleClass._id, participantId: { $in: maleIds } });

  const maleParticipants = [
    await upsertParticipant(smsUser, {
      firstName: "آریا",
      lastName: "تست پیامک",
      birthDate: new Date("2014-05-10"),
      gender: GENDERS.MALE,
      phone: SMS_TEST_PHONE,
    }),
    await upsertParticipant(smsUser, {
      firstName: "نیما",
      lastName: "هم‌کلاس",
      birthDate: new Date("2013-08-20"),
      gender: GENDERS.MALE,
      phone: "",
    }),
    await upsertParticipant(otherUser, {
      firstName: "کیان",
      lastName: "نمونه",
      birthDate: new Date("2012-11-02"),
      gender: GENDERS.MALE,
      phone: "",
    }),
  ];

  const femaleParticipants = [
    await upsertParticipant(otherUser, {
      firstName: "سارا",
      lastName: "نمونه",
      birthDate: new Date("2015-01-15"),
      gender: GENDERS.FEMALE,
      phone: "09121112233",
    }),
    await upsertParticipant(otherUser, {
      firstName: "هستی",
      lastName: "نمونه",
      birthDate: new Date("2014-03-08"),
      gender: GENDERS.FEMALE,
      phone: "",
    }),
  ];

  await enrollActive(smsUser, maleParticipants[0], maleClass);
  await enrollActive(smsUser, maleParticipants[1], maleClass);
  await enrollActive(otherUser, maleParticipants[2], maleClass);
  for (const p of femaleParticipants) await enrollActive(otherUser, p, femaleClass);

  for (const cls of [maleClass, femaleClass]) {
    const activeCount = await Enrollment.countDocuments({
      classId: cls._id,
      status: ENROLLMENT_STATUSES.ACTIVE,
    });
    cls.confirmedCount = activeCount;
    cls.heldCount = 0;
    await cls.save();
  }

  // Keep old messy class male-only if present
  const legacy = await CourseClass.findOne({ title: "sadasd" });
  if (legacy) {
    await Enrollment.deleteMany({ classId: legacy._id, participantId: { $in: femaleIds } });
  }

  console.log("\n=== Seed OK (gender-separated) ===");
  console.log("Male class:", maleClass.title, String(maleClass._id));
  console.log("Female class:", femaleClass.title, String(femaleClass._id));
  console.log("SMS target:", SMS_TEST_PHONE, "→ آریا تست پیامک (کلاس مردانه)");
  console.log("Password:", DEMO_PASSWORD);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
