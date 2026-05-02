import { prisma } from "../db/prisma.js";
import { redis } from "../db/redis.js";
import { env } from "../config/env.js";

function serializeNav(row) {
  if (!row) {
    return null;
  }
  return {
    id: row.id.toString(),
    fundCode: row.fundCode,
    date: row.date,
    nav: Number(row.nav)
  };
}

function serializeAnalytics(row) {
  if (!row) {
    return null;
  }
  return {
    fundCode: row.fundCode,
    window: row.window,
    minReturn: Number(row.minReturn),
    maxReturn: Number(row.maxReturn),
    medianReturn: Number(row.medianReturn),
    p25: Number(row.p25),
    p75: Number(row.p75),
    maxDrawdown: Number(row.maxDrawdown),
    cagrMin: Number(row.cagrMin),
    cagrMax: Number(row.cagrMax),
    cagrMedian: Number(row.cagrMedian),
    computedAt: row.computedAt
  };
}

function cacheKey(prefix, params = {}) {
  const suffix = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${value}`)
    .join("|");
  return suffix ? `${prefix}:${suffix}` : prefix;
}

async function cacheGetOrSet(key, fn, ttl = env.cacheTtlSeconds) {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  const value = await fn();
  await redis.set(key, JSON.stringify(value), "EX", ttl);
  return value;
}

export async function listFunds({ category, amc }) {
  const key = cacheKey("funds:list", { category, amc });
  return cacheGetOrSet(key, async () =>
    prisma.fund.findMany({
      where: {
        category: category || undefined,
        amc: amc || undefined
      },
      orderBy: [{ amc: "asc" }, { name: "asc" }]
    })
  );
}

export async function getFundByCode(code) {
  const key = cacheKey("funds:detail", { code });
  return cacheGetOrSet(key, async () => {
    const fund = await prisma.fund.findUnique({ where: { code } });
    if (!fund) {
      return null;
    }
    const latest = await prisma.navData.findFirst({
      where: { fundCode: code },
      orderBy: { date: "desc" }
    });
    return { ...fund, latestNav: serializeNav(latest) };
  });
}

export async function getFundAnalytics(code, window) {
  const key = cacheKey("funds:analytics", { code, window });
  return cacheGetOrSet(key, async () => {
    const data = await prisma.analytics.findUnique({
      where: {
        fundCode_window: {
          fundCode: code,
          window
        }
      }
    });
    return serializeAnalytics(data);
  });
}

export async function getFundAnalyticsCoverage(code) {
  const key = cacheKey("funds:analytics:coverage", { code });
  return cacheGetOrSet(key, async () => {
    const all = await prisma.analytics.findMany({
      where: { fundCode: code },
      select: { window: true, computedAt: true },
      orderBy: { window: "asc" }
    });
    const available = all.map((row) => row.window);
    const expected = ["1Y", "3Y", "5Y", "10Y"];
    const missing = expected.filter((window) => !available.includes(window));
    return {
      fundCode: code,
      available_windows: available,
      missing_windows: missing,
      latest_computed_at: all.length ? all[all.length - 1].computedAt : null
    };
  });
}

export async function rankFunds({ category, sortBy, window, limit = 5 }) {
  const key = cacheKey("funds:rank", { category, sortBy, window, limit });
  return cacheGetOrSet(key, async () => {
    const rows = await prisma.analytics.findMany({
      where: {
        window,
        fund: {
          category
        }
      },
      include: {
        fund: true
      },
      take: limit,
      orderBy:
        sortBy === "max_drawdown"
          ? [{ maxDrawdown: "asc" }]
          : [{ medianReturn: "desc" }]
    });

    return rows.map((row) => ({
      fundCode: row.fundCode,
      fundName: row.fund.name,
      amc: row.fund.amc,
      category: row.fund.category,
      window: row.window,
      medianReturn: Number(row.medianReturn),
      maxDrawdown: Number(row.maxDrawdown)
    }));
  });
}

export async function invalidateFundCache(code) {
  const keys = await redis.keys(`funds:*${code}*`);
  if (keys.length) {
    await redis.del(keys);
  }
}
