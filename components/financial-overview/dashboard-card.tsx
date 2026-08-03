import { cn } from "../../lib/cn";

interface DashboardCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function DashboardCard({ children, className, hover = true }: DashboardCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
        hover && "transition-all duration-200 hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:border-border",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-text">{title}</h2>
        {subtitle && <p className="text-sm text-muted mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
