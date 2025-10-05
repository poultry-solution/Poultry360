"use client";

import React, { useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, Receipt } from "lucide-react";
import { useGetExpenses } from "@/fetchers/expenses/expenseQueries";

function formatDateYYYYMMDD(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function TodayExpenses() {
  const today = useMemo(() => formatDateYYYYMMDD(new Date()), []);

  const { data, isLoading, error } = useGetExpenses({
    startDate: today,
    endDate: today,
    limit: 10,
    categoryType: "EXPENSE" as any,
  });

  const expenses = (data?.data as any[]) || [];
  const total = expenses.reduce(
    (sum, ex: any) => sum + Number(ex.amount || 0),
    0
  );

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Today's Expenses</CardTitle>
        </div>
        <div className="text-xs text-muted-foreground">
          Total <span className="ml-1 font-semibold text-red-600">₹{Number(total).toLocaleString()}</span>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Loading today's expenses...
          </div>
        ) : error ? (
          <div className="text-center py-6 text-sm text-red-600">
            Failed to load expenses for today
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No expenses recorded today
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {expenses.slice(0, 6).map((ex: any) => (
              <li key={ex.id} className="flex items-center justify-between py-2 px-1 hover:bg-muted/50 rounded-md transition-colors">
                <div className="min-w-0 pr-3">
                  <div className="text-sm font-medium truncate">
                    {ex.description || ex.category?.name || "Expense"}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground truncate">
                    {ex.category?.name && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 mr-2">
                        {ex.category.name}
                      </span>
                    )}
                    {ex.farm?.name && <span className="mr-2 text-xs">{ex.farm.name}</span>}
                    {ex.batch?.batchNumber && (
                      <span className="text-xs">{ex.batch.batchNumber}</span>
                    )}
                  </div>
                </div>
                <div className="ml-2 shrink-0">
                  <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                    ₹{Number(ex.amount).toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default TodayExpenses;
