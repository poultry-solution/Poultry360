"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/common/components/ui/button";

interface LedgerPaginationProps {
  page: number;
  totalPages: number;
  totalRows: number;
  pageLimit: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  className?: string;
}

export function LedgerPagination({
  page,
  totalPages,
  totalRows,
  pageLimit,
  onPageChange,
  loading = false,
  className,
}: LedgerPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safePage = Math.min(Math.max(1, page), safeTotalPages);
  const showingStart = totalRows > 0 ? (safePage - 1) * pageLimit + 1 : 0;
  const showingEnd = totalRows > 0 ? Math.min(safePage * pageLimit, totalRows) : 0;

  return (
    <div className={className}>
      <div className="flex flex-col gap-3 border-t border-gray-200 px-3 py-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-muted-foreground">
          {totalRows > 0
            ? `Showing ${showingStart}-${showingEnd} of ${totalRows}`
            : "No records"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => onPageChange(Math.max(1, safePage - 1))}
            disabled={safePage <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium text-muted-foreground">
            Page {safePage} of {safeTotalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => onPageChange(Math.min(safeTotalPages, safePage + 1))}
            disabled={safePage >= safeTotalPages || loading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
