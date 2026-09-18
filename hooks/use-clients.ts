import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  createdAt: string;
  projects?: { id: string; name: string; budget: string | number; createdAt: string }[];
}

export interface ClientLedgerPayment {
  id: string;
  date: string;
  project: { id: string; name: string };
  category: string;
  description: string | null;
  paymentMode: "CASH" | "UPI" | "CARD" | "NEFT" | "IMPS" | "OTHER";
  paymentProofUrl: string | null;
  credit: string;
}

export interface ClientLedgerData {
  client: Client;
  projects: { id: string; name: string; budget: string | number; createdAt: string }[];
  totals: { totalReceived: string; paymentCount: number };
  payments: ClientLedgerPayment[];
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useClients() {
  return useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: () => fetchJson("/api/clients"),
  });
}

export function useClient(id: string) {
  return useQuery<ClientLedgerData>({
    queryKey: ["client", id],
    queryFn: () => fetchJson(`/api/clients/${id}`),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; phone?: string; email?: string }) =>
      fetchJson("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["financial-overview"] });
    },
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; phone?: string; email?: string }) =>
      fetchJson(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["client", vars.id] });
    },
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/clients/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["financial-overview"] });
    },
  });
}
