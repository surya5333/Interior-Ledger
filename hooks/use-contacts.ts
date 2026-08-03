import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Contact {
  id: string;
  name: string;
  category: string;
  phone: string | null;
  createdAt?: string;
}

export interface ContactDetail {
  contact: Contact;
  projects: {
    project: { id: string; name: string; client?: { name: string } };
    transactions: {
      id: string;
      date: string;
      category: string;
      description: string | null;
      paymentMode: "CASH" | "UPI" | "CARD" | "OTHER";
      paymentProofUrl: string | null;
      credit: string;
      debit: string;
    }[];
    totalCredit: string;
    totalDebit: string;
    balance: string;
  }[];
  totals: {
    credit: string;
    debit: string;
    balance: string;
    transactionCount: number;
    projectCount: number;
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useContacts() {
  return useQuery<Contact[]>({
    queryKey: ["contacts"],
    queryFn: () => fetchJson("/api/contacts"),
  });
}

export function useContactSearch(search: string) {
  return useQuery<Contact[]>({
    queryKey: ["contacts", "search", search],
    queryFn: () => fetchJson(`/api/contacts?search=${encodeURIComponent(search)}`),
    enabled: search.length > 0,
  });
}

export function useContact(id: string) {
  return useQuery<ContactDetail>({
    queryKey: ["contact-history", id],
    queryFn: () => fetchJson(`/api/contacts/${id}`),
    enabled: !!id,
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; category: string; phone?: string }) =>
      fetchJson("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["financial-overview"] });
    },
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; category?: string; phone?: string }) =>
      fetchJson(`/api/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact-history", vars.id] });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/contacts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["financial-overview"] });
    },
  });
}
