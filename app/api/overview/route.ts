import { NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dashboard overview: counts and recent projects */
import { verifySession } from "../../../lib/auth";

import { startOfDay, endOfDay } from "date-fns";

export async function GET() {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prisma = getPrisma();

  const projectVisibilityFilter = session.role === "MANAGER" ? { visibility: "SHARED" as any } : {};
  const transactionVisibilityFilter = session.role === "MANAGER"
    ? { project: { visibility: "SHARED" as any }, deletedAt: null as any }
    : { deletedAt: null as any };

  // Fetch today's events count if Admin, otherwise 0
  let todaysEventsCount = 0;
  if (session.role === "ADMIN") {
    const today = new Date();
    todaysEventsCount = await prisma.scheduleEvent.count({
      where: {
        date: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        }
      }
    });
  }

  const [clientCount, projectCount, contactCount, transactionCount, recentProjects] = await Promise.all([
    prisma.client.count(),
    prisma.project.count({ where: { status: { not: "SCHEDULED" as any }, ...projectVisibilityFilter } }),
    prisma.contact.count(),
    prisma.transaction.count({ where: transactionVisibilityFilter }),
    prisma.project.findMany({
      where: { status: { not: "SCHEDULED" as any }, ...projectVisibilityFilter },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } } },
    }),
  ]);

  return NextResponse.json({
    counts: { 
      clients: clientCount, 
      projects: projectCount, 
      todaysEvents: todaysEventsCount, 
      contacts: contactCount, 
      transactions: transactionCount 
    },
    recentProjects,
  });
}
