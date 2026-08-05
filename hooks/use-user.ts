import { useQuery } from "@tanstack/react-query";
import { SessionPayload } from "../lib/auth";

export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async (): Promise<SessionPayload | null> => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        if (res.status === 401) return null;
        throw new Error("Failed to fetch user");
      }
      const data = await res.json();
      return data.user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
