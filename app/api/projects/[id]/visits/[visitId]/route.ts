import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getPrisma } from "../../../../../../lib/prisma";
import { updateVisitSchema } from "../../../../../../lib/validation";
import {
  verifySession,
  loadProjectLockState,
  projectLocked,
} from "../../../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function loadScopedVisit(projectId: string, visitId: string) {
  const prisma = getPrisma();
  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit) return null;
  if (visit.projectId !== projectId) return null;
  return visit;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; visitId: string }> }
) {
  try {
    const session = await verifySession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId, visitId } = await params;

    const state = await loadProjectLockState(projectId);
    if (!state)
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 }
      );
    if (session.role === "MANAGER" && state.visibility === "PRIVATE")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (state.isLocked)
      return NextResponse.json(
        projectLocked(true).body,
        { status: projectLocked(true).status }
      );

    const existing = await loadScopedVisit(projectId, visitId);
    if (!existing)
      return NextResponse.json(
        { error: "Visit not found." },
        { status: 404 }
      );

    const input = updateVisitSchema.parse(await request.json());
    const updateData: any = {};
    if (input.date !== undefined) updateData.date = input.date;
    if (input.visitName !== undefined) updateData.visitName = input.visitName;
    if (input.description !== undefined)
      updateData.description = input.description ?? null;
    // Explicitly: sequenceNumber can NEVER be updated from client payload.

    if (Object.keys(updateData).length === 0)
      return NextResponse.json(existing, { status: 200 });

    const prisma = getPrisma();
    const updated = await prisma.visit.update({
      where: { id: visitId },
      data: updateData,
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: "Invalid visit.", issues: error.issues },
        { status: 400 }
      );
    throw error;
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; visitId: string }> }
) {
  const session = await verifySession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId, visitId } = await params;

  const state = await loadProjectLockState(projectId);
  if (!state)
    return NextResponse.json(
      { error: "Project not found." },
      { status: 404 }
    );
  if (session.role === "MANAGER" && state.visibility === "PRIVATE")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (state.isLocked)
    return NextResponse.json(
      projectLocked(true).body,
      { status: projectLocked(true).status }
    );

  const existing = await loadScopedVisit(projectId, visitId);
  if (!existing)
    return NextResponse.json(
      { error: "Visit not found." },
      { status: 404 }
    );

  const prisma = getPrisma();
  await prisma.visit.delete({ where: { id: visitId } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
