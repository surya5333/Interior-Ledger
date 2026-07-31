import { NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dashboard overview: counts and recent projects */
export async function GET() {
  const prisma = getPrisma();

  const [clientCount, projectCount, contactCount, transactionCount, recentProjects] = await Promise.all([
    prisma.client.count(),
    prisma.project.count(),
    prisma.contact.count(),
    prisma.transaction.count(),
    prisma.project.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({
    counts: { clients: clientCount, projects: projectCount, contacts: contactCount, transactions: transactionCount },
    recentProjects,
  });
}
