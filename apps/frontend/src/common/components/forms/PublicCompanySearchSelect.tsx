"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Loader2, Building2, Check, X, ChevronDown } from "lucide-react";
import { useSearchPublicCompanies, type PublicCompany } from "@/fetchers/public/companyQueries";
import { useI18n } from "@/i18n/useI18n";

interface PublicCompanySearchSelectProps {
  value?: string | null;
  onValueChange: (value: string | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function PublicCompanySearchSelect({
  value,
  onValueChange,
  placeholder,
  label,
  required = false,
  disabled = false,
  className = "",
}: PublicCompanySearchSelectProps) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<PublicCompany | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Fetch companies with debounced search query - only when popover is open
  const { data: companiesData, isLoading: isSearching } = useSearchPublicCompanies(
    {
      search: debouncedSearchQuery.length >= 2 ? debouncedSearchQuery : undefined,
      limit: 20,
    },
    {
      enabled: isOpen && debouncedSearchQuery.length >= 2,
    }
  );

  const companies = companiesData?.data || [];

  // Load selected company when value changes externally
  useEffect(() => {
    if (value) {
      // Try to find company in loaded companies
      if (companies.length > 0) {
        const company = companies.find((c) => c.id === value);
        if (company && company.id !== selectedCompany?.id) {
          setSelectedCompany(company);
        }
      }
    } else {
      setSelectedCompany(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Focus input when popover opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSelect = (company: PublicCompany) => {
    setSelectedCompany(company);
    onValueChange(company.id);
    setIsOpen(false);
    setSearchQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedCompany(null);
    onValueChange(null);
    setSearchQuery("");
  };

  // Reset search when popover closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  const displayValue = isOpen ? searchQuery : (selectedCompany?.name || "");
  const resolvedPlaceholder = placeholder || t("common.searchPlaceholderCompany");
  const resolvedLabel = label || t("auth.dealerSignup.companyLabel");

  return (
    <div className={`space-y-2 ${className}`} ref={containerRef}>
      {resolvedLabel && (
        <label htmlFor="company-search" className="text-sm font-medium">
          {resolvedLabel}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`relative flex items-center w-full h-10 px-3 py-2 text-sm bg-white border rounded-md text-left ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'
          } ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'}`}
        >
          {!isOpen && selectedCompany && (
            <Building2 className="mr-2 h-4 w-4 text-gray-500" />
          )}
          <span className={`flex-1 truncate ${!selectedCompany && !isOpen ? 'text-gray-500' : ''}`}>
            {displayValue || resolvedPlaceholder}
          </span>
          <div className="flex items-center gap-1 ml-2">
            {selectedCompany && !disabled && !isOpen && (
              <div
                onClick={handleClear}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="p-0.5 hover:bg-gray-100 rounded cursor-pointer"
              >
                <X className="h-4 w-4 text-gray-500" />
              </div>
            )}
            <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${
              isOpen ? 'transform rotate-180' : ''
            }`} />
          </div>
        </button>

        {isOpen && (
          <div 
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    // Prevent Enter from submitting parent form
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                    // Allow Escape to close popover
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setIsOpen(false);
                    }
                  }}
                  placeholder={t("common.typeToSearch")}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              {isSearching ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">{t("common.searching")}</span>
                </div>
              ) : debouncedSearchQuery.length < 2 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>{t("common.typeAtLeast", { count: 2 })}</p>
                  <p className="text-xs mt-1 text-gray-400">{t("common.searchCompanyHint")}</p>
                </div>
              ) : companies.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>{t("common.noCompaniesFound")}</p>
                  <p className="text-xs mt-1 text-gray-400">{t("common.tryDifferentSearch")}</p>
                </div>
              ) : (
                <div className="p-1">
                  {companies.map((company) => (
                    <div
                      key={company.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(company);
                      }}
                      onMouseDown={(e) => {
                        // Prevent focus loss and form events
                        e.preventDefault();
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded cursor-pointer hover:bg-gray-100 ${
                        selectedCompany?.id === company.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <Building2 className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{company.name}</div>
                        {company.owner && (
                          <div className="text-xs text-gray-500 truncate">
                            {t("common.ownerLabel")}: {company.owner.name} • {company.owner.phone}
                          </div>
                        )}
                        {company.address && (
                          <div className="text-xs text-gray-500 truncate">
                            {company.address}
                          </div>
                        )}
                      </div>
                      {selectedCompany?.id === company.id && (
                        <Check className="h-4 w-4 shrink-0 text-blue-600" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Backdrop to close popover when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(false);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      )}
    </div>
  );
}
