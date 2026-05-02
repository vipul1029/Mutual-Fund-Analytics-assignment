import { getSyncStatus, triggerManualSync } from "../../pipeline/syncService.js";

export default async function syncRoutes(fastify) {
  fastify.post("/sync/trigger", async (_request, reply) => {
    const job = await triggerManualSync();
    return reply.code(202).send({
      status: "queued",
      jobId: job.id
    });
  });

  fastify.get("/sync/status", async () => getSyncStatus());
}
