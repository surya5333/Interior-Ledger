"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors duration-150 cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-white hover:bg-primary-hover active:bg-primary-hover",
        secondary:
          "bg-primary-light text-primary hover:bg-[#dcecd4] active:bg-[#dcecd4]",
        outline:
          "border border-border bg-transparent hover:bg-hover active:bg-hover text-text",
        danger:
          "border border-danger text-danger hover:bg-danger-light active:bg-danger-light",
        ghost:
          "text-muted hover:bg-hover hover:text-text active:bg-hover",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 text-sm", // 48px height, 24px px
        sm: "h-8 px-3 text-xs",       // 32px height, 12px px
        lg: "h-14 px-8 text-base",    // 56px height, 32px px
        icon: "h-12 w-12",            // 48px
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" />}
            {children}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
