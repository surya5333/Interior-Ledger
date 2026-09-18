import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface LedgerTransaction {
  id: string;
  date: string;
  isClientPayment?: boolean;
  contact: { id: string; name: string; category: string };
  category: string;
  description: string | null;
  paymentMode: "CASH" | "UPI" | "CARD" | "NEFT" | "IMPS" | "OTHER";
  paymentProofUrl: string | null;
  credit: string;
  debit: string;
  runningBalance: string;
  createdBy: {
    id: string;
    name: string;
    role: "ADMIN" | "MANAGER";
  } | null;
  deleted: {
    at: string;
    by: {
      id: string;
      name: string;
      role: "ADMIN" | "MANAGER";
    } | null;
  } | null;
}

export interface LedgerData {
  project: { id: string; name: string; budget: string; isLocked: boolean };
  client: { id: string; name: string };
  totals: { credit: string; debit: string; balance: string };
  contacts: { id: string; name: string; category: string }[];
  transactions: LedgerTransaction[];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useLedger(projectId: string, contactId?: string | null) {
  return useQuery<LedgerData>({
    queryKey: ["ledger", projectId, contactId ?? null],
    queryFn: () => {
      const url = new URL(`/api/projects/${projectId}/transactions`, window.location.origin);
      if (contactId) url.searchParams.set("contactId", contactId);
      return fetchJson(url.toString());
    },
    enabled: !!projectId,
  });
}

export function useCreateTransaction(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      date: string;
      contactName?: string;
      contactCategory?: string;
      category?: string;
      description?: string;
      credit: number | string;
      debit: number | string;
      paymentMode?: "CASH" | "UPI" | "CARD" | "NEFT" | "IMPS" | "OTHER";
      paymentProofUrl?: string;
      isClientPayment?: boolean;
    }) =>
      fetchJson(`/api/projects/${projectId}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledger", projectId] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["client"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["financial-overview"] });
    },
  });
}

export function useUpdateTransaction(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ transactionId, ...data }: {
      transactionId: string;
      contactName?: string;
      contactCategory?: string;
      category?: string;
      description?: string;
      credit?: number;
      debit?: number;
      date?: string;
      paymentMode?: "CASH" | "UPI" | "CARD" | "NEFT" | "IMPS" | "OTHER";
      paymentProofUrl?: string;
      isClientPayment?: boolean;
    }) =>
      fetchJson(`/api/projects/${projectId}/transactions/${transactionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledger", projectId] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["client"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["financial-overview"] });
    },
  });
}

export function useDeleteTransaction(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transactionId: string) =>
      fetchJson(`/api/projects/${projectId}/transactions/${transactionId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ledger", projectId] });
      qc.invalidateQueries({ queryKey: ["client"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["financial-overview"] });
    },
  });
}
