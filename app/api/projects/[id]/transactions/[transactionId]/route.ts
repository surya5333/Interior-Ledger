import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "../../../../../../lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";

const updateTransactionSchema = z.object({
  contactName: z.string().min(1).optional(),
  contactCategory: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  description: z.string().optional(),
  credit: z.coerce.number().min(0).optional(),
  debit: z.coerce.number().min(0).optional(),
  date: z.coerce.date().optional(),
});

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string, transactionId: string }> }) {
  try {
    const { id: projectId, transactionId } = await params;
    await getPrisma().transaction.delete({
      where: { id: transactionId, projectId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string, transactionId: string }> }) {
  try {
    const { id: projectId, transactionId } = await params;
    const body = updateTransactionSchema.parse(await request.json());
    const prisma = getPrisma();

    let contactId = undefined;
    if (body.contactName && body.contactCategory) {
      const contact = await prisma.contact.upsert({
        where: { name_category: { name: body.contactName, category: body.contactCategory } },
        create: { name: body.contactName, category: body.contactCategory },
        update: {},
        select: { id: true },
      });
      contactId = contact.id;
    }

    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ...(contactId ? { contactId } : {}),
        category: body.category,
        description: body.description,
        credit: body.credit,
        debit: body.debit,
        ...(body.date ? { date: body.date } : {}),
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("PATCH ERROR:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 400 });
  }
}
