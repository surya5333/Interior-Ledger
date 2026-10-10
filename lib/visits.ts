import { Prisma, PrismaClient } from "../generated/prisma/client";

type VisitDbClient = PrismaClient | Prisma.TransactionClient;

export async function getNextVisitSequenceNumber(
  db: VisitDbClient,
  projectId: string
): Promise<number> {
  const result = await db.visit.aggregate({
    where: { projectId },
    _max: { sequenceNumber: true },
  });
  return (result._max.sequenceNumber ?? 0) + 1;
}

const PROJECT_VISIT_SEQ_UNIQUE_TARGET_PART = "sequence_number";

export function isVisitSequenceUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2002") return false;
  const target = (error.meta as any)?.target as string[] | string | undefined;
  if (!target) return false;
  const parts = Array.isArray(target) ? target : [target];
  return parts.some((p) => String(p).includes(PROJECT_VISIT_SEQ_UNIQUE_TARGET_PART));
}
