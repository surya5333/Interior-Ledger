"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "../../lib/cn";
import { Input } from "./input";

interface AutocompleteComboboxProps<T> {
  options: T[];
  getOptionLabel: (opt: T) => string;
  getOptionValue: (opt: T) => string;
  value: string;
  onChange: (text: string) => void;
  onSelect?: (opt: T) => void;
  onCreate?: (text: string) => void;
  placeholder?: string;
  error?: boolean;
  readOnly?: boolean;
  allowCreate?: boolean;
  createLabel?: (text: string) => React.ReactNode;
  emptyLabel?: string;
  className?: string;
  inputName?: string;
  inputAutoComplete?: string;
}

export function AutocompleteCombobox<T>({
  options,
  getOptionLabel,
  getOptionValue,
  value,
  onChange,
  onSelect,
  onCreate,
  placeholder,
  error,
  readOnly,
  allowCreate = false,
  createLabel,
  emptyLabel = "No results found.",
  className,
  inputName,
  inputAutoComplete = "off",
}: AutocompleteComboboxProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setSearch(value ?? "");
  }, [value]);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = options.filter((o) =>
    getOptionLabel(o).toLowerCase().includes(search.toLowerCase())
  );

  const exactMatch = options.some(
    (o) => getOptionValue(o).toLowerCase() === search.trim().toLowerCase()
  );

  const trimmedSearch = search.trim();

  const handleSelectOption = (opt: T) => {
    const label = getOptionLabel(opt);
    setSearch(label);
    onChange(getOptionLabel(opt));
    onSelect?.(opt);
    setOpen(false);
  };

  const handleCreate = () => {
    if (trimmedSearch.length === 0) return;
    onCreate?.(trimmedSearch);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    const val = e.target.value;
    setSearch(val);
    onChange(val);
    if (!open && val.length > 0) setOpen(true);
  };

  const handleInputFocus = () => {
    if (readOnly) return;
    setOpen(true);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          value={search}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          error={error}
          readOnly={readOnly}
          className={cn("pr-8", readOnly && "cursor-not-allowed")}
          autoComplete={inputAutoComplete}
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          name={inputName}
        />
        <ChevronsUpDown
          className={cn(
            "absolute right-2.5 top-1/2 -translate-y-1/2 size-4 pointer-events-none transition-opacity",
            readOnly ? "opacity-30 text-muted" : "text-muted"
          )}
        />
      </div>

      {open && !readOnly && (search.length > 0 || options.length > 0) && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-white shadow-lg max-h-[200px] overflow-y-auto">
          {filtered.length > 0 && (
            <div className="p-1">
              {filtered.map((o) => {
                const isSelected =
                  getOptionValue(o).toLowerCase() === search.trim().toLowerCase();
                return (
                  <button
                    key={getOptionValue(o)}
                    type="button"
                    onClick={() => handleSelectOption(o)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-text hover:bg-surface transition-colors cursor-pointer text-left",
                      isSelected && "bg-surface"
                    )}
                  >
                    <Check
                      className={cn(
                        "size-4 shrink-0",
                        isSelected ? "opacity-100 text-primary" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{getOptionLabel(o)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {allowCreate && trimmedSearch.length > 0 && !exactMatch && (
            <>
              {filtered.length > 0 && <div className="border-t border-border" />}
              <div className="p-1">
                <button
                  type="button"
                  onClick={handleCreate}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-primary hover:bg-surface transition-colors cursor-pointer text-left"
                >
                  <Plus className="size-4 shrink-0" />
                  {createLabel ? (
                    createLabel(trimmedSearch)
                  ) : (
                    <>
                      Use &ldquo;{trimmedSearch}&rdquo;
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {filtered.length === 0 &&
            (trimmedSearch.length === 0 || exactMatch || !allowCreate) && (
              <div className="px-3 py-2 text-sm text-muted">
                {trimmedSearch.length === 0 && options.length === 0
                  ? emptyLabel
                  : trimmedSearch.length === 0
                  ? `Showing all ${options.length} options`
                  : emptyLabel}
              </div>
            )}
        </div>
      )}
    </div>
  );
}
