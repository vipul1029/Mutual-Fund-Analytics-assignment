import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger.js";

export const prisma = new PrismaClient({
  log: ["warn", "error"]
});

export async function disconnectPrisma() {
  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.error({ error }, "Failed disconnecting Prisma");
  }
}
