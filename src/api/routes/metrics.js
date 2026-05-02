import { mfapiLimiter } from "../../services/rateLimiter.js";

export default async function metricsRoutes(fastify) {
  fastify.get("/metrics", async () => mfapiLimiter.getMetrics());
}
