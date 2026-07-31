import { Breadcrumb } from "./breadcrumb";
import { cn } from "../lib/cn";

interface PageHeaderProps {
  breadcrumbItems?: { label: string; href?: string }[];
  title: string;
  subtitle?: string;
  children?: React.ReactNode; // Action buttons
  className?: string;
}

export function PageHeader({
  breadcrumbItems,
  title,
  subtitle,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-2 min-w-0">
        {breadcrumbItems && breadcrumbItems.length > 0 && (
          <Breadcrumb items={breadcrumbItems} />
        )}
        <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] tracking-[-0.02em] text-text">
          {title}
        </h1>
        {subtitle && (
          <p className="text-lg text-muted">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-3 shrink-0">
          {children}
        </div>
      )}
    </header>
  );
}
