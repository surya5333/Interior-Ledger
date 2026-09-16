import { getPrisma } from "./prisma";

const asMoney = (value: { toFixed: (n: number) => string } | number | null | undefined) =>
  Number(value ?? 0).toFixed(2);

/** Client payment transactions across all projects for a client. */
export async function getClientLedger(clientId: string, userRole?: string) {
  const prisma = getPrisma();

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, phone: true, email: true, createdAt: true },
  });

  if (!client) return null;

  const visibilityFilter = userRole === "MANAGER" ? { visibility: "SHARED" as any } : {};

  const [projects, payments] = await Promise.all([
    prisma.project.findMany({
      where: { clientId, ...visibilityFilter },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, budget: true, createdAt: true },
    }),
    prisma.transaction.findMany({
      where: { isClientPayment: true, project: { clientId, ...visibilityFilter }, deletedAt: null },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { project: { select: { id: true, name: true } } },
    }),
  ]);

  const totalCredit = payments.reduce((sum, row) => sum + Number(row.credit), 0);

  return {
    client,
    projects,
    totals: { totalReceived: asMoney(totalCredit), paymentCount: payments.length },
    payments: payments.map((row) => ({
      id: row.id,
      date: row.date.toISOString(),
      project: row.project,
      category: row.category,
      description: row.description,
      paymentMode: row.paymentMode,
      paymentProofUrl: row.paymentProofUrl,
      credit: asMoney(row.credit),
    })),
  };
}

export type ClientLedgerData = NonNullable<Awaited<ReturnType<typeof getClientLedger>>>;
