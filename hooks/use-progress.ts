import { useQuery } from "@tanstack/react-query";
import type { DateRangePreset, ProgressData } from "../lib/progress";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export interface UseProgressParams {
  preset: DateRangePreset;
  startDate?: string;
  endDate?: string;
}

function buildQueryURL(params: UseProgressParams): string {
  const sp = new URLSearchParams();
  sp.set("preset", params.preset);
  if (params.startDate) sp.set("startDate", params.startDate);
  if (params.endDate) sp.set("endDate", params.endDate);
  return `/api/progress?${sp.toString()}`;
}

export function useProgress(params: UseProgressParams) {
  return useQuery<ProgressData>({
    queryKey: ["progress", params.preset, params.startDate ?? null, params.endDate ?? null],
    queryFn: () => fetchJson(buildQueryURL(params)),
  });
}
