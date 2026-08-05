"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { useProjects, useCreateProject, useUpdateProject, useDeleteProject, Project } from "../../hooks/use-projects";
import { useClients } from "../../hooks/use-clients";
import { useUser } from "../../hooks/use-user";
import { PageHeader } from "../../components/page-header";
import { SearchBar } from "../../components/search-bar";
import { EmptyState } from "../../components/empty-state";
import { MoneyText } from "../../components/money-text";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { ClientCombobox } from "../../components/ui/client-combobox";
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

const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  clientName: z.string().min(1, "Client is required"),
  location: z.string().optional(),
  budget: z.coerce.number().min(0, "Budget must be a positive number"),
  visibility: z.enum(["SHARED", "PRIVATE"]).optional(),
});
type ProjectFormData = z.infer<typeof projectSchema>;

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: clients = [] } = useClients();
  const { data: user } = useUser();
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  const [query, setQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, watch, setValue, formState: { errors } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema) as any,
    defaultValues: { name: "", clientName: "", location:"", budget: 0, visibility: "SHARED" },
  });

  const visibilityValue = watch("visibility");

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.client?.name.toLowerCase().includes(query.toLowerCase()) ||
    p.location?.toLowerCase().includes(query.toLowerCase())
  );

  const openNewModal = () => {
    setEditingId(null);
    reset({ name: "", clientName: "", location:"", budget: 0, visibility: "SHARED" });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Project & { visibility?: string }) => {
    setEditingId(p.id);
    reset({ name: p.name, clientName: p.client?.name || "", location:p.location || "", budget: Number(p.budget), visibility: (p.visibility as any) || "SHARED" });
    setIsModalOpen(true);
  };

  const onSubmit = (data: ProjectFormData) => {
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: data.name,
        clientName: data.clientName.trim(),
        location: data.location?.trim(),
        budget: data.budget,
        visibility: data.visibility as any,
      }, {
        onSuccess: () => {
          setIsModalOpen(false);
          toast.success("Project updated successfully.");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to update project.");
        }
      });
    } else {
      createMutation.mutate({ name: data.name, clientName: data.clientName.trim(), location: data.location?.trim(), budget: data.budget, visibility: data.visibility as any }, {
        onSuccess: () => {
          setIsModalOpen(false);
          toast.success("Project created successfully.");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to create project.");
        }
      });
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-8 fade-in">
      <PageHeader
        breadcrumbItems={[{ label: "Directory" }, { label: "Projects" }]}
        title="Projects"
        subtitle="Manage your projects and view their ledgers."
      >
        <Button onClick={openNewModal}>
          <Plus className="size-5 mr-1.5" />
          New Project
        </Button>
      </PageHeader>

      {projects.length === 0 && !query ? (
        <EmptyState
          title="No Projects Yet"
          description="Create your first project to begin tracking finances."
          actionLabel="Create Project"
          onAction={openNewModal}
        />
      ) : (
        <div className="space-y-4">
          <SearchBar
            query={query}
            onQueryChange={setQuery}
            placeholder="Search projects or clients..."
          />

          <DataTable>
            <DataTableHeader>
              <DataTableHeaderRow>
                <DataTableHead>Project Name</DataTableHead>
                <DataTableHead>Client</DataTableHead>
                <DataTableHead>Location</DataTableHead>
                <DataTableHead align="right">Budget</DataTableHead>
                <DataTableHead>Created</DataTableHead>
                <DataTableHead align="right">Actions</DataTableHead>
              </DataTableHeaderRow>
            </DataTableHeader>
            <DataTableBody>
              {filteredProjects.length === 0 ? (
                <DataTableEmpty colSpan={6}>No projects found matching your search.</DataTableEmpty>
              ) : (
                filteredProjects.map((p) => (
                  <DataTableRow key={p.id}>
                    <DataTableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/projects/${p.id}`} className="font-medium text-text hover:text-primary transition-colors">
                          {p.name}
                        </Link>
                        {(p as any).visibility === "PRIVATE" && (
                          <span className="inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-medium text-danger">
                            Private
                          </span>
                        )}
                      </div>
                    </DataTableCell>
                    <DataTableCell className="text-muted">{p.client?.name || "—"}</DataTableCell>
                    <DataTableCell className="text-muted">{p.location || "—"}</DataTableCell>
                    <DataTableCell align="right">
                      <MoneyText amount={p.budget} />
                    </DataTableCell>
                    <DataTableCell className="text-muted">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </DataTableCell>
                    <DataTableCell align="right">
                      <div className="flex items-center justify-end gap-2">
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/projects/${p.id}`}>Open</Link>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditModal(p)}>
                              <Pencil className="size-4 mr-2 text-muted" />
                              Edit Project
                            </DropdownMenuItem>
                            {user?.role === "ADMIN" && (
                              <DropdownMenuItem destructive onClick={() => setDeleteId(p.id)}>
                                <Trash2 className="size-4 mr-2" />
                                Delete Project
                              </DropdownMenuItem>
                            )}
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
            <DialogTitle>{editingId ? "Edit Project" : "New Project"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input id="name" {...register("name")} placeholder="e.g. Palm Grove Apartment" autoFocus error={!!errors.name} />
              {errors.name && <p className="text-xs text-danger">{errors.name.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>Client</Label>
              <Controller
                name="clientName"
                control={control}
                render={({ field }) => (
                  <ClientCombobox
                    clients={clients.map((c) => ({ id: c.id, name: c.name }))}
                    value={field.value}
                    onChange={field.onChange}
                    error={!!errors.clientName}
                  />
                )}
              />
              {errors.clientName && <p className="text-xs text-danger">{errors.clientName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>

              <Input
                id="location"
                {...register("location")}
                placeholder="e.g. MVP Colony, Visakhapatnam"
              />
            </div>    

            <div className="space-y-2">
              <Label htmlFor="budget">Budget (₹)</Label>
              <Input id="budget" type="number" step="0.01" {...register("budget")} placeholder="0.00" error={!!errors.budget} />
              {errors.budget && <p className="text-xs text-danger">{errors.budget.message}</p>}
            </div>

            {user?.role === "ADMIN" && (
              <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
                <div className="space-y-0.5">
                  <Label>Project Visibility</Label>
                  <p className="text-xs text-muted">
                    {visibilityValue === "PRIVATE" ? "Private (Admin Only)" : "Shared (Manager can access)"}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={visibilityValue === "PRIVATE"}
                    onChange={(e) => setValue("visibility", e.target.checked ? "PRIVATE" : "SHARED", { shouldValidate: true })}
                  />
                  <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "Save Changes" : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Project"
        description="Are you sure you want to delete this project? This will permanently delete the project and all its associated transactions."
        confirmLabel="Delete Project"
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => {
                setDeleteId(null);
                toast.success("Project deleted successfully.");
              },
              onError: (err: any) => {
                toast.error(err.message || "Failed to delete project.");
              }
            });
          }
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
