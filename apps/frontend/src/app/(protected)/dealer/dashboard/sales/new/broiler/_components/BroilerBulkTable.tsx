"use client";

import { Plus } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { BroilerBulkRow } from "./BroilerBulkRow";
import { BulkBroilerRow, BulkBroilerRowDerived } from "./types";

interface Props {
  rows: BulkBroilerRow[];
  derived: BulkBroilerRowDerived[];
  showErrorsForRow: (rowId: string) => boolean;
  serverErrorsForRow: (rowId: string) => string[];
  showCustomInvoice: boolean;
  onChangeRow: (rowId: string, patch: Partial<BulkBroilerRow>) => void;
  onRemoveRow: (rowId: string) => void;
  onAddRow: () => void;
}

/** One card per buyer on every screen size. A wide table squeezed the number
 * boxes until typed values were cut off. */
export function BroilerBulkTable({
  rows,
  derived,
  showErrorsForRow,
  serverErrorsForRow,
  showCustomInvoice,
  onChangeRow,
  onRemoveRow,
  onAddRow,
}: Props) {
  return (
    <div className="space-y-3">
      {rows.map((row, idx) => (
        <BroilerBulkRow
          key={row.id}
          index={idx}
          row={row}
          derived={derived[idx]}
          showErrors={showErrorsForRow(row.id)}
          serverErrors={serverErrorsForRow(row.id)}
          showCustomInvoice={showCustomInvoice}
          removable={rows.length > 1}
          onChange={(patch) => onChangeRow(row.id, patch)}
          onRemove={() => onRemoveRow(row.id)}
        />
      ))}

      <Button type="button" variant="outline" onClick={onAddRow} className="w-full md:w-auto">
        <Plus className="mr-2 h-4 w-4" />
        Add buyer
      </Button>
    </div>
  );
}
