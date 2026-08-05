"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Pencil, Trash2, Users, UserCheck, UserX, Banknote } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";
import { StaffDialog, type Staff } from "./components/staff-dialog";
import { cn } from "../../lib/cn";

// Simple UI Card Component
function StatCard({ title, value, icon: Icon, valueClass = "" }: { title: string; value: string | number; icon: any; valueClass?: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5 shadow-sm flex items-center gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
        <Icon className="size-6" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-medium text-muted">{title}</p>
        <p className={`text-2xl font-bold ${valueClass || "text-text"}`}>{value}</p>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | undefined>(undefined);

  const { data: staffList = [], isLoading } = useQuery<Staff[]>({
    queryKey: ["staff"],
    queryFn: async () => {
      const res = await fetch("/api/staff");
      if (!res.ok) throw new Error("Failed to fetch staff");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (staffData: Partial<Staff>) => {
      const isEditing = !!editingStaff;
      const url = isEditing ? `/api/staff/${editingStaff.id}` : "/api/staff";
      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffData),
      });
      if (!res.ok) throw new Error("Failed to save staff");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success(editingStaff ? "Staff updated successfully" : "Staff added successfully");
    },
    onError: () => toast.error("An error occurred while saving"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete staff");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Staff deleted successfully");
    },
    onError: () => toast.error("An error occurred while deleting"),
  });

  const filteredStaff = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return staffList.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (s.designation && s.designation.toLowerCase().includes(q))
    );
  }, [staffList, searchQuery]);

  const activeStaff = staffList.filter((s) => s.status === "ACTIVE").length;
  const inactiveStaff = staffList.length - activeStaff;
  const totalCommitment = staffList
    .filter((s) => s.status === "ACTIVE")
    .reduce((sum, s) => sum + Number(s.monthlySalary), 0);

  const handleAdd = () => {
    setEditingStaff(undefined);
    setIsDialogOpen(true);
  };

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this staff member? This cannot be undone.")) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">Staff</h1>
          <p className="text-muted mt-1">Manage your employees.</p>
        </div>
        <Button onClick={handleAdd} className="gap-2 shrink-0">
          <Plus className="size-4" />
          Add Staff
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard title="Total Staff" value={staffList.length} icon={Users} />
        <StatCard title="Active Staff" value={activeStaff} icon={UserCheck} valueClass="text-primary" />
        <StatCard title="Inactive Staff" value={inactiveStaff} icon={UserX} valueClass="text-danger" />
        <StatCard 
          title="Monthly Salary Commitment" 
          value={`₹${totalCommitment.toLocaleString("en-IN")}`} 
          icon={Banknote} 
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
            <Input
              type="text"
              placeholder="Search by Name, Phone, Designation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-text whitespace-nowrap">
            <thead className="bg-background/50 text-muted font-medium border-b border-border">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Designation</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4 text-right">Monthly Salary</th>
                <th className="px-6 py-4">Joining Date</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted">
                    Loading staff...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">
                    No staff found.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-hover/50 transition-colors">
                    <td className="px-6 py-4 font-medium">{staff.name}</td>
                    <td className="px-6 py-4">{staff.designation || "-"}</td>
                    <td className="px-6 py-4">{staff.phone || "-"}</td>
                    <td className="px-6 py-4 text-right">₹{Number(staff.monthlySalary).toLocaleString("en-IN")}</td>
                    <td className="px-6 py-4">{new Date(staff.joiningDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        staff.status === "ACTIVE" 
                          ? "bg-primary-light text-primary" 
                          : "bg-danger-light text-danger"
                      )}>
                        {staff.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(staff)}
                          className="p-1.5 text-muted hover:text-primary rounded-md transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(staff.id)}
                          className="p-1.5 text-muted hover:text-danger rounded-md transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StaffDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        staff={editingStaff}
        onSave={async (data) => saveMutation.mutateAsync(data)}
      />
    </div>
  );
}
