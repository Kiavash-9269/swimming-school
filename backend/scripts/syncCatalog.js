#!/usr/bin/env node
/**
 * Upsert marketing catalog slots into Mongo course_classes + seed swimming records.
 *
 * Usage:
 *   node scripts/syncCatalog.js
 *   node scripts/syncCatalog.js --open
 */
require("dotenv").config();
const { connectDatabase, disconnectDatabase } = require("../src/config/database");
const catalogService = require("../src/modules/catalog/catalog.service");

async function main() {
  const openRegistration = process.argv.includes("--open");
  await connectDatabase();
  const records = await catalogService.ensureDefaultRecords();
  const sync = await catalogService.syncCatalog({ openRegistration });
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        records,
        sync: {
          slots: sync.slots,
          created: sync.created,
          updated: sync.updated,
          unchanged: sync.unchanged,
        },
        openRegistration,
      },
      null,
      2,
    ),
  );
  await disconnectDatabase();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  try {
    await disconnectDatabase();
  } catch {
    // ignore
  }
  process.exit(1);
});
