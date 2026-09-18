"use client";

import { use, useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Download, Plus, MoreHorizontal, Pencil, Trash2, Lock, Unlock, ChevronUp, ChevronDown } from "lucide-react";

import { useLedger, useCreateTransaction, useUpdateTransaction, useDeleteTransaction, LedgerTransaction } from "../../../hooks/use-ledger";
import { useContacts } from "../../../hooks/use-contacts";
import { useSettings } from "../../../hooks/use-settings";
import { useLockProject } from "../../../hooks/use-projects";
import { useUser } from "../../../hooks/use-user";
import { CategoryBadge } from "../../../components/category-badge";
import { PaymentModeBadge } from "../../../components/payment-mode-badge";
import { PageHeader } from "../../../components/page-header";
import { SummaryStrip } from "../../../components/summary-strip";
import { SearchBar } from "../../../components/search-bar";
import { MoneyText } from "../../../components/money-text";
import { Button } from "../../../components/ui/button";
import { Input, Label } from "../../../components/ui/input";
import { NativeSelect } from "../../../components/ui/select";
import { ConfirmDialog } from "../../../components/confirm-dialog";
import { PageSkeleton } from "../../../components/ui/skeleton";
import { cn } from "../../../lib/cn";
import { supabase } from "../../../lib/supabase";
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
  DropdownMenuSeparator,
} from "../../../components/ui/dropdown-menu";

const paymentModeOptions = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "OTHER", label: "Other" },
] as const;

const CLIENT_PAYMENT_CATEGORY = "Payment";

const transactionSchema = z
  .object({
    paymentFromClient: z.boolean(),
    date: z.string().min(1, "Date is required"),
    contactName: z.string(),
    category: z.string(),
    description: z.string().optional(),
    type: z.enum(["debit", "credit"]),
    amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
    paymentMode: z.enum(["CASH", "UPI", "CARD", "OTHER"]).default("CASH"),
    paymentProofUrl: z.string().url().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.paymentFromClient) {
      if (data.type !== "credit") {
        ctx.addIssue({
          code: "custom",
          message: "Client payments must be recorded as credit.",
          path: ["type"],
        });
      }
    } else {
      if (!data.contactName.trim()) {
        ctx.addIssue({ code: "custom", message: "Contact is required.", path: ["contactName"] });
      }
      if (!data.category.trim()) {
        ctx.addIssue({ code: "custom", message: "Category is required.", path: ["category"] });
      }
    }
  });
type TransactionFormData = z.infer<typeof transactionSchema>;

function getDefaultTransactionValues(clientName = ""): TransactionFormData {
  return {
    paymentFromClient: false,
    date: new Date().toISOString().slice(0, 10),
    contactName: "",
    category: "",
    description: "",
    type: "debit",
    amount: 0,
    paymentMode: "CASH",
    paymentProofUrl: "",
  };
}

function sanitizeFileName(fileName: string) {
  const sanitized = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized || "payment-proof";
}

