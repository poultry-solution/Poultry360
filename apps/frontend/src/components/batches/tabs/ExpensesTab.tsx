import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";

interface ExpensesTabProps {
  isBatchClosed: boolean;
  expensesLoading: boolean;
  expensesError: any;
  expenses: any[];
  expensesTotal: number;
  expenseColumns: any[];
  openNewExpense: () => void;
}

export function ExpensesTab({
  isBatchClosed,
  expensesLoading,
  expensesError,
  expenses,
  expensesTotal,
  expenseColumns,
  openNewExpense,
}: ExpensesTabProps) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Expenses</CardTitle>
          <CardDescription>
            List of expenses broiler for this batch with all category
          </CardDescription>
        </div>
        {!isBatchClosed && (
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={openNewExpense}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        )}
        {isBatchClosed && (
          <Badge variant="secondary" className="bg-gray-100 text-gray-600">
            Batch Closed - No New Entries
          </Badge>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {expensesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading expenses...</span>
          </div>
        ) : expensesError ? (
          <div className="text-center py-8">
            <p className="text-red-600">
              Failed to load expenses. Please try again.
            </p>
          </div>
        ) : (
          <DataTable
            data={expenses}
            columns={expenseColumns}
            showFooter={true}
            footerContent={
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">
                  Total Expenses
                </span>
                <span className="font-bold text-lg text-gray-900">
                  ₹{expensesTotal.toLocaleString()}
                </span>
              </div>
            }
            emptyMessage="No expenses recorded yet"
          />
        )}
      </CardContent>
    </Card>
  );
}
