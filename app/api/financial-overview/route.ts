import { NextResponse } from "next/server";
import { getFinancialOverview } from "../../../lib/financial-overview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Business-wide financial analytics for the Overview page. */
export async function GET() {
  try {
    const data = await getFinancialOverview();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch financial overview:", error);
    return NextResponse.json({ error: "Failed to fetch financial overview." }, { status: 500 });
  }
}
