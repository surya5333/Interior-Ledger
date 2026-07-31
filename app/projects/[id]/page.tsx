"use client";

import { use, useCallback, useMemo, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Download, Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { useLedger, useCreateTransaction, useUpdateTransaction, useDeleteTransaction, LedgerTransaction } from "../../../hooks/use-ledger";
import { useContacts } from "../../../hooks/use-contacts";
import { useSettings } from "../../../hooks/use-settings";
import { PageHeader } from "../../../components/page-header";
import { SummaryStrip } from "../../../components/summary-strip";
import { SearchBar } from "../../../components/search-bar";
import { MoneyText, formatMoney } from "../../../components/money-text";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input, Label } from "../../../components/ui/input";
import { NativeSelect } from "../../../components/ui/select";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { PageSkeleton } from "../../../components/ui/skeleton";
import { cn } from "../../../lib/cn";
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../../../components/ui/dropdown-menu";

const transactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  contactName: z.string().min(1, "Contact is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  type: z.enum(["debit", "credit"]),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
});
type TransactionFormData = z.infer<typeof transactionSchema>;

export default function ProjectLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: ledger, isLoading } = useLedger(id);
  const { data: contacts = [] } = useContacts();
  const { data: settings } = useSettings();
  const createMutation = useCreateTransaction(id);
  const updateMutation = useUpdateTransaction(id);
  const deleteMutation = useDeleteTransaction(id);

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form for the sticky bottom bar
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      contactName: "",
      category: "",
      description: "",
      type: "debit",
      amount: 0,
    },
  });
  
  const entryType = watch("type");

  const visibleTransactions = useMemo(() => {
    if (!ledger) return [];
    let result = ledger.transactions;
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (x) =>
          x.contact.name.toLowerCase().includes(q) ||
          x.category.toLowerCase().includes(q) ||
          (x.description && x.description.toLowerCase().includes(q))
      );
    }
    if (categoryFilter) {
      result = result.filter((x) => x.category === categoryFilter);
    }
    return result;
  }, [ledger, query, categoryFilter]);

  const uniqueCategories = useMemo(() => {
    if (!ledger) return [];
    return Array.from(new Set(ledger.transactions.map((x) => x.category)));
  }, [ledger]);

  const onSubmit = (data: TransactionFormData) => {
    const payload = {
      date: data.date,
      contactName: data.contactName,
      contactCategory: "Vendor",
      category: data.category,
      description: data.description,
      credit: data.type === "credit" ? data.amount : 0,
      debit: data.type === "debit" ? data.amount : 0,
    };

    if (editingId) {
      updateMutation.mutate({ transactionId: editingId, ...payload }, {
        onSuccess: () => {
          setEditingId(null);
          reset({ date: new Date().toISOString().slice(0, 10), contactName: "", category: "", description: "", type: "debit", amount: 0 });
          toast.success("Transaction updated successfully.");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to update transaction.");
        }
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          reset({ date: new Date().toISOString().slice(0, 10), contactName: "", category: "", description: "", type: "debit", amount: 0 });
          toast.success("Transaction added successfully.");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to add transaction.");
        }
      });
    }
  };

  const handleEdit = (t: LedgerTransaction) => {
    setEditingId(t.id);
    const isCredit = Number(t.credit) > 0;
    reset({
      date: new Date(t.date).toISOString().slice(0, 10),
      contactName: t.contact.name,
      category: t.category,
      description: t.description || "",
      type: isCredit ? "credit" : "debit",
      amount: isCredit ? Number(t.credit) : Number(t.debit),
    });
    // Scroll to bottom
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };
  
  const cancelEdit = () => {
      setEditingId(null);
      reset({ date: new Date().toISOString().slice(0, 10), contactName: "", category: "", description: "", type: "debit", amount: 0 });
  }

  const exportPDF = useCallback(async () => {
    if (!ledger) return;
    try {
      const [{ pdf }, { LedgerPDF }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("../../../components/ledger-pdf"),
      ]);
      const companyName = settings?.companyName || "Ledger";
      const logoUrl = settings?.logoUrl;
      const signatureUrl = settings?.signatureUrl;

      const rawBlob = await pdf(<LedgerPDF ledger={ledger} companyName={companyName} logoUrl={logoUrl} signatureUrl={signatureUrl} />).toBlob();
      const blob = new Blob([rawBlob], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ledger.project.name.replace(/\s+/g, "_")}_Ledger.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("PDF generation failed", err);
      toast.error(`Failed to generate PDF: ${err.message || err}`);
    }
  }, [ledger, settings]);

  if (isLoading) return <PageSkeleton />;
  if (!ledger) return <div className="text-muted">Project not found</div>;

  return (
    <div className="space-y-8 fade-in pb-48">
      <PageHeader
        breadcrumbItems={[{ label: "Projects", href: "/projects" }, { label: ledger.project.name }]}
        title={ledger.project.name}
        subtitle={`${ledger.client.name} · Budget ₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(ledger.project.budget))}`}
      >
        <Button variant="secondary" onClick={exportPDF}>
          <Download className="size-4 mr-2" />
          Export PDF
        </Button>
        {/* We don't need an Add Entry button at the top if the sticky bar is always visible, but keeping it for quick scroll down */}
        <Button onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}>
          <Plus className="size-5 mr-1.5" />
          Add Entry
        </Button>
      </PageHeader>

      <SummaryStrip
        items={[
          { label: "Total Credit", value: `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(ledger.totals.credit))}`, color: "credit" },
          { label: "Total Debit", value: `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(ledger.totals.debit))}`, color: "debit" },
          { label: "Balance", value: `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(ledger.totals.balance))}`, color: "balance" },
        ]}
      />

      <div className="space-y-4">
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          placeholder="Search transactions..."
          filters={[
            {
              value: categoryFilter,
              onChange: setCategoryFilter,
              options: uniqueCategories.map((c) => ({ value: c, label: c })),
              placeholder: "All Categories",
            },
          ]}
        />

        <DataTable>
          <DataTableHeader>
            <DataTableHeaderRow>
              <DataTableHead>Date</DataTableHead>
              <DataTableHead>Contact</DataTableHead>
              <DataTableHead>Category</DataTableHead>
              <DataTableHead>Description</DataTableHead>
              <DataTableHead align="right">Credit</DataTableHead>
              <DataTableHead align="right">Debit</DataTableHead>
              <DataTableHead align="right">Balance</DataTableHead>
              <DataTableHead align="right"></DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {visibleTransactions.length === 0 ? (
              <DataTableEmpty colSpan={8}>No transactions found.</DataTableEmpty>
            ) : (
              visibleTransactions.map((t) => (
                <DataTableRow key={t.id}>
                  <DataTableCell className="text-muted">
                    {new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </DataTableCell>
                  <DataTableCell className="font-medium">{t.contact.name}</DataTableCell>
                  <DataTableCell>
                    <Badge variant="muted">{t.category}</Badge>
                  </DataTableCell>
                  <DataTableCell className="text-muted text-sm">{t.description || "—"}</DataTableCell>
                  <DataTableCell align="right">
                    <MoneyText amount={t.credit} color="credit" showDash />
                  </DataTableCell>
                  <DataTableCell align="right">
                    <MoneyText amount={t.debit} color="debit" showDash />
                  </DataTableCell>
                  <DataTableCell align="right">
                    <MoneyText amount={t.runningBalance} color="balance" />
                  </DataTableCell>
                  <DataTableCell align="right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(t)}>
                          <Pencil className="size-4 mr-2 text-muted" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive onClick={() => setDeleteId(t.id)}>
                          <Trash2 className="size-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </DataTableCell>
                </DataTableRow>
              ))
            )}
          </DataTableBody>
        </DataTable>
      </div>

      {/* STICKY QUICK ENTRY BAR */}
      <div className="fixed bottom-0 left-0 lg:left-[280px] right-0 bg-white border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.04)] z-40 p-4 animate-in slide-up">
        <div className="w-full max-w-[1800px] px-6 lg:px-10">
          <div className="flex items-center justify-between mb-3">
             <h3 className="font-semibold text-text text-sm uppercase tracking-wider">{editingId ? "Edit Transaction" : "Quick Entry"}</h3>
             {editingId && (
                 <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-6 px-2 text-xs">Cancel Edit</Button>
             )}
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap lg:flex-nowrap items-end gap-3">
            <div className="flex-1 min-w-[120px] max-w-[140px] space-y-1.5">
              <Label htmlFor="date" className="text-xs">Date</Label>
              <Input id="date" type="date" {...register("date")} className="h-10 text-sm" error={!!errors.date} />
            </div>
            
            <div className="flex-1 min-w-[140px] space-y-1.5">
              <Label htmlFor="type" className="text-xs">Type</Label>
              <NativeSelect 
                id="type" 
                {...register("type")} 
                className={cn("h-10 text-sm", entryType === "credit" ? "text-credit" : "text-debit")}
                error={!!errors.type}
              >
                <option value="debit">Debit (Spent)</option>
                <option value="credit">Credit (Received)</option>
              </NativeSelect>
            </div>

            <div className="flex-1 min-w-[160px] space-y-1.5">
              <Label htmlFor="contactName" className="text-xs">Contact</Label>
              <Input id="contactName" list="contact-list" {...register("contactName")} placeholder="Name..." className="h-10 text-sm" error={!!errors.contactName} />
              <datalist id="contact-list">
                {contacts.map((c) => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>

            <div className="flex-1 min-w-[140px] space-y-1.5">
              <Label htmlFor="category" className="text-xs">Category</Label>
              <Input id="category" list="category-list" {...register("category")} placeholder="e.g. Labor" className="h-10 text-sm" error={!!errors.category} />
              <datalist id="category-list">
                {uniqueCategories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div className="flex-[1.5] min-w-[180px] space-y-1.5">
              <Label htmlFor="description" className="text-xs">Description</Label>
              <Input id="description" {...register("description")} placeholder="Optional details..." className="h-10 text-sm" error={!!errors.description} />
            </div>

            <div className="flex-1 min-w-[120px] max-w-[140px] space-y-1.5">
              <Label htmlFor="amount" className="text-xs">Amount (₹)</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount")} placeholder="0.00" className="h-10 text-sm font-[tabular-nums]" error={!!errors.amount} />
            </div>

            <Button type="submit" size="default" className="h-10 shrink-0 min-w-[100px]" loading={createMutation.isPending || updateMutation.isPending}>
              {editingId ? "Save" : "Add Entry"}
            </Button>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Transaction"
        description="Are you sure you want to delete this transaction? This action cannot be undone and will recalculate running balances."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId, {
              onSuccess: () => {
                setDeleteId(null);
                toast.success("Transaction deleted.");
              },
              onError: (err: any) => {
                toast.error(err.message || "Failed to delete transaction.");
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
