import React from "react";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { DateDisplay } from "@/common/components/ui/date-display";
import { createColumn, Column } from "@/common/components/ui/data-table";

interface SalesColumnsProps {
  isBatchClosed: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  openEditSale: (row: any) => void;
  handleDeleteSale: (id: string) => Promise<void>;
  openTransactionsModal: (row: any) => void;
}

export function createSalesColumns({
  isBatchClosed,
  isUpdating,
  isDeleting,
  openEditSale,
  handleDeleteSale,
  openTransactionsModal,
}: SalesColumnsProps): Column<any>[] {
  return [
    createColumn("date", "Date", {
      type: "date",
      width: "100px",
      render: (value) => <DateDisplay date={value} format="short" />,
    }),
    createColumn("itemType", "Item Type", {
      type: "badge",
      width: "120px",
      render: (value) => {
        const itemTypeColors: Record<string, string> = {
          Chicken_Meat: "bg-green-100 text-green-800",
          EGGS: "bg-yellow-100 text-yellow-800",
          CHICKS: "bg-blue-100 text-blue-800",
          FEED: "bg-orange-100 text-orange-800",
          MEDICINE: "bg-red-100 text-red-800",
          EQUIPMENT: "bg-purple-100 text-purple-800",
          OTHER: "bg-gray-100 text-gray-800",
        };
        const colorClass =
          itemTypeColors[value as string] || "bg-gray-100 text-gray-800";

        return (
          <Badge variant="secondary" className={colorClass}>
            {value || "Sale"}
          </Badge>
        );
      },
    }),
    createColumn("quantity", "Quantity", {
      type: "number",
      align: "right",
      width: "100px",
    }),
    createColumn("weight", "Weight (kg)", {
      type: "number",
      align: "right",
      width: "100px",
      render: (value) => (value ? `${Number(value).toFixed(2)} kg` : "—"),
    }),
    createColumn("unitPrice", "Rate", {
      type: "currency",
      align: "right",
      width: "100px",
    }),
    createColumn("amount", "Total", {
      type: "currency",
      align: "right",
      width: "120px",
    }),
    createColumn("isCredit", "Credit", {
      type: "badge",
      align: "center",
      width: "80px",
      render: (value) => (
        <Badge
          variant="secondary"
          className={
            value
              ? "bg-orange-100 text-orange-800"
              : "bg-gray-100 text-gray-800"
          }
        >
          {value ? "Yes" : "No"}
        </Badge>
      ),
    }),
    createColumn("paidAmount", "Paid", {
      type: "currency",
      align: "right",
      width: "100px",
      render: (value) => (value ? `₹${Number(value).toLocaleString()}` : "—"),
    }),
    createColumn("dueAmount", "Due", {
      type: "currency",
      align: "right",
      width: "100px",
      render: (value) => (value ? `₹${Number(value).toLocaleString()}` : "—"),
    }),
    {
      key: "transactions",
      label: "Transactions",
      type: "actions",
      align: "center",
      width: "120px",
      render: (_, row) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs hover:bg-blue-50 hover:border-blue-300"
          onClick={() => openTransactionsModal(row)}
        >
          View ({row.payments?.length || 0})
        </Button>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      type: "actions",
      align: "right",
      width: "120px",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          {!isBatchClosed ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300"
                onClick={() => openEditSale(row)}
                disabled={isUpdating}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300"
                onClick={() => handleDeleteSale(row.id)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
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
