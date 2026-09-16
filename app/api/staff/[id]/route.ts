import { NextResponse } from "next/server";
import { getPrisma } from "../../../../lib/prisma";
import { verifySession, requireAdminOrManager } from "../../../../lib/auth";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await requireAdminOrManager(session.role);

    const { id } = await params;
    const body = await req.json();
    const { name, phone, designation, monthlySalary, joiningDate, status } = body;

    const prisma = getPrisma();
    const updatedStaff = await prisma.staff.update({
      where: { id },
      data: {
        name,
        phone,
        designation,
        monthlySalary,
        joiningDate: joiningDate ? new Date(joiningDate) : undefined,
        status,
      },
    });

    return NextResponse.json(updatedStaff);
  } catch (error) {
    console.error("Error updating staff:", error);
    return NextResponse.json({ error: "Failed to update staff" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await requireAdminOrManager(session.role);

    const { id } = await params;
    const prisma = getPrisma();
    
    await prisma.staff.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting staff:", error);
    return NextResponse.json({ error: "Failed to delete staff" }, { status: 500 });
  }
}
