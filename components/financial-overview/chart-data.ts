import type { FinancialOverviewData } from "../../lib/financial-overview";

export type MonthlyTrendPoint = {
  month: string;
  monthKey: string;
  revenue: number;
  expense: number;
  transactions: number;
};

function formatMonthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-IN", {
    month: "short",
    year: "2-digit",
  });
}

/** UI-only grouping of recent activity for chart display. */
export function buildMonthlyTrend(
  recentActivity: FinancialOverviewData["recentActivity"]
): MonthlyTrendPoint[] {
  const buckets = new Map<string, { revenue: number; expense: number; transactions: number }>();

  for (const tx of recentActivity) {
    const date = new Date(tx.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = buckets.get(monthKey) ?? { revenue: 0, expense: 0, transactions: 0 };
    existing.revenue += Number(tx.credit);
    existing.expense += Number(tx.debit);
    existing.transactions += 1;
    buckets.set(monthKey, existing);
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, data]) => ({
      monthKey,
      month: formatMonthLabel(monthKey),
      revenue: data.revenue,
      expense: data.expense,
      transactions: data.transactions,
    }));
}

/** UI-only current-month totals derived from recent activity dates. */
export function getHeroMetrics(
  recentActivity: FinancialOverviewData["recentActivity"],
  kpis: FinancialOverviewData["kpis"]
) {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  let monthlyRevenue = 0;
  let monthlyExpense = 0;

  for (const tx of recentActivity) {
    const date = new Date(tx.date);
    if (date.getMonth() === month && date.getFullYear() === year) {
      monthlyRevenue += Number(tx.credit);
      monthlyExpense += Number(tx.debit);
    }
  }

  return {
    currentBalance: Number(kpis.currentBalance),
    monthlyRevenue,
    monthlyExpense,
  };
}

export function buildPaymentChartData(
  paymentModeSummary: FinancialOverviewData["paymentModeSummary"]
) {
  return paymentModeSummary
    .filter((row) => Number(row.totalAmount) > 0)
    .map((row) => ({
      mode: row.mode,
      name: row.mode,
      value: Number(row.totalAmount),
      percentage: row.percentage,
      amount: row.totalAmount,
    }));
}

export function buildCategoryChartData(
  categorySummary: FinancialOverviewData["categorySummary"]
) {
  return categorySummary.map((row) => ({
    category: row.category,
    total: Number(row.total),
    debit: Number(row.debit),
    credit: Number(row.credit),
  }));
}

export function getMaxTotal(items: { total: number }[] | { totalValue: string }[]) {
  if (!items.length) return 0;
  return Math.max(
    ...items.map((item) =>
      "totalValue" in item ? Number(item.totalValue) : item.total
    )
  );
}
