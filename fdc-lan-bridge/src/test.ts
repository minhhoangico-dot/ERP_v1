import { hisPool } from "./db/his";
import { misaPool } from "./db/misa";
import { syncStaffJob } from "./jobs/syncStaff";
import { syncInventoryJob } from "./jobs/syncInventory";
import { syncPatientVolumeJob } from "./jobs/syncPatientVolume";
import { syncMisaPaymentsJob } from "./jobs/syncMisaPayments";
import { scanMisaPhieuchiJob } from "./jobs/scanMisaPhieuchi";
import { syncMisaSuppliesJob } from "./jobs/syncMisaSupplies";
import { updateHealthJob } from "./jobs/updateHealth";
import { syncAttendanceJob } from "./jobs/syncAttendance";
import { logger } from "./lib/logger";

async function runTests() {
    logger.info("=== Starting Manual Test Run ===");

    try {
        await updateHealthJob();
        logger.info("Health Check Complete.");

        // await syncStaffJob();
        // logger.info("Staff Sync Complete.");

        await syncPatientVolumeJob();
        logger.info("Patient Volume Sync Complete.");

        await syncInventoryJob();
        logger.info("Medicine Inventory Sync Complete.");

        await syncMisaSuppliesJob();
        logger.info("MISA Supplies Sync Complete.");

        await syncMisaPaymentsJob();
        logger.info("MISA Payments Sync Complete.");

        await scanMisaPhieuchiJob();
        logger.info("MISA Phieu Chi Scan Complete.");

        await syncAttendanceJob();
        logger.info("Hikvision Attendance Sync Complete.");

        logger.info("=== All Manual Tests Finished ===");
    } catch (err) {
        logger.error("Error during manual tests", err);
    } finally {
        try {
            await hisPool.end();
            await misaPool.close();
        } catch (e) { }
        process.exit();
    }
}

runTests();
