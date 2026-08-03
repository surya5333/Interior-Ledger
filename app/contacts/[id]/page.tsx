"use client";

import { use } from "react";
import Link from "next/link";
import { ReceiptText } from "lucide-react";

import { useContact } from "../../../hooks/use-contacts";
import { CategoryBadge } from "../../../components/category-badge";
import { PageHeader } from "../../../components/page-header";
import { SummaryStrip } from "../../../components/summary-strip";
import { EmptyState } from "../../../components/empty-state";
import { MoneyText, formatMoney } from "../../../components/money-text";
import { PageSkeleton } from "../../../components/ui/skeleton";
import {
  DataTable,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from "../../../components/ui/data-table";

export default function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useContact(id);

  if (isLoading) return <PageSkeleton />;
  if (!data || !data.contact) return <div className="text-muted">Contact not found.</div>;

  const { contact, projects, totals } = data;

  return (
    <div className="space-y-10 fade-in">
      <PageHeader
        breadcrumbItems={[{ label: "Contacts", href: "/contacts" }, { label: contact.name }]}
        title={contact.name}
        subtitle={
          <span className="flex items-center gap-2 mt-1">
            <CategoryBadge category={contact.category} />
            {contact.phone && <span className="text-muted">· {contact.phone}</span>}
          </span> as any
        }
      />

      <SummaryStrip
        items={[
          { label: "Total Credit", value: formatMoney(totals.credit), color: "credit" },
          { label: "Total Debit", value: formatMoney(totals.debit), color: "debit" },
          { label: "Net Balance", value: formatMoney(totals.balance), color: "balance" },
        ]}
      />

      <section className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-text">Cross-Project History</h2>
          <p className="text-sm text-muted mt-1">
            {totals.transactionCount} transaction{totals.transactionCount !== 1 ? "s" : ""} across {totals.projectCount} project{totals.projectCount !== 1 ? "s" : ""}
          </p>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={<ReceiptText className="size-6 text-muted" />}
            title="No History"
            description="No transactions found for this contact across any projects."
          />
        ) : (
          <div className="space-y-10">
            {projects.map((group) => (
              <div key={group.project.id} className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div>
                    <Link href={`/projects/${group.project.id}`} className="font-semibold text-lg text-text hover:text-primary transition-colors">
                      {group.project.name}
                    </Link>
                    {group.project.client && (
                      <span className="text-muted ml-3 text-sm">{group.project.client.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-credit font-[tabular-nums]">{formatMoney(group.totalCredit)}</span>
                    <span className="text-border">|</span>
                    <span className="text-debit font-[tabular-nums]">{formatMoney(group.totalDebit)}</span>
                  </div>
                </div>

                <DataTable>
                  <DataTableHeader>
                    <DataTableHeaderRow>
                      <DataTableHead>Date</DataTableHead>
                      <DataTableHead>Category</DataTableHead>
                      <DataTableHead>Description</DataTableHead>
                      <DataTableHead align="right">Credit</DataTableHead>
                      <DataTableHead align="right">Debit</DataTableHead>
                    </DataTableHeaderRow>
                  </DataTableHeader>
                  <DataTableBody>
                    {group.transactions.map((t) => (
                      <DataTableRow key={t.id}>
                        <DataTableCell className="text-muted text-sm">
                          {new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </DataTableCell>
                        <DataTableCell>
                          <CategoryBadge category={t.category} />
                        </DataTableCell>
                        <DataTableCell className="text-muted text-sm">{t.description || "—"}</DataTableCell>
                        <DataTableCell align="right">
                          <MoneyText amount={t.credit} color="credit" showDash />
                        </DataTableCell>
                        <DataTableCell align="right">
                          <MoneyText amount={t.debit} color="debit" showDash />
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
