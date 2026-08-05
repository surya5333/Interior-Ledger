import { getPrisma } from "../prisma";
import { Prisma } from "../../generated/prisma/client";

export function getPreviousMonth(month: number, year: number) {
  if (month === 1) {
    return { month: 12, year: year - 1 };
  }
  return { month: month - 1, year };
}

export async function ensureSalaryRecord(staffId: string, month: number, year: number) {
  const prisma = getPrisma();
  
  // 1. Check if record already exists
  const existing = await prisma.salaryRecord.findUnique({
    where: {
      staffId_month_year: {
        staffId,
        month,
        year,
      },
    },
  });

  if (existing) {
    return existing;
  }

  // 2. Fetch staff details
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
  });

  if (!staff) {
    throw new Error(`Staff with id ${staffId} not found`);
  }

  // 3. Get previous due
  // We look for the most recent record before this month/year
  const previousRecord = await prisma.salaryRecord.findFirst({
    where: {
      staffId,
      OR: [
        { year: { lt: year } },
        { year: year, month: { lt: month } },
      ],
    },
    orderBy: [
      { year: "desc" },
      { month: "desc" },
    ],
  });

  const previousDue = previousRecord ? previousRecord.due : new Prisma.Decimal(0);
  const monthlySalary = staff.monthlySalary;
  const totalPayable = new Prisma.Decimal(Number(monthlySalary) + Number(previousDue));

  // 4. Create the new record
  const newRecord = await prisma.salaryRecord.create({
    data: {
      staffId,
      month,
      year,
      monthlySalary,
      previousDue,
      totalPayable,
      due: totalPayable, // Initial due is total payable since paidAmount is 0
      isPaid: false,
      paidAmount: 0,
    },
  });

  return newRecord;
}

export async function recalculateFutureRecords(staffId: string, fromMonth: number, fromYear: number) {
  const prisma = getPrisma();

  // 1. Get the starting record (the one that was just edited)
  const startingRecord = await prisma.salaryRecord.findUnique({
    where: {
      staffId_month_year: {
        staffId,
        month: fromMonth,
        year: fromYear,
      },
    },
  });

  if (!startingRecord) return;

  // 2. Fetch all chronologically subsequent records for this staff
  const futureRecords = await prisma.salaryRecord.findMany({
    where: {
      staffId,
      OR: [
        { year: { gt: fromYear } },
        { year: fromYear, month: { gt: fromMonth } },
      ],
    },
    orderBy: [
      { year: "asc" },
      { month: "asc" },
    ],
  });

  if (futureRecords.length === 0) return;

  // 3. Sequentially recalculate
  let currentCarryForwardDue = startingRecord.due;

  // Using a sequential loop since each calculation depends on the previous one
  for (const record of futureRecords) {
    const newPreviousDue = currentCarryForwardDue;
    const newTotalPayable = new Prisma.Decimal(Number(record.monthlySalary) + Number(newPreviousDue));
    const newDue = new Prisma.Decimal(Number(newTotalPayable) - Number(record.paidAmount));

    await prisma.salaryRecord.update({
      where: { id: record.id },
      data: {
        previousDue: newPreviousDue,
        totalPayable: newTotalPayable,
        due: newDue,
      },
    });

    currentCarryForwardDue = newDue;
  }
}
