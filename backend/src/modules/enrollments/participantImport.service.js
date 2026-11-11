const { AppError } = require("../../utils/AppError");
const { logEvent } = require("../../services/logging");
const { assertValidBirthDate } = require("../../utils/age");
const { Participant } = require("./participant.model");
const { User, ROLES } = require("../auth/user.model");
const { hashPassword } = require("../../utils/password");
const { GENDERS, PARTICIPANT_RELATIONS } = require("../courses/domain.constants");
const { convertAccessBufferToExcel } = require("../reports/accessConvert");
const { findOrCreateOwnerAccount } = require("./participant.service");

const BIOMETRIC_MAX = 500_000;
const EXTRA_VALUE_MAX = 8_000;
const DEFAULT_BIRTH = new Date(Date.UTC(2010, 0, 1));
/** Shared owner for Club/Access rows that have no valid mobile — phones filled in later by admin. */
const HOLDING_ACCOUNT_PHONE = "09000000000";
const HOLDING_ACCOUNT_FIRST = "واردات";
const HOLDING_ACCOUNT_LAST = "باشگاه (بدون موبایل)";

function normalizeKey(header) {
  return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_\-‌]/g, "");
}

/** Map of canonical field → accepted Access/Excel header aliases (normalized). */
const FIELD_ALIASES = {
  firstName: ["نام", "firstname", "fname", "نامکوچک", "name"],
  lastName: ["نامخانوادگی", "lastname", "lname", "فامیل", "family", "familyname", "surname"],
  fullName: ["نامکامل", "fullname", "نامونامخانوادگی", "personname"],
  phone: [
    "موبایل",
    "موبایلشاگرد",
    "تلفن",
    "تلفنهمراه",
    "tel",
    "telephone",
    "phone",
    "mobile",
    "mobileno",
    "cellphone",
  ],
  accountPhone: [
    "موبایلحساب",
    "تلفنولی",
    "موبایلولی",
    "تلفنپدر",
    "accountphone",
    "parentphone",
    "guardianphone",
    "ownerphone",
  ],
  birthDate: ["تاریخولد", "تاریختولد", "birthdate", "birth", "dob", "birthday"],
  gender: ["جنسیت", "gender", "sex", "جنس"],
  fingerprint: [
    "اثرانگشت",
    "اثرانگشت۱",
    "اثرانگشت1",
    "fingerprint",
    "finger",
    "fp",
    "fptemplate",
    "template",
    "fingertemplate",
  ],
  faceData: ["چهره", "تصویرچهره", "face", "facedata", "facetemplate", "faceid", "photo", "تصویر"],
  cardNumber: ["شمارهکارت", "کارت", "card", "cardno", "cardnumber", "badgeno", "badge", "rfid"],
  externalId: [
    "کد",
    "کدپرسنلی",
    "کدشاگرد",
    "شناسه",
    "externalid",
    "personid",
    "userid",
    "uid",
    "id",
    "pin",
    "enrollnumber",
    "number",
    "membershipno",
    "memberno",
  ],
  notes: ["یادداشت", "توضیحات", "notes", "note", "remark", "description"],
  fatherOccupation: ["شغلپدر", "fatheroccupation", "occupation"],
  relation: ["نسبت", "relation"],
  emergencyName: ["ناماضطراری", "تماساضطراری", "emergencyname", "ecname"],
  emergencyPhone: ["موبایلاضطراری", "تلفناضطراری", "emergencyphone", "ecphone"],
};

const KNOWN_ALIASES = new Set(Object.values(FIELD_ALIASES).flat());

function toEnglishDigits(value) {
  return String(value || "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function buildColumnMap(columns) {
  const map = {};
  const used = new Set();
  for (const col of columns) {
    const key = normalizeKey(col);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (map[field]) continue;
      if (aliases.includes(key)) {
        map[field] = col;
        used.add(col);
        break;
      }
    }
  }
  // Prefer explicit lastName over treating "نام" as firstName when both نام+فامیل exist.
  // If only "name"/"نام" matched firstName and lastName is empty, keep as firstName.
  return { map, used };
}

function cell(row, col) {
  if (!col) return "";
  const v = row[col];
  if (v == null) return "";
  return String(v).trim();
}

function normalizePhone(raw) {
  let s = toEnglishDigits(raw).replace(/[^\d]/g, "");
  if (!s) return "";
  if (s.startsWith("98") && s.length === 12) s = `0${s.slice(2)}`;
  if (s.length === 10 && s.startsWith("9")) s = `0${s}`;
  if (/^09\d{9}$/.test(s)) return s;
  return "";
}

