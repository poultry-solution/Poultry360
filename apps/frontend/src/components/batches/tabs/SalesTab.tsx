import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";
import { DataTable } from "@/common/components/ui/data-table";

interface SalesTabProps {
  isBatchClosed: boolean;
  salesLoading: boolean;
  salesError: any;
  batchSales: any[];
  salesTotal: number;
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
  salesColumns,
  openNewSale,
  refetchSales,
}: SalesTabProps) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Sales</CardTitle>
          <CardDescription>Items sold from this batch</CardDescription>
        </div>
        {!isBatchClosed && (
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={openNewSale}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Sale
          </Button>
        )}
        {isBatchClosed && (
          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
            Batch Closed - No New Entries
          </Badge>
        )}
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
                  ₹{salesTotal.toLocaleString()}
                </span>
              </div>
            }
            emptyMessage="No sales recorded yet"
          />
        )}
      </CardContent>
    </Card>
  );
}
