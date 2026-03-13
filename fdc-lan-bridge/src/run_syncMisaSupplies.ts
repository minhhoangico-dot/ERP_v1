import { syncMisaSuppliesJob } from "./jobs/syncMisaSupplies";

async function run() {
  try {
    console.log("Running syncMisaSuppliesJob once...");
    await syncMisaSuppliesJob();
    console.log("syncMisaSuppliesJob finished.");
    process.exit(0);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  }
}

run();

