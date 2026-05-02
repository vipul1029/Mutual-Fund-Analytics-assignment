import { Queue, QueueEvents } from "bullmq";
import { env } from "../config/env.js";
import { redis } from "../db/redis.js";

export const syncQueue = new Queue(env.syncQueueName, {
  connection: redis
});

export const syncQueueEvents = new QueueEvents(env.syncQueueName, {
  connection: redis
});

export const deadLetterQueue = new Queue(env.deadLetterQueueName, {
  connection: redis
});

export const JOBS = {
  FULL_SYNC: "full-sync",
  SYNC_FUND: "sync-fund",
  DEAD_LETTER: "dead-letter"
};
