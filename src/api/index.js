import fundsRoutes from "./routes/funds.js";
import metricsRoutes from "./routes/metrics.js";
import syncRoutes from "./routes/sync.js";

export async function registerRoutes(fastify) {
  await fastify.register(fundsRoutes);
  await fastify.register(syncRoutes);
  await fastify.register(metricsRoutes);
}
