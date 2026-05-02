import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";
import { redis } from "../db/redis.js";
import { mfapiClient } from "../services/mfapiClient.js";
import { JOBS, syncQueue } from "../queue/queues.js";
import { buildFundSchedule, planNavUpserts } from "./syncPlanner.js";
import { recomputeAnalyticsForFund } from "../services/analyticsService.js";
import { invalidateFundCache } from "../services/fundService.js";
import { logger } from "../utils/logger.js";

const SYNC_META = {
  state: "sync:meta:state",
  lastRun: "sync:meta:last_run"
};

async function setSyncRunning(running) {
  await redis.set(SYNC_META.state, running ? "running" : "idle");
  if (!running) {
    await redis.set(SYNC_META.lastRun, new Date().toISOString());
  }
}

export async function triggerManualSync() {
  logger.info("Manual sync trigger requested");
  return syncQueue.add(
    JOBS.FULL_SYNC,
    {},
    {
      removeOnComplete: 100,
      removeOnFail: 100
    }
  );
}

export async function enqueueFundJobs() {
  const funds = await prisma.fund.findMany({ select: { code: true } });
  await setSyncRunning(true);
  logger.info({ count: funds.length }, "Full sync started");

  for (let index = 0; index < funds.length; index += 1) {
    const fund = funds[index];
    const scheduledDelay = buildFundSchedule(index, env.syncBatchSize, env.syncBatchDelayMs, env.syncRequestSpacingMs);
    await syncQueue.add(
      JOBS.SYNC_FUND,
      { code: fund.code },
      {
        jobId: `sync:${fund.code}`,
        delay: scheduledDelay,
        removeOnComplete: 100,
        removeOnFail: 100,
        attempts: 5,
        backoff: {
          type: "exponential",
          delay: 2_000
        }
      }
    );
  }
  logger.info("Full sync job enqueue completed");
  return funds.length;
}

export async function syncSingleFund(code) {
  logger.info({ code }, "Fund sync started");
  await prisma.syncState.upsert({
    where: { fundCode: code },
    create: {
      fundCode: code,
      lastSyncedDate: new Date("1970-01-01"),
      status: "running",
      lastRunAt: new Date(),
      lastError: null
    },
    update: {
      status: "running",
      lastRunAt: new Date(),
      lastError: null
    }
  });

  try {
    const state = await prisma.syncState.findUnique({ where: { fundCode: code } });
    const payload = await mfapiClient.getFundHistory(code);

    const navRows = Array.isArray(payload?.data) ? payload.data : [];
    const { rows, latestDate } = planNavUpserts(navRows, state?.lastSyncedDate ?? null);

    if (rows.length) {
      await prisma.navData.createMany({
        data: rows.map((row) => ({
          fundCode: code,
          date: row.date,
          nav: row.nav
        })),
        skipDuplicates: true
      });
    }

    if (latestDate) {
      await prisma.syncState.upsert({
        where: { fundCode: code },
        create: {
          fundCode: code,
          lastSyncedDate: latestDate,
          status: "completed",
          lastRunAt: new Date(),
          lastError: null
        },
        update: {
          lastSyncedDate: latestDate,
          status: "completed",
          lastRunAt: new Date(),
          lastError: null
        }
      });
    } else {
      await prisma.syncState.update({
        where: { fundCode: code },
        data: {
          status: "completed",
          lastRunAt: new Date(),
          lastError: null
        }
      });
    }

    await recomputeAnalyticsForFund(code);
    await invalidateFundCache(code);
    logger.info({ code, inserted: rows.length }, "Fund sync complete");
    return { code, inserted: rows.length };
  } catch (error) {
    await prisma.syncState.update({
      where: { fundCode: code },
      data: {
        status: "failed",
        lastRunAt: new Date(),
        lastError: String(error?.message ?? error)
      }
    });
    logger.error({ code, error }, "Fund sync failed");
    throw error;
  }
}

export async function getSyncStatus() {
  const [counts, states] = await Promise.all([
    syncQueue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
    prisma.syncState.findMany({
      include: { fund: true },
      orderBy: { updatedAt: "desc" }
    })
  ]);
  const [status, lastRun] = await Promise.all([
    redis.get(SYNC_META.state),
    redis.get(SYNC_META.lastRun)
  ]);

  if ((counts.active ?? 0) === 0 && (counts.waiting ?? 0) === 0 && status === "running") {
    await setSyncRunning(false);
  }

  return {
    status: status ?? ((counts.active ?? 0) > 0 || (counts.waiting ?? 0) > 0 ? "running" : "idle"),
    last_run: lastRun,
    queue: counts,
    funds: states.map((state) => ({
      fund_code: state.fundCode,
      status: state.status,
      last_synced_date: state.lastSyncedDate,
      last_error: state.lastError
    }))
  };
}
