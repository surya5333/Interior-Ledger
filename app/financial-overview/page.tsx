"use client";

import { useMemo } from "react";

import { PageSkeleton } from "../../components/ui/skeleton";
import { useFinancialOverview } from "../../hooks/use-financial-overview";
import { ActivityFeed } from "../../components/financial-overview/activity-feed";
import { BusinessInsights } from "../../components/financial-overview/business-insights";
import { ChartsSection } from "../../components/financial-overview/charts-section";
import { getHeroMetrics } from "../../components/financial-overview/chart-data";
import { DashboardHero } from "../../components/financial-overview/dashboard-hero";
import { SectionHeader } from "../../components/financial-overview/dashboard-card";
import { KpiGrid } from "../../components/financial-overview/kpi-grid";
import { QuickStatsSection } from "../../components/financial-overview/quick-stats";
import {
  CategorySummarySection,
  TopClientsSection,
  TopContactsSection,
} from "../../components/financial-overview/ranked-sections";

export default function FinancialOverviewPage() {
  const { data, isLoading } = useFinancialOverview();

  const heroMetrics = useMemo(
    () => (data ? getHeroMetrics(data.recentActivity, data.kpis) : null),
    [data]
  );

  if (isLoading || !data || !heroMetrics) {
    return <PageSkeleton />;
  }

  const {
    kpis,
    insights,
    recentActivity,
    topClients,
    topContacts,
    categorySummary,
    paymentModeSummary,
    quickStats,
  } = data;

  return (
    <div className="space-y-10 fade-in pb-4">
      <DashboardHero
        currentBalance={heroMetrics.currentBalance}
        monthlyRevenue={heroMetrics.monthlyRevenue}
        monthlyExpense={heroMetrics.monthlyExpense}
      />

      <section>
        <SectionHeader title="Key Metrics" subtitle="Business-wide counts and financial totals" />
        <KpiGrid kpis={kpis} />
      </section>

      <ChartsSection
        recentActivity={recentActivity}
        paymentModeSummary={paymentModeSummary}
        categorySummary={categorySummary}
      />

      <BusinessInsights insights={insights} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <TopClientsSection topClients={topClients} />
        <TopContactsSection topContacts={topContacts} />
      </div>

      <ActivityFeed recentActivity={recentActivity} />

      <CategorySummarySection categorySummary={categorySummary} />

      <QuickStatsSection quickStats={quickStats} />
    </div>
  );
}
