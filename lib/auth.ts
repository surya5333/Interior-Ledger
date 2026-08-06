import { cookies } from "next/headers";
import { getPrisma } from "./prisma";
import crypto from "crypto";

export interface SessionPayload {
  id: string;
  username: string;
  role: "ADMIN" | "MANAGER";
}

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const prisma = getPrisma();
  await prisma.session.create({
    data: {
      id: token,
      userId,
      expiresAt,
    },
  });

  return token;
}

export async function verifySession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return null;
  }

  const prisma = getPrisma();
  const session = await prisma.session.findUnique({
    where: { id: token },
    include: { user: true },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: token } });
    return null;
  }

  return {
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
  };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (token) {
    const prisma = getPrisma();
    await prisma.session.delete({ where: { id: token } }).catch(() => {});
  }
}

export async function requireAdmin(role: string): Promise<void> {
  if (role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}
