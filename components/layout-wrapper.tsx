"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "./sidebar";
import { useUser } from "../hooks/use-user";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user, isLoading, error } = useUser();
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!isLoading && !user && !isLoginPage) {
      router.push("/login");
    }
  }, [user, isLoading, isLoginPage, router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Optional: show a loading state while fetching session on first load
  if (isLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  // If we are not logged in and not on login page, we are redirecting
  if (!user) {
    return null;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="w-full max-w-[1800px] p-6 lg:p-10">
          {children}
        </div>
      </main>
    </>
  );
}
