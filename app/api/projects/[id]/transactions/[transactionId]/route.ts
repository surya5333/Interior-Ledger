import { NextRequest, NextResponse } from "next/server";
import { findOrCreateContactByNameAndCategory } from "../../../../../../lib/contacts";
import { getPrisma } from "../../../../../../lib/prisma";
import { CLIENT_PAYMENT_CATEGORY, paymentModeValues } from "../../../../../../lib/validation";
import { z } from "zod";

export const runtime = "nodejs";

const updateTransactionSchema = z.object({
  contactName: z.string().trim().min(1).max(120).optional(),
  contactCategory: z.string().trim().min(1).max(80).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  credit: z.coerce.number().min(0).optional(),
  debit: z.coerce.number().min(0).optional(),
  date: z.coerce.date().optional(),
  paymentMode: z.enum(paymentModeValues).optional(),
  paymentProofUrl: z
    .string()
    .url("Enter a valid payment proof URL.")
    .optional()
    .or(z.literal(""))
    .transform((value) => value || undefined),
  isClientPayment: z.boolean().optional(),
});

import { verifySession } from "../../../../../../lib/auth";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string, transactionId: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, transactionId } = await params;
    const prisma = getPrisma();

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { visibility: true } });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (session.role === "MANAGER" && project.visibility === "PRIVATE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.transaction.delete({
      where: { id: transactionId, projectId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string, transactionId: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, transactionId } = await params;
    const body = updateTransactionSchema.parse(await request.json());
    const prisma = getPrisma();

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { visibility: true } });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (session.role === "MANAGER" && project.visibility === "PRIVATE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const existingTransaction = await prisma.transaction.findFirst({
      where: { id: transactionId, projectId },
      select: {
        id: true,
        isClientPayment: true,
        category: true,
        credit: true,
        debit: true,
        paymentMode: true,
        paymentProofUrl: true,
        contact: { select: { name: true, category: true } },
      },
    });

    if (!existingTransaction) {
      return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
    }

    const isClientPayment = body.isClientPayment ?? existingTransaction.isClientPayment;
    const paymentMode = body.paymentMode ?? existingTransaction.paymentMode;
    const paymentProofUrl =
      paymentMode === "UPI"
        ? body.paymentProofUrl !== undefined
          ? body.paymentProofUrl
          : existingTransaction.paymentProofUrl ?? undefined
        : null;
    const existingContactName = existingTransaction.isClientPayment ? undefined : existingTransaction.contact?.name;
    const existingContactCategory = existingTransaction.isClientPayment
      ? undefined
      : existingTransaction.contact?.category ?? existingTransaction.category;
    const nextCategory = isClientPayment
      ? CLIENT_PAYMENT_CATEGORY
      : body.category ?? existingTransaction.category;
    const nextCredit = body.credit ?? Number(existingTransaction.credit);
    const nextDebit = isClientPayment ? 0 : body.debit ?? Number(existingTransaction.debit);
    const nextContactName = body.contactName ?? existingContactName;
    const nextContactCategory = body.contactCategory ?? body.category ?? existingContactCategory;

    if (isClientPayment) {
      if (nextCredit <= 0) {
        return NextResponse.json(
          { error: "Client payments must include a credit amount." },
          { status: 400 }
        );
      }

      if (nextCategory !== CLIENT_PAYMENT_CATEGORY) {
        return NextResponse.json(
          { error: `Client payment category must be "${CLIENT_PAYMENT_CATEGORY}".` },
          { status: 400 }
        );
      }
    } else {
      if (!nextContactName?.trim()) {
        return NextResponse.json({ error: "Contact is required." }, { status: 400 });
      }

      if (!nextCategory?.trim()) {
        return NextResponse.json({ error: "Category is required." }, { status: 400 });
      }

      const hasCredit = nextCredit > 0;
      const hasDebit = nextDebit > 0;
      if (hasCredit === hasDebit) {
        return NextResponse.json(
          { error: "Provide either a credit or a debit amount." },
          { status: 400 }
        );
      }
    }

    if (paymentMode !== "UPI" && paymentProofUrl) {
      return NextResponse.json(
        { error: "Payment proof is only supported for UPI transactions." },
        { status: 400 }
      );
    }

    if (isClientPayment) {
      const transaction = await prisma.transaction.update({
        where: { id: transactionId, projectId },
        data: {
          isClientPayment: true,
          contactId: null,
          category: CLIENT_PAYMENT_CATEGORY,
          description: body.description,
          credit: body.credit,
          debit: 0,
          paymentMode,
          paymentProofUrl,
          ...(body.date ? { date: body.date } : {}),
        },
      });

      return NextResponse.json(transaction);
    }

    let contactId = undefined;
    if (nextContactName && nextContactCategory) {
      const contact = await findOrCreateContactByNameAndCategory(prisma, {
        name: nextContactName,
        category: nextContactCategory,
      });
      contactId = contact.id;
    }

    const transaction = await prisma.transaction.update({
      where: { id: transactionId, projectId },
      data: {
        isClientPayment: false,
        ...(contactId ? { contactId } : {}),
        category: nextCategory,
        description: body.description,
        credit: nextCredit,
        debit: nextDebit,
        paymentMode,
        paymentProofUrl,
        ...(body.date ? { date: body.date } : {}),
      },
    });

    return NextResponse.json(transaction);
  } catch (error) {
    console.error("PATCH ERROR:", error);
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 400 });
  }
}
