import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";
import { registerRoutes } from "./api/index.js";
import { disconnectPrisma } from "./db/prisma.js";
import { disconnectRedis } from "./db/redis.js";

const app = Fastify({
  logger
});

async function bootstrap() {
  await app.register(cors, { origin: true });
  await app.register(sensible);
  await registerRoutes(app);

  await app.listen({ host: "0.0.0.0", port: env.port });
  logger.info({ port: env.port }, "Server started");
}

async function shutdown(signal) {
  logger.info({ signal }, "Graceful shutdown initiated");
  await app.close();
  await Promise.all([disconnectPrisma(), disconnectRedis()]);
  process.exit(0);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    shutdown(signal).catch((error) => {
      logger.error({ error }, "Error during shutdown");
      process.exit(1);
    });
  });
}

bootstrap().catch((error) => {
  logger.error({ error }, "Failed to start server");
  process.exit(1);
});
