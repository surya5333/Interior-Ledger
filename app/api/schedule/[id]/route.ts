import { NextResponse } from "next/server";
import { getPrisma } from "../../../../lib/prisma";
import { verifySession, requireAdminOrManager } from "../../../../lib/auth";
import * as z from "zod";
import { EventPriority } from "../../../../generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateSchema = z.object({
  title: z.string().min(1, "Title is required").optional(),
  date: z.string().min(1, "Date is required").optional(),
  time: z.string().min(1, "Time is required").optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  priority: z.nativeEnum(EventPriority).optional(),
});

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    await requireAdminOrManager(session.role);

    const body = await request.json();
    const data = updateSchema.parse(body);

    const prisma = getPrisma();
    
    const updateData: any = { ...data };
    if (data.date) {
      updateData.date = new Date(data.date);
    }

    const event = await prisma.scheduleEvent.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(event);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    await requireAdminOrManager(session.role);

    const prisma = getPrisma();
    await prisma.scheduleEvent.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 });
  }
}
