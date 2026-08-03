import { formatMoney } from "../money-text";
import { cn } from "../../lib/cn";
import { DashboardCard } from "./dashboard-card";
import { DASHBOARD_COLORS } from "./constants";

interface DashboardHeroProps {
  currentBalance: number;
  monthlyRevenue: number;
  monthlyExpense: number;
}

export function DashboardHero({
  currentBalance,
  monthlyRevenue,
  monthlyExpense,
}: DashboardHeroProps) {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const stats = [
    {
      label: "Current Balance",
      value: formatMoney(currentBalance),
      description: "Overall balance across all projects",
      colors: DASHBOARD_COLORS.balance,
    },
    {
      label: "Monthly Revenue",
      value: formatMoney(monthlyRevenue),
      description: "Credits recorded this month",
      colors: DASHBOARD_COLORS.revenue,
    },
    {
      label: "Monthly Expense",
      value: formatMoney(monthlyExpense),
      description: "Debits recorded this month",
      colors: DASHBOARD_COLORS.expense,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted">{today}</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-text">
          Financial Overview
        </h1>
        <p className="text-base text-muted max-w-2xl">
          Track your business performance, cash flow and financial health.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <DashboardCard key={stat.label} className="p-5">
            <p className="text-sm font-medium text-muted">{stat.label}</p>
            <p className={cn("mt-2 text-2xl md:text-3xl font-bold tracking-tight font-[tabular-nums]", stat.colors.text)}>
              {stat.value}
            </p>
            <p className="mt-1.5 text-xs text-muted">{stat.description}</p>
          </DashboardCard>
        ))}
      </div>
    </div>
  );
}