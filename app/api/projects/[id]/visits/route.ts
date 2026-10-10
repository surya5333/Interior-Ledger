import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getNextVisitSequenceNumber, isVisitSequenceUniqueViolation } from "../../../../../lib/visits";
import { getPrisma } from "../../../../../lib/prisma";
import { createVisitSchema } from "../../../../../lib/validation";
import {
  verifySession,
  loadProjectLockState,
  projectLocked,
} from "../../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await verifySession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: projectId } = await params;

  const prisma = getPrisma();
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { visibility: true },
  });

  if (!project)
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  if (session.role === "MANAGER" && project.visibility === "PRIVATE")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const visits = await prisma.visit.findMany({
    where: { projectId },
    orderBy: [
      { date: "desc" },
      { createdAt: "desc" },
    ],
  });

  return NextResponse.json(visits, {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifySession();
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: projectId } = await params;

    const prisma = getPrisma();
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

    const input = createVisitSchema.parse(await request.json());

    let created: any = null;
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        created = await prisma.$transaction(async (tx) => {
          const nextSeq = await getNextVisitSequenceNumber(tx, projectId);
          return tx.visit.create({
            data: {
              projectId,
              date: input.date,
              visitName: input.visitName || `Visit ${nextSeq}`,
              description: input.description ?? null,
              sequenceNumber: nextSeq,
            },
          });
        });
        break;
      } catch (error) {
        if (attempt < MAX_ATTEMPTS && isVisitSequenceUniqueViolation(error)) {
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: "Invalid visit.", issues: error.issues },
        { status: 400 }
      );
    throw error;
  }
}
