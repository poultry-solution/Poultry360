import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import { DataTable } from "@/common/components/ui/data-table";

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
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Customer Ledger</CardTitle>
          <CardDescription>
            Balances with customers for this batch
          </CardDescription>
        </div>
        {isBatchClosed && (
          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
            Batch Closed - No New Entries
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <DataTable
          data={customerBalances}
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
      </CardContent>
    </Card>
  );
}
