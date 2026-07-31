import { cn } from "../../lib/cn";

interface DataTableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

function DataTable({ className, children, ...props }: DataTableProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-white overflow-hidden", className)} {...props}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          {children}
        </table>
      </div>
    </div>
  );
}

function DataTableHeader({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={cn("sticky top-0 z-10 bg-white shadow-sm", className)} {...props}>
      {children}
    </thead>
  );
}

function DataTableHeaderRow({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn("border-b border-border", className)} {...props}>
      {children}
    </tr>
  );
}

function DataTableHead({ className, align, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-[13px] font-semibold uppercase tracking-wider text-muted",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

function DataTableBody({ className, children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("", className)} {...props}>
      {children}
    </tbody>
  );
}

function DataTableRow({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-border/50 last:border-0 transition-colors duration-100 hover:bg-hover/50",
        "h-[56px]",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

function DataTableCell({ className, align, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-base",
        align === "right" && "text-right font-[tabular-nums]",
        align === "center" && "text-center",
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

function DataTableEmpty({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-16 text-center text-muted">
        {children}
      </td>
    </tr>
  );
}

export {
  DataTable,
  DataTableHeader,
  DataTableHeaderRow,
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableCell,
  DataTableEmpty,
};
