import { syncInventoryJob } from "./src/jobs/syncInventory";
import { detectAnomaliesJob } from "./src/jobs/detectAnomalies";
import { hisPool } from "./src/db/his";
import { misaPool } from "./src/db/misa";

async function runTest() {
    try {
        console.log("Running syncInventoryJob...");
        await syncInventoryJob();

        console.log("Running detectAnomaliesJob...");
        await detectAnomaliesJob();

        console.log("Done.");
    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        await hisPool.end();
        await misaPool.close();
        process.exit(0);
    }
}

runTest();
