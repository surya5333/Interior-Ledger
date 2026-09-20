import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "../../../lib/auth";
import { getProgress, type DateRangePreset } from "../../../lib/progress";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  preset: z.enum(["this_week", "this_month", "this_year", "custom"]).default("this_year"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      preset: searchParams.get("preset") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid date range parameters." }, { status: 400 });
    }

    const data = await getProgress(session.role, {
      preset: parsed.data.preset,
      startDate: parsed.data.startDate ?? "",
      endDate: parsed.data.endDate ?? "",
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress data." }, { status: 500 });
  }
}
