"use client";

import { Fragment } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { BroilerBulkRow, BroilerBulkRowErrors } from "./BroilerBulkRow";
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
  // Desktop: 11 columns (# · Buyer · Weight · Broilers · Rate · Discount ·
  // Total · Paid · Payment · ⋮ · ✕). Error strip below each row spans all 11.
  const columnCount = 11;

  return (
    <div className="space-y-3">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border bg-white md:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="p-2 text-left font-medium w-[40px]">#</th>
              <th className="p-2 text-left font-medium">Buyer</th>
              <th className="p-2 text-left font-medium">Weight (kg)</th>
              <th className="p-2 text-left font-medium">Broilers</th>
              <th className="p-2 text-left font-medium">Rate/kg</th>
              <th className="p-2 text-left font-medium">Discount</th>
              <th className="p-2 text-right font-medium">Line total</th>
              <th className="p-2 text-left font-medium">Paid</th>
              <th className="p-2 text-left font-medium">Payment</th>
              <th className="p-2" />
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const showErrors = showErrorsForRow(row.id);
              const serverErrors = serverErrorsForRow(row.id);
              const clientErrors = showErrors ? derived[idx].errors : [];
              return (
                <Fragment key={row.id}>
                  <BroilerBulkRow
                    variant="table"
                    index={idx}
                    row={row}
                    derived={derived[idx]}
                    showErrors={showErrors}
                    serverErrors={serverErrors}
                    showCustomInvoice={showCustomInvoice}
                    removable={rows.length > 1}
                    onChange={(patch) => onChangeRow(row.id, patch)}
                    onRemove={() => onRemoveRow(row.id)}
                  />
                  <BroilerBulkRowErrors
                    errors={[...clientErrors, ...serverErrors]}
                    columnCount={columnCount}
                  />
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card stack */}
      <div className="space-y-3 md:hidden">
        {rows.map((row, idx) => (
          <BroilerBulkRow
            key={row.id}
            variant="card"
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
      </div>

      <Button type="button" variant="outline" onClick={onAddRow} className="w-full md:w-auto">
        <Plus className="mr-2 h-4 w-4" />
        Add buyer
      </Button>
    </div>
  );
}
