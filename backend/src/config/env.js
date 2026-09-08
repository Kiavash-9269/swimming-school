const path = require("path");
const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  JWT_REGISTRATION_EXPIRES_IN: z.string().default("15m"),
  JWT_PASSWORD_RESET_EXPIRES_IN: z.string().default("15m"),
  FRONTEND_URL: z.string().url("FRONTEND_URL must be a valid URL"),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  // OTP lifecycle
  OTP_TTL_SECONDS: z.coerce.number().int().positive().optional(),
  /** @deprecated Prefer OTP_TTL_SECONDS. Kept for backward compatibility. */
  OTP_EXPIRATION_MINUTES: z.coerce.number().int().positive().optional(),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_CODE_LENGTH: z.coerce.number().int().min(4).max(8).default(5),
  OTP_RATE_LIMIT_PER_PHONE: z.coerce.number().int().positive().default(5),
  OTP_RATE_LIMIT_WINDOW_SEC: z.coerce.number().int().positive().default(600),

  // SMS provider
  SMS_PROVIDER: z.enum(["development", "sms-webservice", "kavenegar"]).optional(),
  SMS_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  SMS_WEBSERVICE_API_KEY: z.string().optional().default(""),
  SMS_WEBSERVICE_SENDER: z.string().optional().default(""),
  SMS_WEBSERVICE_TEMPLATE_KEY: z.string().optional().default(""),
  /** Default: http://api.sms-webservice.com/api/V3 (HTTPS often times out on some networks) */
  SMS_WEBSERVICE_BASE_URL: z.string().optional().default("http://api.sms-webservice.com/api/V3"),
  KAVENEGAR_API_KEY: z.string().optional().default(""),
  KAVENEGAR_SENDER: z.string().optional().default(""),
  KAVENEGAR_TEMPLATE: z.string().optional().default(""),

  // Course domain
  APP_TIMEZONE: z.string().min(1).default("Asia/Tehran"),
  RESERVATION_HOLD_SECONDS: z.coerce.number().int().positive().default(900),
  WAITLIST_OFFER_SECONDS: z.coerce.number().int().positive().default(900),
  PAYMENT_PROVIDER: z.enum(["mock", "zarinpal"]).default("mock"),
  PAYMENT_CALLBACK_URL: z.string().optional().default(""),
  PAYMENT_CALLBACK_SECRET: z.string().optional().default(""),
  PAYMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  ZARINPAL_MERCHANT_ID: z.string().optional().default(""),
  ZARINPAL_SANDBOX: z.string().optional().default("true"),

  // Notifications / scheduler (Phase 5)
  SCHEDULER_ENABLED: z.string().optional(),
  SCHEDULER_INTERVAL_MS: z.coerce.number().int().positive().default(15000),
  JOB_BATCH_SIZE: z.coerce.number().int().positive().max(500).default(50),
  NOTIFICATION_MAX_ATTEMPTS: z.coerce.number().int().positive().max(10).default(3),
  NOTIFICATION_LEASE_SECONDS: z.coerce.number().int().positive().default(60),
  NOTIFICATION_DEFAULT_LOCALE: z.enum(["fa", "en"]).default("fa"),
  CLASS_REMINDER_HOURS: z.coerce.number().positive().default(24),
  SESSION_REMINDER_HOURS: z.coerce.number().positive().default(1),
  EMAIL_PROVIDER: z.enum(["mock", "log"]).default("mock"),
  EXPORT_MAX_ROWS: z.coerce.number().int().positive().max(50000).default(5000),

  // Document storage (Phase 7)
  DOCUMENT_STORAGE_PROVIDER: z.enum(["local"]).default("local"),
  DOCUMENT_STORAGE_ROOT: z.string().min(1).optional(),
  DOCUMENT_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .max(20 * 1024 * 1024)
    .default(5 * 1024 * 1024),

  APP_VERSION: z.string().default("1.0.0"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${details}`);
  process.exit(1);
}

const data = parsed.data;

const OTP_TTL_SECONDS =
  data.OTP_TTL_SECONDS ??
  (data.OTP_EXPIRATION_MINUTES != null ? data.OTP_EXPIRATION_MINUTES * 60 : 120);

let SMS_PROVIDER = data.SMS_PROVIDER;
if (!SMS_PROVIDER) {
  SMS_PROVIDER = data.NODE_ENV === "production" ? undefined : "development";
}

function failConfig(message) {
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${message}`);
  process.exit(1);
}

