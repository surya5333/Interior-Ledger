import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center gap-1.5 text-sm text-muted", className)}
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="size-3.5 text-border" />}
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-text transition-colors no-underline text-muted"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-muted">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
