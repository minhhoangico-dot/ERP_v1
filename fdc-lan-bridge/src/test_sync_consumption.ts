import { syncSupplyConsumptionJob } from './jobs/syncSupplyConsumption';

async function test() {
    console.log("Testing syncSupplyConsumptionJob...");
    await syncSupplyConsumptionJob();
    console.log("Job completed.");
    process.exit(0);
}

test();
