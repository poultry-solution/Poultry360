"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Plus, Loader2, Filter } from "lucide-react";
import { DataTable } from "@/common/components/ui/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { Label } from "@/common/components/ui/label";

export type ExpenseCategoryFilter = "All" | "Feed" | "Chicks" | "Other" | "Medicine";

function matchesCategoryFilter(row: any, filter: ExpenseCategoryFilter): boolean {
  if (filter === "All") return true;
  const name = row.category?.name || "Other";
  if (filter === "Chicks") return name === "Hatchery" || name === "Chicks";
  return name === filter;
}

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
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategoryFilter>("All");

  const filteredExpenses = useMemo(() => {
    return expenses.filter((row) => matchesCategoryFilter(row, categoryFilter));
  }, [expenses, categoryFilter]);

  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce(
      (sum: number, ex: any) => sum + Number(ex.amount ?? 0),
      0
    );
  }, [filteredExpenses]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <CardTitle>Expenses</CardTitle>
          <CardDescription className="hidden sm:block">
            List of expenses for this batch with all category
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 min-w-0 flex-1 sm:flex-initial">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
            <Label htmlFor="expense-category-filter" className="text-sm text-muted-foreground whitespace-nowrap hidden sm:inline">
              Filter by category
            </Label>
            <Select
              value={categoryFilter}
              onValueChange={(v) => setCategoryFilter(v as ExpenseCategoryFilter)}
            >
              <SelectTrigger id="expense-category-filter" className="w-full sm:w-[140px] h-9 bg-background min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Feed">Feed</SelectItem>
                <SelectItem value="Chicks">Chicks</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
                <SelectItem value="Medicine">Medicine</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!isBatchClosed ? (
            <Button
              className="bg-primary hover:bg-primary/90 shrink-0 w-full sm:w-auto"
              onClick={openNewExpense}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          ) : (
            <Badge variant="secondary" className="bg-gray-100 text-gray-600 shrink-0 w-full sm:w-auto justify-center">
              Batch Closed - No New Entries
            </Badge>
          )}
        </div>
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
            data={filteredExpenses}
            columns={expenseColumns}
            showFooter={true}
            footerContent={
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-900">
                  {categoryFilter === "All" ? "Total Expenses" : `Total (${categoryFilter})`}
                </span>
                <span className="font-bold text-lg text-gray-900">
                  ₹{filteredTotal.toLocaleString()}
                </span>
              </div>
            }
            emptyMessage={categoryFilter === "All" ? "No expenses recorded yet" : `No ${categoryFilter} expenses`}
          />
        )}
      </CardContent>
    </Card>
  );
}
