import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { 
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts"
  },
  // DIRECT_URL is used only by Prisma CLI commands. Runtime traffic uses the
  // Supavisor transaction pooler in lib/prisma.ts through DATABASE_URL.
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres",
  },
});
