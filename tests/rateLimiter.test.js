import { describe, expect, it } from "vitest";
import { buildRateLimiter } from "../src/services/rateLimiter.js";

describe("rate limiter", () => {
  it("enforces second, minute and hour windows together", async () => {
    const limiter = buildRateLimiter({
      useRedis: false,
      perSecond: { tokens: 2, intervalMs: 100, maxConcurrent: 4 },
      perMinute: { tokens: 4, intervalMs: 300, maxConcurrent: 4 },
      perHour: { tokens: 6, intervalMs: 600, maxConcurrent: 4 }
    });

    const startedAt = Date.now();
    const executionTimes = [];

    await Promise.all(
      Array.from({ length: 7 }).map((_, idx) =>
        limiter.schedule(async () => {
          executionTimes[idx] = Date.now() - startedAt;
        })
      )
    );

    await limiter.stop();

    const sorted = [...executionTimes].sort((a, b) => a - b);
    expect(sorted[1]).toBeLessThan(220); // first 2 pass second limiter (allow CI timer jitter)
    expect(sorted[3]).toBeGreaterThanOrEqual(100); // next 2 wait for second refill
    expect(sorted[6]).toBeGreaterThanOrEqual(600); // 7th waits for hour limiter
  });

  it("exposes metrics payload shape with limits", async () => {
    const limiter = buildRateLimiter({ useRedis: false });
    const metrics = await limiter.getMetrics();
    await limiter.stop();

    expect(metrics).toEqual({
      per_second: 0,
      per_minute: 0,
      per_hour: 0,
      limits: {
        per_second: 2,
        per_minute: 50,
        per_hour: 300
      }
    });
  });
});
