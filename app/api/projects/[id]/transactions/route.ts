import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getProjectLedger } from "../../../../../lib/ledger";
import { getPrisma } from "../../../../../lib/prisma";
import { createTransactionSchema } from "../../../../../lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ledger = await getProjectLedger(id);
  return ledger
    ? NextResponse.json(ledger, { headers: { "Cache-Control": "private, no-store" } })
    : NextResponse.json({ error: "Project not found." }, { status: 404 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const input = createTransactionSchema.parse(await request.json());
    const prisma = getPrisma();

    const transaction = await prisma.$transaction(async (db) => {
      const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true } });
      if (!project) return null;

      const contact = await db.contact.upsert({
        where: { name_category: { name: input.contactName, category: input.contactCategory } },
        create: { name: input.contactName, category: input.contactCategory },
        update: {},
        select: { id: true },
      });

      return db.transaction.create({
        data: { projectId, contactId: contact.id, date: input.date, category: input.category, description: input.description, credit: input.credit, debit: input.debit },
        select: { id: true },
      });
    });

    if (!transaction) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid transaction.", issues: error.issues }, { status: 400 });
    throw error;
  }
}
