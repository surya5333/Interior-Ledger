import { cn } from "../../lib/cn";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-pulse rounded-md bg-border/60", className)}
      {...props}
    />
  );
}

function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 px-4 py-4 border-b border-border/50">
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton
              key={col}
              className="h-4 flex-1"
              style={{ maxWidth: col === 0 ? "180px" : col === cols - 1 ? "80px" : "120px" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-white p-6 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-8 fade-in">
      {/* Header skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-4 w-48" />
      </div>
      {/* Table skeleton */}
      <div className="rounded-xl border border-border bg-white overflow-hidden">
        <TableSkeleton />
      </div>
    </div>
  );
}

export { Skeleton, TableSkeleton, CardSkeleton, PageSkeleton };
