import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Lazily creates a Prisma client only when a Route Handler needs it.
 * DATABASE_URL must use Supabase's transaction pooler (port 6543) in Vercel.
 */
export function getPrisma() {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required for database operations.");
  }

  globalForPrisma.prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  return globalForPrisma.prisma;
}