export default function ProjectLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [contactFilter, setContactFilter] = useState("");
  // Single source of truth for both on-screen view and PDF export.
  // Server-side filtered when contactFilter is set (includes recalculated totals).
  const { data: ledger, isLoading } = useLedger(id, contactFilter || null);
  const { data: contacts = [] } = useContacts();
  const { data: settings } = useSettings();
  const { data: user } = useUser();
  const createMutation = useCreateTransaction(id);
  const updateMutation = useUpdateTransaction(id);
  const deleteMutation = useDeleteTransaction(id);
  const lockMutation = useLockProject(id);

  const isOwner = user?.role === "ADMIN";
  const isLocked = ledger?.project.isLocked ?? false;

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [lockConfirmOpen, setLockConfirmOpen] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isQuickEntryOpen, setIsQuickEntryOpen] = useState(true);
  const quickEntryRef = useRef<HTMLDivElement | null>(null);
  const lastContactWorkflowRef = useRef<Pick<TransactionFormData, "contactName" | "category" | "type">>({
    contactName: "",
    category: "",
    type: "debit",
  });
  const suppressWorkflowSyncRef = useRef(false);

  // Form for the sticky bottom bar
  const { register, handleSubmit, reset, setValue, getValues, watch, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: getDefaultTransactionValues(),
  });
  
  const entryType = watch("type");
  const paymentFromClient = watch("paymentFromClient");
  const paymentMode = watch("paymentMode");
  const paymentProofUrl = watch("paymentProofUrl");
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const resetTransactionForm = useCallback(() => {
    suppressWorkflowSyncRef.current = true;
    lastContactWorkflowRef.current = {
      contactName: "",
      category: "",
      type: "debit",
    };
    reset(getDefaultTransactionValues(ledger?.client?.name ?? ""));
    setEditingId(null);
    setUploadError(null);
  }, [reset, ledger?.client?.name]);

  useEffect(() => {
    if (!ledger) return;
    if (suppressWorkflowSyncRef.current) {
      suppressWorkflowSyncRef.current = false;
      return;
    }

    if (paymentFromClient) {
      const currentValues = getValues();
      lastContactWorkflowRef.current = {
        contactName: (currentValues.contactName || "").trim() || lastContactWorkflowRef.current.contactName || "",
        category:
          ((currentValues.category || "").trim() && currentValues.category !== CLIENT_PAYMENT_CATEGORY
            ? currentValues.category
            : lastContactWorkflowRef.current.category) || "",
        type: currentValues.type || "debit",
      };
      setValue("contactName", ledger?.client?.name ?? "", { shouldDirty: false });
      setValue("category", CLIENT_PAYMENT_CATEGORY, { shouldDirty: false });
      setValue("type", "credit", { shouldDirty: false });
    } else {
      setValue("contactName", lastContactWorkflowRef.current.contactName ?? "", { shouldDirty: false });
      setValue("category", lastContactWorkflowRef.current.category ?? "", { shouldDirty: false });
      setValue("type", lastContactWorkflowRef.current.type ?? "debit", { shouldDirty: false });
    }
  }, [getValues, ledger, paymentFromClient, setValue]);

  useEffect(() => {
    if (paymentMode !== "UPI" && paymentProofUrl) {
      setValue("paymentProofUrl", "", { shouldDirty: true });
      setUploadError(null);
    }
  }, [paymentMode, paymentProofUrl, setValue]);

  useEffect(() => {
    if (isLocked && editingId) {
      resetTransactionForm();
    }
  }, [isLocked, editingId, resetTransactionForm]);

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

  const handleProofUpload = useCallback(async (file: File) => {
    if (isLocked) {
      toast.error("Project is locked. Cannot upload proof.");
      return;
    }
    try {
      setUploadingProof(true);
      setUploadError(null);

      const filePath = `transactions/${id}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(filePath, file, { upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("uploads").getPublicUrl(filePath);
      setValue("paymentProofUrl", data.publicUrl, { shouldDirty: true, shouldValidate: true });
      toast.success("UPI screenshot uploaded successfully.");
    } catch (error: any) {
      const message = error?.message || "Failed to upload UPI screenshot.";
      setUploadError(message);
      toast.error(message);
    } finally {
      setUploadingProof(false);
    }
  }, [id, setValue, isLocked]);

  const onSubmit = (data: TransactionFormData) => {
    if (isLocked) {
      toast.error("Project is locked. Cannot submit transaction.");
      return;
    }
    const payload = data.paymentFromClient
      ? {
          date: data.date,
          isClientPayment: true,
          category: CLIENT_PAYMENT_CATEGORY,
          description: data.description,
          credit: data.amount,
          debit: 0,
          paymentMode: data.paymentMode,
          paymentProofUrl: data.paymentMode === "UPI" ? data.paymentProofUrl || undefined : undefined,
        }
      : {
          date: data.date,
          isClientPayment: false,
          contactName: data.contactName,
          contactCategory: data.category,
          category: data.category,
          description: data.description,
          credit: data.type === "credit" ? data.amount : 0,
          debit: data.type === "debit" ? data.amount : 0,
          paymentMode: data.paymentMode,
          paymentProofUrl: data.paymentMode === "UPI" ? data.paymentProofUrl || undefined : undefined,
        };

    if (editingId) {
      updateMutation.mutate({ transactionId: editingId, ...payload }, {
        onSuccess: () => {
          resetTransactionForm();
          toast.success("Transaction updated successfully.");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to update transaction.");
        }
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          resetTransactionForm();
          toast.success("Transaction added successfully.");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to add transaction.");
        }
      });
    }
  };

  const handleEdit = (t: LedgerTransaction) => {
    if (isLocked) {
      toast.error("Project is locked. Cannot edit transaction.");
      return;
    }
    if (t.deleted) {
      toast.error("Cannot edit a deleted transaction.");
      return;
    }
    setEditingId(t.id);
    setUploadError(null);
    suppressWorkflowSyncRef.current = true;
    lastContactWorkflowRef.current = t.isClientPayment
      ? { contactName: "", category: "", type: "debit" }
      : {
          contactName: t.contact?.name ?? "",
          category: t.contact?.category ?? "",
          type: Number(t.credit) > 0 ? "credit" : "debit",
        };
    const isCredit = Number(t.credit) > 0;
    reset({
      ...getDefaultTransactionValues(ledger?.client?.name ?? ""),
      paymentFromClient: Boolean(t.isClientPayment),
      date: t.date ? new Date(t.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      contactName: t.contact?.name ?? "",
      category: t.isClientPayment ? CLIENT_PAYMENT_CATEGORY : (t.category ?? t.contact?.category ?? ""),
      description: t.description ?? "",
      type: isCredit ? "credit" : "debit",
      amount: isCredit ? Number(t.credit) : Number(t.debit),
      paymentMode: t.paymentMode ?? "CASH",
      paymentProofUrl: t.paymentProofUrl ?? "",
    });
    // Scroll to bottom
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };
  
  const cancelEdit = () => {
    resetTransactionForm();
  };

  const handleLockToggle = () => {
    if (!isOwner || !ledger) return;
    if (ledger.project.isLocked) {
      lockMutation.mutate(undefined, {
        onSuccess: (data) => {
          toast.success(data.isLocked ? "Project locked" : "Project unlocked");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to update lock state.");
        },
      });
    } else {
      setLockConfirmOpen(true);
    }
  };

  const confirmLock = () => {
    setLockConfirmOpen(false);
    lockMutation.mutate(undefined, {
      onSuccess: (data) => {
        toast.success(data.isLocked ? "Project locked" : "Project unlocked");
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to lock project.");
      },
    });
  };

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

      const pdfLedger = {
        ...ledger,
        transactions: ledger.transactions.filter((t) => !t.deleted),
      };

      const rawBlob = await pdf(<LedgerPDF ledger={pdfLedger} companyName={companyName} logoUrl={logoUrl} signatureUrl={signatureUrl} />).toBlob();
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
        {isOwner && (
          isLocked ? (
            <Button variant="secondary" onClick={handleLockToggle} loading={lockMutation.isPending}>
              <Unlock className="size-4 mr-2" />
              Unlock Project
            </Button>
          ) : (
            <Button variant="secondary" onClick={handleLockToggle} loading={lockMutation.isPending}>
              <Lock className="size-4 mr-2" />
              Lock Project
            </Button>
          )
        )}
        {!isLocked && (
          <Button
            onClick={() => {
              setIsQuickEntryOpen(true);
              // Avoid layout thrashing: run DOM side effect after state commit
              setTimeout(() => {
                quickEntryRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
              }, 0);
            }}
          >
            <Plus className="size-5 mr-1.5" />
            Add Entry
          </Button>
        )}
      </PageHeader>

      {isLocked && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-warning/30 bg-warning/5">
          <Lock className="size-4 text-warning" />
          <p className="text-sm font-medium text-warning">
            This project is view-only. Transactions and details cannot be modified until the project is unlocked.
          </p>
        </div>
      )}

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
              value: contactFilter,
              onChange: setContactFilter,
              options: ledger.contacts.map((c) => ({
                value: c.id,
                label: `${c.name} • ${c.category}`,
              })),
              placeholder: "All Contacts",
            },
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
              <DataTableHead>Payment</DataTableHead>
              <DataTableHead>Description</DataTableHead>
              <DataTableHead align="right">Credit</DataTableHead>
              <DataTableHead align="right">Debit</DataTableHead>
              <DataTableHead align="right">Balance</DataTableHead>
              <DataTableHead align="right"></DataTableHead>
            </DataTableHeaderRow>
          </DataTableHeader>
          <DataTableBody>
            {visibleTransactions.length === 0 ? (
              <DataTableEmpty colSpan={9}>No transactions found.</DataTableEmpty>
            ) : (
              visibleTransactions.map((t) => {
                const isDeleted = !!t.deleted;
                return (
                  <DataTableRow key={t.id} className={cn(isDeleted && "opacity-60 bg-muted/10")}>
                    <DataTableCell className="text-muted">
                      <div className="flex flex-col gap-1">
                        {new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        {isDeleted && t.deleted?.by && (
                          <p className="text-[11px] font-medium text-muted flex items-center gap-1">
                            <span>Deleted by</span>
                            <span className="font-semibold text-muted">
                              {t.deleted.by.name} • {t.deleted.by.role === "ADMIN" ? "Owner" : "Manager"}
                            </span>
                          </p>
                        )}
                      </div>
                    </DataTableCell>
                    <DataTableCell className={cn("font-medium", isDeleted && "line-through decoration-muted/60")}>
                      {t.contact.name}
                    </DataTableCell>
                    <DataTableCell>
                      <CategoryBadge category={t.category} />
                    </DataTableCell>
                    <DataTableCell>
                      <div className="flex flex-col items-start gap-1">
                        <PaymentModeBadge paymentMode={t.paymentMode} />
                        {t.paymentMode === "UPI" && t.paymentProofUrl ? (
                          <a
                            href={t.paymentProofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            View proof
                          </a>
                        ) : null}
                      </div>
                    </DataTableCell>
                    <DataTableCell className="text-muted text-sm">{t.description || "—"}</DataTableCell>
                    <DataTableCell align="right">
                      {isDeleted ? (
                        <span className="text-muted line-through decoration-muted/60">
                          <MoneyText amount={t.credit} color="credit" showDash />
                        </span>
                      ) : (
                        <MoneyText amount={t.credit} color="credit" showDash />
                      )}
                    </DataTableCell>
                    <DataTableCell align="right">
                      {isDeleted ? (
                        <span className="text-muted line-through decoration-muted/60">
                          <MoneyText amount={t.debit} color="debit" showDash />
                        </span>
                      ) : (
                        <MoneyText amount={t.debit} color="debit" showDash />
                      )}
                    </DataTableCell>
                    <DataTableCell align="right">
                      {isDeleted ? (
                        <span className="text-muted italic text-xs">—</span>
                      ) : (
                        <MoneyText amount={t.runningBalance} color="balance" />
                      )}
                    </DataTableCell>
                    <DataTableCell align="right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <div className="px-3 py-2 cursor-default select-none">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Added by</p>
                            <p className="text-sm font-medium text-text mt-0.5">
                              {t.createdBy
                                ? `${t.createdBy.name} • ${t.createdBy.role === "ADMIN" ? "Owner" : "Manager"}`
                                : "Not available"}
                            </p>
                          </div>
                          {isDeleted && t.deleted?.by && (
                            <>
                              <DropdownMenuSeparator />
                              <div className="px-3 py-2 cursor-default select-none">
                                <p className="text-[11px] font-medium uppercase tracking-wider text-muted">Deleted by</p>
                                <p className="text-sm font-medium text-text mt-0.5">
                                  {t.deleted.by.name} • {t.deleted.by.role === "ADMIN" ? "Owner" : "Manager"}
                                </p>
                              </div>
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleEdit(t)}
                            disabled={isLocked || isDeleted}
                          >
                            <Pencil className="size-4 mr-2 text-muted" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            destructive
                            onClick={() => setDeleteId(t.id)}
                            disabled={isLocked}
                          >
                            <Trash2 className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </DataTableCell>
                  </DataTableRow>
                );
              })
            )}
          </DataTableBody>
        </DataTable>
      </div>

      {/* STICKY QUICK ENTRY BAR */}
      <div ref={quickEntryRef} className="fixed bottom-0 left-0 lg:left-[280px] right-0 bg-white border-t border-border shadow-[0_-4px_24px_rgba(0,0,0,0.04)] z-40 p-4 animate-in slide-up">
        <div className="w-full max-w-[1800px] px-6 lg:px-10">
          {isLocked ? (
            <div className="flex items-center justify-between gap-2 py-2">
              <div className="flex items-center justify-center gap-2 py-1 flex-1">
                <Lock className="size-4 text-warning" />
                <p className="text-sm font-medium text-warning">
                  View only — project is locked. Contact the Owner to unlock for changes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickEntryOpen((v) => !v)}
                aria-label={isQuickEntryOpen ? "Collapse Quick Entry" : "Expand Quick Entry"}
                className="shrink-0 size-8 inline-flex items-center justify-center rounded-md text-muted hover:text-text hover:bg-muted/40 transition-colors"
              >
                {isQuickEntryOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <h3 className="font-semibold text-text text-sm uppercase tracking-wider">{editingId ? "Edit Transaction" : "Quick Entry"}</h3>
                  {editingId && (
                      <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-6 px-2 text-xs shrink-0">Cancel Edit</Button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsQuickEntryOpen((v) => !v)}
                  aria-label={isQuickEntryOpen ? "Collapse Quick Entry" : "Expand Quick Entry"}
                  className="shrink-0 size-8 inline-flex items-center justify-center rounded-md text-muted hover:text-text hover:bg-muted/40 transition-colors"
                >
                  {isQuickEntryOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                </button>
              </div>
              {isQuickEntryOpen ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                <label className="flex items-center gap-2.5 text-sm font-medium text-text cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-border text-primary focus:ring-primary"
                    checked={watch("paymentFromClient") ?? false}
                    {...register("paymentFromClient")}
                  />
                  Payment Received From Client
                </label>

                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 items-end">
                  <div className="shrink-0 min-w-[170px] max-w-[200px] space-y-1.5">
                    <Label htmlFor="date" className="text-xs">Date</Label>
                    <Input id="date" type="date" value={watch("date") ?? ""} {...register("date")} className="h-10 text-sm w-full" error={!!errors.date} />
                  </div>

                  {!paymentFromClient ? (
                    <div className="min-w-0 space-y-1.5">
                      <Label htmlFor="type" className="text-xs">Type</Label>
                      <NativeSelect
                        id="type"
                        value={watch("type") ?? "debit"}
                        {...register("type")}
                        className={cn("h-10 text-sm min-w-0 w-full", entryType === "credit" ? "text-credit" : "text-debit")}
                        error={!!errors.type}
                      >
                        <option value="debit">Debit (Spent)</option>
                        <option value="credit">Credit (Received)</option>
                      </NativeSelect>
                    </div>
                  ) : null}

                  {paymentFromClient ? (
                    <div className="min-w-0 space-y-1.5">
                      <Label htmlFor="clientName" className="text-xs">Client</Label>
                      <Input
                        id="clientName"
                        value={ledger?.client?.name ?? ""}
                        readOnly
                        className="h-10 text-sm bg-[#FAFAF8] cursor-not-allowed min-w-0 w-full"
                      />
                    </div>
                  ) : (
                    <div className="min-w-0 space-y-1.5">
                      <Label htmlFor="contactName" className="text-xs">Contact</Label>
                      <Input id="contactName" list="contact-list" value={watch("contactName") ?? ""} {...register("contactName")} placeholder="Name..." className="h-10 text-sm min-w-0 w-full" error={!!errors.contactName} />
                      <datalist id="contact-list">
                        {contacts.map((c) => <option key={c.id} value={c.name} />)}
                      </datalist>
                    </div>
                  )}

                  <div className="min-w-0 space-y-1.5">
                    <Label htmlFor="category" className="text-xs">Category</Label>
                    <Input
                      id="category"
                      list={paymentFromClient ? undefined : "category-list"}
                      value={watch("category") ?? ""}
                      {...register("category")}
                      placeholder="e.g. Labor"
                      readOnly={paymentFromClient}
                      className={cn("h-10 text-sm min-w-0 w-full", paymentFromClient && "bg-[#FAFAF8] cursor-not-allowed")}
                      error={!!errors.category}
                    />
                    {!paymentFromClient ? (
                      <datalist id="category-list">
                        {uniqueCategories.map((c) => <option key={c} value={c} />)}
                      </datalist>
                    ) : null}
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <Label htmlFor="paymentMode" className="text-xs">Payment Mode</Label>
                    <NativeSelect
                      id="paymentMode"
                      value={watch("paymentMode") ?? "CASH"}
                      {...register("paymentMode")}
                      className="h-10 text-sm min-w-0 w-full"
                      error={!!errors.paymentMode}
                    >
                      {paymentModeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </NativeSelect>
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <Label htmlFor="description" className="text-xs">Description</Label>
                    <Input id="description" value={watch("description") ?? ""} {...register("description")} placeholder="Optional details..." className="h-10 text-sm min-w-0 w-full" error={!!errors.description} />
                  </div>

                  <div className="min-w-0 space-y-1.5">
                    <Label htmlFor="amount" className="text-xs">Amount (₹)</Label>
                    <Input id="amount" type="number" step="0.01" value={watch("amount") ?? ""} {...register("amount")} placeholder="0.00" className="h-10 text-sm font-[tabular-nums] min-w-0 w-full" error={!!errors.amount} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" size="default" className="h-10 shrink-0 min-w-[120px]" loading={isSubmitting || uploadingProof} disabled={uploadingProof}>
                    {editingId ? "Save" : "Add Entry"}
                  </Button>
                </div>

                {paymentMode === "UPI" ? (
                  <div className="rounded-xl border border-border bg-muted/20 p-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                      <div className="min-w-[220px] flex-1 space-y-1.5">
                        <Label htmlFor="paymentProof" className="text-xs">Upload UPI Screenshot</Label>
                        <Input
                          key={`${editingId ?? "new"}-${paymentMode}-${paymentProofUrl ? "has-proof" : "no-proof"}`}
                          id="paymentProof"
                          type="file"
                          accept="image/*"
                          className="h-10 text-sm"
                          disabled={uploadingProof || isSubmitting}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              void handleProofUpload(file);
                            }
                          }}
                        />
                        <input type="hidden" value={watch("paymentProofUrl") ?? ""} {...register("paymentProofUrl")} />
                        <p className="text-xs text-muted">
                          Upload an image proof for UPI payments. You can submit without it and add or replace it later.
                        </p>
                        {uploadingProof ? <p className="text-xs text-muted">Uploading screenshot...</p> : null}
                        {uploadError ? <p className="text-xs text-danger">{uploadError}</p> : null}
                      </div>

                      {paymentProofUrl ? (
                        <div className="w-full max-w-[280px] space-y-2">
                          <p className="text-xs font-medium text-text">Current Preview</p>
                          <div className="overflow-hidden rounded-lg border border-border bg-white">
                            <img src={paymentProofUrl} alt="UPI payment proof preview" className="h-32 w-full object-cover" />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </form>
              ) : null}
            </>
          )}
        </div>
      </div>

      {(() => {
        const deletingTx = deleteId ? visibleTransactions.find((x) => x.id === deleteId) : null;
        const isDeletingSoftDeleted = !!deletingTx?.deleted;
        const confirmTitle = isDeletingSoftDeleted ? "Permanently Delete Audit Row" : "Delete Transaction";
        const confirmDescription = isDeletingSoftDeleted
          ? "This is a Manager-deleted audit row. Permanently removing it will erase the record completely with no recovery. Running balances will be recalculated."
          : "Are you sure you want to delete this transaction? This action cannot be undone and will recalculate running balances.";
        const confirmLabelText = isDeletingSoftDeleted ? "Permanently Delete" : "Delete";
        const confirmToast = isDeletingSoftDeleted ? "Audit row permanently deleted." : "Transaction deleted.";
        return (
          <ConfirmDialog
            open={!!deleteId}
            onOpenChange={(open) => !open && setDeleteId(null)}
            title={confirmTitle}
            description={confirmDescription}
            confirmLabel={confirmLabelText}
            onConfirm={() => {
              if (deleteId) {
                deleteMutation.mutate(deleteId, {
                  onSuccess: () => {
                    setDeleteId(null);
                    toast.success(confirmToast);
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
        );
      })()}

      <ConfirmDialog
        open={lockConfirmOpen}
        onOpenChange={(open) => !open && setLockConfirmOpen(false)}
        title="Lock Project"
        description="Locking this project will prevent any further edits to transactions, project details, and ledger entries until unlocked. Only the Owner can unlock this project."
        confirmLabel="Lock Project"
        onConfirm={confirmLock}
        loading={lockMutation.isPending}
      />
    </div>
  );
}
