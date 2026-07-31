import { cn } from "../lib/cn";
import { Button } from "./ui/button";
import { FolderOpen } from "lucide-react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20 px-6 text-center", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-hover mb-5">
        {icon || <FolderOpen className="size-6 text-muted" strokeWidth={1.5} />}
      </div>
      <h3 className="text-lg font-semibold text-text mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-muted max-w-sm mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}
