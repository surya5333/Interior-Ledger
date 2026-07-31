import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";
import { contactSearchSchema } from "../../../lib/validation";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contactSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  phone: z.string().optional(),
});

/** Autosuggest or full list endpoint */
export async function GET(request: NextRequest) {
  const searchParam = request.nextUrl.searchParams.get("search");
  const isSearch = searchParam !== null;
  const { search } = contactSearchSchema.parse({ search: searchParam ?? "" });
  
  const contacts = await getPrisma().contact.findMany({
    where: search ? { name: { contains: search, mode: "insensitive" } } : undefined,
    select: { id: true, name: true, category: true, phone: true },
    orderBy: { name: "asc" },
    ...(isSearch && search ? { take: 8 } : {}),
  });
  return NextResponse.json(contacts, { headers: { "Cache-Control": "private, max-age=30" } });
}

export async function POST(request: NextRequest) {
  try {
    const body = contactSchema.parse(await request.json());
    const contact = await getPrisma().contact.upsert({
      where: { name_category: { name: body.name, category: body.category } },
      create: {
        name: body.name,
        category: body.category || "Vendor",
        phone: body.phone || null,
      },
      update: { phone: body.phone },
    });
    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
