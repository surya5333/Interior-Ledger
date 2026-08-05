import { NextRequest, NextResponse } from "next/server";
import { getClientLedger } from "../../../../lib/client-ledger";
import { getPrisma } from "../../../../lib/prisma";
import { verifySession } from "../../../../lib/auth";
import { z } from "zod";

export const runtime = "nodejs";

const updateClientSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

/** GET client details with projects and payment ledger */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ledger = await getClientLedger(id);
  if (!ledger) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  return NextResponse.json(ledger);
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
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.role === "MANAGER") {
      return NextResponse.json({ error: "Forbidden: Managers cannot delete clients." }, { status: 403 });
    }
    
    const { id } = await params;
    await getPrisma().client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Cannot delete client with existing projects." }, { status: 400 });
  }
}

