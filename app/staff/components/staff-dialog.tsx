"use client";

import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Input, Label } from "../../../components/ui/input";
import { cn } from "../../../lib/cn";
import { X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

export interface Staff {
  id: string;
  name: string;
  phone: string | null;
  designation: string | null;
  monthlySalary: string | number;
  joiningDate: string;
  status: "ACTIVE" | "INACTIVE";
}

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: Staff;
  onSave: (staff: Partial<Staff>) => Promise<void>;
}

export function StaffDialog({ open, onOpenChange, staff, onSave }: StaffDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<Staff>>({
    name: "",
    phone: "",
    designation: "",
    monthlySalary: "",
    joiningDate: new Date().toISOString().slice(0, 10),
    status: "ACTIVE",
  });

  useEffect(() => {
    if (open) {
      if (staff) {
        setFormData({
          ...staff,
          joiningDate: staff.joiningDate ? new Date(staff.joiningDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        });
      } else {
        setFormData({
          name: "",
          phone: "",
          designation: "",
          monthlySalary: "",
          joiningDate: new Date().toISOString().slice(0, 10),
          status: "ACTIVE",
        });
      }
    }
  }, [open, staff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-white p-6 shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-text">
              {staff ? "Edit Staff" : "Add Staff"}
            </Dialog.Title>
            <Dialog.Close className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-secondary data-[state=open]:text-muted cursor-pointer">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 234 567 890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  value={formData.designation || ""}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="Interior Designer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlySalary">Monthly Salary</Label>
                <Input
                  id="monthlySalary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthlySalary || ""}
                  onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="joiningDate">Joining Date</Label>
                <Input
                  id="joiningDate"
                  type="date"
                  value={formData.joiningDate || ""}
                  onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    className="size-4 text-primary focus:ring-primary"
                    checked={formData.status === "ACTIVE"}
                    onChange={() => setFormData({ ...formData, status: "ACTIVE" })}
                  />
                  <span className="text-sm">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    className="size-4 text-primary focus:ring-primary"
                    checked={formData.status === "INACTIVE"}
                    onChange={() => setFormData({ ...formData, status: "INACTIVE" })}
                  />
                  <span className="text-sm">Inactive</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Dialog.Close asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" loading={isSubmitting}>
                {staff ? "Save Changes" : "Add Staff"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
