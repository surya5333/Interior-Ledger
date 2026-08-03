"use client";

import * as React from "react";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "./button";
import { Input } from "./input";

interface ClientOption {
  id: string;
  name: string;
}

interface ClientComboboxProps {
  clients: ClientOption[];
  value?: string; // The display name
  onChange: (name: string) => void;
  error?: boolean;
}

export function ClientCombobox({ clients, value, onChange, error }: ClientComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Sync the external value into the search field when modal opens with an edit
  React.useEffect(() => {
    setSearch(value ?? "");
  }, [value]);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = clients.some(
    (c) => c.name.toLowerCase() === search.trim().toLowerCase()
  );

  const handleSelect = (name: string) => {
    setSearch(name);
    onChange(name);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    onChange(val);
    if (!open && val.length > 0) setOpen(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          value={search}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          placeholder="Type or select a client..."
          error={error}
          className="pr-8"
          autoComplete="off"
        />
        <ChevronsUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />
      </div>

      {open && (search.length > 0 || clients.length > 0) && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-white shadow-lg max-h-[200px] overflow-y-auto">
          {filtered.length > 0 && (
            <div className="p-1">
              {filtered.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c.name)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text hover:bg-surface transition-colors cursor-pointer",
                    c.name.toLowerCase() === search.trim().toLowerCase() && "bg-surface"
                  )}
                >
                  <Check
                    className={cn(
                      "size-4 shrink-0",
                      c.name.toLowerCase() === search.trim().toLowerCase()
                        ? "opacity-100 text-primary"
                        : "opacity-0"
                    )}
                  />
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {search.trim().length > 0 && !exactMatch && (
            <>
              {filtered.length > 0 && <div className="border-t border-border" />}
              <div className="p-1">
                <button
                  type="button"
                  onClick={() => handleSelect(search.trim())}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-primary hover:bg-surface transition-colors cursor-pointer"
                >
                  <UserPlus className="size-4 shrink-0" />
                  Create &ldquo;{search.trim()}&rdquo;
                </button>
              </div>
            </>
          )}

          {filtered.length === 0 && (search.trim().length === 0 || exactMatch) && (
            <div className="px-3 py-2 text-sm text-muted">No clients found.</div>
          )}
        </div>
      )}
    </div>
  );
}
