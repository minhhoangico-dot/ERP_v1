import { backfillHisPharmacyInventoryDailyValueJob } from "./jobs/backfillHisPharmacyInventoryDailyValue";
import { logger } from "./lib/logger";

async function run() {
  try {
    logger.info("Manual run: backfillHisPharmacyInventoryDailyValueJob(365) starting...");
    await backfillHisPharmacyInventoryDailyValueJob(365);
    logger.info("Manual run: backfillHisPharmacyInventoryDailyValueJob completed.");
  } catch (err) {
    logger.error("Manual backfillHisPharmacyInventoryDailyValueJob failed", err);
  } finally {
    // Allow Node process to exit
    process.exit(0);
  }
}

run();

