import React from "react";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { DateDisplay } from "@/common/components/ui/date-display";
import { createColumn, Column } from "@/common/components/ui/data-table";

interface MortalityColumnsProps {
  isBatchClosed: boolean;
  updateMortalityMutation: { isPending: boolean };
  deleteMortalityMutation: { isPending: boolean };
  openEditMortality: (row: any) => void;
  deleteMortality: (id: string) => void;
}

export function createMortalityColumns({
  isBatchClosed,
  updateMortalityMutation,
  deleteMortalityMutation,
  openEditMortality,
  deleteMortality,
}: MortalityColumnsProps): Column<any>[] {
  return [
    createColumn("date", "Date", {
      type: "date",
      width: "120px",
      render: (value) => <DateDisplay date={value} format="short" />,
    }),
    createColumn("count", "Birds", {
      type: "number",
      align: "center",
      width: "100px",
      render: (value) => (
        <span className="font-medium text-red-600">{value}</span>
      ),
    }),
    createColumn("reason", "Reason", {
      width: "200px",
      render: (value) => (
        <Badge
          variant="secondary"
          className="bg-red-100 text-red-800 border-red-200"
        >
          {value || "Natural Death"}
        </Badge>
      ),
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
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300"
                onClick={() => openEditMortality(row)}
                disabled={updateMortalityMutation.isPending}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300"
                onClick={() => deleteMortality(row.id)}
                disabled={deleteMortalityMutation.isPending}
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
