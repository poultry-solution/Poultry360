import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";

interface SalesBalanceTabProps {
  isBatchClosed: boolean;
  customerBalances: any[];
  receivableTotal: number;
  ledgerColumns: any[];
  openNewLedger: () => void;
}

export function SalesBalanceTab({
  isBatchClosed,
  customerBalances,
  receivableTotal,
  ledgerColumns,
  openNewLedger,
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
        {!isBatchClosed && (
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={openNewLedger}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        )}
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
