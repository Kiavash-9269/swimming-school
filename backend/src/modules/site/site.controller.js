const { z } = require("zod");
const QRCode = require("qrcode");
const { success } = require("../../utils/apiResponse");
const { asyncHandler } = require("../../middleware/errorHandler");
const { AppError } = require("../../utils/AppError");
const settings = require("./siteSetting.service");

const cardToCardBody = z
  .object({
    enabled: z.boolean().optional(),
    cardNumber: z.string().trim().max(32).optional(),
    cardHolder: z.string().trim().max(120).optional(),
    bankName: z.string().trim().max(80).optional(),
    iban: z.string().trim().max(40).optional(),
    instructions: z.string().trim().max(600).optional(),
  })
  .strict();

const clinicBody = z
  .object({
    enabled: z.boolean().optional(),
    title: z.string().trim().max(120).optional(),
    subtitle: z.string().trim().max(160).optional(),
    description: z.string().trim().max(1500).optional(),
    priceToman: z.coerce.number().int().min(0).max(500000000).optional(),
    startDate: z.string().trim().max(60).optional(),
    endDate: z.string().trim().max(60).optional(),
    schedule: z.string().trim().max(200).optional(),
    location: z.string().trim().max(200).optional(),
    capacity: z.coerce.number().int().min(0).max(10000).optional(),
    phone: z.string().trim().max(20).optional(),
    notice: z.string().trim().max(600).optional(),
  })
  .strict();

const getPublicSettings = asyncHandler(async (_req, res) => {
  const [cardToCard, clinic] = await Promise.all([
    settings.getCardToCard(),
    settings.getClinic(),
  ]);
  return success(res, {
    cardToCard: settings.publicCardToCard(cardToCard),
    clinic: settings.publicClinic(clinic),
  });
});

const getAdminSettings = asyncHandler(async (_req, res) => {
  const [cardToCard, clinic] = await Promise.all([
    settings.getCardToCard(),
    settings.getClinic(),
  ]);
  return success(res, { cardToCard, clinic });
});

const putCardToCard = asyncHandler(async (req, res) => {
  const value = await settings.updateValue(settings.SETTING_KEYS.CARD_TO_CARD, req.body, {
    actorId: req.user._id,
  });
  return success(res, value);
});

const putClinic = asyncHandler(async (req, res) => {
  const value = await settings.updateValue(settings.SETTING_KEYS.CLINIC, req.body, {
    actorId: req.user._id,
  });
  return success(res, value);
});

/**
 * Scannable payment QR — encodes the card number so banking apps can read it.
 * Served as PNG so admins/customers can print it like a provider payment card.
 */
const getPaymentQr = asyncHandler(async (req, res) => {
  const cardToCard = settings.publicCardToCard(await settings.getCardToCard());
  const digits = String(cardToCard.cardNumber || "").replace(/[^\d]/g, "");
  if (!cardToCard.enabled || digits.length < 16) {
    throw new AppError("شماره کارت کارت‌به‌کارت تنظیم نشده است", {
      statusCode: 404,
      code: "CARD_TO_CARD_UNAVAILABLE",
    });
  }

  const png = await QRCode.toBuffer(digits, {
    type: "png",
    width: 480,
    margin: 1,
    errorCorrectionLevel: "M",
  });

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(png);
});

module.exports = {
  cardToCardBody,
  clinicBody,
  getPublicSettings,
  getAdminSettings,
  putCardToCard,
  putClinic,
  getPaymentQr,
};