if (data.NODE_ENV === "production" && !data.COOKIE_SECURE) {
  failConfig("COOKIE_SECURE must be true in production");
}

if (data.NODE_ENV === "production") {
  if (!SMS_PROVIDER || SMS_PROVIDER === "development") {
    failConfig("Production requires SMS_PROVIDER=sms-webservice or SMS_PROVIDER=kavenegar");
  }
}

if (SMS_PROVIDER === "sms-webservice") {
  if (!data.SMS_WEBSERVICE_API_KEY?.trim()) {
    failConfig("SMS_WEBSERVICE_API_KEY is required when SMS_PROVIDER=sms-webservice");
  }
  if (!data.SMS_WEBSERVICE_TEMPLATE_KEY?.trim() && !data.SMS_WEBSERVICE_SENDER?.trim()) {
    failConfig(
      "sms-webservice requires SMS_WEBSERVICE_TEMPLATE_KEY (preferred) or SMS_WEBSERVICE_SENDER",
    );
  }
}

if (SMS_PROVIDER === "kavenegar") {
  if (!data.KAVENEGAR_API_KEY?.trim()) {
    failConfig("KAVENEGAR_API_KEY is required when SMS_PROVIDER=kavenegar");
  }
  if (!data.KAVENEGAR_TEMPLATE?.trim()) {
    failConfig("KAVENEGAR_TEMPLATE is required when SMS_PROVIDER=kavenegar");
  }
}

if (SMS_PROVIDER === "development" && data.NODE_ENV === "production") {
  failConfig("SMS_PROVIDER=development is not allowed in production");
}

if (!SMS_PROVIDER) {
  failConfig("SMS_PROVIDER is required");
}

const schedulerRaw = data.SCHEDULER_ENABLED;
const SCHEDULER_ENABLED =
  schedulerRaw == null || schedulerRaw === ""
    ? data.NODE_ENV === "production"
    : schedulerRaw === "true" || schedulerRaw === "1";

const pathMod = path;
const defaultStorageRoot = pathMod.resolve(
  __dirname,
  "../../",
  data.NODE_ENV === "test" ? ".data/test-documents" : ".data/documents",
);

const DOCUMENT_STORAGE_ROOT = data.DOCUMENT_STORAGE_ROOT
  ? pathMod.resolve(data.DOCUMENT_STORAGE_ROOT)
  : defaultStorageRoot;

// Refuse obviously public/frontend paths
const normalizedRoot = DOCUMENT_STORAGE_ROOT.replace(/\\/g, "/").toLowerCase();
if (
  normalizedRoot.includes("/frontend/") ||
  normalizedRoot.includes("/public/") ||
  normalizedRoot.endsWith("/public") ||
  normalizedRoot.includes("/static/")
) {
  failConfig("DOCUMENT_STORAGE_ROOT must not be inside frontend/public/static directories");
}

if (data.PAYMENT_PROVIDER === "zarinpal") {
  if (!data.ZARINPAL_MERCHANT_ID?.trim()) {
    failConfig("ZARINPAL_MERCHANT_ID is required when PAYMENT_PROVIDER=zarinpal");
  }
  if (!data.PAYMENT_CALLBACK_URL?.trim()) {
    failConfig("PAYMENT_CALLBACK_URL is required when PAYMENT_PROVIDER=zarinpal");
  }
  if (data.NODE_ENV === "production" && !data.PAYMENT_CALLBACK_SECRET?.trim()) {
    failConfig("PAYMENT_CALLBACK_SECRET is required in production when PAYMENT_PROVIDER=zarinpal");
  }
}

if (data.NODE_ENV === "production" && data.PAYMENT_PROVIDER === "mock") {
  failConfig("PAYMENT_PROVIDER=mock is not allowed in production; use zarinpal");
}

const env = {
  ...data,
  SMS_PROVIDER,
  OTP_TTL_SECONDS,
  /** Derived for any legacy callers expecting minutes. */
  OTP_EXPIRATION_MINUTES: Math.max(1, Math.ceil(OTP_TTL_SECONDS / 60)),
  SCHEDULER_ENABLED,
  DOCUMENT_STORAGE_ROOT,
};

module.exports = { env };
