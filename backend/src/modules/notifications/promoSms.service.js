const { AppError } = require("../../utils/AppError");
const { env } = require("../../config/env");
const { logEvent } = require("../../services/logging");
const { createSmsProvider } = require("../../services/sms/createProvider");
const { Participant } = require("../enrollments/participant.model");
const { User } = require("../auth/user.model");
const { enqueueNotification } = require("./notification.service");
const { NOTIFICATION_TYPES, NOTIFICATION_CHANNELS } = require("./notification.constants");
const { renderTemplate } = require("./templates");
/** Must match holding phone in participantImport.service (avoid circular require). */
const HOLDING_ACCOUNT_PHONE = "09000000000";
const DEFAULT_TEST_PHONE = "09301905219";

function normalizeMobile(raw) {
  let s = String(raw || "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[^\d]/g, "");
  if (!s) return "";
  if (s.startsWith("98") && s.length === 12) s = `0${s.slice(2)}`;
  if (s.length === 10 && s.startsWith("9")) s = `0${s}`;
  return /^09\d{9}$/.test(s) ? s : "";
}

function resolvePromoBody(customMessage) {
  const custom = String(customMessage || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 400);
  if (custom) {
    if (/https?:\/\//i.test(custom) || /www\./i.test(custom)) {
      throw new AppError("متن پیامک نباید لینک داشته باشد (محدودیت پنل پیامک).", {
        statusCode: 400,
        code: "SMS_LINK_NOT_ALLOWED",
      });
    }
    return custom;
  }
  return renderTemplate(NOTIFICATION_TYPES.REGISTRATION_DISCOUNT, "fa", {}).body;
}

/**
 * Recipients: club-imported participants with a valid mobile
 * (participant.phone or owner phone, excluding the holding account).
 */
async function listClubDiscountRecipients({ limit = 5000 } = {}) {
  const safeLimit = Math.min(10000, Math.max(1, Number(limit) || 5000));
  const rows = await Participant.find({
    isActive: true,
    externalId: { $regex: /^club:/ },
  })
    .select("phone ownerUserId externalId firstName lastName")
    .limit(safeLimit)
    .lean();

  const ownerIds = [...new Set(rows.map((r) => String(r.ownerUserId)))];
  const owners = await User.find({ _id: { $in: ownerIds } })
    .select("phone")
    .lean();
  const ownerPhone = new Map(owners.map((u) => [String(u._id), u.phone]));

  const byPhone = new Map();
  for (const row of rows) {
    const owner = ownerPhone.get(String(row.ownerUserId)) || "";
    const phone =
      normalizeMobile(row.phone) ||
      (owner && owner !== HOLDING_ACCOUNT_PHONE ? normalizeMobile(owner) : "");
    if (!phone) continue;
    if (byPhone.has(phone)) continue;
    byPhone.set(phone, {
      phone,
      userId: String(row.ownerUserId),
      participantId: String(row._id),
      externalId: row.externalId || "",
      name: `${row.firstName || ""} ${row.lastName || ""}`.trim(),
    });
  }
  return [...byPhone.values()];
}

/**
 * @param {{ audience: 'test'|'club_with_phone', testPhone?: string, message?: string, campaignKey?: string, sendNow?: boolean, actorId: string }} args
 */
async function enqueueRegistrationDiscountSms({
  audience,
  testPhone,
  message,
  campaignKey,
  sendNow = false,
  actorId,
}) {
  if (!["test", "club_with_phone"].includes(audience)) {
    throw new AppError("مخاطب پیامک نامعتبر است.", {
      statusCode: 400,
      code: "INVALID_PROMO_AUDIENCE",
    });
  }

  const body = resolvePromoBody(message);
  const campaign =
    String(campaignKey || "").trim().slice(0, 64) ||
    `promo-${new Date().toISOString().slice(0, 10)}`;

  if (audience === "test") {
    const phone = normalizeMobile(testPhone || DEFAULT_TEST_PHONE);
    if (!phone) {
      throw new AppError("شماره موبایل تست نامعتبر است.", {
        statusCode: 400,
        code: "INVALID_TEST_PHONE",
      });
    }

    let user = await User.findOne({ phone });
    if (!user) {
      // Prefer any active admin as notification owner for test-only enqueue.
      user = await User.findOne({ role: "ADMIN", isActive: true }).select("_id phone");
    }
    if (!user) {
      throw new AppError("برای ارسال تست، یک حساب ادمین لازم است.", {
        statusCode: 400,
        code: "ADMIN_REQUIRED_FOR_TEST_SMS",
      });
    }

    if (sendNow) {
      const provider = createSmsProvider(env);
      if (typeof provider.sendText !== "function") {
        throw new AppError("ارائه‌دهنده پیامک از ارسال متن پشتیبانی نمی‌کند.", {
          statusCode: 501,
          code: "SMS_TEXT_UNSUPPORTED",
        });
      }
      const result = await provider.sendText({
        phone,
        message: body,
        purpose: NOTIFICATION_TYPES.REGISTRATION_DISCOUNT,
      });
      logEvent("PROMO_SMS_TEST_SENT", {
        actorId: String(actorId),
        phoneMasked: `${phone.slice(0, 4)}***${phone.slice(-2)}`,
        messageId: result?.messageId || "",
        campaign,
      });
      return {
        audience,
        campaign,
        queued: 0,
        sentNow: result?.delivered ? 1 : 0,
        skipped: 0,
        testPhone: phone,
        messageId: result?.messageId || "",
        bodyPreview: body.slice(0, 120),
      };
    }

    const { notification, created } = await enqueueNotification({
      userId: user._id,
      type: NOTIFICATION_TYPES.REGISTRATION_DISCOUNT,
      channel: NOTIFICATION_CHANNELS.SMS,
      idempotencyKey: `REGISTRATION_DISCOUNT:${campaign}:test:${phone}`,
      destination: phone,
      templateVars: {},
    });
    // Override body when custom message was provided (enqueue already rendered default).
    if (message && notification && notification.body !== body) {
      notification.body = body;
      await notification.save();
    }

    return {
      audience,
      campaign,
      queued: created ? 1 : 0,
      sentNow: 0,
      skipped: created ? 0 : 1,
      testPhone: phone,
      notificationId: notification ? String(notification._id) : null,
      bodyPreview: body.slice(0, 120),
    };
  }

  const recipients = await listClubDiscountRecipients();
  let queued = 0;
  let skipped = 0;
  const errors = [];

  for (const recipient of recipients) {
    try {
      const { notification, created } = await enqueueNotification({
        userId: recipient.userId,
        type: NOTIFICATION_TYPES.REGISTRATION_DISCOUNT,
        channel: NOTIFICATION_CHANNELS.SMS,
        idempotencyKey: `REGISTRATION_DISCOUNT:${campaign}:${recipient.phone}`,
        destination: recipient.phone,
        refs: { participantId: recipient.participantId },
        templateVars: {},
      });
      if (message && notification && notification.body !== body) {
        notification.body = body;
        await notification.save();
      }
      if (created) queued += 1;
      else skipped += 1;
    } catch (error) {
      skipped += 1;
      if (errors.length < 20) {
        errors.push({ phone: recipient.phone, reason: error?.message || "enqueue failed" });
      }
    }
  }

  logEvent("PROMO_SMS_CLUB_QUEUED", {
    actorId: String(actorId),
    campaign,
    queued,
    skipped,
    recipientCount: recipients.length,
  });

  return {
    audience,
    campaign,
    queued,
    sentNow: 0,
    skipped,
    recipientCount: recipients.length,
    bodyPreview: body.slice(0, 120),
    errors,
  };
}

module.exports = {
  DEFAULT_TEST_PHONE,
  normalizeMobile,
  listClubDiscountRecipients,
  enqueueRegistrationDiscountSms,
  resolvePromoBody,
};
