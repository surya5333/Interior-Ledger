"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, Building2 } from "lucide-react";

import { useClients, useCreateClient, useUpdateClient, useDeleteClient, Client } from "../../hooks/use-clients";
import { PageHeader } from "../../components/page-header";
import { SearchBar } from "../../components/search-bar";
import { EmptyState } from "../../components/empty-state";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageSkeleton } from "../../components/ui/skeleton";
import {
  DataTable,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableEmpty,
} from "../../components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../components/ui/dropdown-menu";

const clientSchema = z.object({
  name: z.string().min(1, "Client name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
});
type ClientFormData = z.infer<typeof clientSchema>;

export default function ClientsPage() {
  const { data: clients = [], isLoading } = useClients();
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const deleteMutation = useDeleteClient();

  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: "", phone: "", email: "" },
  });

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(query.toLowerCase())) ||
    (c.phone && c.phone.includes(query))
  );

  const openNewModal = () => {
    setEditingId(null);
    reset({ name: "", phone: "", email: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (c: Client) => {
    setEditingId(c.id);
    reset({ name: c.name, phone: c.phone || "", email: c.email || "" });
    setIsModalOpen(true);
  };

  const onSubmit = (data: ClientFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data }, {
        onSuccess: () => {
          setIsModalOpen(false);
          toast.success("Client updated successfully.");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to update client.");
        }
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setIsModalOpen(false);
          toast.success("Client created successfully.");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to create client.");
        }
      });
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-8 fade-in">
      <PageHeader
        breadcrumbItems={[{ label: "Directory" }, { label: "Clients" }]}
        title="Clients"
        subtitle="Manage your clients and customers."
      >
        <Button onClick={openNewModal}>
          <Plus className="size-5 mr-1.5" />
          Add Client
        </Button>
      </PageHeader>

      {clients.length === 0 && !query ? (
        <EmptyState
          icon={<Building2 className="size-6 text-muted" />}
          title="No Clients Yet"
          description="Add your first client to start creating projects for them."
          actionLabel="Add Client"
          onAction={openNewModal}
        />
      ) : (
        <div className="space-y-4">
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            placeholder="Search clients by name, email, or phone..."
          />

          <DataTable>
            <DataTableHeader>
              <DataTableHeaderRow>
                <DataTableHead>Name</DataTableHead>
                <DataTableHead>Phone</DataTableHead>
                <DataTableHead>Email</DataTableHead>
                <DataTableHead>Added On</DataTableHead>
                <DataTableHead align="right">Actions</DataTableHead>
              </DataTableHeaderRow>
            </DataTableHeader>
            <DataTableBody>
              {filteredClients.length === 0 ? (
                <DataTableEmpty colSpan={5}>No clients found matching your search.</DataTableEmpty>
              ) : (
                filteredClients.map((c) => (
                  <DataTableRow key={c.id}>
                    <DataTableCell>
                      <Link href={`/clients/${c.id}`} className="font-medium text-text hover:text-primary transition-colors">
                        {c.name}
                      </Link>
                    </DataTableCell>
                    <DataTableCell className="text-muted">{c.phone || "—"}</DataTableCell>
                    <DataTableCell className="text-muted">{c.email || "—"}</DataTableCell>
                    <DataTableCell className="text-muted">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </DataTableCell>
                    <DataTableCell align="right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="secondary" size="sm">
                           <Link href={`/clients/${c.id}`}>View</Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(c)}>
                              <Pencil className="size-4 mr-2 text-muted" />
                              Edit Client
                            </DropdownMenuItem>
                            <DropdownMenuItem destructive onClick={() => setDeleteId(c.id)}>
                              <Trash2 className="size-4 mr-2" />
                              Delete Client
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Client" : "New Client"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...register("name")} placeholder="e.g. Acme Corp" autoFocus error={!!errors.name} />
              {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input id="phone" type="tel" {...register("phone")} placeholder="+91..." error={!!errors.phone} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address (Optional)</Label>
              <Input id="email" type="email" {...register("email")} placeholder="client@example.com" error={!!errors.email} />
              {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "Save Changes" : "Save Client"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Client"
        description="Are you sure you want to delete this client? They can only be deleted if they have no active projects."
        confirmLabel="Delete Client"
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => {
                setDeleteId(null);
                toast.success("Client deleted successfully.");
              },
              onError: (err: any) => {
                toast.error(err.message || "Failed to delete. Ensure they have no projects.");
                setDeleteId(null);
              }
            });
          }
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
