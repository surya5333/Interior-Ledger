import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "../../../../lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

/** GET client details with their projects */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = await getPrisma().client.findUnique({
    where: { id },
    include: { projects: { orderBy: { createdAt: "desc" } } },
  });
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  return NextResponse.json(client);
}

/** PATCH update client */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = updateClientSchema.parse(await request.json());
    const client = await getPrisma().client.update({ where: { id }, data: body });
    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}

/** DELETE client (only if no projects reference them) */
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await getPrisma().client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Cannot delete client with existing projects." }, { status: 400 });
  }
}
