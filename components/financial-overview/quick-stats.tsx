import { Calculator, CircleCheck, FolderKanban, Wallet } from "lucide-react";

import { formatMoney } from "../money-text";
import { cn } from "../../lib/cn";
import type { FinancialOverviewData } from "../../lib/financial-overview";
import { DashboardCard, SectionHeader } from "./dashboard-card";

interface QuickStatsProps {
  quickStats: FinancialOverviewData["quickStats"];
}

const STAT_CONFIG = [
  {
    key: "averageTransactionAmount" as const,
    label: "Average Transaction",
    icon: Calculator,
    bg: "bg-slate-50",
    iconColor: "text-slate-600",
  },
  {
    key: "averageProjectBudget" as const,
    label: "Average Budget",
    icon: Wallet,
    bg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    key: "activeProjects" as const,
    label: "Active Projects",
    icon: FolderKanban,
    bg: "bg-violet-50",
    iconColor: "text-violet-600",
    isCount: true,
  },
  {
    key: "completedProjects" as const,
    label: "Completed Projects",
    icon: CircleCheck,
    bg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    isCount: true,
  },
];

export function QuickStatsSection({ quickStats }: QuickStatsProps) {
  return (
    <section>
      <SectionHeader title="Quick Statistics" subtitle="Averages and project status counts" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAT_CONFIG.map((stat) => {
          const Icon = stat.icon;
          const raw = quickStats[stat.key];
          const value = stat.isCount ? raw.toString() : formatMoney(raw as string);

          return (
            <DashboardCard key={stat.key} className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", stat.bg)}>
                  <Icon className={cn("size-4", stat.iconColor)} strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold font-[tabular-nums] text-text">{value}</p>
                  <p className="text-xs text-muted">{stat.label}</p>
                </div>
              </div>
            </DashboardCard>
          );
        })}
      </div>
    </section>
  );
}
