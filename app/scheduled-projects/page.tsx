"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, Play } from "lucide-react";
import { differenceInDays, isSameDay, isSameWeek, isSameMonth, parseISO, startOfDay } from "date-fns";

import { cn } from "../../lib/cn";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject, Project } from "../../hooks/use-projects";
import { useClients } from "../../hooks/use-clients";
import { PageHeader } from "../../components/page-header";
import { SearchBar } from "../../components/search-bar";
import { EmptyState } from "../../components/empty-state";
import { MoneyText } from "../../components/money-text";
import { SummaryStrip } from "../../components/summary-strip";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { ClientCombobox } from "../../components/ui/client-combobox";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { PageSkeleton } from "../../components/ui/skeleton";
import { Badge } from "../../components/ui/badge";
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

const scheduledProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  clientName: z.string().min(1, "Client is required"),
  location: z.string().optional(),
  budget: z.coerce.number().min(0, "Budget must be a positive number"),
  scheduledDate: z.string().min(1, "Scheduled date is required"),
  notes: z.string().optional(),
});
type ScheduledProjectFormData = z.infer<typeof scheduledProjectSchema>;

type FilterOption = "ALL" | "TODAY" | "THIS_WEEK" | "THIS_MONTH";

export default function ScheduledProjectsPage() {
  const { data: projects = [], isLoading } = useProjects({ status: "SCHEDULED" });
  const { data: clients = [] } = useClients();
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterOption>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [startProjectId, setStartProjectId] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<ScheduledProjectFormData>({
    resolver: zodResolver(scheduledProjectSchema) as any,
    defaultValues: { name: "", clientName: "", location: "", budget: 0, scheduledDate: "", notes: "" },
  });

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase()) ||
                           p.client?.name.toLowerCase().includes(query.toLowerCase()) ||
                           p.location?.toLowerCase().includes(query.toLowerCase());
      
      if (!matchesQuery) return false;
      
      if (filter === "ALL") return true;
      if (!p.scheduledDate) return false;
      
      const date = parseISO(p.scheduledDate);
      const today = new Date();
      
      if (filter === "TODAY") return isSameDay(date, today);
      if (filter === "THIS_WEEK") return isSameWeek(date, today);
      if (filter === "THIS_MONTH") return isSameMonth(date, today);
      
      return true;
    });
  }, [projects, query, filter]);

  // Summary counts
  const summaryItems = useMemo(() => {
    let startingThisWeek = 0;
    let startingThisMonth = 0;
    let totalBudget = 0;
    
    const today = new Date();
    
    projects.forEach(p => {
      totalBudget += Number(p.budget);
      if (p.scheduledDate) {
        const date = parseISO(p.scheduledDate);
        if (isSameWeek(date, today)) startingThisWeek++;
        if (isSameMonth(date, today)) startingThisMonth++;
      }
    });

    return [
      { label: "Scheduled Projects", value: projects.length.toString() },
      { label: "Starting This Week", value: startingThisWeek.toString() },
      { label: "Starting This Month", value: startingThisMonth.toString() },
      { label: "Total Budget", value: `₹${totalBudget.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` },
    ];
  }, [projects]);

  const openNewModal = () => {
    setEditingId(null);
    reset({ name: "", clientName: "", location: "", budget: 0, scheduledDate: "", notes: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (p: Project) => {
    setEditingId(p.id);
    reset({ 
      name: p.name, 
      clientName: p.client?.name || "", 
      location: p.location || "", 
      budget: Number(p.budget),
      scheduledDate: p.scheduledDate ? p.scheduledDate.split('T')[0] : "",
      notes: p.notes || ""
    });
    setIsModalOpen(true);
  };

  const onSubmit = (data: ScheduledProjectFormData) => {
    if (editingId) {
      updateMutation.mutate({
        id: editingId,
        name: data.name,
        clientName: data.clientName.trim(),
        location: data.location?.trim(),
        budget: data.budget,
        scheduledDate: data.scheduledDate,
        notes: data.notes,
      }, {
        onSuccess: () => {
          setIsModalOpen(false);
          toast.success("Scheduled project updated.");
        },
        onError: (err: any) => toast.error(err.message || "Failed to update.")
      });
    } else {
      createMutation.mutate({ 
        name: data.name, 
        clientName: data.clientName.trim(), 
        location: data.location?.trim(), 
        budget: data.budget,
        status: "SCHEDULED",
        scheduledDate: data.scheduledDate,
        notes: data.notes,
      }, {
        onSuccess: () => {
          setIsModalOpen(false);
          toast.success("Project scheduled successfully.");
        },
        onError: (err: any) => toast.error(err.message || "Failed to schedule project.")
      });
    }
  };

  const onStartProject = () => {
    if (startProjectId) {
      updateMutation.mutate({
        id: startProjectId,
        status: "ACTIVE"
      }, {
        onSuccess: () => {
          setStartProjectId(null);
          toast.success("Project started successfully.");
        },
        onError: (err: any) => toast.error(err.message || "Failed to start project.")
      });
    }
  };

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-8 fade-in">
      <PageHeader
        breadcrumbItems={[{ label: "Directory" }, { label: "Scheduled Projects" }]}
        title="Scheduled Projects"
        subtitle="Manage upcoming projects before work begins."
      >
        <Button onClick={openNewModal}>
          <Plus className="size-5 mr-1.5" />
          Schedule Project
        </Button>
      </PageHeader>
      
      <SummaryStrip items={summaryItems} />

      {projects.length === 0 && !query && filter === "ALL" ? (
        <EmptyState
          title="No Scheduled Projects"
          description="Schedule your first project to keep track of upcoming work."
          actionLabel="Schedule Project"
          onAction={openNewModal}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
            <SearchBar
              query={query}
              onQueryChange={setQuery}
              placeholder="Search projects or clients..."
            />
            <div className="flex flex-wrap sm:flex-nowrap gap-1.5 p-1 bg-background border border-border rounded-xl shadow-xs w-full sm:w-auto">
              {(["ALL", "TODAY", "THIS_WEEK", "THIS_MONTH"] as const).map(opt => {
                const isSelected = filter === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setFilter(opt)}
                    className={cn(
                      "flex-1 sm:flex-none px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-150 cursor-pointer text-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                      isSelected
                        ? "bg-primary text-white font-semibold shadow-xs hover:bg-primary-hover active:bg-primary-hover"
                        : "bg-white text-muted hover:text-text hover:bg-hover hover:border-border border border-border/60 shadow-2xs active:bg-border/40"
                    )}
                  >
                    {opt === "ALL" ? "All" : opt === "TODAY" ? "Today" : opt === "THIS_WEEK" ? "This Week" : "This Month"}
                  </button>
                );
              })}
            </div>
          </div>

          <DataTable>
            <DataTableHeader>
              <DataTableHeaderRow>
                <DataTableHead>Project Name</DataTableHead>
                <DataTableHead>Client</DataTableHead>
                <DataTableHead>Location</DataTableHead>
                <DataTableHead align="right">Budget</DataTableHead>
                <DataTableHead>Scheduled Date</DataTableHead>
                <DataTableHead>Days Remaining</DataTableHead>
                <DataTableHead>Status</DataTableHead>
                <DataTableHead align="right">Actions</DataTableHead>
              </DataTableHeaderRow>
            </DataTableHeader>
            <DataTableBody>
              {filteredProjects.length === 0 ? (
                <DataTableEmpty colSpan={8}>No scheduled projects found.</DataTableEmpty>
              ) : (
                filteredProjects.map((p) => {
                  let daysRemaining: number | null = null;
                  if (p.scheduledDate) {
                    daysRemaining = differenceInDays(startOfDay(parseISO(p.scheduledDate)), startOfDay(new Date()));
                  }

                  return (
                    <DataTableRow key={p.id}>
                      <DataTableCell>
                        <div className="font-medium text-text">{p.name}</div>
                        {p.notes && <div className="text-xs text-muted truncate max-w-[200px]" title={p.notes}>{p.notes}</div>}
                      </DataTableCell>
                      <DataTableCell className="text-muted">{p.client?.name || "—"}</DataTableCell>
                      <DataTableCell className="text-muted">{p.location || "—"}</DataTableCell>
                      <DataTableCell align="right">
                        <MoneyText amount={p.budget} />
                      </DataTableCell>
                      <DataTableCell className="text-muted">
                        {p.scheduledDate ? new Date(p.scheduledDate).toLocaleDateString() : "—"}
                      </DataTableCell>
                      <DataTableCell>
                        {daysRemaining !== null ? (
                          <span className={daysRemaining < 0 ? "text-danger font-medium" : daysRemaining <= 3 ? "text-warning font-medium" : "text-muted"}>
                            {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days ago` : daysRemaining === 0 ? "Today" : `In ${daysRemaining} days`}
                          </span>
                        ) : "—"}
                      </DataTableCell>
                      <DataTableCell>
                        <Badge variant="default">Scheduled</Badge>
                      </DataTableCell>
                      <DataTableCell align="right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={() => setStartProjectId(p.id)}>
                            <Play className="size-4 mr-1.5" />
                            Start Project
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
                              <DropdownMenuItem destructive onClick={() => setDeleteId(p.id)}>
                                <Trash2 className="size-4 mr-2" />
                                Delete Project
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })
              )}
            </DataTableBody>
          </DataTable>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Scheduled Project" : "Schedule Project"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              <Input id="location" {...register("location")} placeholder="e.g. MVP Colony, Visakhapatnam" />
            </div>    

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget (₹)</Label>
                <Input id="budget" type="number" step="0.01" {...register("budget")} placeholder="0.00" error={!!errors.budget} />
                {errors.budget && <p className="text-xs text-danger">{errors.budget.message}</p>}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scheduledDate">Scheduled Date</Label>
                <div className="relative">
                  <Input id="scheduledDate" type="date" {...register("scheduledDate")} error={!!errors.scheduledDate} />
                  {errors.scheduledDate && <p className="text-xs text-danger">{errors.scheduledDate.message}</p>}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <textarea 
                id="notes" 
                {...register("notes")} 
                placeholder="e.g. Waiting for advance payment..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "Save Changes" : "Schedule Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Start Confirmation */}
      <ConfirmDialog
        open={!!startProjectId}
        onOpenChange={(open) => !open && setStartProjectId(null)}
        title="Start this project?"
        description="This will move the project from Scheduled Projects to your active Projects. You can then start adding transactions."
        confirmLabel="Start Project"
        onConfirm={onStartProject}
        loading={updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Scheduled Project"
        description="Are you sure you want to delete this scheduled project? This action cannot be undone."
        confirmLabel="Delete Project"
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => {
                setDeleteId(null);
                toast.success("Project deleted successfully.");
              },
              onError: (err: any) => toast.error(err.message || "Failed to delete project.")
            });
          }
        }}
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
