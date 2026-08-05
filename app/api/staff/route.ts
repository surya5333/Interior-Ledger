import { NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";
import { verifySession } from "../../../lib/auth";

export async function GET() {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const prisma = getPrisma();
    const staff = await prisma.staff.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json({ error: "Failed to fetch staff" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await verifySession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, designation, monthlySalary, joiningDate, status } = body;

    if (!name || !monthlySalary || !joiningDate) {
      return NextResponse.json({ error: "Name, monthly salary, and joining date are required" }, { status: 400 });
    }

    const prisma = getPrisma();
    const newStaff = await prisma.staff.create({
      data: {
        name,
        phone,
        designation,
        monthlySalary,
        joiningDate: new Date(joiningDate),
        status: status || "ACTIVE",
      },
    });

    return NextResponse.json(newStaff);
  } catch (error) {
    console.error("Error creating staff:", error);
    return NextResponse.json({ error: "Failed to create staff" }, { status: 500 });
  }
}
