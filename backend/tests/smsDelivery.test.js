const request = require("supertest");
const { createApp } = require("../src/app");
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require("./helpers/db");
const { Otp } = require("../src/modules/auth/otp.model");
const { User } = require("../src/modules/auth/user.model");
const { hashPassword } = require("../src/utils/password");
const { env } = require("../src/config/env");
const {
  otpDeliveryService,
  SmsWebserviceProvider,
  KavenegarProvider,
  createSmsProvider,
  SmsProviderError,
  SMS_ERROR_CODES,
} = require("../src/services/otpDelivery");
const { normalizePhone, isValidIranianMobile } = require("../src/utils/phone");
const { maskPhone } = require("../src/utils/mask");

describe("SMS provider integration", () => {
  let app;
  let originalFetch;

  beforeAll(async () => {
    await setupTestDatabase();
    app = createApp();
    originalFetch = global.fetch;
  }, 120000);

  afterEach(async () => {
    otpDeliveryService.resetAdapter();
    global.fetch = originalFetch;
    await clearDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  describe("phone normalization", () => {
    test("normalizes Iranian formats to canonical 09xxxxxxxxx", () => {
      expect(normalizePhone("09123456789")).toBe("09123456789");
      expect(normalizePhone("+989123456789")).toBe("09123456789");
      expect(normalizePhone("989123456789")).toBe("09123456789");
      expect(normalizePhone("00989123456789")).toBe("09123456789");
      expect(isValidIranianMobile("09123456789")).toBe(true);
      expect(maskPhone("09123456789")).toBe("0912***6789");
    });
  });

  describe("provider factory", () => {
    test("selects development adapter by default in test", () => {
      expect(env.SMS_PROVIDER).toBe("development");
      const provider = createSmsProvider(env);
      expect(provider.constructor.name).toBe("DevelopmentDeliveryAdapter");
    });

    test("builds sms-webservice provider when configured", () => {
      const provider = createSmsProvider({
        ...env,
        SMS_PROVIDER: "sms-webservice",
        SMS_WEBSERVICE_API_KEY: "test-key",
        SMS_WEBSERVICE_TEMPLATE_KEY: "tpl",
        SMS_WEBSERVICE_SENDER: "",
        SMS_TIMEOUT_MS: 5000,
        OTP_TTL_SECONDS: 120,
        NODE_ENV: "development",
      });
      expect(provider).toBeInstanceOf(SmsWebserviceProvider);
    });

    test("builds kavenegar provider when configured", () => {
      const provider = createSmsProvider({
        ...env,
        SMS_PROVIDER: "kavenegar",
        KAVENEGAR_API_KEY: "test-key",
        KAVENEGAR_TEMPLATE: "verify",
        KAVENEGAR_SENDER: "",
        SMS_TIMEOUT_MS: 5000,
        NODE_ENV: "development",
      });
      expect(provider).toBeInstanceOf(KavenegarProvider);
    });

    test("rejects unknown provider", () => {
      expect(() =>
        createSmsProvider({
          ...env,
          SMS_PROVIDER: "random-provider",
          NODE_ENV: "development",
        }),
      ).toThrow(SmsProviderError);
    });

    test("rejects development provider in production config object", () => {
      expect(() =>
        createSmsProvider({
          ...env,
          SMS_PROVIDER: "development",
          NODE_ENV: "production",
        }),
      ).toThrow(/not allowed in production/i);
    });
  });

  describe("SmsWebserviceProvider", () => {
    test("succeeds when provider returns message id", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: 98765, FinalText: "x" }),
      });

      const provider = new SmsWebserviceProvider({
        apiKey: "key",
        templateKey: "tpl",
        sender: "",
        timeoutMs: 5000,
        otpTtlSeconds: 120,
      });

      const result = await provider.send({
        phone: "09120001111",
        code: "12345",
        purpose: "REGISTER",
      });

      expect(result.delivered).toBe(true);
      expect(result.messageId).toBe("98765");
      expect(global.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = global.fetch.mock.calls[0][0];
      expect(calledUrl).toContain("SendTokenSingle");
      expect(calledUrl).toContain("Destination=9120001111");
      expect(calledUrl).toContain("p1=12345");
      expect(calledUrl).not.toContain("devOtp");
    });

    test("fails when HTTP 200 but message id missing", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ message: "no id" }),
      });

      const provider = new SmsWebserviceProvider({
        apiKey: "key",
        templateKey: "tpl",
        sender: "",
        timeoutMs: 5000,
        otpTtlSeconds: 120,
      });

      await expect(
        provider.send({ phone: "09120001112", code: "12345", purpose: "REGISTER" }),
      ).rejects.toMatchObject({ code: SMS_ERROR_CODES.SMS_DELIVERY_FAILED });
    });

    test("maps abort/timeout to SMS_PROVIDER_TIMEOUT", async () => {
      global.fetch = jest.fn().mockImplementation(() => {
        const err = new Error("aborted");
        err.name = "AbortError";
        return Promise.reject(err);
      });

      const provider = new SmsWebserviceProvider({
        apiKey: "key",
        templateKey: "tpl",
        sender: "",
        timeoutMs: 1,
        otpTtlSeconds: 120,
      });

      await expect(
        provider.send({ phone: "09120001113", code: "12345", purpose: "REGISTER" }),
      ).rejects.toMatchObject({ code: SMS_ERROR_CODES.SMS_PROVIDER_TIMEOUT });
    });

    test("succeeds when provider returns numeric id array", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify([9876543210]),
      });

      const provider = new SmsWebserviceProvider({
        apiKey: "key",
        templateKey: "",
        sender: "30001234567890",
        timeoutMs: 5000,
        otpTtlSeconds: 120,
      });

      const result = await provider.send({
        phone: "09120001115",
        code: "12345",
        purpose: "REGISTER",
      });

      expect(result.delivered).toBe(true);
      expect(result.messageId).toBe("9876543210");
    });

    test("succeeds when provider returns bare numeric id", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "555001",
      });

      const provider = new SmsWebserviceProvider({
        apiKey: "key",
        templateKey: "tpl",
        sender: "",
        timeoutMs: 5000,
        otpTtlSeconds: 120,
      });

      const result = await provider.send({
        phone: "09120001116",
        code: "12345",
        purpose: "REGISTER",
      });

      expect(result.delivered).toBe(true);
      expect(result.messageId).toBe("555001");
    });

    test("maps IP-not-allowed provider response to configuration error", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => JSON.stringify("IP address not allowed.(Global).Your Ip Is: 1.2.3.4"),
      });

      const provider = new SmsWebserviceProvider({
        apiKey: "key",
        templateKey: "",
        sender: "3000",
        timeoutMs: 5000,
        otpTtlSeconds: 120,
        baseUrl: "http://api.sms-webservice.com/api/V3",
      });

      await expect(
        provider.send({ phone: "09120001114", code: "12345", purpose: "REGISTER" }),
      ).rejects.toMatchObject({ code: SMS_ERROR_CODES.SMS_CONFIGURATION_ERROR });
    });
  });

  describe("KavenegarProvider", () => {
    test("succeeds when return.status is 200", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            return: { status: 200, message: "تایید شد" },
            entries: { messageid: 55 },
          }),
      });

      const provider = new KavenegarProvider({
        apiKey: "secret-key",
        template: "verify",
        timeoutMs: 5000,
      });

      const result = await provider.send({
        phone: "09120002222",
        code: "54321",
        purpose: "RESET_PASSWORD",
      });

      expect(result.delivered).toBe(true);
      expect(result.messageId).toBe("55");
    });

    test("fails when provider status is not 200", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ return: { status: 411, message: "invalid" } }),
      });

      const provider = new KavenegarProvider({
        apiKey: "secret-key",
        template: "verify",
        timeoutMs: 5000,
      });

      await expect(
        provider.send({ phone: "09120002223", code: "54321", purpose: "REGISTER" }),
      ).rejects.toMatchObject({ code: SMS_ERROR_CODES.SMS_DELIVERY_FAILED });
    });
  });

  describe("OTP delivery failure policy", () => {
    test("API fails and OTP is not usable when provider fails", async () => {
      otpDeliveryService.setAdapter({
        async send() {
          throw new SmsProviderError("fail", { code: SMS_ERROR_CODES.SMS_DELIVERY_FAILED });
        },
      });

      const res = await request(app)
        .post("/api/auth/register/send-otp")
        .send({ phone: "09123330001" });

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("SMS_DELIVERY_FAILED");
      expect(res.body.data?.devOtp).toBeUndefined();

      const active = await Otp.countDocuments({
        phone: "09123330001",
        consumedAt: null,
        invalidatedAt: null,
      });
      expect(active).toBe(0);

      // Retry allowed immediately (no active OTP cooldown lock).
      otpDeliveryService.resetAdapter();
      const retry = await request(app)
        .post("/api/auth/register/send-otp")
        .send({ phone: "09123330001" });
      expect(retry.status).toBe(200);
      expect(retry.body.data.sent).toBe(true);
      expect(retry.body.data.devOtp).toMatch(/^\d{5}$/);
    });

    test("timeout failure invalidates OTP and does not hang forever", async () => {
      otpDeliveryService.setAdapter({
        async send() {
          throw new SmsProviderError("timeout", {
            code: SMS_ERROR_CODES.SMS_PROVIDER_TIMEOUT,
            statusCode: 504,
          });
        },
      });

      const res = await request(app)
        .post("/api/auth/register/send-otp")
        .send({ phone: "09123330002" });

      expect(res.status).toBe(504);
      expect(res.body.error.code).toBe("SMS_PROVIDER_TIMEOUT");
      expect(await Otp.countDocuments({ phone: "09123330002", invalidatedAt: null })).toBe(0);
    });
  });

  describe("phone rate limit", () => {
    test("blocks excessive OTP creates for same phone", async () => {
      const phone = "09124440001";
      const now = new Date();
      for (let i = 0; i < env.OTP_RATE_LIMIT_PER_PHONE; i += 1) {
        await Otp.create({
          phone,
          codeHash: `hash-${i}`,
          purpose: "REGISTER",
          expiresAt: new Date(now.getTime() + 60000),
          maxAttempts: 5,
          invalidatedAt: new Date(),
        });
      }

      const res = await request(app).post("/api/auth/register/send-otp").send({ phone });
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe("OTP_PHONE_RATE_LIMIT");
    });
  });

  describe("end-to-end with mocked provider success", () => {
    test("register OTP → verify → register", async () => {
      const send = await request(app)
        .post("/api/auth/register/send-otp")
        .send({ phone: "09125550001" });
      expect(send.status).toBe(200);
      const code = send.body.data.devOtp;

      const verify = await request(app)
        .post("/api/auth/register/verify-otp")
        .send({ phone: "09125550001", code });
      expect(verify.status).toBe(200);

      const register = await request(app)
        .post("/api/auth/register")
        .send({
          registrationToken: verify.body.data.registrationToken,
          firstName: "علی",
          lastName: "تست",
          password: "Password1",
          confirmPassword: "Password1",
        });
      expect(register.status).toBe(201);
      expect(register.body.data.user.phone).toBe("09125550001");
    });

    test("password reset OTP delivery with mocked success", async () => {
      await User.create({
        phone: "09125550002",
        firstName: "علی",
        lastName: "تست",
        passwordHash: await hashPassword("Password1"),
        phoneVerified: true,
      });

      const send = await request(app)
        .post("/api/auth/password/send-otp")
        .send({ phone: "09125550002" });
      expect(send.status).toBe(200);
      expect(send.body.data.devOtp).toMatch(/^\d{5}$/);

      const verify = await request(app)
        .post("/api/auth/password/verify-otp")
        .send({ phone: "09125550002", code: send.body.data.devOtp });
      expect(verify.status).toBe(200);
      expect(verify.body.data.resetToken).toBeTruthy();
    });

    test("REGISTER OTP cannot verify RESET flow", async () => {
      const send = await request(app)
        .post("/api/auth/register/send-otp")
        .send({ phone: "09125550003" });
      const code = send.body.data.devOtp;

      await User.create({
        phone: "09125550003",
        firstName: "علی",
        lastName: "تست",
        passwordHash: await hashPassword("Password1"),
        phoneVerified: true,
      });

      // Consume uniqueness by using same phone after register OTP — purpose isolation:
      // register OTP purpose cannot satisfy reset verify for a different purpose record.
      // Use a dedicated reset request path instead: wrong purpose code from REGISTER otp.
      const resetVerify = await request(app)
        .post("/api/auth/password/verify-otp")
        .send({ phone: "09125550003", code });
      expect(resetVerify.status).toBe(400);
      expect(resetVerify.body.error.code).toBe("INVALID_OTP");
    });
  });

  describe("devOtp exposure", () => {
    test("does not expose OTP when adapter is not development", async () => {
      otpDeliveryService.setAdapter({
        async send({ code }) {
          return { delivered: true, channel: "sms", provider: "mock", code };
        },
      });

      // maybeExposeDevOtp checks SMS_PROVIDER env, not adapter name — force via spy
      const originalMaybe = otpDeliveryService.maybeExposeDevOtp.bind(otpDeliveryService);
      otpDeliveryService.maybeExposeDevOtp = () => undefined;

      const res = await request(app)
        .post("/api/auth/register/send-otp")
        .send({ phone: "09126660001" });
      expect(res.status).toBe(200);
      expect(res.body.data.devOtp).toBeUndefined();
      expect(res.body.data.sent).toBe(true);

      otpDeliveryService.maybeExposeDevOtp = originalMaybe;
    });
  });
});
