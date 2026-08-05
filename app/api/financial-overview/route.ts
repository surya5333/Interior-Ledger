import { NextResponse } from "next/server";
import { getFinancialOverview } from "../../../lib/financial-overview";
import { verifySession } from "../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Business-wide financial analytics for the Overview page. */
export async function GET() {
  try {
    const session = await verifySession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const data = await getFinancialOverview(session.role);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch financial overview:", error);
    return NextResponse.json({ error: "Failed to fetch financial overview." }, { status: 500 });
  }
}
