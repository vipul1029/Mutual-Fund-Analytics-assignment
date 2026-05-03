

import { disconnectRedis } from "./db/redis.js";
import { disconnectPrisma } from "./db/prisma.js";
import { createSyncWorker } from "./queue/worker.js";
import { logger } from "./utils/logger.js";

const worker = createSyncWorker();
logger.info("Standalone worker started");

async function shutdown(signal) {
  logger.info({ signal }, "Stopping worker");
  await worker.close();
  await Promise.all([disconnectPrisma(), disconnectRedis()]);
  process.exit(0);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    shutdown(signal).catch((error) => {
      logger.error({ error }, "Worker shutdown failed");
      process.exit(1);
    });
  });
}