// import { Worker } from "bullmq";
// import { env } from "../config/env.js";
// import { redis } from "../db/redis.js";
// import { deadLetterQueue, JOBS } from "./queues.js";
// import { enqueueFundJobs, syncSingleFund } from "../pipeline/syncService.js";
// import { logger } from "../utils/logger.js";

// export function createSyncWorker() {
//   const worker = new Worker(
//     env.syncQueueName,
//     async (job) => {
//       if (job.name === JOBS.FULL_SYNC) {
//         const count = await enqueueFundJobs();
//         return { enqueued: count };
//       }

//       if (job.name === JOBS.SYNC_FUND) {
//         return syncSingleFund(job.data.code);
//       }

//       throw new Error(`Unknown job type: ${job.name}`);
//     },
//     {
//       connection: redis,
//       concurrency: 4
//     }
//   );

//   worker.on("completed", (job) => {
//     logger.info({ jobId: job.id, name: job.name, attemptsMade: job.attemptsMade }, "Job completed");
//   });

//   worker.on("failed", async (job, error) => {
//     logger.error({ jobId: job?.id, name: job?.name, attemptsMade: job?.attemptsMade, error }, "Job failed");
//     const maxAttempts = Number(job?.opts?.attempts ?? 1);
//     if (job && job.attemptsMade >= maxAttempts) {
//       await deadLetterQueue.add(
//         JOBS.DEAD_LETTER,
//         {
//           originalJobId: job.id,
//           originalJobName: job.name,
//           payload: job.data,
//           failedAt: new Date().toISOString(),
//           error: String(error?.message ?? error)
//         },
//         { removeOnComplete: 1000, removeOnFail: 1000 }
//       );
//       logger.error({ jobId: job.id, name: job.name }, "Moved job to dead-letter queue");
//     }
//   });

//   worker.on("active", (job) => {
//     logger.info({ jobId: job.id, name: job.name, attemptsMade: job.attemptsMade }, "Job processing started");
//   });

//   worker.on("drained", async () => {
//     await redis.set("sync:meta:state", "idle");
//     await redis.set("sync:meta:last_run", new Date().toISOString());
//     logger.info("Sync worker queue drained");
//   });

//   return worker;
// }
























// import { Worker } from "bullmq";
// import { env } from "../config/env.js";
// import { connection } from "../db/redis.js";
// import { deadLetterQueue, JOBS } from "./queues.js";
// import { enqueueFundJobs, syncSingleFund } from "../pipeline/syncService.js";
// import { logger } from "../utils/logger.js";

// export function createSyncWorker() {
//   const worker = new Worker(
//     env.syncQueueName,
//     async (job) => {
//       if (job.name === JOBS.FULL_SYNC) {
//         const count = await enqueueFundJobs();
//         return { enqueued: count };
//       }

//       if (job.name === JOBS.SYNC_FUND) {
//         return syncSingleFund(job.data.code);
//       }

//       throw new Error(`Unknown job type: ${job.name}`);
//     },
//     {
//       connection,
//       concurrency: 4
//     }
//   );

//   worker.on("completed", (job) => {
//     logger.info({ jobId: job.id, name: job.name, attemptsMade: job.attemptsMade }, "Job completed");
//   });

//   worker.on("failed", async (job, error) => {
//     console.error("❌ WORKER ERROR:", error);
//     if (error?.stack) console.error(error.stack);

//     logger.error({ jobId: job?.id, name: job?.name, attemptsMade: job?.attemptsMade, error }, "Job failed");

//     const maxAttempts = Number(job?.opts?.attempts ?? 1);

//     if (job && job.attemptsMade >= maxAttempts) {
//       await deadLetterQueue.add(
//         JOBS.DEAD_LETTER,
//         {
//           originalJobId: job.id,
//           originalJobName: job.name,
//           payload: job.data,
//           failedAt: new Date().toISOString(),
//           error: String(error?.message ?? error)
//         },
//         { removeOnComplete: 1000, removeOnFail: 1000 }
//       );

//       logger.error({ jobId: job.id, name: job.name }, "Moved job to dead-letter queue");
//     }
//   });

//   worker.on("active", (job) => {
//     logger.info({ jobId: job.id, name: job.name, attemptsMade: job.attemptsMade }, "Job processing started");
//   });

//   worker.on("drained", async () => {
//     await redis.set("sync:meta:state", "idle");
//     await redis.set("sync:meta:last_run", new Date().toISOString());
//     logger.info("Sync worker queue drained");
//   });

//   return worker;
// }















import { Worker } from "bullmq";
import { env } from "../config/env.js";
import { connection, redis } from "../db/redis.js";
import { deadLetterQueue, JOBS } from "./queues.js";
import { enqueueFundJobs, syncSingleFund } from "../pipeline/syncService.js";
import { logger } from "../utils/logger.js";

export function createSyncWorker() {
  const worker = new Worker(
    env.syncQueueName,
    async (job) => {
      if (job.name === JOBS.FULL_SYNC) {
        logger.info("🚀 FULL SYNC START");
        return await enqueueFundJobs();
      }

      if (job.name === JOBS.SYNC_FUND) {
        logger.info({ code: job.data.code }, "📥 Syncing fund");
        return await syncSingleFund(job.data.code);
      }

      throw new Error(`Unknown job type: ${job.name}`);
    },
    {
      connection,
      concurrency: 4
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "✅ Job completed");
  });

  worker.on("failed", async (job, error) => {
    console.error("❌ ERROR:", error);
    if (error?.stack) console.error(error.stack);

    const maxAttempts = Number(job?.opts?.attempts ?? 1);

    if (job && job.attemptsMade >= maxAttempts) {
      await deadLetterQueue.add(JOBS.DEAD_LETTER, {
        originalJobId: job.id,
        error: String(error?.message ?? error)
      });
    }
  });

  worker.on("drained", async () => {
    await redis.set("sync:meta:state", "idle");
    logger.info("Queue drained");
  });

  return worker;
}