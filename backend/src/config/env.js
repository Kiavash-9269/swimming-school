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

const env = {
  ...data,
  SMS_PROVIDER,
  OTP_TTL_SECONDS,
  /** Derived for any legacy callers expecting minutes. */
  OTP_EXPIRATION_MINUTES: Math.max(1, Math.ceil(OTP_TTL_SECONDS / 60)),
};

module.exports = { env };
