"use client";

import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { NativeSelect } from "./ui/select";
import { cn } from "../lib/cn";

interface FilterOption {
  value: string;
  label: string;
}

interface SearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  filters?: {
    value: string;
    onChange: (value: string) => void;
    options: FilterOption[];
    placeholder?: string;
  }[];
  className?: string;
}

export function SearchBar({
  query,
  onQueryChange,
  placeholder = "Search...",
  filters,
  className,
}: SearchBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <div className="relative flex-1 min-w-[240px]">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>
      {filters?.map((filter, i) => (
        <NativeSelect
          key={i}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          className="w-auto min-w-[160px]"
        >
          <option value="">{filter.placeholder || "All"}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </NativeSelect>
      ))}
    </div>
  );
}
