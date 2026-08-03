import { useQuery } from "@tanstack/react-query";
import type { FinancialOverviewData } from "../lib/financial-overview";

export type { FinancialOverviewData };

export function useFinancialOverview() {
  return useQuery<FinancialOverviewData>({
    queryKey: ["financial-overview"],
    queryFn: async () => {
      const res = await fetch("/api/financial-overview");
      if (!res.ok) throw new Error("Failed to fetch financial overview");
      return res.json();
    },
  });
}
