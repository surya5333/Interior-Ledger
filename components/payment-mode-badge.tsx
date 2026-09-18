import type { HTMLAttributes } from "react";

import { cn } from "../lib/cn";

type PaymentMode = "CASH" | "UPI" | "CARD" | "NEFT" | "IMPS" | "OTHER";

const paymentModeConfig: Record<PaymentMode, { label: string; className: string }> = {
  CASH: { label: "Cash", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  UPI: { label: "UPI", className: "border-violet-200 bg-violet-50 text-violet-700" },
  CARD: { label: "Card", className: "border-sky-200 bg-sky-50 text-sky-700" },
  NEFT: { label: "NEFT", className: "border-amber-200 bg-amber-50 text-amber-700" },
  IMPS: { label: "IMPS", className: "border-indigo-200 bg-indigo-50 text-indigo-700" },
  OTHER: { label: "Other", className: "border-stone-200 bg-stone-100 text-stone-700" },
};

interface PaymentModeBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  paymentMode: PaymentMode;
}

export function PaymentModeBadge({ paymentMode, className, ...props }: PaymentModeBadgeProps) {
  const config = paymentModeConfig[paymentMode];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none whitespace-nowrap",
        config.className,
        className
      )}
      {...props}
    >
      {config.label}
    </span>
  );
}
