import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface Visit {
  id: string;
  projectId: string;
  date: string;
  visitName: string;
  description: string | null;
  sequenceNumber: number;
  createdAt: string;
  updatedAt: string;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

const VISITS_QUERY_KEY = "project-visits";

export function useProjectVisits(projectId: string) {
  return useQuery<Visit[]>({
    queryKey: [VISITS_QUERY_KEY, projectId],
    queryFn: () => fetchJson(`/api/projects/${projectId}/visits`),
    enabled: !!projectId,
  });
}

export function useCreateProjectVisit(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      date: string;
      visitName?: string;
      description?: string | null;
    }) =>
      fetchJson<Visit>(`/api/projects/${projectId}/visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VISITS_QUERY_KEY, projectId] });
    },
  });
}

export function useUpdateProjectVisit(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      visitId,
      ...data
    }: {
      visitId: string;
      date?: string;
      visitName?: string;
      description?: string | null;
    }) =>
      fetchJson<Visit>(
        `/api/projects/${projectId}/visits/${visitId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VISITS_QUERY_KEY, projectId] });
    },
  });
}

export function useDeleteProjectVisit(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (visitId: string) =>
      fetchJson<{ ok: boolean }>(
        `/api/projects/${projectId}/visits/${visitId}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [VISITS_QUERY_KEY, projectId] });
    },
  });
}
