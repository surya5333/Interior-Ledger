"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Home,
  BarChart3,
  FolderKanban,
  Users,
  Building2,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { cn } from "../lib/cn";
import { useSettings } from "../hooks/use-settings";

const navItems = [
  { href: "/", label: "Overview", icon: Home, match: (p: string) => p === "/" },
  { href: "/projects", label: "Projects", icon: FolderKanban, match: (p: string) => p === "/projects" || p.startsWith("/projects/") },
  { href: "/scheduled-projects", label: "Scheduled Projects", icon: FolderKanban, match: (p: string) => p.startsWith("/scheduled-projects") },
  { href: "/clients", label: "Clients", icon: Building2, match: (p: string) => p.startsWith("/clients") },
  { href: "/contacts", label: "Contacts", icon: Users, match: (p: string) => p.startsWith("/contacts") },
  { href: "/financial-overview", label: "Financial Overview", icon: BarChart3, match: (p: string) => p.startsWith("/financial-overview") },
];

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: settings } = useSettings();

  const companyName = settings?.companyName || "Ledger";
  const initials = getInitials(companyName);

  // Keep document title in sync with company name
  useEffect(() => {
    document.title = companyName;
  }, [companyName]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-white border border-border shadow-sm cursor-pointer"
        aria-label="Open menu"
      >
        <Menu className="size-5 text-text" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 flex h-screen w-[280px] flex-col bg-sidebar border-r border-border",
          "transition-transform duration-200 ease-out",
          "lg:translate-x-0 lg:static",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 lg:hidden p-1.5 rounded-lg hover:bg-hover cursor-pointer"
          aria-label="Close menu"
        >
          <X className="size-4 text-muted" />
        </button>

        {/* Brand */}
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-3 px-6 pt-8 pb-2 no-underline"
        >
          {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt={companyName} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white text-sm font-bold">
              {initials}
            </div>
          )}
          <span className="text-xl font-bold leading-tight text-text">
            {companyName}
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-0.5 px-3 mt-8 flex-1">
          {navItems.map((item) => {
            const isActive = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium no-underline transition-colors duration-100",
                  isActive
                    ? "bg-primary-light text-primary"
                    : "text-muted hover:bg-hover hover:text-text"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary" />
                )}
                <Icon className="size-[18px] shrink-0" strokeWidth={1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-3 pb-4 space-y-1">
          {/* Settings */}
          <Link
            href="/settings"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium no-underline transition-colors duration-100",
              pathname === "/settings"
                ? "bg-primary-light text-primary"
                : "text-muted hover:bg-hover hover:text-text"
            )}
          >
            {pathname === "/settings" && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-primary" />
            )}
            <Settings className="size-[18px] shrink-0" strokeWidth={1.8} />
            <span>Settings</span>
          </Link>

        </div>
      </aside>
    </>
  );
}
