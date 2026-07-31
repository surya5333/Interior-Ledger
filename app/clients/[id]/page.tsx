"use client";

import { use } from "react";
import Link from "next/link";
import { FolderKanban } from "lucide-react";

import { useClient } from "../../../hooks/use-clients";
import { PageHeader } from "../../../components/page-header";
import { EmptyState } from "../../../components/empty-state";
import { Button } from "../../../components/ui/button";
import { MoneyText } from "../../../components/money-text";
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

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: client, isLoading } = useClient(id);

  if (isLoading) return <PageSkeleton />;
  if (!client) return <div className="text-muted">Client not found.</div>;

  return (
    <div className="space-y-8 fade-in">
      <PageHeader
        breadcrumbItems={[{ label: "Clients", href: "/clients" }, { label: client.name }]}
        title={client.name}
        subtitle={[client.phone, client.email].filter(Boolean).join(" · ") || "No contact info provided"}
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-text">Projects</h2>
          <p className="text-sm text-muted mt-1">{client.projects?.length || 0} project{(client.projects?.length !== 1) ? "s" : ""}</p>
        </div>

        {(!client.projects || client.projects.length === 0) ? (
          <EmptyState
            icon={<FolderKanban className="size-6 text-muted" />}
            title="No Projects Found"
            description="This client has no active projects."
            actionLabel="Create Project"
            onAction={() => window.location.href = "/projects"}
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
              {client.projects.map((p) => (
                <DataTableRow key={p.id}>
                  <DataTableCell>
                    <Link href={`/projects/${p.id}`} className="font-medium text-text hover:text-primary transition-colors">
                      {p.name}
                    </Link>
                  </DataTableCell>
                  <DataTableCell align="right">
                    <MoneyText amount={p.budget} />
                  </DataTableCell>
                  <DataTableCell className="text-muted">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </DataTableCell>
                  <DataTableCell align="right">
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/projects/${p.id}`}>View Ledger</Link>
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
