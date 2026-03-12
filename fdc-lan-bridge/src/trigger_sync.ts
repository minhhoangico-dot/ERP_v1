import { syncInventoryJob } from "./jobs/syncInventory";

async function run() {
    console.log("Triggering manual sync...");
    await syncInventoryJob();
    console.log("Sync complete.");
    process.exit(0);
}

run();
