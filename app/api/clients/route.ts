import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const clientSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

export async function GET() {
  const clients = await getPrisma().client.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  try {
    const body = clientSchema.parse(await request.json());
    const existing = await getPrisma().client.findFirst({
      where: { name: { equals: body.name, mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ error: "A client with this name already exists." }, { status: 400 });
    }
    const client = await getPrisma().client.create({ data: { ...body, email: body.email || null } });
    return NextResponse.json(client, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Invalid data" }, { status: 400 });
  }
}
