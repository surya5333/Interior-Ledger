import { NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";
import { verifySession, requireAdmin } from "../../../lib/auth";
import * as z from "zod";
import { EventPriority } from "../../../generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  location: z.string().optional(),
  notes: z.string().optional(),
  priority: z.nativeEnum(EventPriority).optional(),
});

export async function GET(request: Request) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // Only ADMIN can access schedule
    await requireAdmin(session.role);

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const prisma = getPrisma();

    const where: any = {};
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const events = await prisma.scheduleEvent.findMany({
      where,
      orderBy: [
        { date: "asc" },
        { time: "asc" },
      ],
    });

    return NextResponse.json(events);
  } catch (error: any) {
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    await requireAdmin(session.role);

    const body = await request.json();
    const data = createSchema.parse(body);

    const prisma = getPrisma();
    const event = await prisma.scheduleEvent.create({
      data: {
        title: data.title,
        date: new Date(data.date),
        time: data.time,
        location: data.location || null,
        notes: data.notes || null,
        priority: data.priority || "MEDIUM",
      },
    });

    return NextResponse.json(event);
  } catch (error: any) {
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: (error as any).errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
