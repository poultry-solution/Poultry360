"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Building2, Check, X } from "lucide-react";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Button } from "@/common/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/ui/popover";
import { useSearchCompanies, type Company } from "@/fetchers/dealer/companyQueries";
import { cn } from "@/common/lib/utils";

interface CompanySearchSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CompanySearchSelect({
  value,
  onValueChange,
  placeholder = "Search and select company...",
  label = "Company",
  required = false,
  disabled = false,
  className,
}: CompanySearchSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: searchData, isLoading: isSearching } = useSearchCompanies(searchQuery);

  const companies = searchData?.data || [];

  // Load selected company when value changes externally or when companies are loaded
  useEffect(() => {
    if (value && companies.length > 0) {
      const company = companies.find((c) => c.id === value);
      if (company && company.id !== selectedCompany?.id) {
        setSelectedCompany(company);
      }
    } else if (!value) {
      setSelectedCompany(null);
    }
  }, [value, companies]);

  const handleSelect = (company: Company) => {
    setSelectedCompany(company);
    onValueChange(company.id);
    setIsOpen(false);
    setSearchQuery(""); // Clear search after selection
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setSelectedCompany(null);
    onValueChange("");
    setSearchQuery("");
  };

  // Reset search when popover closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor="company-search">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-full justify-between"
            disabled={disabled}
            id="company-search"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {selectedCompany ? (
                <>
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{selectedCompany.name}</span>
                  {selectedCompany.owner && (
                    <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                      ({selectedCompany.owner.name})
                    </span>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            {selectedCompany && !disabled && (
              <X
                className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                placeholder="Type to search companies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Searching...
                </span>
              </div>
            ) : searchQuery.length < 2 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Type at least 2 characters to search</p>
                <p className="text-xs mt-1">This helps protect company information</p>
              </div>
            ) : companies.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No companies found</p>
                <p className="text-xs mt-1">Try a different search term</p>
              </div>
            ) : (
              <div className="p-1">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    onClick={() => handleSelect(company)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-sm cursor-pointer hover:bg-accent transition-colors",
                      selectedCompany?.id === company.id && "bg-accent"
                    )}
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{company.name}</div>
                      {company.owner && (
                        <div className="text-xs text-muted-foreground truncate">
                          Owner: {company.owner.name} • {company.owner.phone}
                        </div>
                      )}
                    </div>
                    {selectedCompany?.id === company.id && (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
