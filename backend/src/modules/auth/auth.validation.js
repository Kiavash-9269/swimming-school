const { z } = require("zod");
const { normalizePhone, isValidIranianMobile } = require("../../utils/phone");
const { env } = require("../../config/env");

const phoneSchema = z
  .string({ required_error: "شماره موبایل الزامی است" })
  .trim()
  .min(1, "شماره موبایل الزامی است")
  .transform((value) => normalizePhone(value))
  .refine((value) => isValidIranianMobile(value), {
    message: "فرمت شماره موبایل معتبر نیست",
  });

const passwordSchema = z
  .string({ required_error: "رمز عبور الزامی است" })
  .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد")
  .max(128, "رمز عبور بیش از حد طولانی است");

const nameSchema = z
  .string({ required_error: "این فیلد الزامی است" })
  .trim()
  .transform((value) => value.replace(/\s+/g, " ").trim())
  .pipe(
    z
      .string()
      .min(2, "حداقل ۲ کاراکتر وارد کنید")
      .max(80, "حداکثر ۸۰ کاراکتر مجاز است"),
  );

const otpLen = Number(env.OTP_CODE_LENGTH) || 5;
const otpCodeSchema = z
  .string({ required_error: "کد تأیید الزامی است" })
  .trim()
  .regex(new RegExp(`^\\d{${otpLen}}$`), `کد تأیید باید ${otpLen} رقم باشد`);

const checkPhoneSchema = z.object({
  phone: phoneSchema,
});

const sendOtpSchema = z.object({
  phone: phoneSchema,
});

const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: otpCodeSchema,
});

const registerSchema = z
  .object({
    registrationToken: z.string().min(1, "توکن ثبت‌نام الزامی است"),
    firstName: nameSchema,
    lastName: nameSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "تکرار رمز عبور الزامی است"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "رمز عبور و تکرار آن یکسان نیستند",
      });
    }
  });

const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "رمز عبور الزامی است"),
});

const resetPasswordSchema = z
  .object({
    resetToken: z.string().min(1, "توکن بازیابی الزامی است"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "تکرار رمز عبور الزامی است"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "رمز عبور و تکرار آن یکسان نیستند",
      });
    }
  });

module.exports = {
  checkPhoneSchema,
  sendOtpSchema,
  verifyOtpSchema,
  registerSchema,
  loginSchema,
  resetPasswordSchema,
};
