import { NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dashboard overview: counts and recent projects */
export async function GET() {
  const prisma = getPrisma();

  const [clientCount, projectCount, scheduledProjectCount, contactCount, transactionCount, recentProjects] = await Promise.all([
    prisma.client.count(),
    prisma.project.count({ where: { status: { not: "SCHEDULED" as any } } }),
    prisma.project.count({ where: { status: "SCHEDULED" as any } }),
    prisma.contact.count(),
    prisma.transaction.count(),
    prisma.project.findMany({
      where: { status: { not: "SCHEDULED" as any } },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({
    counts: { clients: clientCount, projects: projectCount, scheduledProjects: scheduledProjectCount, contacts: contactCount, transactions: transactionCount },
    recentProjects,
  });
}
