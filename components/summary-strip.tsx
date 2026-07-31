import { cn } from "../lib/cn";

interface SummaryItem {
  label: string;
  value: string;
  color?: "credit" | "debit" | "balance" | "default";
}

interface SummaryStripProps {
  items: SummaryItem[];
  className?: string;
}

export function SummaryStrip({ items, className }: SummaryStripProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap md:flex-nowrap rounded-xl border border-border bg-white overflow-hidden",
        className
      )}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col gap-1 px-6 py-5 flex-1 min-w-[150px]",
            i < items.length - 1 && "border-r border-border",
            "border-b md:border-b-0 border-border last:border-b-0"
          )}
        >
          <span className="text-sm text-muted font-medium">{item.label}</span>
          <strong
            className={cn(
              "text-2xl font-bold tracking-tight font-[tabular-nums]",
              {
                "text-credit": item.color === "credit",
                "text-debit": item.color === "debit",
                "text-balance": item.color === "balance",
                "text-text": item.color === "default" || !item.color,
              }
            )}
          >
            {item.value}
          </strong>
        </div>
      ))}
    </div>
  );
}
