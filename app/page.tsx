"use client";

import Link from "next/link";
import { PageHeader } from "../components/page-header";
import { SummaryStrip } from "../components/summary-strip";
import { DataTable, DataTableHeader, DataTableHeaderRow, DataTableHead, DataTableBody, DataTableRow, DataTableCell, DataTableEmpty } from "../components/ui/data-table";
import { MoneyText, formatMoney } from "../components/money-text";
import { Button } from "../components/ui/button";
import { Plus, Users, FolderKanban, ReceiptText } from "lucide-react";
import { useOverview } from "../hooks/use-overview";
import { useSettings } from "../hooks/use-settings";
import { PageSkeleton } from "../components/ui/skeleton";

export default function OverviewPage() {
  const { data, isLoading } = useOverview();
  const { data: settings } = useSettings();
  const companyName = settings?.companyName || "Ledger";

  if (isLoading) {
    return <PageSkeleton />;
  }

  const { counts, recentProjects } = data || { counts: { clients: 0, projects: 0, todaysEvents: 0, contacts: 0, transactions: 0 }, recentProjects: [] };

  const summaryItems = [];
  
  // Only show Today's Events if it's > 0, which also conveniently hides it for Managers (as their count is 0)
  // unless they happen to have no events, but it's a fair compromise without fetching user role here.
  if (counts.todaysEvents > 0) {
    summaryItems.push({ label: "Today's Events", value: counts.todaysEvents.toString() });
  }
  
  summaryItems.push({ label: "Active Projects", value: counts.projects.toString() });
  summaryItems.push({ label: "Total Clients", value: counts.clients.toString() });
  summaryItems.push({ label: "Transactions", value: counts.transactions.toString() });


  return (
    <div className="space-y-10 fade-in">
      <PageHeader
        title="Overview"
        subtitle={`Welcome to ${companyName}. Your project finances at a glance.`}
      />

      <SummaryStrip items={summaryItems} />

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Button asChild variant="secondary" className="bg-white">
            <Link href="/clients">
              <Plus className="size-4 text-muted mr-1" />
              New Client
            </Link>
          </Button>
          <Button asChild variant="secondary" className="bg-white">
            <Link href="/projects">
              <Plus className="size-4 text-muted mr-1" />
              New Project
            </Link>
          </Button>
          <Button asChild variant="secondary" className="bg-white">
            <Link href="/projects">
              <Plus className="size-4 text-muted mr-1" />
              Add Transaction
            </Link>
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold text-text">Recent Projects</h2>
            <p className="text-sm text-muted mt-1">{recentProjects.length} most recent</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/projects">View All</Link>
          </Button>
        </div>

        <DataTable>
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead>Project Name</DataTableHead>
              <DataTableHead>Client</DataTableHead>
              <DataTableHead align="right">Budget</DataTableHead>
              <DataTableHead>Created</DataTableHead>
              <DataTableHead align="right">Actions</DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {recentProjects.length === 0 ? (
              <DataTableEmpty colSpan={5}>
                No projects yet. <Link href="/clients" className="text-primary hover:underline">Create a client</Link> first, then add a project.
              </DataTableEmpty>
            ) : (
              recentProjects.map((p) => (
                <DataTableRow key={p.id}>
                  <DataTableCell>
                    <Link href={`/projects/${p.id}`} className="font-medium text-text hover:text-primary transition-colors">
                      {p.name}
                    </Link>
                  </DataTableCell>
                  <DataTableCell className="text-muted">{p.client?.name || "—"}</DataTableCell>
                  <DataTableCell align="right">
                    <MoneyText amount={p.budget} />
                  </DataTableCell>
                  <DataTableCell className="text-muted">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </DataTableCell>
                  <DataTableCell align="right">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/projects/${p.id}`}>Open</Link>
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </section>
    </div>
  );
}
