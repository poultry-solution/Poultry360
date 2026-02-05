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
    <div className="flex items-center gap-1 md:gap-2 flex-wrap justify-end">
      <Button
        variant="outline"
        size="sm"
        className="hover:bg-green-50 hover:text-green-700 border-green-200 text-xs md:text-sm h-7 md:h-8 px-2 md:px-3 gap-1"
        onClick={onAddExpense}
      >
        <Plus className="h-3 w-3 md:h-4 md:w-4" />
        Expense
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="hover:bg-green-50 hover:text-green-700 border-green-200 text-xs md:text-sm h-7 md:h-8 px-2 md:px-3 gap-1"
        onClick={onAddSale}
      >
        <Plus className="h-3 w-3 md:h-4 md:w-4" />
        Sale
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="hover:bg-green-50 hover:text-green-700 border-green-200 text-xs md:text-sm h-7 md:h-8 px-2 md:px-3 gap-1"
        onClick={onAddMortality}
      >
        <Plus className="h-3 w-3 md:h-4 md:w-4" />
        Mortality
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="hover:bg-green-50 hover:text-green-700 border-green-200 text-xs md:text-sm h-7 md:h-8 px-2 md:px-3 gap-1"
        onClick={onRecordWeight}
      >
        <Plus className="h-3 w-3 md:h-4 md:w-4" />
        Weight
      </Button>
    </div>
  );
}
