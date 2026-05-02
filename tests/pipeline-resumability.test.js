import { describe, expect, it } from "vitest";
import { buildFundSchedule, planNavUpserts } from "../src/pipeline/syncPlanner.js";

describe("sync planner resumability", () => {
  it("skips rows up to last synced date", () => {
    const navRows = [
      { date: "01-01-2024", nav: "10.0000" },
      { date: "02-01-2024", nav: "10.1000" },
      { date: "03-01-2024", nav: "10.3000" }
    ];

    const result = planNavUpserts(navRows, new Date("2024-01-02"));

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].nav).toBeCloseTo(10.3);
    expect(result.latestDate.toISOString().slice(0, 10)).toBe("2024-01-03");
  });

  it("builds chunked schedule with spacing and batch delays", () => {
    const delay0 = buildFundSchedule(0, 3, 1000, 500);
    const delay2 = buildFundSchedule(2, 3, 1000, 500);
    const delay3 = buildFundSchedule(3, 3, 1000, 500);

    expect(delay0).toBe(0);
    expect(delay2).toBe(1000);
    expect(delay3).toBe(2500);
  });
});
