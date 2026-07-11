import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Plus, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { DataTable } from "@/common/components/ui/data-table";

interface SalesTabProps {
  isBatchClosed: boolean;
  salesLoading: boolean;
  salesError: any;
  batchSales: any[];
  salesTotal: number;
  salesPagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  salesSummary?: {
    totalAmount: number;
    totalCount: number;
    pageAmount: number;
  };
  page: number;
  onPageChange: (page: number) => void;
  salesColumns: any[];
  openNewSale: () => void;
  refetchSales: () => void;
}

export function SalesTab({
  isBatchClosed,
  salesLoading,
  salesError,
  batchSales,
  salesTotal,
  salesPagination,
  salesSummary,
  page,
  onPageChange,
  salesColumns,
  openNewSale,
  refetchSales,
}: SalesTabProps) {
  const totalAmount = Number(salesSummary?.totalAmount ?? salesTotal ?? 0);
  const totalRows = Number(salesPagination?.total ?? salesSummary?.totalCount ?? 0);
  const pageLimit = Number(salesPagination?.limit ?? 10);
  const totalPages = Math.max(1, Number(salesPagination?.totalPages ?? 1));
  const currentPage = Math.min(Math.max(1, Number(salesPagination?.page ?? page)), totalPages);
  const showingStart = totalRows > 0 ? (currentPage - 1) * pageLimit + 1 : 0;
  const showingEnd = totalRows > 0 ? Math.min(currentPage * pageLimit, totalRows) : 0;
  const canGoPrevious = currentPage > 1 && !salesLoading;
  const canGoNext = currentPage < totalPages && !salesLoading;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <CardTitle>Sales</CardTitle>
          <CardDescription className="hidden sm:block">Items sold from this batch</CardDescription>
        </div>
        <div className="shrink-0 w-full sm:w-auto">
          {!isBatchClosed && (
            <Button
              className="bg-primary hover:bg-primary/90 w-full sm:w-auto"
              onClick={openNewSale}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Sale
            </Button>
          )}
          {isBatchClosed && (
            <Badge variant="secondary" className="bg-gray-100 text-gray-600 w-full sm:w-auto justify-center">
              Batch Closed - No New Entries
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {salesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading sales...</span>
          </div>
        ) : salesError ? (
          <div className="text-center py-8">
            <p className="text-red-600">Failed to load sales data</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchSales()}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <DataTable
              data={batchSales || []}
              columns={salesColumns}
              showFooter={true}
              footerContent={
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">
                    Total Sales
                  </span>
                  <span className="font-bold text-lg text-green-600">
                    ₹{totalAmount.toLocaleString()}
                  </span>
                </div>
              }
              emptyMessage="No sales recorded yet"
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
                  onClick={() => onPageChange(currentPage - 1)}
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
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={!canGoNext}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
