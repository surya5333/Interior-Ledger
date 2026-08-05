"use client";

import { useState, useMemo } from "react";
import { Download, Users, Banknote, AlertCircle, CheckCircle2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/button";
import { PaymentCell } from "./components/payment-cell";
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

export default function SalaryPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"CURRENT_MONTH" | "ALL_MONTHS">("CURRENT_MONTH");
  const currentActualMonth = new Date().getMonth() + 1;
  const currentActualYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentActualYear);

  const { data: staffList = [], isLoading } = useQuery<any[]>({
    queryKey: ["salary", viewMode, selectedYear],
    queryFn: async () => {
      // Current month for the selected year implies the actual current calendar month.
      // (As requested: "Current Month, Year 2026 -> Shows August 2026")
      const url = viewMode === "CURRENT_MONTH" 
        ? `/api/salary?month=${currentActualMonth}&year=${selectedYear}` 
        : `/api/salary?year=${selectedYear}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch salary data");
      return res.json();
    },
  });

  const totals = useMemo(() => {
    let totalPayable = 0;
    let currentDue = 0;
    let totalPaid = 0;

    staffList.forEach(staff => {
      // In ALL_MONTHS view, a staff member has multiple records (up to 12).
      // We sum all records returned.
      if (staff.salaryRecords && staff.salaryRecords.length > 0) {
        staff.salaryRecords.forEach((record: any) => {
          totalPayable += Number(record.totalPayable || 0);
          totalPaid += Number(record.paidAmount || 0);
          currentDue += Number(record.due || 0);
        });
      }
    });

    return { totalPayable, currentDue, totalPaid };
  }, [staffList]);

  // Generate Year options dynamically (e.g. 2024 to current + 1)
  const years = Array.from({ length: 5 }, (_, i) => currentActualYear - 2 + i);

  const handleUpdate = () => {
    queryClient.invalidateQueries({ queryKey: ["salary"] });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">Salary Dashboard</h1>
          <p className="text-muted mt-1">Manage and track staff salaries automatically.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-white border border-border rounded-md px-1 shadow-sm">
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="h-9 bg-transparent px-3 py-1 text-sm text-text outline-none cursor-pointer border-r border-border"
            >
              <option value="CURRENT_MONTH">Current Month</option>
              <option value="ALL_MONTHS">All Months</option>
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="h-9 bg-transparent px-3 py-1 text-sm text-text outline-none cursor-pointer font-medium"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard title="Total Staff" value={staffList.length} icon={Users} />
        <StatCard title="Total Payable" value={`₹${totals.totalPayable.toLocaleString("en-IN")}`} icon={Banknote} />
        <StatCard title="Current Due" value={`₹${totals.currentDue.toLocaleString("en-IN")}`} icon={AlertCircle} valueClass="text-danger" />
        <StatCard title="Total Paid" value={`₹${totals.totalPaid.toLocaleString("en-IN")}`} icon={CheckCircle2} valueClass="text-primary" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          {viewMode === "CURRENT_MONTH" ? (
            <table className="w-full text-left text-sm text-text whitespace-nowrap">
              <thead className="bg-background/50 text-muted font-medium border-b border-border">
                <tr>
                  <th className="px-6 py-4 w-12">#</th>
                  <th className="px-6 py-4">Staff Name</th>
                  <th className="px-6 py-4 text-right">Monthly Salary</th>
                  <th className="px-6 py-4 text-right">Previous Due</th>
                  <th className="px-6 py-4 text-right font-semibold text-primary">Total Payable</th>
                  <th className="px-6 py-4 min-w-[320px]">Payment Status & Actions</th>
                  <th className="px-6 py-4 text-right">Due</th>
                  <th className="px-6 py-4 text-right font-semibold text-text">Total Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted">
                      Loading salary data...
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-muted">
                      No staff found.
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff, i) => {
                    const record = staff.salaryRecords?.[0];
                    if (!record) return null; // Wait for auto-generation to complete on backend if empty

                    const salary = Number(record.monthlySalary);
                    const prevDue = Number(record.previousDue);
                    const payable = Number(record.totalPayable);
                    const paid = Number(record.paidAmount);
                    const due = Number(record.due);

                    return (
                      <tr key={staff.id} className="hover:bg-hover/50 transition-colors">
                        <td className="px-6 py-4 text-muted">{i + 1}</td>
                        <td className="px-6 py-4 font-medium">{staff.name}</td>
                        <td className="px-6 py-4 text-right">₹{salary.toLocaleString("en-IN")}</td>
                        <td className="px-6 py-4 text-right text-muted">
                          {prevDue > 0 ? `₹${prevDue.toLocaleString("en-IN")}` : "-"}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-primary">
                          ₹{payable.toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4">
                          <PaymentCell 
                            staffId={staff.id}
                            month={currentActualMonth}
                            year={selectedYear}
                            totalPayable={payable} 
                            initialIsPaid={record.isPaid}
                            initialPaymentType={record.paymentType}
                            initialPaidAmount={record.paidAmount}
                            initialPaymentMode={record.paymentMode}
                            onUpdate={handleUpdate}
                          />
                        </td>
                        <td className={cn("px-6 py-4 text-right font-medium", due > 0 ? "text-danger" : "text-muted")}>
                          ₹{due.toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-text">
                          ₹{paid.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm text-text whitespace-nowrap">
              <thead className="bg-background/50 text-muted font-medium border-b border-border">
                <tr>
                  <th className="px-6 py-4 sticky left-0 z-10 bg-background/50 border-r border-border backdrop-blur-sm">Staff Name</th>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <th key={i} className="px-6 py-4 min-w-[280px]">
                      {new Date(selectedYear, i, 1).toLocaleString('default', { month: 'short' })}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-12 text-center text-muted">
                      Loading salary data...
                    </td>
                  </tr>
                ) : staffList.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-12 text-center text-muted">
                      No staff found.
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => (
                    <tr key={staff.id} className="hover:bg-hover/50 transition-colors">
                      <td className="px-6 py-4 font-medium sticky left-0 z-10 bg-white border-r border-border shadow-[4px_0_12px_rgba(0,0,0,0.02)]">
                        {staff.name}
                      </td>
                      {Array.from({ length: 12 }).map((_, i) => {
                        const month = i + 1;
                        const record = staff.salaryRecords?.find((r: any) => r.month === month);
                        
                        return (
                          <td key={month} className="px-6 py-4 border-r border-border/50">
                            {record ? (
                              <PaymentCell 
                                staffId={staff.id}
                                month={month}
                                year={selectedYear}
                                totalPayable={Number(record.totalPayable)}
                                initialIsPaid={record.isPaid}
                                initialPaymentType={record.paymentType}
                                initialPaidAmount={record.paidAmount}
                                initialPaymentMode={record.paymentMode}
                                onUpdate={handleUpdate}
                              />
                            ) : (
                              <span className="text-muted text-xs italic opacity-50">Future Month</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
