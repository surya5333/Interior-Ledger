import { useQuery } from "@tanstack/react-query";
import { Project } from "./use-projects";

export interface OverviewData {
  counts: {
    clients: number;
    projects: number;
    todaysEvents: number;
    contacts: number;
    transactions: number;
  };
  recentProjects: Project[];
}

export function useOverview() {
  return useQuery<OverviewData>({
    queryKey: ["overview"],
    queryFn: async () => {
      const res = await fetch("/api/overview");
      if (!res.ok) throw new Error("Failed to fetch overview");
      return res.json();
    },
  });
}
