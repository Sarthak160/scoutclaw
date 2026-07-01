import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __scoutclawPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!globalThis.__scoutclawPrisma) {
    globalThis.__scoutclawPrisma = new PrismaClient();
  }

  return globalThis.__scoutclawPrisma;
}

export function getPrismaClient(): PrismaClient | null {
  return createPrismaClient();
}
