import { PrismaClient } from '../generated/prisma/client';
import bcrypt from 'bcryptjs';
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const managerPasswordHash = await bcrypt.hash('manager123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
    create: {
      name: 'Admin User',
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const manager = await prisma.user.upsert({
    where: { username: 'manager' },
    update: {
      passwordHash: managerPasswordHash,
      role: 'MANAGER',
    },
    create: {
      name: 'Manager User',
      username: 'manager',
      passwordHash: managerPasswordHash,
      role: 'MANAGER',
    },
  });

  console.log({ admin, manager });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
