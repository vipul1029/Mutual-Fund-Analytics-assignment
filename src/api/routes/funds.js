import { WINDOWS } from "../../analytics/computeAnalytics.js";
import {
  getFundAnalytics,
  getFundAnalyticsCoverage,
  getFundByCode,
  listFunds,
  rankFunds
} from "../../services/fundService.js";

const VALID_WINDOWS = new Set(Object.keys(WINDOWS));
const VALID_SORT = new Set(["median_return", "max_drawdown"]);

export default async function fundsRoutes(fastify) {
  fastify.get("/funds", async (request) => {
    const { category, amc } = request.query;
    return listFunds({ category, amc });
  });

  fastify.get("/funds/rank", async (request, reply) => {
    const { category, sort_by: sortBy = "median_return", window, limit = 5 } = request.query;
    if (!category) {
      return reply.badRequest("category is required");
    }
    if (!window || !VALID_WINDOWS.has(window)) {
      return reply.badRequest("window must be one of 1Y, 3Y, 5Y, 10Y");
    }
    if (!VALID_SORT.has(sortBy)) {
      return reply.badRequest("sort_by must be median_return or max_drawdown");
    }
    return rankFunds({
      category,
      sortBy,
      window,
      limit: Number(limit)
    });
  });

  fastify.get("/funds/:code", async (request, reply) => {
    const data = await getFundByCode(request.params.code);
    if (!data) {
      return reply.notFound("Fund not found");
    }
    return data;
  });

  fastify.get("/funds/:code/analytics", async (request, reply) => {
    const { window } = request.query;
    if (!VALID_WINDOWS.has(window)) {
      return reply.badRequest("window must be one of 1Y, 3Y, 5Y, 10Y");
    }
    const data = await getFundAnalytics(request.params.code, window);
    if (!data) {
      return reply.notFound("Analytics unavailable");
    }
    return data;
  });

  // Additive endpoint for insufficient-history edge cases without changing existing behavior.
  fastify.get("/funds/:code/analytics/coverage", async (request) =>
    getFundAnalyticsCoverage(request.params.code)
  );
}
