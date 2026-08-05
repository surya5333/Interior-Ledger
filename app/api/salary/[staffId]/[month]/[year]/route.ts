import { NextResponse } from "next/server";
import { getPrisma } from "../../../../../../lib/prisma";
import { verifySession } from "../../../../../../lib/auth";
import { recalculateFutureRecords } from "../../../../../../lib/services/salary-service";
import { Prisma } from "../../../../../../generated/prisma/client";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ staffId: string; month: string; year: string }> }
) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { staffId, month: m, year: y } = await params;
    const month = parseInt(m);
    const year = parseInt(y);

    const body = await req.json();
    const { isPaid, paymentType, paidAmount, paymentMode } = body;

    const prisma = getPrisma();

    // 1. Get the existing record
    const existingRecord = await prisma.salaryRecord.findUnique({
      where: { staffId_month_year: { staffId, month, year } },
    });

    if (!existingRecord) {
      return NextResponse.json({ error: "Salary record not found" }, { status: 404 });
    }

    // 2. Validate Paid Amount
    const amount = new Prisma.Decimal(paidAmount || 0);
    if (amount.lessThan(0)) {
      return NextResponse.json({ error: "Negative paid amounts are not allowed" }, { status: 400 });
    }
    if (amount.greaterThan(existingRecord.totalPayable)) {
      return NextResponse.json({ error: "Paid amount cannot exceed Total Payable" }, { status: 400 });
    }

    // 3. Calculate Due
    // Rule 4: If unchecked, Paid Amount = 0, Due = Total Payable
    const finalAmount = isPaid ? amount : new Prisma.Decimal(0);
    const finalDue = new Prisma.Decimal(Number(existingRecord.totalPayable) - Number(finalAmount));

    // 4. Update the record
    const updatedRecord = await prisma.salaryRecord.update({
      where: { id: existingRecord.id },
      data: {
        isPaid,
        paymentType: isPaid ? paymentType : null,
        paidAmount: finalAmount,
        paymentMode: isPaid ? paymentMode : null,
        due: finalDue,
        // Rule: save current date if checked and it wasn't paid before (or simply update it)
        paidDate: (isPaid && !existingRecord.isPaid) ? new Date() : (isPaid ? existingRecord.paidDate : null),
      },
    });

    // 5. Trigger Recalculation Engine for all following months!
    await recalculateFutureRecords(staffId, month, year);

    return NextResponse.json(updatedRecord);
  } catch (error) {
    console.error("Error updating salary record:", error);
    return NextResponse.json({ error: "Failed to update salary record" }, { status: 500 });
  }
}
