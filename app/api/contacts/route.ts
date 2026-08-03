import { NextRequest, NextResponse } from "next/server";
import { findContactByNameAndCategory, findOrCreateContactByNameAndCategory } from "../../../lib/contacts";
import { getPrisma } from "../../../lib/prisma";
import { contactSearchSchema } from "../../../lib/validation";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  phone: z.string().trim().optional(),
});

/** Autosuggest or full list endpoint */
export async function GET(request: NextRequest) {
  const searchParam = request.nextUrl.searchParams.get("search");
  const isSearch = searchParam !== null;
  const { search } = contactSearchSchema.parse({ search: searchParam ?? "" });
  
  const contacts = await getPrisma().contact.findMany({
    where: search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ],
    } : undefined,
    select: { id: true, name: true, category: true, phone: true },
    orderBy: [{ name: "asc" }, { category: "asc" }],
    ...(isSearch && search ? { take: 8 } : {}),
  });
  return NextResponse.json(contacts, { headers: { "Cache-Control": "private, max-age=30" } });
}

export async function POST(request: NextRequest) {
  try {
    const body = contactSchema.parse(await request.json());
    const prisma = getPrisma();
    const existing = await findContactByNameAndCategory(prisma, body.name, body.category);
    const contact = await findOrCreateContactByNameAndCategory(prisma, {
      name: body.name,
      category: body.category,
      phone: body.phone,
    });

    return NextResponse.json(contact, { status: existing ? 200 : 201 });
  } catch (error) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
