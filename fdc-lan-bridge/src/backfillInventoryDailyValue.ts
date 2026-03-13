import { backfillMisaInventoryDailyValueJob } from "./jobs/backfillMisaInventoryDailyValue";

async function run() {
  const arg = process.argv.find((a) => a.startsWith("--days="));
  const days = arg ? Number(arg.split("=")[1]) : 365;

  await backfillMisaInventoryDailyValueJob(Number.isFinite(days) ? days : 365);
  process.exit(0);
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});

