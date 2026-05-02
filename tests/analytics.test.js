import { describe, expect, it } from "vitest";
import { computeMaxDrawdown, computeRollingCagr } from "../src/analytics/computeAnalytics.js";

describe("analytics computations", () => {
  it("computes max drawdown correctly", () => {
    const series = [
      { date: new Date("2020-01-01"), nav: 100 },
      { date: new Date("2020-02-01"), nav: 120 },
      { date: new Date("2020-03-01"), nav: 90 },
      { date: new Date("2020-04-01"), nav: 95 }
    ];

    const drawdown = computeMaxDrawdown(series);
    expect(drawdown).toBeCloseTo(-0.25, 6);
  });

  it("computes rolling CAGR values for a 1Y window", () => {
    const series = [
      { date: new Date("2020-01-01"), nav: 100 },
      { date: new Date("2020-12-31"), nav: 110 },
      { date: new Date("2021-12-31"), nav: 121 }
    ];

    const values = computeRollingCagr(series, 365);
    expect(values.length).toBe(2);
    expect(values[0]).toBeCloseTo(0.1, 2);
    expect(values[1]).toBeCloseTo(0.1, 2);
  });

  it("validates sparse NAV series with known CAGR and drawdown", () => {
    // Sparse dates intentionally simulate weekends/holidays.
    const series = [
      { date: new Date("2020-01-01"), nav: 100 },
      { date: new Date("2020-01-10"), nav: 110 },
      { date: new Date("2021-01-03"), nav: 121 },
      { date: new Date("2021-01-15"), nav: 118 }
    ];

    const values = computeRollingCagr(series, 365);
    expect(values.length).toBe(2);
    // Uses next available NAV on/after target date:
    // 100 -> 121 in ~368 days ~= 20.8% annualized
    expect(values[0]).toBeCloseTo(0.208, 2);
    // 110 -> 118 in ~370 days ~= 7.1%
    expect(values[1]).toBeCloseTo(0.071, 2);

    const drawdown = computeMaxDrawdown(series);
    // Peak 121 to trough 118 => -2.4793%
    expect(drawdown).toBeCloseTo(-0.024793, 5);
  });
});
