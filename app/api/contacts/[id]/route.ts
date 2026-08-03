import { NextRequest, NextResponse } from "next/server";
import { findContactByNameAndCategory, normalizeContactIdentity } from "../../../../lib/contacts";
import { getPrisma } from "../../../../lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateContactSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  phone: z.union([z.string().trim().max(40), z.null()]).optional(),
});

/** Get a contact's details and all their transactions across projects */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const prisma = getPrisma();

  const contact = await prisma.contact.findUnique({
    where: { id },
    select: { id: true, name: true, category: true, phone: true, createdAt: true },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found." }, { status: 404 });
  }

  const transactions = await prisma.transaction.findMany({
    where: { contactId: id },
    include: {
      project: { select: { id: true, name: true, client: { select: { name: true } } } },
    },
    orderBy: { date: "desc" },
  });

  // Group transactions by project
  const byProject: Record<string, { project: any; transactions: any[]; totalCredit: number; totalDebit: number }> = {};
  let grandTotalCredit = 0;
  let grandTotalDebit = 0;

  for (const t of transactions) {
    const pid = t.project.id;
    if (!byProject[pid]) {
      byProject[pid] = { project: t.project, transactions: [], totalCredit: 0, totalDebit: 0 };
    }
    const credit = Number(t.credit);
    const debit = Number(t.debit);
    byProject[pid].transactions.push({
      id: t.id,
      date: t.date.toISOString(),
      category: t.category,
      description: t.description,
      paymentMode: t.paymentMode,
      paymentProofUrl: t.paymentProofUrl,
      credit: credit.toFixed(2),
      debit: debit.toFixed(2),
    });
    byProject[pid].totalCredit += credit;
    byProject[pid].totalDebit += debit;
    grandTotalCredit += credit;
    grandTotalDebit += debit;
  }

  return NextResponse.json({
    contact,
    projects: Object.values(byProject).map((g) => ({
      ...g,
      totalCredit: g.totalCredit.toFixed(2),
      totalDebit: g.totalDebit.toFixed(2),
      balance: (g.totalCredit - g.totalDebit).toFixed(2),
    })),
    totals: {
      credit: grandTotalCredit.toFixed(2),
      debit: grandTotalDebit.toFixed(2),
      balance: (grandTotalCredit - grandTotalDebit).toFixed(2),
      transactionCount: transactions.length,
      projectCount: Object.keys(byProject).length,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const prisma = getPrisma();
    const body = updateContactSchema.parse(await req.json());
    const existing = await prisma.contact.findUnique({
      where: { id },
      select: { id: true, name: true, category: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Contact not found." }, { status: 404 });
    }

    const nextName = body.name ?? existing.name;
    const nextCategory = body.category ?? existing.category;
    const normalizedIdentity = normalizeContactIdentity(nextName, nextCategory);
    const duplicate = await findContactByNameAndCategory(
      prisma,
      normalizedIdentity.name,
      normalizedIdentity.category,
      id
    );

    if (duplicate) {
      return NextResponse.json(
        { error: "A contact with this name and category already exists." },
        { status: 409 }
      );
    }

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: normalizedIdentity.name } : {}),
        ...(body.category !== undefined ? { category: normalizedIdentity.category } : {}),
        ...(body.phone !== undefined ? { phone: body.phone || null } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const prisma = getPrisma();
    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
