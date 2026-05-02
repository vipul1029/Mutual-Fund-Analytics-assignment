import dotenv from "dotenv";

dotenv.config();

function required(name, fallback = undefined) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 3000),
  logLevel: process.env.LOG_LEVEL ?? "info",
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/mf_analytics?schema=public",
  redisHost: process.env.REDIS_HOST ?? "localhost",
  redisPort: Number(process.env.REDIS_PORT ?? 6379),
  redisPassword: process.env.REDIS_PASSWORD ?? "",
  mfapiBaseUrl: process.env.MFAPI_BASE_URL ?? "https://api.mfapi.in",
  cacheTtlSeconds: Number(process.env.CACHE_TTL_SECONDS ?? 120),
  syncQueueName: process.env.SYNC_QUEUE_NAME ?? "mf-sync-queue",
  deadLetterQueueName: process.env.DEAD_LETTER_QUEUE_NAME ?? "mf-sync-dlq",
  syncBatchSize: Number(process.env.SYNC_BATCH_SIZE ?? 5),
  syncBatchDelayMs: Number(process.env.SYNC_BATCH_DELAY_MS ?? 10_000),
  syncRequestSpacingMs: Number(process.env.SYNC_REQUEST_SPACING_MS ?? 12_000)
};
