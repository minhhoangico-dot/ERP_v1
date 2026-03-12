import cron from "node-cron";
import { logger } from "./lib/logger";

// Import Jobs
import { syncStaffJob } from "./jobs/syncStaff";
import { syncInventoryJob } from "./jobs/syncInventory";
import { syncPatientVolumeJob } from "./jobs/syncPatientVolume";
import { syncMisaPaymentsJob } from "./jobs/syncMisaPayments";
import { scanMisaPhieuchiJob } from "./jobs/scanMisaPhieuchi";
import { syncAttendanceJob } from "./jobs/syncAttendance";
import { syncMisaSuppliesJob } from "./jobs/syncMisaSupplies";
import { updateHealthJob } from "./jobs/updateHealth";
import { syncMedicineImportsJob } from "./jobs/syncMedicineImports";
import { detectAnomaliesJob } from "./jobs/detectAnomalies";
import { syncSupplyConsumptionJob } from "./jobs/syncSupplyConsumption";
import { syncSupplyMonthlyStatsJob } from "./jobs/syncSupplyMonthlyStats";

export function startScheduler() {
    logger.info("Initializing Node Cron Scheduler...");

    // Health: Every 1 min
    cron.schedule("* * * * *", updateHealthJob);
    logger.info("Cron registered: updateHealthJob (Every 1 minute: * * * * *)");

    // MISA Payments: Every 5 min
    cron.schedule("*/5 * * * *", syncMisaPaymentsJob);
    logger.info("Cron registered: syncMisaPaymentsJob (Every 5 minutes: */5 * * * *)");

    // MISA Phieu Chi Scan: Every 5 min
    cron.schedule("*/5 * * * *", scanMisaPhieuchiJob);
    logger.info("Cron registered: scanMisaPhieuchiJob (Every 5 minutes: */5 * * * *)");

    // Attendance: Every 15 min
    cron.schedule("*/15 * * * *", syncAttendanceJob);
    logger.info("Cron registered: syncAttendanceJob (Every 15 minutes: */15 * * * *)");

    // Staff: Every 1 hour
    // cron.schedule("0 * * * *", syncStaffJob);
    // logger.info("Cron registered: syncStaffJob (Every 1 hour: 0 * * * *)");

    cron.schedule("0 6 * * *", async () => {
        logger.info("Running scheduled syncInventoryJob (Medicine)...");
        await syncInventoryJob();

        logger.info("Running scheduled detectAnomaliesJob...");
        await detectAnomaliesJob();

        logger.info("Running scheduled syncMisaSuppliesJob (Supplies)...");
        await syncMisaSuppliesJob();

        logger.info("Running scheduled syncPatientVolumeJob...");
        syncPatientVolumeJob();

        logger.info("Running scheduled syncMedicineImportsJob...");
        syncMedicineImportsJob();

        logger.info("Running scheduled syncSupplyConsumptionJob...");
        await syncSupplyConsumptionJob();

        logger.info("Running scheduled syncSupplyMonthlyStatsJob...");
        await syncSupplyMonthlyStatsJob();
    });
}
