

import IORedis from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const redisOptions = {
  host: env.redisHost,
  port: env.redisPort,
  maxRetriesPerRequest: null,
  enableReadyCheck: true
};

if (env.redisPassword) {
  redisOptions.password = env.redisPassword;
}

export const redis = new IORedis(redisOptions);


export const connection = {
  host: env.redisHost,
  port: env.redisPort
};

redis.on("error", (error) => {
  logger.error({ error }, "Redis connection error");
});

export async function disconnectRedis() {
  try {
    await redis.quit();
  } catch (error) {
    logger.error({ error }, "Failed disconnecting Redis cleanly");
    redis.disconnect();
  }
}