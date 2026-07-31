import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Settings {
  companyName: string;
  logoUrl: string | null;
  signatureUrl: string | null;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useSettings() {
  return useQuery<Settings>({
    queryKey: ["settings"],
    queryFn: () => fetchJson("/api/settings"),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { companyName: string; logoUrl?: string; signatureUrl?: string }) =>
      fetchJson("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}
