import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Project {
  id: string;
  name: string;
  clientId: string;
  location: string | null;
  budget: string | number;
  status: string;
  visibility: string;
  isLocked: boolean;
  scheduledDate: string | null;
  notes: string | null;
  createdAt: string;
  client?: { id: string; name: string };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function useProjects(options?: { status?: string }) {
  return useQuery<Project[]>({
    queryKey: ["projects", options?.status],
    queryFn: () => fetchJson(`/api/projects${options?.status ? `?status=${options.status}` : ""}`),
  });
}

export function useProject(id: string) {
  return useQuery<Project>({
    queryKey: ["project", id],
    queryFn: () => fetchJson(`/api/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; clientName: string; location?: string; budget: number; status?: string; visibility?: string; scheduledDate?: string; notes?: string }) =>
      fetchJson("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["financial-overview"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; clientName?: string; location?: string; budget?: number; status?: string; visibility?: string; scheduledDate?: string; notes?: string }) =>
      fetchJson(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["financial-overview"] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["financial-overview"] });
    },
  });
}

export function useLockProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation<{ id: string; isLocked: boolean }, Error, void>({
    mutationFn: async () => {
      return fetchJson(`/api/projects/${projectId}/lock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    },
    onSuccess: (data) => {
      qc.setQueryData(["project", projectId], (prev: Project | undefined) =>
        prev ? { ...prev, isLocked: data.isLocked } : prev
      );
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      qc.invalidateQueries({ queryKey: ["ledger", projectId] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["overview"] });
      qc.invalidateQueries({ queryKey: ["financial-overview"] });
    },
  });
}
