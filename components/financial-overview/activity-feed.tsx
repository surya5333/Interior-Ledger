import Link from "next/link";

import { CategoryBadge } from "../category-badge";
import { PaymentModeBadge } from "../payment-mode-badge";
import { MoneyText } from "../money-text";
import { cn } from "../../lib/cn";
import type { FinancialOverviewData } from "../../lib/financial-overview";
import { DashboardCard, SectionHeader } from "./dashboard-card";

function getRelativeDayLabel(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function groupByDay(recentActivity: FinancialOverviewData["recentActivity"]) {
  const groups = new Map<string, FinancialOverviewData["recentActivity"]>();

  for (const tx of recentActivity) {
    const label = getRelativeDayLabel(tx.date);
    const existing = groups.get(label) ?? [];
    existing.push(tx);
    groups.set(label, existing);
  }

  return Array.from(groups.entries());
}

interface ActivityFeedProps {
  recentActivity: FinancialOverviewData["recentActivity"];
}

export function ActivityFeed({ recentActivity }: ActivityFeedProps) {
  const groups = groupByDay(recentActivity);

  return (
    <section>
      <SectionHeader
        title="Recent Activity"
        subtitle="Last 10 transactions across all projects"
      />
      <DashboardCard className="p-0 overflow-hidden">
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted text-center py-12">No transactions recorded yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {groups.map(([dayLabel, transactions]) => (
              <div key={dayLabel}>
                <div className="px-5 py-3 bg-[#FAFAF8] border-b border-border">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {dayLabel}
                  </p>
                </div>
                <div className="divide-y divide-border/60">
                  {transactions.map((tx) => {
                    const isCredit = Number(tx.credit) > 0;
                    const amount = isCredit ? tx.credit : tx.debit;
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-hover/50"
                      >
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full shrink-0",
                            isCredit ? "bg-emerald-500" : "bg-blue-500"
                          )}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/contacts/${tx.contact.id}`}
                              className="font-medium text-text hover:text-primary transition-colors no-underline"
                            >
                              {tx.contact.name}
                            </Link>
                            <PaymentModeBadge paymentMode={tx.paymentMode} />
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <CategoryBadge category={tx.category} />
                            <span className="text-xs text-muted">{tx.project.name}</span>
                          </div>
                        </div>
                        <MoneyText
                          amount={amount}
                          color={isCredit ? "credit" : "debit"}
                          className="text-base shrink-0"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardCard>
    </section>
  );
}
