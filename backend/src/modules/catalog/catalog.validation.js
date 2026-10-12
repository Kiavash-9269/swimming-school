const { z } = require("zod");

const swimmingRecordItem = z.object({
  event: z.string().trim().min(2).max(120),
  time: z.coerce.number().min(0),
  distance: z.coerce.number().int().min(1).max(10000),
  holder: z.string().trim().min(2).max(160),
  type: z.enum(["خارجی", "داخلی"]),
  discipline: z.string().trim().min(2).max(80),
  highlight: z.boolean().optional().default(false),
  sortOrder: z.coerce.number().int().optional(),
});

const replaceRecordsBody = z.object({
  items: z.array(swimmingRecordItem).min(1).max(500),
});

const syncCatalogBody = z
  .object({
    openRegistration: z.boolean().optional().default(false),
  })
  .default({ openRegistration: false });

module.exports = {
  replaceRecordsBody,
  syncCatalogBody,
  swimmingRecordItem,
};