function parseGender(raw) {
  const s = toEnglishDigits(String(raw || "")).trim().toLowerCase();
  if (!s) return null;
  if (["مرد", "آقا", "پسر", "male", "m", "1", "آقایان", "پسران"].includes(s)) return GENDERS.MALE;
  if (["زن", "خانم", "دختر", "female", "f", "2", "بانوان", "دختران"].includes(s)) return GENDERS.FEMALE;
  if (s === GENDERS.MALE.toLowerCase()) return GENDERS.MALE;
  if (s === GENDERS.FEMALE.toLowerCase()) return GENDERS.FEMALE;
  return null;
}

function parseBirthDate(raw) {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
  const s = toEnglishDigits(String(raw)).trim();
  if (!s) return null;
  // ISO / Access datetime "2020-05-01T00:00:00"
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return new Date(iso);
  // YYYY-MM-DD or YYYY/MM/DD
  const m = /^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/.exec(s);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (y >= 1300 && y <= 1500) {
      // Likely Jalali year without converter — keep as string note; reject for birthDate
      return null;
    }
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  return null;
}

function splitFullName(full) {
  const parts = String(full || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function truncate(str, max) {
  const s = String(str || "");
  return s.length > max ? s.slice(0, max) : s;
}

function pickBiometric(value) {
  const s = String(value || "").trim();
  if (!s || s === "بله" || s === "خیر") return "";
  return truncate(s, BIOMETRIC_MAX);
}

function collectExtraFields(row, usedColumns) {
  const extra = {};
  for (const [key, value] of Object.entries(row)) {
    if (usedColumns.has(key)) continue;
    const text = String(value ?? "").trim();
    if (!text) continue;
    const nk = normalizeKey(key);
    if (KNOWN_ALIASES.has(nk)) continue;
    extra[String(key).slice(0, 80)] = truncate(text, EXTRA_VALUE_MAX);
  }
  return Object.keys(extra).length ? extra : null;
}

function tableLooksLikePeople(columns, columnMap) {
  const hasName = Boolean(columnMap.firstName || columnMap.lastName || columnMap.fullName);
  const hasIdentity = Boolean(columnMap.phone || columnMap.externalId || columnMap.fingerprint || columnMap.faceData);
  return hasName && (hasIdentity || columnMap.birthDate || columnMap.gender);
}

function isClubTableName(name) {
  return /^club$/i.test(String(name || "").trim());
}

/** Prefer legacy Club roster when present so attendance/payment tables are not imported as people. */
function selectImportTables(tables) {
  const clubTables = (tables || []).filter((t) => isClubTableName(t.name));
  return clubTables.length ? clubTables : tables || [];
}

async function findOrCreateHoldingOwner() {
  const existing = await User.findOne({ phone: HOLDING_ACCOUNT_PHONE });
  if (existing) return existing;
  try {
    return await User.create({
      phone: HOLDING_ACCOUNT_PHONE,
      firstName: HOLDING_ACCOUNT_FIRST,
      lastName: HOLDING_ACCOUNT_LAST,
      passwordHash: await hashPassword(HOLDING_ACCOUNT_PHONE),
      phoneVerified: false,
      role: ROLES.USER,
      isActive: false,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const raced = await User.findOne({ phone: HOLDING_ACCOUNT_PHONE });
      if (raced) return raced;
    }
    throw error;
  }
}

function mapRow(row, columnMap, usedColumns) {
  let firstName = cell(row, columnMap.firstName);
  let lastName = cell(row, columnMap.lastName);
  if ((!firstName || !lastName) && columnMap.fullName) {
    const split = splitFullName(cell(row, columnMap.fullName));
    if (!firstName) firstName = split.firstName;
    if (!lastName) lastName = split.lastName;
  }
  // Access Club often stores full name in a single "name" column (with or without spaces).
  if (firstName && !lastName && !columnMap.lastName) {
    const split = splitFullName(firstName);
    firstName = split.firstName;
    lastName = split.lastName;
  }

  const phone = normalizePhone(cell(row, columnMap.phone));
  const accountPhone =
    normalizePhone(cell(row, columnMap.accountPhone)) || phone;

  let birthDate = parseBirthDate(cell(row, columnMap.birthDate));
  let birthDateDefaulted = false;
  if (!birthDate) {
    birthDate = DEFAULT_BIRTH;
    birthDateDefaulted = true;
  }

  let gender = parseGender(cell(row, columnMap.gender));
  let genderDefaulted = false;
  if (!gender) {
    gender = GENDERS.MALE;
    genderDefaulted = true;
  }

  const fingerprint = pickBiometric(cell(row, columnMap.fingerprint));
  const faceData = pickBiometric(cell(row, columnMap.faceData));
  const cardNumber = truncate(cell(row, columnMap.cardNumber), 64);
  const externalId = truncate(cell(row, columnMap.externalId), 120);
  const notesParts = [];
  const notesCell = cell(row, columnMap.notes);
  if (notesCell) notesParts.push(notesCell);
  if (birthDateDefaulted) notesParts.push("تاریخ تولد پیش‌فرض (واردشده از اکسس)");
  if (genderDefaulted) notesParts.push("جنسیت پیش‌فرض (واردشده از اکسس)");

  const importedFields = collectExtraFields(row, usedColumns);

  return {
    firstName: truncate(firstName, 80),
    lastName: truncate(lastName, 80),
    phone,
    accountPhone,
    birthDate,
    gender,
    fingerprint,
    faceData,
    cardNumber,
    externalId,
    fatherOccupation: truncate(cell(row, columnMap.fatherOccupation), 80),
    notes: truncate(notesParts.join(" — "), 1000),
    emergencyContact: {
      name: truncate(cell(row, columnMap.emergencyName), 120),
      phone: normalizePhone(cell(row, columnMap.emergencyPhone)),
      relationship: "",
    },
    importedFields,
    relation: PARTICIPANT_RELATIONS.SELF,
  };
}

async function upsertImportedParticipant({ actorId, mapped, tableName }) {
  if (!mapped.firstName || mapped.firstName.length < 2 || !mapped.lastName || mapped.lastName.length < 2) {
    return { status: "skipped", reason: "نام یا نام خانوادگی ناقص است" };
  }

  try {
    assertValidBirthDate(mapped.birthDate);
  } catch {
    return { status: "skipped", reason: "تاریخ تولد نامعتبر است" };
  }

  const clubRow = isClubTableName(tableName);
  let externalId = mapped.externalId || "";
  if (clubRow && externalId && !String(externalId).startsWith("club:")) {
    externalId = `club:${externalId}`;
  }

  const hasMobile = Boolean(mapped.accountPhone);
  const notesParts = [];
  if (mapped.notes) notesParts.push(mapped.notes);
  if (!hasMobile) notesParts.push("موبایل ندارد — تکمیل دستی");
  const notes = truncate(notesParts.join(" — "), 1000);

  let user;
  if (hasMobile) {
    try {
      ({ user } = await findOrCreateOwnerAccount({
        accountPhone: mapped.accountPhone,
        firstName: mapped.firstName,
        lastName: mapped.lastName,
      }));
    } catch (error) {
      // User full-name is globally unique; disambiguate owner display name for import only.
      if (error?.code !== "NAME_EXISTS") throw error;
      ({ user } = await findOrCreateOwnerAccount({
        accountPhone: mapped.accountPhone,
        firstName: mapped.firstName,
        lastName: truncate(`${mapped.lastName} · ${mapped.accountPhone.slice(-4)}`, 80),
      }));
    }
  } else {
    user = await findOrCreateHoldingOwner();
  }

  let participant = null;
  if (externalId) {
    participant = await Participant.findOne({ externalId, isActive: true });
  }
  if (!participant) {
    participant = await Participant.findOne({
      ownerUserId: user._id,
      firstName: mapped.firstName,
      lastName: mapped.lastName,
      birthDate: mapped.birthDate,
    });
  }

  const biometricPatch = {
    fingerprint: mapped.fingerprint || undefined,
    faceData: mapped.faceData || undefined,
    cardNumber: mapped.cardNumber || undefined,
    externalId: externalId || undefined,
    importedFields: mapped.importedFields || undefined,
  };

  if (participant) {
    if (mapped.phone) participant.phone = mapped.phone;
    if (mapped.fingerprint) participant.fingerprint = mapped.fingerprint;
    if (mapped.faceData) participant.faceData = mapped.faceData;
    if (mapped.cardNumber) participant.cardNumber = mapped.cardNumber;
    if (externalId) participant.externalId = externalId;
    if (mapped.importedFields) {
      participant.importedFields = {
        ...(participant.importedFields && typeof participant.importedFields === "object"
          ? participant.importedFields
          : {}),
        ...mapped.importedFields,
      };
    }
    if (notes && !String(participant.notes || "").includes(notes)) {
      participant.notes = truncate([participant.notes, notes].filter(Boolean).join(" — "), 1000);
    }
    if (mapped.fatherOccupation) participant.fatherOccupation = mapped.fatherOccupation;
    await participant.save();
    return {
      status: "updated",
      id: String(participant._id),
      biometrics: biometricPatch,
      missingPhone: !hasMobile,
    };
  }

  participant = await Participant.create({
    ownerUserId: user._id,
    firstName: mapped.firstName,
    lastName: mapped.lastName,
    birthDate: mapped.birthDate,
    gender: mapped.gender,
    relation: mapped.relation,
    phone: mapped.phone || mapped.accountPhone || "",
    fatherOccupation: mapped.fatherOccupation || "",
    medicalConfirmed: false,
    emergencyContact: mapped.emergencyContact || {},
    registeredAt: new Date(),
    notes,
    createdByAdmin: true,
    isActive: true,
    fingerprint: mapped.fingerprint || "",
    faceData: mapped.faceData || "",
    cardNumber: mapped.cardNumber || "",
    externalId: externalId || "",
    importedFields: mapped.importedFields || null,
  });

  logEvent("PARTICIPANT_IMPORTED_FROM_ACCESS", {
    participantId: String(participant._id),
    actorId: String(actorId),
    hasFingerprint: Boolean(mapped.fingerprint),
    hasFace: Boolean(mapped.faceData),
    missingPhone: !hasMobile,
    club: clubRow,
  });

  return {
    status: "created",
    id: String(participant._id),
    biometrics: biometricPatch,
    missingPhone: !hasMobile,
  };
}

/**
 * Convert Access → Excel and optionally persist person-like rows into Participant
 * (including fingerprint / face / card / extra columns).
 */
async function convertAndImportAccess({ buffer, originalName, actorId, importRows = true }) {
  // Prefer Club-only read for legacy pool DBs (other tables like CashList can exceed row caps).
  let converted;
  try {
    converted = await convertAccessBufferToExcel(buffer, {
      originalName,
      tableNames: ["Club"],
      maxRows: 20000,
      onTooLarge: "throw",
    });
  } catch (error) {
    if (error?.code !== "ACCESS_NO_TABLES" && error?.code !== "ACCESS_NO_DATA") throw error;
    converted = await convertAccessBufferToExcel(buffer, {
      originalName,
      onTooLarge: "skip",
    });
  }
  const summary = {
    tableCount: converted.tableCount,
    rowCount: converted.rowCount,
    imported: false,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  if (!importRows) {
    return { ...converted, summary };
  }

  summary.imported = true;
  summary.missingPhone = 0;
  summary.withPhone = 0;
  summary.importTables = [];
  const maxErrors = 50;
  const importTables = selectImportTables(converted.tables);

  for (const table of importTables) {
    const { map: columnMap, used } = buildColumnMap(table.columns);
    if (!tableLooksLikePeople(table.columns, columnMap) && !isClubTableName(table.name)) continue;
    summary.importTables.push(table.name);

    for (let i = 0; i < table.rows.length; i += 1) {
      const mapped = mapRow(table.rows[i], columnMap, used);
      try {
        const result = await upsertImportedParticipant({
          actorId,
          mapped,
          tableName: table.name,
        });
        if (result.status === "created") summary.created += 1;
        else if (result.status === "updated") summary.updated += 1;
        else {
          summary.skipped += 1;
          if (summary.errors.length < maxErrors) {
            summary.errors.push({
              table: table.name,
              row: i + 2,
              reason: result.reason || "رد شد",
            });
          }
          continue;
        }
        if (result.missingPhone) summary.missingPhone += 1;
        else summary.withPhone += 1;
      } catch (error) {
        summary.skipped += 1;
        if (summary.errors.length < maxErrors) {
          summary.errors.push({
            table: table.name,
            row: i + 2,
            reason: error?.message || "خطای ذخیره",
          });
        }
        if (error instanceof AppError && error.statusCode >= 500) throw error;
      }
    }
  }

  if (summary.created + summary.updated === 0 && summary.skipped === 0) {
    summary.errors.push({
      table: "*",
      row: 0,
      reason: "جدولی شبیه فهرست شاگردان (نام + موبایل/کد/بیومتریک) پیدا نشد؛ فقط اکسل ساخته شد.",
    });
  }

  logEvent("ADMIN_ACCESS_CONVERTED", {
    actorId: String(actorId),
    tableCount: summary.tableCount,
    created: summary.created,
    updated: summary.updated,
    skipped: summary.skipped,
    missingPhone: summary.missingPhone,
    withPhone: summary.withPhone,
    importTables: summary.importTables,
  });

  return { ...converted, summary };
}

module.exports = {
  convertAndImportAccess,
  mapRow,
  buildColumnMap,
  normalizePhone,
  parseGender,
  parseBirthDate,
  selectImportTables,
  HOLDING_ACCOUNT_PHONE,
};
