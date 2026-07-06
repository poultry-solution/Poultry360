import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { DataTable } from "@/common/components/ui/data-table";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SALES_BALANCE_PAGE_LIMIT = 10;

interface SalesBalanceTabProps {
  isBatchClosed: boolean;
  customerBalances: any[];
  receivableTotal: number;
  ledgerColumns: any[];
}

export function SalesBalanceTab({
  isBatchClosed,
  customerBalances,
  receivableTotal,
  ledgerColumns,
}: SalesBalanceTabProps) {
  const [page, setPage] = useState(1);
  const totalRows = customerBalances.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / SALES_BALANCE_PAGE_LIMIT));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const showingStart = totalRows > 0 ? (currentPage - 1) * SALES_BALANCE_PAGE_LIMIT + 1 : 0;
  const showingEnd = totalRows > 0 ? Math.min(currentPage * SALES_BALANCE_PAGE_LIMIT, totalRows) : 0;
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const visibleCustomerBalances = useMemo(() => {
    const start = (currentPage - 1) * SALES_BALANCE_PAGE_LIMIT;
    return customerBalances.slice(start, start + SALES_BALANCE_PAGE_LIMIT);
  }, [customerBalances, currentPage]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <CardTitle>Customer Ledger</CardTitle>
          <CardDescription className="hidden sm:block">
            Balances with customers for this batch
          </CardDescription>
        </div>
        {isBatchClosed && (
          <Badge variant="secondary" className="bg-gray-100 text-gray-600 shrink-0 w-full sm:w-auto justify-center">
            Batch Closed - No New Entries
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="space-y-3">
          <DataTable
            data={visibleCustomerBalances}
            columns={ledgerColumns}
            showFooter={true}
            footerContent={
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">
                  Total Receivable
                </span>
                <span className="font-bold text-lg text-orange-600">
                  ₹{receivableTotal.toLocaleString()}
                </span>
              </div>
            }
            emptyMessage="No ledger entries yet"
          />
          <div className="flex flex-col gap-3 px-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {showingStart}-{showingEnd} of {totalRows}
            </div>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage(currentPage - 1)}
                disabled={!canGoPrevious}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage(currentPage + 1)}
                disabled={!canGoNext}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
