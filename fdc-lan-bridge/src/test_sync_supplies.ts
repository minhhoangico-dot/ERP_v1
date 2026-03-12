import { syncMisaSuppliesJob } from './jobs/syncMisaSupplies';

async function test() {
    console.log("Testing syncMisaSuppliesJob...");
    await syncMisaSuppliesJob();
    console.log("Job completed.");
    process.exit(0);
}

test();
