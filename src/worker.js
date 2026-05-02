// import { createSyncWorker } from "./queue/worker.js";
// import { disconnectPrisma } from "./db/prisma.js";
// import { disconnectRedis } from "./db/redis.js";
// import { logger } from "./utils/logger.js";

// const worker = createSyncWorker();
// logger.info("Standalone worker started");

// async function shutdown(signal) {
//   logger.info({ signal }, "Stopping worker");
//   await worker.close();
//   await Promise.all([disconnectPrisma(), disconnectRedis()]);
//   process.exit(0);
// }

// for (const signal of ["SIGINT", "SIGTERM"]) {
//   process.on(signal, () => {
//     shutdown(signal).catch((error) => {
//       logger.error({ error }, "Worker shutdown failed");
//       process.exit(1);
//     });
//   });
// }












import { Worker } from "bullmq";
import { connection } from "../db/redis.js";
import { enqueueFundJobs, syncSingleFund } from "../pipeline/syncService.js";
import { JOBS } from "./queues.js";

export function createSyncWorker() {
  const worker = new Worker(
    "mf-sync-queue",
    async (job) => {
      try {
        console.log("🚀 Processing job:", job.name);

        if (job.name === JOBS.FULL_SYNC) {
          await enqueueFundJobs();
        }

        if (job.name === JOBS.SYNC_FUND) {
          await syncSingleFund(job.data.code);
        }

        console.log("✅ Job completed:", job.name);
      } catch (err) {
        console.error("❌ JOB ERROR:", err);
        if (err?.stack) console.error(err.stack);
        throw err;
      }
    },
    { connection }
  );

  worker.on("failed", (job, err) => {
    console.error("❌ WORKER FAILED:", job.name);
    console.error(err);
    if (err?.stack) console.error(err.stack);
  });

  worker.on("completed", (job) => {
    console.log("🎉 WORKER COMPLETED:", job.name);
  });

  return worker;
}