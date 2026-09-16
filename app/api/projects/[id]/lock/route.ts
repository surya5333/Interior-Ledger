import { NextRequest, NextResponse } from "next/server";
import { getPrisma } from "../../../../../lib/prisma";
import { verifySession } from "../../../../../lib/auth";

export const runtime = "nodejs";

function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const s = value.trim().toLowerCase();
    return s === "true" || s === "t" || s === "1" || s === "yes" || s === "on";
  }
  return false;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only the Owner can lock or unlock a project." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const prisma = getPrisma();

  let project;
  try {
    project = await prisma.project.findUnique({ where: { id } });
  } catch (dbErr: any) {
    return NextResponse.json(
      { error: "Failed to read project state: " + (dbErr?.message || "unknown") },
      { status: 500 }
    );
  }
  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const currentlyLocked = toBool((project as any).isLocked);
  const nextLockState = !currentlyLocked;

  try {
    const updated = await prisma.project.update({
      where: { id },
      data: { isLocked: nextLockState },
    });
    return NextResponse.json({
      id: updated.id,
      isLocked: toBool((updated as any).isLocked),
    });
  } catch (dbErr: any) {
    return NextResponse.json(
      { error: "Failed to toggle project lock state: " + (dbErr?.message || "unknown") },
      { status: 500 }
    );
  }
}
