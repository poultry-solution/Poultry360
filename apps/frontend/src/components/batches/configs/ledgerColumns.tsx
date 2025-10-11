import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Plus } from "lucide-react";
import { createColumn, Column } from "@/components/ui/data-table";

interface LedgerRow {
  id: string | number;
  name: string;
  phone: string;
  category: string;
  sales: number;
  received: number;
  balance: number;
}

interface LedgerColumnsProps {
  isBatchClosed: boolean;
  batchSales: any[];
  openCustomerTransactionsModal: (row: any) => void;
  openPaymentModal: (customer: { id: string; name: string; balance: number }) => void;
  openEditLedger: (row: any) => void;
  deleteLedger: (id: number) => void;
}

export function createLedgerColumns({
  isBatchClosed,
  batchSales,
  openCustomerTransactionsModal,
  openPaymentModal,
  openEditLedger,
  deleteLedger,
}: LedgerColumnsProps): Column<LedgerRow>[] {
  return [
    createColumn("name", "Name", {
      render: (value) => <span className="font-medium">{value}</span>,
    }),
    createColumn("phone", "Phone"),
    createColumn("category", "Category", {
      type: "badge",
      render: (value) => (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          {value}
        </Badge>
      ),
    }),
    createColumn("sales", "Sales", {
      type: "currency",
      align: "right",
      render: (value) => (
        <span className="font-medium">₹{Number(value).toLocaleString()}</span>
      ),
    }),
    createColumn("received", "Received", {
      type: "currency",
      align: "right",
      render: (value) => (
        <span className="text-green-600">
          ₹{Number(value).toLocaleString()}
        </span>
      ),
    }),
    createColumn("balance", "Balance", {
      type: "currency",
      align: "right",
      render: (value) => {
        const numValue = Number(value);
        return (
          <span
            className={
              numValue > 0
                ? "text-orange-600 font-bold"
                : "text-green-600 font-bold"
            }
          >
            ₹{numValue.toLocaleString()}
          </span>
        );
      },
    }),
    {
      key: "transactions",
      label: "Transactions",
      type: "actions",
      align: "center",
      width: "120px",
      render: (_, row) => {
        // Count total transactions for this customer
        const customerTransactions =
          batchSales?.filter(
            (sale: any) => sale.isCredit && sale.customerId === row.id
          ) || [];

        const totalPayments = customerTransactions.reduce(
          (sum: number, sale: any) => sum + (sale.payments?.length || 0),
          0
        );

        return (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs hover:bg-blue-50 hover:border-blue-300"
            onClick={() => openCustomerTransactionsModal(row)}
          >
            View ({totalPayments})
          </Button>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      type: "actions",
      align: "right",
      width: "160px",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          {!isBatchClosed ? (
            <>
              {row.balance > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                  onClick={() =>
                    openPaymentModal({
                      id:
                        typeof row.id === "string" ? row.id : row.id.toString(),
                      name: row.name,
                      balance: row.balance,
                    })
                  }
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Pay
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300"
                onClick={() => openEditLedger(row)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300"
                onClick={() =>
                  deleteLedger(
                    typeof row.id === "string" ? parseInt(row.id) : row.id
                  )
                }
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
