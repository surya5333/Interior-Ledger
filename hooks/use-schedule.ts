import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface ScheduleEvent {
  id: string;
  title: string;
  date: string; // ISO string
  time: string;
  location: string | null;
  notes: string | null;
  priority: "LOW" | "MEDIUM" | "HIGH";
  createdAt: string;
  updatedAt: string;
}

export function useScheduleEvents(startDate?: string, endDate?: string) {
  return useQuery<ScheduleEvent[]>({
    queryKey: ["schedule", startDate, endDate],
    queryFn: async () => {
      const url = new URL("/api/schedule", window.location.href);
      if (startDate) url.searchParams.append("startDate", startDate);
      if (endDate) url.searchParams.append("endDate", endDate);
      
      const res = await fetch(url.toString());
      if (!res.ok) {
        if (res.status === 403) throw new Error("Forbidden");
        throw new Error("Failed to fetch events");
      }
      return res.json();
    },
  });
}

export function useCreateScheduleEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<ScheduleEvent, "id" | "createdAt" | "updatedAt">) => {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to create event");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}

export function useUpdateScheduleEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Partial<ScheduleEvent> & { id: string }) => {
      const { id, ...rest } = data;
      const res = await fetch(`/api/schedule/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to update event");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}

export function useDeleteScheduleEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/schedule/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to delete event");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
  });
}
