import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const settingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  logoUrl: z.string().optional().or(z.literal("")),
  signatureUrl: z.string().optional().or(z.literal("")),
});

export async function GET() {
  try {
    const prisma = getPrisma();
    let settings = await prisma.settings.findUnique({
      where: { id: "singleton" },
    });
    
    if (!settings) {
      settings = await prisma.settings.create({
        data: { id: "singleton", companyName: "Interior Ledger" },
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = settingsSchema.parse(await request.json());
    const prisma = getPrisma();
    
    const settings = await prisma.settings.upsert({
      where: { id: "singleton" },
      update: {
        companyName: body.companyName,
        logoUrl: body.logoUrl || null,
        signatureUrl: body.signatureUrl || null,
      },
      create: {
        id: "singleton",
        companyName: body.companyName,
        logoUrl: body.logoUrl || null,
        signatureUrl: body.signatureUrl || null,
      },
    });
    
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }
}
