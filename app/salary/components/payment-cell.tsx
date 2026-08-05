"use client";

import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../../../lib/cn";

interface PaymentCellProps {
  staffId: string;
  month: number;
  year: number;
  initialIsPaid?: boolean;
  initialPaymentType?: "FULL" | "PARTIAL" | null;
  initialPaidAmount?: string | number;
  initialPaymentMode?: "CASH" | "UPI" | "BANK_TRANSFER" | null;
  totalPayable: number;
  onUpdate: () => void;
}

export function PaymentCell({
  staffId,
  month,
  year,
  initialIsPaid = false,
  initialPaymentType = "FULL",
  initialPaidAmount = "",
  initialPaymentMode = "CASH",
  totalPayable,
  onUpdate,
}: PaymentCellProps) {
  const [isPaid, setIsPaid] = useState(initialIsPaid);
  const [paymentType, setPaymentType] = useState(initialPaymentType || "FULL");
  const [paidAmount, setPaidAmount] = useState<string | number>(initialPaidAmount);
  const [paymentMode, setPaymentMode] = useState(initialPaymentMode || "CASH");
  const [isLoading, setIsLoading] = useState(false);

  // Sync state if props change (due to refetch)
  useEffect(() => {
    setIsPaid(initialIsPaid);
    setPaymentType(initialPaymentType || "FULL");
    setPaidAmount(initialPaidAmount);
    setPaymentMode(initialPaymentMode || "CASH");
  }, [initialIsPaid, initialPaymentType, initialPaidAmount, initialPaymentMode]);

  const saveChanges = async (
    newIsPaid: boolean,
    newPaymentType: string,
    newPaidAmount: string | number,
    newPaymentMode: string
  ) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/salary/${staffId}/${month}/${year}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPaid: newIsPaid,
          paymentType: newPaymentType,
          paidAmount: Number(newPaidAmount),
          paymentMode: newPaymentMode,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update payment");
      }

      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
      // Revert state on error
      setIsPaid(initialIsPaid);
      setPaymentType(initialPaymentType || "FULL");
      setPaidAmount(initialPaidAmount);
      setPaymentMode(initialPaymentMode || "CASH");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckboxChange = (checked: boolean) => {
    setIsPaid(checked);
    let amount = paidAmount;
    if (checked && paymentType === "FULL") {
      amount = totalPayable;
      setPaidAmount(totalPayable);
    }
    saveChanges(checked, paymentType, amount, paymentMode);
  };

  const handlePaymentTypeChange = (type: "FULL" | "PARTIAL") => {
    setPaymentType(type);
    let amount = type === "FULL" ? totalPayable : "";
    setPaidAmount(amount);
    saveChanges(isPaid, type, amount, paymentMode);
  };

  const handleAmountBlur = () => {
    // Only save if it changed
    if (Number(paidAmount) !== Number(initialPaidAmount)) {
      saveChanges(isPaid, paymentType, paidAmount, paymentMode);
    }
  };

  const handleModeChange = (mode: string) => {
    setPaymentMode(mode as any);
    saveChanges(isPaid, paymentType, paidAmount, mode);
  };

  return (
    <div className={cn("flex items-center gap-3", isLoading && "opacity-50 pointer-events-none")}>
      <label className="relative flex cursor-pointer items-center justify-center rounded border border-border bg-white w-5 h-5 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-1">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={isPaid}
          onChange={(e) => handleCheckboxChange(e.target.checked)}
        />
        <div className="absolute inset-0 rounded bg-primary opacity-0 transition-opacity peer-checked:opacity-100" />
        <Check className="absolute size-3.5 text-white opacity-0 transition-opacity peer-checked:opacity-100" strokeWidth={3} />
      </label>

      {isPaid && (
        <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
          <select
            value={paymentType}
            onChange={(e) => handlePaymentTypeChange(e.target.value as "FULL" | "PARTIAL")}
            className="h-8 rounded-md border border-border bg-white px-2 py-1 text-xs text-text shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="FULL">Full Payment</option>
            <option value="PARTIAL">Partial Payment</option>
          </select>

          <input
            type="number"
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            onBlur={handleAmountBlur}
            disabled={paymentType === "FULL"}
            placeholder="Amount"
            className="h-8 w-24 rounded-md border border-border bg-white px-2 py-1 text-xs text-text shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-sidebar disabled:text-muted"
          />

          <select
            value={paymentMode}
            onChange={(e) => handleModeChange(e.target.value)}
            className="h-8 rounded-md border border-border bg-white px-2 py-1 text-xs text-text shadow-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>
        </div>
      )}
      {isLoading && <Loader2 className="size-4 animate-spin text-muted" />}
    </div>
  );
}
