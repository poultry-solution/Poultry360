"use client";

import { Plus, Clock } from "lucide-react";

interface QuickActionsProps {
  onAddExpense: () => void;
  onAddSale: () => void;
  onAddMortality: () => void;
  onRecordWeight: () => void;
}

export function QuickActions({
  onAddExpense,
  onAddSale,
  onAddMortality,
  onRecordWeight,
}: QuickActionsProps) {
  return (
    <div className="hidden md:flex md:items-center md:gap-2 md:flex-wrap md:justify-end">
      <button
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
        onClick={onAddExpense}
      >
        <Plus className="h-4 w-4" />
        <span className="truncate">Add Expense</span>
      </button>
      <button
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
        onClick={onAddSale}
      >
        <Plus className="h-4 w-4" />
        <span className="truncate">Add Sales</span>
      </button>
      <button
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
        onClick={onAddMortality}
      >
        <Plus className="h-4 w-4" />
        <span className="truncate">Add Mortality</span>
      </button>
      <button
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
        onClick={onRecordWeight}
      >
        <Plus className="h-4 w-4" />
        <span className="truncate">Record Weight</span>
      </button>
    </div>
  );
}
