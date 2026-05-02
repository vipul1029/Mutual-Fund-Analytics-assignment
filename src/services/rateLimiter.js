import Bottleneck from "bottleneck";
import IORedis from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const LIMITS = {
  perSecond: 2,
  perMinute: 50,
  perHour: 300
};

const WINDOWS = {
  perSecond: 1000,
  perMinute: 60_000,
  perHour: 3_600_000
};

function redisClientOptions() {
  return {
    host: env.redisHost,
    port: env.redisPort,
    password: env.redisPassword || undefined
  };
}

function createMetricsRedisClient() {
  const options = redisClientOptions();
  options.maxRetriesPerRequest = null;
  options.enableReadyCheck = true;
  return new IORedis(options);
}

function createLimiter(id, reservoir, intervalMs, maxConcurrent = 2, options = {}) {
  const useRedis = options.useRedis ?? true;
  return new Bottleneck({
    id,
    ...(useRedis
      ? {
          datastore: "ioredis",
          clearDatastore: false,
          clientOptions: redisClientOptions()
        }
      : {}),
    reservoir,
    reservoirRefreshAmount: reservoir,
    reservoirRefreshInterval: intervalMs,
    maxConcurrent
  });
}

export function buildRateLimiter(config = {}) {
  const useRedis = config.useRedis ?? true;
  const metricsRedis = useRedis ? createMetricsRedisClient() : null;
  const limits = {
    perSecond: config.perSecond?.tokens ?? LIMITS.perSecond,
    perMinute: config.perMinute?.tokens ?? LIMITS.perMinute,
    perHour: config.perHour?.tokens ?? LIMITS.perHour
  };
  const windows = {
    perSecond: config.perSecond?.intervalMs ?? WINDOWS.perSecond,
    perMinute: config.perMinute?.intervalMs ?? WINDOWS.perMinute,
    perHour: config.perHour?.intervalMs ?? WINDOWS.perHour
  };
  const second = createLimiter(
    "mfapi-sec",
    limits.perSecond,
    windows.perSecond,
    config.perSecond?.maxConcurrent ?? 2,
    { useRedis }
  );
  const minute = createLimiter(
    "mfapi-min",
    limits.perMinute,
    windows.perMinute,
    config.perMinute?.maxConcurrent ?? 5,
    { useRedis }
  );
  const hour = createLimiter(
    "mfapi-hour",
    limits.perHour,
    windows.perHour,
    config.perHour?.maxConcurrent ?? 10,
    { useRedis }
  );

  // Job must pass all three gates: hour -> minute -> second.
  hour.chain(minute);
  minute.chain(second);

  function currentWindowKeys(now = Date.now()) {
    return {
      perSecond: `mfapi:metrics:sec:${Math.floor(now / windows.perSecond)}`,
      perMinute: `mfapi:metrics:min:${Math.floor(now / windows.perMinute)}`,
      perHour: `mfapi:metrics:hour:${Math.floor(now / windows.perHour)}`
    };
  }

  async function reserveQuota() {
    if (!useRedis) {
      return {
        granted: true,
        counts: { perSecond: 0, perMinute: 0, perHour: 0 },
        waits: { perSecond: 0, perMinute: 0, perHour: 0 }
      };
    }
    const now = Date.now();
    const keys = currentWindowKeys(now);

    const lua = `
      local secCurrent = tonumber(redis.call('GET', KEYS[1]) or '0')
      local minCurrent = tonumber(redis.call('GET', KEYS[2]) or '0')
      local hourCurrent = tonumber(redis.call('GET', KEYS[3]) or '0')
      local secLimit = tonumber(ARGV[1])
      local minLimit = tonumber(ARGV[2])
      local hourLimit = tonumber(ARGV[3])
      local secTtl = tonumber(ARGV[4])
      local minTtl = tonumber(ARGV[5])
      local hourTtl = tonumber(ARGV[6])

      if secCurrent >= secLimit or minCurrent >= minLimit or hourCurrent >= hourLimit then
        return {
          0,
          secCurrent,
          minCurrent,
          hourCurrent
        }
      end

      secCurrent = redis.call('INCR', KEYS[1])
      minCurrent = redis.call('INCR', KEYS[2])
      hourCurrent = redis.call('INCR', KEYS[3])
      if secCurrent == 1 then redis.call('PEXPIRE', KEYS[1], secTtl * 2) end
      if minCurrent == 1 then redis.call('PEXPIRE', KEYS[2], minTtl * 2) end
      if hourCurrent == 1 then redis.call('PEXPIRE', KEYS[3], hourTtl * 2) end

      return {
        1,
        secCurrent,
        minCurrent,
        hourCurrent
      }
    `;

    const res = await metricsRedis.eval(
      lua,
      3,
      keys.perSecond,
      keys.perMinute,
      keys.perHour,
      limits.perSecond,
      limits.perMinute,
      limits.perHour,
      windows.perSecond,
      windows.perMinute,
      windows.perHour
    );

    const granted = Number(res[0]) === 1;
    const counts = {
      perSecond: Number(res[1]),
      perMinute: Number(res[2]),
      perHour: Number(res[3])
    };
    const waits = {
      perSecond: windows.perSecond - (now % windows.perSecond),
      perMinute: windows.perMinute - (now % windows.perMinute),
      perHour: windows.perHour - (now % windows.perHour)
    };
    return { granted, counts, waits };
  }

  async function waitForQuota() {
    while (true) {
      const reserved = await reserveQuota();
      if (reserved.granted) {
        return reserved;
      }
      const waitMs = Math.max(
        reserved.counts.perSecond >= limits.perSecond ? reserved.waits.perSecond : 0,
        reserved.counts.perMinute >= limits.perMinute ? reserved.waits.perMinute : 0,
        reserved.counts.perHour >= limits.perHour ? reserved.waits.perHour : 0
      );
      await new Promise((resolve) => setTimeout(resolve, Math.max(waitMs, 50)));
    }
  }

  return {
    async schedule(fn, metadata = {}) {
      const quota = await waitForQuota();
      const response = await hour.schedule(fn);
      const now = new Date().toISOString();
      logger.info(
        `[${now}] API_CALL scheme=${metadata.schemeCode ?? "unknown"} sec=${quota.counts.perSecond} min=${quota.counts.perMinute} hour=${quota.counts.perHour}`
      );
      return response;
    },
    async getMetrics() {
      if (!useRedis) {
        return {
          per_second: 0,
          per_minute: 0,
          per_hour: 0,
          limits: {
            per_second: limits.perSecond,
            per_minute: limits.perMinute,
            per_hour: limits.perHour
          }
        };
      }
      const keys = currentWindowKeys(Date.now());
      const values = await metricsRedis.mget(keys.perSecond, keys.perMinute, keys.perHour);
      return {
        per_second: Number(values[0] ?? 0),
        per_minute: Number(values[1] ?? 0),
        per_hour: Number(values[2] ?? 0),
        limits: {
          per_second: limits.perSecond,
          per_minute: limits.perMinute,
          per_hour: limits.perHour
        }
      };
    },
    async stop() {
      await Promise.all([second.stop(), minute.stop(), hour.stop()]);
      if (metricsRedis) {
        await metricsRedis.quit();
      }
    }
  };
}

export const mfapiLimiter = buildRateLimiter({
  useRedis: process.env.NODE_ENV !== "test"
});
