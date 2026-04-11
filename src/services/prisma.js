import prismaPkg from "@prisma/client";

const { PrismaClient } = prismaPkg;

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  if (!globalThis.__scoutclawPrisma) {
    globalThis.__scoutclawPrisma = new PrismaClient();
  }

  return globalThis.__scoutclawPrisma;
}

export function getPrismaClient() {
  return createPrismaClient();
}
