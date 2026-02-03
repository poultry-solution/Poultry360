"use client";

import { Plus } from "lucide-react";
import { Button } from "@/common/components/ui/button";

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
      <Button
        variant="outline"
        className="hover:bg-green-50 hover:text-green-700 border-green-200 gap-2"
        onClick={onAddExpense}
      >
        <Plus className="h-4 w-4" />
        Add Expense
      </Button>
      <Button
        variant="outline"
        className="hover:bg-green-50 hover:text-green-700 border-green-200 gap-2"
        onClick={onAddSale}
      >
        <Plus className="h-4 w-4" />
        Add Sales
      </Button>
      <Button
        variant="outline"
        className="hover:bg-green-50 hover:text-green-700 border-green-200 gap-2"
        onClick={onAddMortality}
      >
        <Plus className="h-4 w-4" />
        Add Mortality
      </Button>
      <Button
        variant="outline"
        className="hover:bg-green-50 hover:text-green-700 border-green-200 gap-2"
        onClick={onRecordWeight}
      >
        <Plus className="h-4 w-4" />
        Record Weight
      </Button>
    </div>
  );
}
