"use client";

import * as React from "react";
import { cn } from "../../lib/cn";

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, children, error, ...props }, ref) => {
    return (
      <select
        className={cn(
          "flex h-12 w-full rounded-lg border bg-white px-4 text-base text-text appearance-none",
          "transition-all duration-150",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23707070%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')]",
          "bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10",
          error
            ? "border-danger focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger"
            : "border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
    );
  }
);
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
