import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "../../../../lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  clientName: z.string().optional(),
  location: z.string().optional(),
  budget: z.coerce.number().min(0).optional(),
});

/** GET project details */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getPrisma().project.findUnique({
    where: { id },
    include: { client: true },
  });
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  return NextResponse.json(project);
}

/** PATCH update project */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = updateProjectSchema.parse(await request.json());
    const prisma = getPrisma();

    let clientId: string | undefined;

    // If clientName is provided, find or create the client (mirrors POST logic)
    if (body.clientName && body.clientName.trim().length > 0) {
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

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(body.name ? { name: body.name.trim() } : {}),
        ...(body.location ? { location: body.location.trim() } : {}),
        ...(clientId ? { clientId } : {}),
        ...(body.budget !== undefined ? { budget: body.budget } : {}),
      },
    });
    return NextResponse.json(project);
  } catch (error) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}

/** DELETE project (cascades transactions) */
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await getPrisma().project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Cannot delete project." }, { status: 400 });
  }
}
