"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Input } from "@/common/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/common/components/ui/popover";
import { cn } from "@/common/lib/utils";

export interface SearchableSelectOption<T = unknown> {
  value: string;
  label: string;
  subtitle?: string;
  data?: T;
}

interface SearchableSelectProps<T = unknown> {
  value: string;
  onValueChange: (value: string, option?: SearchableSelectOption<T>) => void;
  options: SearchableSelectOption<T>[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  isLoading?: boolean;
  onSearch?: (query: string) => void;
  onInputValueChange?: (value: string) => void;
  onCreate?: (query: string) => void;
  createLabel?: (query: string) => string;
  minimumSearchLength?: number;
  displayValue?: string;
  className?: string;
}

export function SearchableSelect<T = unknown>({
  value,
  onValueChange,
  options,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
  isLoading = false,
  onSearch,
  onInputValueChange,
  onCreate,
  createLabel = (query) => `Create “${query}”`,
  minimumSearchLength = 0,
  displayValue,
  className,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [cachedSelection, setCachedSelection] = useState<{ value: string; label: string } | null>(null);

  // Debounced search
  useEffect(() => {
    if (!onSearch) return;

    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel = selectedOption?.label ?? (
    cachedSelection?.value === value ? cachedSelection.label : displayValue ?? ""
  );

  // Filter options locally if no backend search
  const filteredOptions = onSearch 
    ? options 
    : options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        option.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  // Keep remote-search selections visible after their result list is replaced.
  useEffect(() => {
    if (selectedOption) {
      setCachedSelection({ value: selectedOption.value, label: selectedOption.label });
    }
  }, [selectedOption]);

  useEffect(() => {
    if (!value) {
      setCachedSelection(null);
    }
  }, [value]);

  useEffect(() => {
    if (!open) {
      setInputValue(selectedLabel);
      setSearchQuery("");
    }
  }, [open, selectedLabel]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    if (!onInputValueChange && value && newValue !== selectedLabel) {
      onValueChange("");
    }
    setInputValue(newValue);
    setSearchQuery(newValue);
    onInputValueChange?.(newValue);
    if (!open && newValue.length > 0) setOpen(true);
  };

  const handleFocus = () => {
    setOpen(true);
  };

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverAnchor asChild>
          <div className="relative w-full">
            <Input
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onClick={() => setOpen(true)}
              placeholder={open ? searchPlaceholder : placeholder}
              disabled={disabled}
              className={cn("pr-8", className)}
              autoComplete="off"
            />
            <div 
              className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </PopoverAnchor>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] bg-white p-0 shadow-lg dark:bg-zinc-950"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-[300px] overflow-y-auto bg-white dark:bg-zinc-950">
            {searchQuery.length < minimumSearchLength ? (
              <div className="py-8  text-center text-sm text-muted-foreground">
                Type at least {minimumSearchLength} character{minimumSearchLength === 1 ? "" : "s"} to search...
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredOptions.length === 0 && !onCreate ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              <div className="p-2">
                {filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "relative flex cursor-pointer select-none items-center rounded-md px-3 py-2.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                      value === option.value && "bg-accent"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur
                      setCachedSelection({ value: option.value, label: option.label });
                      setInputValue(option.label);
                      onValueChange(option.value, option);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="truncate font-medium">{option.label}</span>
                      {option.subtitle && (
                        <span className="text-xs text-muted-foreground truncate mt-0.5">
                          {option.subtitle}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {onCreate && searchQuery.trim() && !filteredOptions.some((option) => option.label.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                  <button
                    type="button"
                    className="w-full rounded-md px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-accent"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onCreate(searchQuery.trim());
                      setInputValue(searchQuery.trim());
                      setOpen(false);
                    }}
                  >
                    {createLabel(searchQuery.trim())}
                  </button>
                )}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
