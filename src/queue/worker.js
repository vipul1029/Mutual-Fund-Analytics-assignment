

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
        logger.info(" FULL SYNC START");
        return await enqueueFundJobs();
      }

      if (job.name === JOBS.SYNC_FUND) {
        logger.info({ code: job.data.code }, " Syncing fund");
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
    logger.info({ jobId: job.id }, " Job completed");
  });

  worker.on("failed", async (job, error) => {
    console.error(" ERROR:", error);
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