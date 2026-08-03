"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, Users as UsersIcon } from "lucide-react";

import { useContacts, useCreateContact, useUpdateContact, useDeleteContact, Contact } from "../../hooks/use-contacts";
import { CategoryBadge } from "../../components/category-badge";
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

const contactSchema = z.object({
  name: z.string().min(1, "Contact name is required"),
  category: z.string().min(1, "Category is required"),
  phone: z.string().optional(),
});
type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactsPage() {
  const { data: contacts = [], isLoading } = useContacts();
  const createMutation = useCreateContact();
  const updateMutation = useUpdateContact();
  const deleteMutation = useDeleteContact();
  const categorySuggestions = Array.from(new Set(contacts.map((contact) => contact.category.trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: "", category: "", phone: "" },
  });

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase()) ||
    (c.phone && c.phone.includes(query))
  );

  const openNewModal = () => {
    setEditingId(null);
    reset({ name: "", category: "", phone: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (c: Contact) => {
    setEditingId(c.id);
    reset({ name: c.name, category: c.category, phone: c.phone || "" });
    setIsModalOpen(true);
  };

  const onSubmit = (data: ContactFormData) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data }, {
        onSuccess: () => {
          setIsModalOpen(false);
          toast.success("Contact updated successfully.");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to update contact.");
        }
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setIsModalOpen(false);
          toast.success("Contact created successfully.");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to create contact.");
        }
      });
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-8 fade-in">
      <PageHeader
        breadcrumbItems={[{ label: "Directory" }, { label: "Contacts" }]}
        title="Contacts"
        subtitle="Manage vendors, contractors, and project contacts."
      >
        <Button onClick={openNewModal}>
          <Plus className="size-5 mr-1.5" />
          Add Contact
        </Button>
      </PageHeader>

      {contacts.length === 0 && !query ? (
        <EmptyState
          icon={<UsersIcon className="size-6 text-muted" />}
          title="No Contacts Yet"
          description="Add contacts like vendors or laborers to track payments against them."
          actionLabel="Add Contact"
          onAction={openNewModal}
        />
      ) : (
        <div className="space-y-4">
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            placeholder="Search contacts by name, category, or phone..."
          />

          <DataTable>
            <DataTableHeader>
              <DataTableHeaderRow>
                <DataTableHead>Name</DataTableHead>
                <DataTableHead>Category</DataTableHead>
                <DataTableHead>Phone</DataTableHead>
                <DataTableHead align="right">Actions</DataTableHead>
              </DataTableHeaderRow>
            </DataTableHeader>
            <DataTableBody>
              {filteredContacts.length === 0 ? (
                <DataTableEmpty colSpan={4}>No contacts found matching your search.</DataTableEmpty>
              ) : (
                filteredContacts.map((c) => (
                  <DataTableRow key={c.id}>
                    <DataTableCell>
                      <Link href={`/contacts/${c.id}`} className="font-medium text-text hover:text-primary transition-colors">
                        {c.name}
                      </Link>
                    </DataTableCell>
                    <DataTableCell>
                      <CategoryBadge category={c.category} />
                    </DataTableCell>
                    <DataTableCell className="text-muted">{c.phone || "—"}</DataTableCell>
                    <DataTableCell align="right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="secondary" size="sm">
                           <Link href={`/contacts/${c.id}`}>History</Link>
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
                              Edit Contact
                            </DropdownMenuItem>
                            <DropdownMenuItem destructive onClick={() => setDeleteId(c.id)}>
                              <Trash2 className="size-4 mr-2" />
                              Delete Contact
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
            <DialogTitle>{editingId ? "Edit Contact" : "New Contact"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...register("name")} placeholder="e.g. Ramesh Singh" autoFocus error={!!errors.name} />
              {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input id="category" list="categories-list" {...register("category")} placeholder="e.g. worker" error={!!errors.category} />
              <datalist id="categories-list">
                {categorySuggestions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
              {errors.category && <p className="text-xs text-danger">{errors.category.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input id="phone" type="tel" {...register("phone")} placeholder="+91..." error={!!errors.phone} />
            </div>

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "Save Changes" : "Save Contact"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Contact"
        description="Are you sure you want to delete this contact? They can only be deleted if they have no existing transactions."
        confirmLabel="Delete Contact"
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => {
                setDeleteId(null);
                toast.success("Contact deleted successfully.");
              },
              onError: (err: any) => {
                toast.error(err.message || "Failed to delete. Ensure they have no transactions.");
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
