import Link from "next/link";
import {
  Award,
  Briefcase,
  Tag,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import { formatMoney } from "../money-text";
import { cn } from "../../lib/cn";
import type { FinancialOverviewData } from "../../lib/financial-overview";
import { DashboardCard, SectionHeader } from "./dashboard-card";

interface InsightItemProps {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  label: string;
  name: string;
  subtitle: string;
  amount?: string;
  href?: string;
}

function InsightItem({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  name,
  subtitle,
  amount,
  href,
}: InsightItemProps) {
  const content = (
    <DashboardCard className="p-5 h-full">
      <div className="flex items-start gap-4">
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          <Icon className={cn("size-5", iconColor)} strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
          <p className="mt-1.5 text-base font-semibold text-text truncate">{name}</p>
          <p className="mt-0.5 text-sm text-muted truncate">{subtitle}</p>
          {amount && (
            <p className="mt-2 text-lg font-bold font-[tabular-nums] text-text">{amount}</p>
          )}
        </div>
      </div>
    </DashboardCard>
  );

  if (href) {
    return (
      <Link href={href} className="block no-underline">
        {content}
      </Link>
    );
  }

  return content;
}

interface BusinessInsightsProps {
  insights: FinancialOverviewData["insights"];
}

export function BusinessInsights({ insights }: BusinessInsightsProps) {
  return (
    <section>
      <SectionHeader
        title="Business Insights"
        subtitle="Standout performers across your ledger"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <InsightItem
          icon={Award}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          label="Highest Paying Client"
          name={insights.highestPayingClient?.name ?? "—"}
          subtitle={
            insights.highestPayingClient ? "Top client by revenue received" : "No client payments yet"
          }
          amount={
            insights.highestPayingClient
              ? formatMoney(insights.highestPayingClient.totalCredit)
              : undefined
          }
          href={
            insights.highestPayingClient
              ? `/clients/${insights.highestPayingClient.id}`
              : undefined
          }
        />
        <InsightItem
          icon={Briefcase}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
          label="Largest Project"
          name={insights.largestProject?.name ?? "—"}
          subtitle={
            insights.largestProject ? "Highest transaction value" : "No project activity yet"
          }
          amount={
            insights.largestProject
              ? formatMoney(insights.largestProject.totalValue)
              : undefined
          }
          href={
            insights.largestProject ? `/projects/${insights.largestProject.id}` : undefined
          }
        />
        <InsightItem
          icon={UserCheck}
          iconBg="bg-teal-50"
          iconColor="text-teal-600"
          label="Most Active Contact"
          name={insights.mostActiveContact?.name ?? "—"}
          subtitle={
            insights.mostActiveContact
              ? `${insights.mostActiveContact.transactionCount} transactions · ${insights.mostActiveContact.category}`
              : "No contact activity yet"
          }
          href={
            insights.mostActiveContact
              ? `/contacts/${insights.mostActiveContact.id}`
              : undefined
          }
        />
        <InsightItem
          icon={Tag}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          label="Highest Category"
          name={insights.highestExpenseCategory?.category ?? "—"}
          subtitle={
            insights.highestExpenseCategory ? "Top expense category" : "No expenses recorded yet"
          }
          amount={
            insights.highestExpenseCategory
              ? formatMoney(insights.highestExpenseCategory.totalDebit)
              : undefined
          }
        />
      </div>
    </section>
  );
}
