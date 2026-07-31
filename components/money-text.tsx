import { cn } from "../lib/cn";

const formatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

export function formatMoney(amount: number | string): string {
  return `₹${formatter.format(Number(amount))}`;
}

interface MoneyTextProps {
  amount: number | string;
  color?: "credit" | "debit" | "balance" | "default";
  showDash?: boolean; // Show "—" when amount is 0
  className?: string;
}

export function MoneyText({
  amount,
  color = "default",
  showDash = false,
  className,
}: MoneyTextProps) {
  const num = Number(amount);
  
  if (showDash && num === 0) {
    return <span className={cn("text-muted", className)}>—</span>;
  }

  return (
    <span
      className={cn(
        "font-medium font-[tabular-nums]",
        {
          "text-credit": color === "credit",
          "text-debit": color === "debit",
          "text-balance": color === "balance",
          "text-text": color === "default",
        },
        className
      )}
    >
      {formatMoney(num)}
    </span>
  );
}
