import { useQuery } from "@tanstack/react-query";

export interface OverviewData {
  counts: {
    clients: number;
    projects: number;
    scheduledProjects: number;
    contacts: number;
    transactions: number;
  };
  recentProjects: {
    id: string;
    name: string;
    budget: string | number;
    createdAt: string;
    client: { name: string };
  }[];
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
