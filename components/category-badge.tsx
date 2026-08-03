import type { HTMLAttributes } from "react";

import { cn } from "../lib/cn";
import { getCategoryBadgeColors, normalizeCategoryName } from "../lib/category-color";

interface CategoryBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  category?: string | null;
  emptyLabel?: string;
}

export function CategoryBadge({
  category,
  emptyLabel = "Uncategorized",
  className,
  style,
  ...props
}: CategoryBadgeProps) {
  const normalizedCategory = normalizeCategoryName(category);
  const label = normalizedCategory || emptyLabel;
  const colors = getCategoryBadgeColors(normalizedCategory);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none whitespace-nowrap",
        className
      )}
      style={{ ...colors, ...style }}
      title={label}
      {...props}
    >
      <span className="max-w-[16rem] truncate">{label}</span>
    </span>
  );
}
