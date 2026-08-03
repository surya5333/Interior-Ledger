"use client";

import { use } from "react";
import Link from "next/link";
import { FolderKanban } from "lucide-react";

import { useClient } from "../../../hooks/use-clients";
import { PageHeader } from "../../../components/page-header";
import { SummaryStrip } from "../../../components/summary-strip";
import { EmptyState } from "../../../components/empty-state";
import { CategoryBadge } from "../../../components/category-badge";
import { PaymentModeBadge } from "../../../components/payment-mode-badge";
import { Button } from "../../../components/ui/button";
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
  DataTableEmpty,
} from "../../../components/ui/data-table";

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useClient(id);

  if (isLoading) return <PageSkeleton />;
  if (!data) return <div className="text-muted">Client not found.</div>;

  const { client, projects, payments, totals } = data;

  return (
    <div className="space-y-8 fade-in">
      <PageHeader
        breadcrumbItems={[{ label: "Clients", href: "/clients" }, { label: client.name }]}
        title={client.name}
        subtitle={[client.phone, client.email].filter(Boolean).join(" · ") || "No contact info provided"}
      />

      <SummaryStrip
        items={[
          { label: "Total Received", value: formatMoney(totals.totalReceived), color: "credit" },
          { label: "Client Payments", value: totals.paymentCount.toString() },
          { label: "Projects", value: projects.length.toString() },
        ]}
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-text">Client Ledger</h2>
          <p className="text-sm text-muted mt-1">Payments received from this client across all projects</p>
        </div>

        <DataTable>
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead>Date</DataTableHead>
              <DataTableHead>Project</DataTableHead>
              <DataTableHead>Category</DataTableHead>
              <DataTableHead>Payment</DataTableHead>
              <DataTableHead>Description</DataTableHead>
              <DataTableHead align="right">Amount</DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {payments.length === 0 ? (
              <DataTableEmpty colSpan={6}>
                No client payments recorded yet. Record a payment from a project ledger.
              </DataTableEmpty>
            ) : (
              payments.map((payment) => (
                <DataTableRow key={payment.id}>
                  <DataTableCell className="text-muted">
                    {new Date(payment.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </DataTableCell>
                  <DataTableCell>
                    <Link
                      href={`/projects/${payment.project.id}`}
                      className="font-medium text-text hover:text-primary transition-colors"
                    >
                      {payment.project.name}
                    </Link>
                  </DataTableCell>
                  <DataTableCell>
                    <CategoryBadge category={payment.category} />
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-col items-start gap-1">
                      <PaymentModeBadge paymentMode={payment.paymentMode} />
                      {payment.paymentMode === "UPI" && payment.paymentProofUrl ? (
                        <a
                          href={payment.paymentProofUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          View proof
                        </a>
                      ) : null}
                    </div>
                  </DataTableCell>
                  <DataTableCell className="text-muted text-sm">
                    {payment.description || "—"}
                  </DataTableCell>
                  <DataTableCell align="right">
                    <MoneyText amount={payment.credit} color="credit" />
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-text">Projects</h2>
          <p className="text-sm text-muted mt-1">{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon={<FolderKanban className="size-6 text-muted" />}
            title="No Projects Found"
            description="This client has no active projects."
            actionLabel="Create Project"
            onAction={() => { window.location.href = "/projects"; }}
          />
        ) : (
          <DataTable>
            <DataTableHeader>
              <DataTableHeaderRow>
                <DataTableHead>Project Name</DataTableHead>
                <DataTableHead align="right">Budget</DataTableHead>
                <DataTableHead>Created At</DataTableHead>
                <DataTableHead align="right">Actions</DataTableHead>
              </DataTableHeaderRow>
            </DataTableHeader>
            <DataTableBody>
              {projects.map((project) => (
                <DataTableRow key={project.id}>
                  <DataTableCell>
                    <Link href={`/projects/${project.id}`} className="font-medium text-text hover:text-primary transition-colors">
                      {project.name}
                    </Link>
                  </DataTableCell>
                  <DataTableCell align="right">
                    <MoneyText amount={project.budget} />
                  </DataTableCell>
                  <DataTableCell className="text-muted">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </DataTableCell>
                  <DataTableCell align="right">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/projects/${project.id}`}>View Ledger</Link>
                    </Button>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </section>
    </div>
  );
}
