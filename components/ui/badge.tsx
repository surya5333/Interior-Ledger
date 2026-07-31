import { cn } from "../../lib/cn";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "danger" | "muted";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-primary-light text-primary": variant === "default",
          "bg-green-50 text-success": variant === "success",
          "bg-danger-light text-danger": variant === "danger",
          "bg-hover text-muted": variant === "muted",
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };
