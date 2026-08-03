import Link from "next/link";

import { CategoryBadge } from "../category-badge";
import { MoneyText, formatMoney } from "../money-text";
import { cn } from "../../lib/cn";
import type { FinancialOverviewData } from "../../lib/financial-overview";
import { DashboardCard, SectionHeader } from "./dashboard-card";
import { getMaxTotal } from "./chart-data";

interface RankedCardProps {
  rank: number;
  name: string;
  amount: string;
  maxAmount: number;
  href: string;
  badge?: React.ReactNode;
  meta?: string;
  accentColor: string;
}

function RankedCard({
  rank,
  name,
  amount,
  maxAmount,
  href,
  badge,
  meta,
  accentColor,
}: RankedCardProps) {
  const widthPercent = maxAmount > 0 ? (Number(amount) / maxAmount) * 100 : 0;

  return (
    <Link href={href} className="block no-underline group">
      <div className="rounded-xl border border-border/80 bg-white p-4 transition-all duration-200 group-hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] group-hover:border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FAFAF8] text-sm font-bold text-muted">
              #{rank}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-text truncate group-hover:text-primary transition-colors">
                {name}
              </p>
              {badge && <div className="mt-1">{badge}</div>}
              {meta && <p className="mt-0.5 text-xs text-muted">{meta}</p>}
            </div>
          </div>
          <MoneyText amount={amount} className="text-base shrink-0" />
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-hover overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", accentColor)}
            style={{ width: `${Math.max(widthPercent, 4)}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

export function TopClientsSection({
  topClients,
}: {
  topClients: FinancialOverviewData["topClients"];
}) {
  const maxValue = getMaxTotal(topClients);

  return (
    <section>
      <SectionHeader title="Top Clients" subtitle="Ranked by total transaction value" />
      {topClients.length === 0 ? (
        <DashboardCard>
          <p className="text-sm text-muted text-center py-8">No client transaction data yet.</p>
        </DashboardCard>
      ) : (
        <div className="space-y-3">
          {topClients.map((client, index) => (
            <RankedCard
              key={client.id}
              rank={index + 1}
              name={client.name}
              amount={client.totalValue}
              maxAmount={maxValue}
              href={`/clients/${client.id}`}
              meta={`${client.transactionCount} transactions`}
              accentColor="bg-orange-500"
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function TopContactsSection({
  topContacts,
}: {
  topContacts: FinancialOverviewData["topContacts"];
}) {
  const maxValue = getMaxTotal(topContacts);

  return (
    <section>
      <SectionHeader title="Top Contacts" subtitle="Ranked by total transaction value" />
      {topContacts.length === 0 ? (
        <DashboardCard>
          <p className="text-sm text-muted text-center py-8">No contact transaction data yet.</p>
        </DashboardCard>
      ) : (
        <div className="space-y-3">
          {topContacts.map((contact, index) => (
            <RankedCard
              key={contact.id}
              rank={index + 1}
              name={contact.name}
              amount={contact.totalValue}
              maxAmount={maxValue}
              href={`/contacts/${contact.id}`}
              badge={<CategoryBadge category={contact.category} />}
              meta={`${contact.transactionCount} transactions`}
              accentColor="bg-teal-500"
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function CategorySummarySection({
  categorySummary,
}: {
  categorySummary: FinancialOverviewData["categorySummary"];
}) {
  const maxTotal = getMaxTotal(categorySummary.map((r) => ({ total: Number(r.total) })));

  return (
    <section>
      <SectionHeader
        title="Category Summary"
        subtitle="Aggregate totals grouped by category"
      />
      <DashboardCard className="p-5">
        {categorySummary.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">No category data yet.</p>
        ) : (
          <div className="space-y-5">
            {categorySummary.map((row) => {
              const total = Number(row.total);
              const widthPercent = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
              return (
                <div key={row.category}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <CategoryBadge category={row.category} />
                    <span className="text-sm font-semibold font-[tabular-nums] text-text">
                      {formatMoney(total)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-hover overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-500 transition-all duration-500"
                      style={{ width: `${Math.max(widthPercent, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DashboardCard>
    </section>
  );
}
