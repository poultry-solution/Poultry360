"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, RotateCw } from "lucide-react";
import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { DataTable, Column } from "@/common/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Label } from "@/common/components/ui/label";
import { Input } from "@/common/components/ui/input";
import {
  useGetCompanyPurchasesAggregated,
  useCreateCompanyPurchase,
  type AggregatedPurchaseRow,
} from "@/fetchers/company/companyPurchaseQueries";
import { toast } from "sonner";

const formatCurrency = (n: number | string) =>
  `रू ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function CompanyPurchasesPage() {
  const { data, isLoading } = useGetCompanyPurchasesAggregated();
  const createMutation = useCreateCompanyPurchase();
  const rows: AggregatedPurchaseRow[] = data?.data ?? [];

  const [reorderOpen, setReorderOpen] = useState(false);
  const [reorderRow, setReorderRow] = useState<AggregatedPurchaseRow | null>(null);
  const [reorderQty, setReorderQty] = useState("");

  const openReorder = (row: AggregatedPurchaseRow) => {
    setReorderRow(row);
    setReorderQty("");
    setReorderOpen(true);
  };

  const closeReorder = () => {
    setReorderOpen(false);
    setReorderRow(null);
    setReorderQty("");
  };

  const handleReorder = async () => {
    if (!reorderRow) return;
    const qty = Number(reorderQty);
    if (!(qty > 0)) {
      toast.error("Enter a valid quantity");
      return;
    }
    try {
      await createMutation.mutateAsync({
        supplierId: reorderRow.supplierId,
        items: [
          {
            rawMaterialId: reorderRow.rawMaterialId,
            quantity: qty,
            unitPrice: reorderRow.unitPrice,
          },
        ],
      });
      toast.success("Reorder recorded. Stock and supplier ledger updated.");
      closeReorder();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message ?? "Failed to record reorder");
    }
  };

  const columns: Column<AggregatedPurchaseRow>[] = [
    { key: "item", label: "Item", render: (_, row) => row.rawMaterial.name },
    { key: "supplier", label: "Supplier", render: (_, row) => row.supplier.name },
    { key: "unit", label: "Unit", render: (_, row) => row.rawMaterial.unit },
    {
      key: "rate",
      label: "Rate",
      render: (_, row) => `${formatCurrency(row.unitPrice)}/${row.rawMaterial.unit}`,
    },
    {
      key: "totalQuantity",
      label: "Total Qty",
      align: "right",
      render: (_, row) =>
        `${Number(row.remainingQuantity ?? row.totalQuantity).toLocaleString("en-IN", { minimumFractionDigits: 2 })} ${row.rawMaterial.unit}`,
    },
    {
      key: "totalAmount",
      label: "Total Amount",
      align: "right",
      render: (_, row) => formatCurrency(row.remainingAmount ?? row.totalAmount),
    },
    {
      key: "actions",
      label: "Actions",
      width: "100px",
      render: (_, row) => (
        <Button variant="outline" size="sm" onClick={() => openReorder(row)} title="Reorder">
          <RotateCw className="h-4 w-4 mr-1" />
          Reorder
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Purchases</h1>
          <p className="text-sm text-muted-foreground">
            Purchase inventory by item, supplier and rate. Use &quot;Add purchase&quot; to record new entries.
          </p>
        </div>
        <Button asChild className="bg-primary">
          <Link href="/company/dashboard/purchases/new">
            <Plus className="mr-2 h-4 w-4" />
            Add purchase
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable<AggregatedPurchaseRow>
            data={rows}
            columns={columns}
            loading={isLoading}
            emptyMessage='No purchases yet. Use "Add purchase" to record raw material purchases from suppliers.'
            getRowKey={(row) =>
              `${row.rawMaterialId}-${row.supplierId}-${row.rawMaterial.unit}-${row.unitPrice}`
            }
          />
        </CardContent>
      </Card>

      <Dialog open={reorderOpen} onOpenChange={(open) => !open && closeReorder()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reorder</DialogTitle>
            <DialogDescription>
              {reorderRow && (
                <>
                  Same item, supplier and rate. Enter quantity to record a new purchase. Stock and supplier
                  ledger will be updated.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {reorderRow && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {reorderRow.rawMaterial.name} · {reorderRow.supplier.name} ·{" "}
                {formatCurrency(reorderRow.unitPrice)}/{reorderRow.rawMaterial.unit}
              </p>
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="any"
                  value={reorderQty}
                  onChange={(e) => setReorderQty(e.target.value)}
                  placeholder={`e.g. 100`}
                  className="mt-1"
                />
                <span className="text-xs text-muted-foreground mt-1 block">
                  {reorderRow.rawMaterial.unit}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeReorder}>
              Cancel
            </Button>
            <Button onClick={handleReorder} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Reorder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
