import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { findOrCreateContactByNameAndCategory } from "../../../../../lib/contacts";
import { getProjectLedger } from "../../../../../lib/ledger";
import { getPrisma } from "../../../../../lib/prisma";
import { CLIENT_PAYMENT_CATEGORY, createTransactionSchema } from "../../../../../lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePaymentProofUrl(paymentMode: "CASH" | "UPI" | "CARD" | "OTHER", paymentProofUrl?: string) {
  return paymentMode === "UPI" && paymentProofUrl ? paymentProofUrl : null;
}

import { verifySession } from "../../../../../lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await verifySession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  
  const prisma = getPrisma();
  const project = await prisma.project.findUnique({ where: { id }, select: { visibility: true } });
  
  if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (session.role === "MANAGER" && project.visibility === "PRIVATE") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ledger = await getProjectLedger(id);
  return ledger
    ? NextResponse.json(ledger, { headers: { "Cache-Control": "private, no-store" } })
    : NextResponse.json({ error: "Project not found." }, { status: 404 });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;
    
    const prisma = getPrisma();
    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { visibility: true } });
    if (!project) return NextResponse.json({ error: "Project not found." }, { status: 404 });
    if (session.role === "MANAGER" && project.visibility === "PRIVATE") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const input = createTransactionSchema.parse(await request.json());

    const transaction = await prisma.$transaction(async (db) => {
      const projectData = await db.project.findUnique({
        where: { id: projectId },
        select: { id: true, client: { select: { id: true, name: true } } },
      });
      if (!projectData) return null;

      if (input.isClientPayment) {
        return db.transaction.create({
          data: {
            projectId,
            contactId: null,
            isClientPayment: true,
            date: input.date,
            category: CLIENT_PAYMENT_CATEGORY,
            description: input.description,
            credit: input.credit,
            debit: "0",
            paymentMode: input.paymentMode,
            paymentProofUrl: normalizePaymentProofUrl(input.paymentMode, input.paymentProofUrl),
          },
          select: { id: true },
        });
      }

      const contactCategory = input.contactCategory ?? input.category!;
      const contact = await findOrCreateContactByNameAndCategory(db, {
        name: input.contactName!,
        category: contactCategory,
      });

      return db.transaction.create({
        data: {
          projectId,
          contactId: contact.id,
          isClientPayment: false,
          date: input.date,
          category: input.category!,
          description: input.description,
          credit: input.credit,
          debit: input.debit,
          paymentMode: input.paymentMode,
          paymentProofUrl: normalizePaymentProofUrl(input.paymentMode, input.paymentProofUrl),
        },
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
