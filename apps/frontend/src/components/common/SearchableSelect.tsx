"use client";

import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/ui/popover";
import { ScrollArea } from "@/common/components/ui/scroll-area";
import { cn } from "@/common/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  subtitle?: string;
  data?: any;
}

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string, option?: SearchableSelectOption) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  isLoading?: boolean;
  onSearch?: (query: string) => void;
  className?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  disabled = false,
  isLoading = false,
  onSearch,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputValue, setInputValue] = useState("");

  // Debounced search
  useEffect(() => {
    if (!onSearch) return;

    const timer = setTimeout(() => {
      onSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, onSearch]);

  const selectedOption = options.find((option) => option.value === value);

  // Filter options locally if no backend search
  const filteredOptions = onSearch 
    ? options 
    : options.filter((option) =>
        option.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        option.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  // Sync display value
  useEffect(() => {
    if (!open) {
      setInputValue(selectedOption ? selectedOption.label : "");
      setSearchQuery("");
    }
  }, [open, selectedOption]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSearchQuery(newValue);
    if (!open && newValue.length > 0) setOpen(true);
  };

  const handleFocus = () => {
    // Only open if there's already a value or if user starts typing
    if (inputValue.length > 0) {
      setOpen(true);
    }
  };

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <div className="relative w-full">
            <Input
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              placeholder={placeholder}
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
        </PopoverTrigger>
        <PopoverContent 
          className="bg-white w-[var(--radix-popover-trigger-width)] p-0 " 
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ScrollArea className="max-h-[300px]">
            {searchQuery.length === 0 ? (
              <div className="py-8  text-center text-sm text-muted-foreground">
                Start typing to search...
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredOptions.length === 0 ? (
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
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
