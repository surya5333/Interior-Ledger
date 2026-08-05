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
  scheduledDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
}).refine(
  (d) => !!d.clientId || (!!d.clientName && d.clientName.trim().length > 0),
  { message: "Either clientId or clientName is required", path: ["clientName"] }
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const where = status ? { status: status as any } : { status: { not: "SCHEDULED" as any } };

  const projects = await getPrisma().project.findMany({ 
    where,
    include: { client: true },
    orderBy: { createdAt: "desc" } 
  });
  return NextResponse.json(projects);
}

export async function POST(request: NextRequest) {
  try {
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

    const project = await prisma.project.create({
      data: { 
        name: body.name.trim(), 
        clientId,
        location: body.location?.trim()||null, 
        budget: body.budget,
        status: body.status as any || "ACTIVE",
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
