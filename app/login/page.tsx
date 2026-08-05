"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input, Label } from "../../components/ui/input";
import { Eye, EyeOff, ShieldCheck, UserCog } from "lucide-react";
import { cn } from "../../lib/cn";
import { useUser } from "../../hooks/use-user";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"ADMIN" | "MANAGER">("ADMIN");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const { data: user, isLoading: userLoading } = useUser();

  useEffect(() => {
    if (!userLoading && user) {
      router.push("/");
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setCompanyName(data.companyName || "Interior Ledger");
        setLogoUrl(data.logoUrl || "");
      })
      .catch(() => {
        setCompanyName("Interior Ledger");
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, password }),
      });

      if (res.ok) {
        toast.success("Login successful");
        window.location.href = "/";
      } else {
        const data = await res.json();
        toast.error(data.error || "Invalid password.");
      }
    } catch (error) {
      toast.error("An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full flex-1 items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-white border border-border rounded-xl shadow-sm p-8 space-y-6">
        <div className="flex flex-col items-center space-y-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={companyName}
              className="h-16 w-16 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-white text-xl font-bold">
              {companyName
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w[0].toUpperCase())
                .join("")}
            </div>
          )}
          <h1 className="text-2xl font-bold text-text">{companyName}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Login As selector */}
          <div className="space-y-2">
            <Label>Login As</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("ADMIN")}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium transition-all duration-150 cursor-pointer",
                  role === "ADMIN"
                    ? "border-primary bg-primary-light text-primary ring-1 ring-primary/20"
                    : "border-border bg-white text-muted hover:border-primary/40 hover:text-text"
                )}
              >
                <ShieldCheck className="size-4 shrink-0" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => setRole("MANAGER")}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium transition-all duration-150 cursor-pointer",
                  role === "MANAGER"
                    ? "border-primary bg-primary-light text-primary ring-1 ring-primary/20"
                    : "border-border bg-white text-muted hover:border-primary/40 hover:text-text"
                )}
              >
                <UserCog className="size-4 shrink-0" />
                Manager
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" loading={isLoading}>
            Login
          </Button>
        </form>
      </div>
    </div>
  );
}
