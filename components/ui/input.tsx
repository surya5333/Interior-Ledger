"use client";

import * as React from "react";
import { cn } from "../../lib/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    const normalizedProps =
      type !== "file" && Object.prototype.hasOwnProperty.call(props, "value")
        ? { ...props, value: props.value ?? "" }
        : props;

    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-lg border bg-white px-4 text-base text-text",
          "placeholder:text-muted/60",
          "transition-all duration-150",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          type === "date" && "pr-10",
          error
            ? "border-danger focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger"
            : "border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          className
        )}
        ref={ref}
        {...normalizedProps}
      />
    );
  }
);
Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    const normalizedProps = Object.prototype.hasOwnProperty.call(props, "value")
      ? { ...props, value: props.value ?? "" }
      : props;

    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-lg border bg-white px-4 py-3 text-base text-text",
          "placeholder:text-muted/60",
          "transition-all duration-150",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-danger focus:outline-none focus:ring-2 focus:ring-danger/20 focus:border-danger"
            : "border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
          className
        )}
        ref={ref}
        {...normalizedProps}
      />
    );
  }
);
Textarea.displayName = "Textarea";

const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    return (
      <label
        className={cn(
          "text-sm font-medium text-text leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Label.displayName = "Label";

export { Input, Textarea, Label };
