import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const projectSchema = z.object({
  name: z.string().min(1),
  clientId: z.string().optional(),
  location: z.string().optional(),
  clientName: z.string().optional(),
  budget: z.coerce.number().min(0),
  status: z.enum(["SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  visibility: z.enum(["SHARED", "PRIVATE"]).optional(),
  scheduledDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),

}).refine(
  (d) => !!d.clientId || (!!d.clientName && d.clientName.trim().length > 0),
  { message: "Either clientId or clientName is required", path: ["clientName"] }
);

import { verifySession } from "../../../lib/auth";

export async function GET(request: NextRequest) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where: any = status ? { status: status as any } : { status: { not: "SCHEDULED" as any } };
  
  if (session.role === "MANAGER") {
    where.visibility = "SHARED";
  }

  const projects = await getPrisma().project.findMany({ 
    where,
    include: { client: true },
    orderBy: { createdAt: "desc" } 
  });
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = projectSchema.parse(await request.json());
    const prisma = getPrisma();

    let clientId = body.clientId;

    // If clientName is provided, find or create the client
    if (!clientId && body.clientName) {
      const trimmedName = body.clientName.trim();

      // Case-insensitive search for existing client
      const existing = await prisma.client.findFirst({
        where: { name: { equals: trimmedName, mode: "insensitive" } },
      });

      if (existing) {
        clientId = existing.id;
      } else {
        const newClient = await prisma.client.create({
          data: { name: trimmedName },
        });
        clientId = newClient.id;
      }
    }

    if (!clientId) {
      return NextResponse.json({ error: "Client is required" }, { status: 400 });
    }

    // Force SHARED if MANAGER creates a project
    const finalVisibility = session.role === "MANAGER" ? "SHARED" : (body.visibility || "SHARED");

    const project = await prisma.project.create({
      data: { 
        name: body.name.trim(), 
        clientId,
        location: body.location?.trim()||null, 
        budget: body.budget,
        status: body.status as any || "ACTIVE",
        visibility: finalVisibility as any,
        scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    const message = error?.issues?.[0]?.message || error?.message || "Invalid data";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
