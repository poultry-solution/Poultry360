import React from "react";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Trash2 } from "lucide-react";
import { DateDisplay } from "@/common/components/ui/date-display";
import { createColumn, Column } from "@/common/components/ui/data-table";

export interface ExpenseColumnsProps {
  isBatchClosed: boolean;
  onDeleteClick: (row: any) => void;
}

export function createExpenseColumns({
  isBatchClosed,
  onDeleteClick,
}: ExpenseColumnsProps): Column<any>[] {
  return [
    createColumn("category", "Category", {
      type: "badge",
      width: "120px",
      render: (_, row) => (
        <Badge
          variant="secondary"
          className={
            row.category?.name === "Feed"
              ? "bg-blue-100 text-blue-800"
              : row.category?.name === "Medicine"
                ? "bg-red-100 text-red-800"
                : row.category?.name === "Hatchery"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
          }
        >
          {row.category?.name || "Other"}
        </Badge>
      ),
    }),
    createColumn("details", "Details", {
      render: (_, row) => {
        const details = [];
        if (row.quantity) details.push(`Qty: ${row.quantity}`);
        if (row.unitPrice)
          details.push(`Rate: ₹${Number(row.unitPrice).toLocaleString()}`);
        if (row.inventoryUsages && row.inventoryUsages.length > 0) {
          const items = row.inventoryUsages
            .map(
              (usage: any) =>
                `${usage.item.name} (${usage.quantity}${usage.item.unit})`
            )
            .join(", ");
          details.push(`Items: ${items}`);
        }
        return details.join(" • ") || row.description || "—";
      },
    }),
    createColumn("amount", "Amount", {
      type: "currency",
      align: "right",
      width: "120px",
      render: (value) => `₹${Number(value).toLocaleString()}`,
    }),
    createColumn("date", "Date", {
      type: "date",
      width: "100px",
      render: (value) => <DateDisplay date={value} format="short" />,
    }),
    {
      key: "actions",
      label: "Actions",
      type: "actions",
      align: "right",
      width: "120px",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          {!isBatchClosed ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300"
              onClick={() => onDeleteClick(row)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : (
            <Badge
              variant="secondary"
              className="bg-gray-100 text-gray-500 text-xs"
            >
              Closed
            </Badge>
          )}
        </div>
      ),
    },
  ];
}
