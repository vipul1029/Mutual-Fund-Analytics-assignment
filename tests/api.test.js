import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/fundService.js", () => ({
  listFunds: vi.fn(async () => [{ code: "1001", name: "Sample Fund" }]),
  getFundByCode: vi.fn(async (code) => ({ code, name: "Sample Fund", latestNav: null })),
  getFundAnalytics: vi.fn(async () => null),
  rankFunds: vi.fn(async () => []),
  getFundAnalyticsCoverage: vi.fn(async () => ({
    fundCode: "1001",
    available_windows: ["1Y"],
    missing_windows: ["3Y", "5Y", "10Y"],
    latest_computed_at: null
  }))
}));

const { default: fundsRoutes } = await import("../src/api/routes/funds.js");

describe("fund routes", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("GET /funds returns array", async () => {
    const app = Fastify();
    await app.register(fundsRoutes);
    const response = await app.inject({
      method: "GET",
      url: "/funds"
    });

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.json())).toBe(true);
    await app.close();
  });

  it("GET /funds/:code returns fund", async () => {
    const app = Fastify();
    await app.register(fundsRoutes);
    const response = await app.inject({
      method: "GET",
      url: "/funds/1001"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ code: "1001" });
    await app.close();
  });
});
