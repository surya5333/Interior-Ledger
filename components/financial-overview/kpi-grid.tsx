import {
  Building2,
  FolderKanban,
  Receipt,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { formatMoney } from "../money-text";
import { cn } from "../../lib/cn";
import type { FinancialOverviewData } from "../../lib/financial-overview";
import { DashboardCard } from "./dashboard-card";
import { DASHBOARD_COLORS } from "./constants";

type KpiKey =
  | "projects"
  | "clients"
  | "contacts"
  | "transactions"
  | "revenue"
  | "expense"
  | "balance";

const KPI_CONFIG: Record<
  KpiKey,
  { label: string; description: string; icon: LucideIcon; colors: (typeof DASHBOARD_COLORS)[keyof typeof DASHBOARD_COLORS] }
> = {
  balance: {
    label: "Current Balance",
    description: "Overall balance across all projects",
    icon: Wallet,
    colors: DASHBOARD_COLORS.balance,
  },
  projects: {
    label: "Total Projects",
    description: "Active and completed projects",
    icon: FolderKanban,
    colors: DASHBOARD_COLORS.projects,
  },
  clients: {
    label: "Total Clients",
    description: "Clients across your portfolio",
    icon: Building2,
    colors: DASHBOARD_COLORS.clients,
  },
  contacts: {
    label: "Total Contacts",
    description: "Vendors, workers and partners",
    icon: Users,
    colors: DASHBOARD_COLORS.contacts,
  },
  transactions: {
    label: "Total Transactions",
    description: "All ledger entries recorded",
    icon: Receipt,
    colors: DASHBOARD_COLORS.transactions,
  },
  revenue: {
    label: "Total Revenue",
    description: "Total credits received",
    icon: TrendingUp,
    colors: DASHBOARD_COLORS.revenue,
  },
  expense: {
    label: "Total Expenses",
    description: "Total debits spent",
    icon: TrendingDown,
    colors: DASHBOARD_COLORS.expense,
  },
};

interface KpiGridProps {
  kpis: FinancialOverviewData["kpis"];
}

export function KpiGrid({ kpis }: KpiGridProps) {
  const items: { key: KpiKey; value: string }[] = [
    { key: "balance", value: formatMoney(kpis.currentBalance) },
    { key: "revenue", value: formatMoney(kpis.totalCredit) },
    { key: "expense", value: formatMoney(kpis.totalDebit) },
    { key: "projects", value: kpis.totalProjects.toString() },
    { key: "clients", value: kpis.totalClients.toString() },
    { key: "contacts", value: kpis.totalContacts.toString() },
    { key: "transactions", value: kpis.totalTransactions.toString() },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map(({ key, value }) => {
        const config = KPI_CONFIG[key];
        const Icon = config.icon;
        return (
          <DashboardCard key={key} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  config.colors.bg
                )}
              >
                <Icon className={cn("size-5", config.colors.icon)} strokeWidth={1.8} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-bold tracking-tight font-[tabular-nums] text-text">
              {value}
            </p>
            <p className="mt-1 text-sm font-medium text-text">{config.label}</p>
            <p className="mt-0.5 text-xs text-muted">{config.description}</p>
          </DashboardCard>
        );
      })}
    </div>
  );
}
