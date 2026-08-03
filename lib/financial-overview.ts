import { Prisma } from "../generated/prisma/client";
import { getPrisma } from "./prisma";

const asMoney = (value: Prisma.Decimal | number | null | undefined) =>
  Number(value ?? 0).toFixed(2);

type RankedRow = {
  id: string;
  name: string;
  category?: string | null;
  clientName?: string | null;
  totalValue: Prisma.Decimal;
  transactionCount?: bigint | number;
};

type ProjectStatusRow = {
  activeProjects: bigint | number;
  completedProjects: bigint | number;
};

/** Business-wide financial analytics via Prisma aggregates and targeted SQL. */
export async function getFinancialOverview() {
  const prisma = getPrisma();

  const [
    projectCount,
    clientCount,
    contactCount,
    transactionCount,
    transactionTotals,
    budgetAgg,
    recentTransactions,
    categoryGroups,
    paymentModeGroups,
    insightRows,
    topClientRows,
    topContactRows,
    projectStatusRows,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.client.count(),
    prisma.contact.count(),
    prisma.transaction.count(),
    prisma.transaction.aggregate({
      _sum: { credit: true, debit: true },
    }),
    prisma.project.aggregate({
      _avg: { budget: true },
    }),
    prisma.transaction.findMany({
      take: 10,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        contact: { select: { id: true, name: true, category: true } },
        project: {
          select: {
            id: true,
            name: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.transaction.groupBy({
      by: ["category"],
      _sum: { credit: true, debit: true },
    }),
    prisma.transaction.groupBy({
      by: ["paymentMode"],
      _sum: { credit: true, debit: true },
    }),
    prisma.$queryRaw<
      {
        highestPayingClientId: string | null;
        highestPayingClientName: string | null;
        highestPayingClientCredit: Prisma.Decimal | null;
        largestProjectId: string | null;
        largestProjectName: string | null;
        largestProjectValue: Prisma.Decimal | null;
        mostActiveContactId: string | null;
        mostActiveContactName: string | null;
        mostActiveContactCategory: string | null;
        mostActiveContactCount: bigint | number | null;
        highestExpenseCategory: string | null;
        highestExpenseCategoryDebit: Prisma.Decimal | null;
      }[]
    >(Prisma.sql`
      WITH client_credits AS (
        SELECT cl.id, cl.name, COALESCE(SUM(t.credit), 0)::numeric AS total_credit
        FROM "Client" cl
        LEFT JOIN "Project" p ON p.client_id = cl.id
        LEFT JOIN "Transaction" t ON t.project_id = p.id
        GROUP BY cl.id, cl.name
        ORDER BY total_credit DESC
        LIMIT 1
      ),
      project_values AS (
        SELECT p.id, p.name, COALESCE(SUM(t.credit + t.debit), 0)::numeric AS total_value
        FROM "Project" p
        LEFT JOIN "Transaction" t ON t.project_id = p.id
        GROUP BY p.id, p.name
        ORDER BY total_value DESC
        LIMIT 1
      ),
      contact_activity AS (
        SELECT c.id, c.name, c.category, COUNT(t.id)::bigint AS tx_count
        FROM "Contact" c
        LEFT JOIN "Transaction" t ON t.contact_id = c.id
        GROUP BY c.id, c.name, c.category
        ORDER BY tx_count DESC, c.name ASC
        LIMIT 1
      ),
      expense_categories AS (
        SELECT category, COALESCE(SUM(debit), 0)::numeric AS total_debit
        FROM "Transaction"
        GROUP BY category
        ORDER BY total_debit DESC
        LIMIT 1
      )
      SELECT
        cc.id AS "highestPayingClientId",
        cc.name AS "highestPayingClientName",
        cc.total_credit AS "highestPayingClientCredit",
        pv.id AS "largestProjectId",
        pv.name AS "largestProjectName",
        pv.total_value AS "largestProjectValue",
        ca.id AS "mostActiveContactId",
        ca.name AS "mostActiveContactName",
        ca.category AS "mostActiveContactCategory",
        ca.tx_count AS "mostActiveContactCount",
        ec.category AS "highestExpenseCategory",
        ec.total_debit AS "highestExpenseCategoryDebit"
      FROM (SELECT 1) AS anchor
      LEFT JOIN client_credits cc ON TRUE
      LEFT JOIN project_values pv ON TRUE
      LEFT JOIN contact_activity ca ON TRUE
      LEFT JOIN expense_categories ec ON TRUE
    `),
    prisma.$queryRaw<RankedRow[]>(Prisma.sql`
      SELECT
        cl.id,
        cl.name,
        COALESCE(SUM(t.credit + t.debit), 0)::numeric AS "totalValue",
        COUNT(t.id)::bigint AS "transactionCount"
      FROM "Client" cl
      LEFT JOIN "Project" p ON p.client_id = cl.id
      LEFT JOIN "Transaction" t ON t.project_id = p.id
      GROUP BY cl.id, cl.name
      HAVING COALESCE(SUM(t.credit + t.debit), 0) > 0
      ORDER BY "totalValue" DESC
      LIMIT 5
    `),
    prisma.$queryRaw<RankedRow[]>(Prisma.sql`
      SELECT
        c.id,
        c.name,
        c.category,
        COALESCE(SUM(t.credit + t.debit), 0)::numeric AS "totalValue",
        COUNT(t.id)::bigint AS "transactionCount"
      FROM "Contact" c
      LEFT JOIN "Transaction" t ON t.contact_id = c.id
      GROUP BY c.id, c.name, c.category
      HAVING COALESCE(SUM(t.credit + t.debit), 0) > 0
      ORDER BY "totalValue" DESC
      LIMIT 5
    `),
    prisma.$queryRaw<ProjectStatusRow[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE has_tx AND balance <> 0)::bigint AS "activeProjects",
        COUNT(*) FILTER (WHERE has_tx AND balance = 0)::bigint AS "completedProjects"
      FROM (
        SELECT
          p.id,
          EXISTS (
            SELECT 1 FROM "Transaction" t WHERE t.project_id = p.id
          ) AS has_tx,
          COALESCE((
            SELECT SUM(t.credit - t.debit)
            FROM "Transaction" t
            WHERE t.project_id = p.id
          ), 0)::numeric AS balance
        FROM "Project" p
      ) project_balances
    `),
  ]);

  const totalCredit = Number(transactionTotals._sum.credit ?? 0);
  const totalDebit = Number(transactionTotals._sum.debit ?? 0);
  const currentBalance = totalCredit - totalDebit;
  const avgTransactionAmount =
    transactionCount > 0 ? (totalCredit + totalDebit) / transactionCount : 0;

  const categorySummary = categoryGroups
    .map((row) => {
      const credit = Number(row._sum.credit ?? 0);
      const debit = Number(row._sum.debit ?? 0);
      return {
        category: row.category,
        credit: asMoney(credit),
        debit: asMoney(debit),
        total: asMoney(credit + debit),
      };
    })
    .sort((a, b) => Number(b.total) - Number(a.total));

  const paymentModeOrder = ["CASH", "UPI", "CARD", "OTHER"] as const;
  const paymentModeTotals = paymentModeOrder.map((mode) => {
    const row = paymentModeGroups.find((g) => g.paymentMode === mode);
    const credit = Number(row?._sum.credit ?? 0);
    const debit = Number(row?._sum.debit ?? 0);
    return { mode, amount: credit + debit };
  });
  const paymentModeGrandTotal = paymentModeTotals.reduce((sum, row) => sum + row.amount, 0);

  const insights = insightRows[0] ?? {};
  const projectStatus = projectStatusRows[0] ?? {
    activeProjects: 0,
    completedProjects: 0,
  };

  return {
    kpis: {
      totalProjects: projectCount,
      totalClients: clientCount,
      totalContacts: contactCount,
      totalTransactions: transactionCount,
      totalCredit: asMoney(totalCredit),
      totalDebit: asMoney(totalDebit),
      currentBalance: asMoney(currentBalance),
    },
    insights: {
      highestPayingClient: insights.highestPayingClientId
        ? {
            id: insights.highestPayingClientId,
            name: insights.highestPayingClientName!,
            totalCredit: asMoney(insights.highestPayingClientCredit),
          }
        : null,
      largestProject: insights.largestProjectId
        ? {
            id: insights.largestProjectId,
            name: insights.largestProjectName!,
            totalValue: asMoney(insights.largestProjectValue),
          }
        : null,
      mostActiveContact:
        insights.mostActiveContactId && Number(insights.mostActiveContactCount ?? 0) > 0
          ? {
              id: insights.mostActiveContactId,
              name: insights.mostActiveContactName!,
              category: insights.mostActiveContactCategory!,
              transactionCount: Number(insights.mostActiveContactCount),
            }
          : null,
      highestExpenseCategory:
        insights.highestExpenseCategory && Number(insights.highestExpenseCategoryDebit ?? 0) > 0
          ? {
              category: insights.highestExpenseCategory,
              totalDebit: asMoney(insights.highestExpenseCategoryDebit),
            }
          : null,
    },
    recentActivity: recentTransactions.map((t) => ({
      id: t.id,
      date: t.date.toISOString(),
      contact: t.isClientPayment
        ? {
            id: t.project.client.id,
            name: t.project.client.name,
            category: "Payment",
          }
        : {
            id: t.contact!.id,
            name: t.contact!.name,
            category: t.contact!.category,
          },
      project: { id: t.project.id, name: t.project.name },
      category: t.category,
      paymentMode: t.paymentMode,
      credit: asMoney(t.credit),
      debit: asMoney(t.debit),
    })),
    topClients: topClientRows.map((row) => ({
      id: row.id,
      name: row.name,
      totalValue: asMoney(row.totalValue),
      transactionCount: Number(row.transactionCount ?? 0),
    })),
    topContacts: topContactRows.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category ?? "",
      totalValue: asMoney(row.totalValue),
      transactionCount: Number(row.transactionCount ?? 0),
    })),
    categorySummary,
    paymentModeSummary: paymentModeTotals.map(({ mode, amount }) => ({
      mode,
      totalAmount: asMoney(amount),
      percentage: paymentModeGrandTotal > 0 ? (amount / paymentModeGrandTotal) * 100 : 0,
    })),
    quickStats: {
      averageTransactionAmount: asMoney(avgTransactionAmount),
      averageProjectBudget: asMoney(budgetAgg._avg.budget ?? 0),
      activeProjects: Number(projectStatus.activeProjects),
      completedProjects: Number(projectStatus.completedProjects),
    },
  };
}

export type FinancialOverviewData = Awaited<ReturnType<typeof getFinancialOverview>>;
