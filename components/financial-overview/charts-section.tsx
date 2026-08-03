"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatMoney } from "../money-text";
import type { FinancialOverviewData } from "../../lib/financial-overview";
import { DashboardCard, SectionHeader } from "./dashboard-card";
import {
  buildCategoryChartData,
  buildMonthlyTrend,
  buildPaymentChartData,
  type MonthlyTrendPoint,
} from "./chart-data";
import { DASHBOARD_COLORS, PAYMENT_MODE_CHART_COLORS, PAYMENT_MODE_LABELS } from "./constants";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 shadow-md text-sm">
      {label && <p className="font-medium text-text mb-1">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="text-muted">
          <span style={{ color: entry.color }}>{entry.name}: </span>
          {formatMoney(entry.value)}
        </p>
      ))}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] items-center justify-center text-sm text-muted">
      {message}
    </div>
  );
}

export function RevenueExpenseChart({
  recentActivity,
}: {
  recentActivity: FinancialOverviewData["recentActivity"];
}) {
  const data = buildMonthlyTrend(recentActivity);

  return (
    <DashboardCard>
      <SectionHeader
        title="Revenue vs Expense"
        subtitle="Monthly trend from recent transaction activity"
      />
      {data.length === 0 ? (
        <EmptyChart message="No transaction data available for trend chart." />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={DASHBOARD_COLORS.revenue.chart} stopOpacity={0.15} />
                <stop offset="95%" stopColor={DASHBOARD_COLORS.revenue.chart} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={DASHBOARD_COLORS.expense.chart} stopOpacity={0.15} />
                <stop offset="95%" stopColor={DASHBOARD_COLORS.expense.chart} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#707070", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#707070", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke={DASHBOARD_COLORS.revenue.chart}
              fill="url(#revenueGradient)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="expense"
              name="Expense"
              stroke={DASHBOARD_COLORS.expense.chart}
              fill="url(#expenseGradient)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </DashboardCard>
  );
}

export function PaymentModeChart({
  paymentModeSummary,
}: {
  paymentModeSummary: FinancialOverviewData["paymentModeSummary"];
}) {
  const data = buildPaymentChartData(paymentModeSummary);

  return (
    <DashboardCard className="h-full">
      <SectionHeader title="Payment Summary" subtitle="Distribution by payment method" />
      {data.length === 0 ? (
        <EmptyChart message="No payment mode data yet." />
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry) => (
                  <Cell
                    key={entry.mode}
                    fill={PAYMENT_MODE_CHART_COLORS[entry.mode]}
                    stroke="transparent"
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatMoney(Number(value ?? 0))}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #E8E8E8",
                  fontSize: "13px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-3 border-t border-border pt-4">
            {paymentModeSummary.map((row) => (
              <div key={row.mode} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PAYMENT_MODE_CHART_COLORS[row.mode] }}
                  />
                  <span className="text-sm text-text">{PAYMENT_MODE_LABELS[row.mode]}</span>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-medium font-[tabular-nums] text-text">
                    {formatMoney(row.totalAmount)}
                  </p>
                  <p className="text-xs text-muted">{row.percentage.toFixed(0)}%</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardCard>
  );
}

export function CategoryDistributionChart({
  categorySummary,
}: {
  categorySummary: FinancialOverviewData["categorySummary"];
}) {
  const data = buildCategoryChartData(categorySummary).slice(0, 8);

  return (
    <DashboardCard className="h-full">
      <SectionHeader title="Category Distribution" subtitle="Sorted by total transaction value" />
      {data.length === 0 ? (
        <EmptyChart message="No category data yet." />
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(280, data.length * 36)}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fill: "#707070", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={100}
              tick={{ fill: "#707070", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => formatMoney(Number(value ?? 0))}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #E8E8E8",
                fontSize: "13px",
              }}
            />
            <Bar dataKey="total" fill={DASHBOARD_COLORS.contacts.chart} radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </DashboardCard>
  );
}

export function MonthlyTransactionsChart({ data }: { data: MonthlyTrendPoint[] }) {
  return (
    <DashboardCard>
      <SectionHeader title="Monthly Transactions" subtitle="Transaction volume by month" />
      {data.length === 0 ? (
        <EmptyChart message="No transaction data available." />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#707070", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#707070", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid #E8E8E8",
                fontSize: "13px",
              }}
            />
            <Bar
              dataKey="transactions"
              name="Transactions"
              fill={DASHBOARD_COLORS.projects.chart}
              radius={[4, 4, 0, 0]}
              barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </DashboardCard>
  );
}

export function ChartsSection({
  recentActivity,
  paymentModeSummary,
  categorySummary,
}: {
  recentActivity: FinancialOverviewData["recentActivity"];
  paymentModeSummary: FinancialOverviewData["paymentModeSummary"];
  categorySummary: FinancialOverviewData["categorySummary"];
}) {
  const monthlyData = buildMonthlyTrend(recentActivity);

  return (
    <div className="space-y-6">
      <RevenueExpenseChart recentActivity={recentActivity} />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PaymentModeChart paymentModeSummary={paymentModeSummary} />
        <CategoryDistributionChart categorySummary={categorySummary} />
      </div>
      <MonthlyTransactionsChart data={monthlyData} />
    </div>
  );
}
