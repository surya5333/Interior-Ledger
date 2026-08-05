import { NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";
import { verifySession } from "../../../lib/auth";
import { ensureSalaryRecord } from "../../../lib/services/salary-service";

export async function GET(req: Request) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const monthStr = searchParams.get("month");
    const yearStr = searchParams.get("year");
    
    if (!yearStr) {
      return NextResponse.json({ error: "Year is required" }, { status: 400 });
    }

    const prisma = getPrisma();
    const year = parseInt(yearStr);

    // Get all ACTIVE staff to auto-generate missing records
    const activeStaff = await prisma.staff.findMany({
      where: { status: "ACTIVE" },
      select: { id: true },
    });

    if (monthStr) {
      // CURRENT MONTH VIEW
      const month = parseInt(monthStr);
      // Auto-generate for this specific month
      await Promise.all(
        activeStaff.map((s) => ensureSalaryRecord(s.id, month, year))
      );

      const staffList = await prisma.staff.findMany({
        orderBy: { name: "asc" },
        include: {
          salaryRecords: {
            where: { month, year },
          },
        },
      });
      return NextResponse.json(staffList);
    } else {
      // ALL MONTHS VIEW
      const currentDate = new Date();
      let maxMonth = 0;
      if (year < currentDate.getFullYear()) {
        maxMonth = 12;
      } else if (year === currentDate.getFullYear()) {
        maxMonth = currentDate.getMonth() + 1; // 1-indexed
      }

      // Sequentially ensure records to preserve chronological carry-forward correctly
      for (const staff of activeStaff) {
        for (let m = 1; m <= maxMonth; m++) {
          await ensureSalaryRecord(staff.id, m, year);
        }
      }

      const staffList = await prisma.staff.findMany({
        orderBy: { name: "asc" },
        include: {
          salaryRecords: {
            where: { year },
            orderBy: { month: "asc" },
          },
        },
      });
      return NextResponse.json(staffList);
    }

  } catch (error) {
    console.error("Error fetching salary records:", error);
    return NextResponse.json({ error: "Failed to fetch salary records" }, { status: 500 });
  }
}
