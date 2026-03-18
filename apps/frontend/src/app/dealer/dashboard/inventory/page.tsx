"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Package, AlertTriangle, TrendingUp, Check, X, ArrowRightLeft, Repeat } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { DataTable, Column } from "@/common/components/ui/data-table";
import { Badge } from "@/common/components/ui/badge";
import { DateInput } from "@/common/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import {
  useGetDealerProducts,
  useGetInventorySummary,
  useUpdateDealerProduct,
} from "@/fetchers/dealer/dealerProductQueries";
import { useRecordManualPurchase } from "@/fetchers/dealer/dealerManualCompanyQueries";
import { useI18n } from "@/i18n/useI18n";
import { toast } from "sonner";
import { getTodayLocalDate } from "@/common/lib/utils";

// Inline editable price cell component
function EditablePriceCell({ value, productId }: { value: number; productId: string }) {
  const { t } = useI18n();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const updateMutation = useUpdateDealerProduct();

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    const newPrice = parseFloat(editValue);
    if (isNaN(newPrice) || newPrice < 0) {
      setEditValue(String(value));
      setIsEditing(false);
      return;
    }
    if (newPrice === value) {
      setIsEditing(false);
      return;
    }
    updateMutation.mutate(
      { id: productId, sellingPrice: newPrice },
      {
        onSuccess: () => {
          toast.success(t("dealer.inventory.messages.priceUpdated"));
          setIsEditing(false);
        },
        onError: () => {
          toast.error(t("dealer.inventory.messages.updateFailed"));
          setEditValue(String(value));
          setIsEditing(false);
        },
      }
    );
  };

  const handleCancel = () => {
    setEditValue(String(value));
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-muted-foreground">रू</span>
        <input
          ref={inputRef}
          type="number"
          step="0.01"
          min="0"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="w-20 h-7 px-1.5 text-sm border rounded text-right focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={updateMutation.isPending}
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="font-medium text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
      title={t("dealer.inventory.table.sell")}
    >
      रू {Number(value).toFixed(2)}
    </button>
  );
}

export default function DealerInventoryPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [reorderRow, setReorderRow] = useState<any | null>(null);
  const [reorderDate, setReorderDate] = useState<string>(new Date().toISOString());
  const [reorderQty, setReorderQty] = useState<string>("");
  const recordPurchaseMutation = useRecordManualPurchase();

  // Queries
  const { data: summaryData, isLoading: summaryLoading } = useGetInventorySummary();
  const { data: productsData, isLoading } = useGetDealerProducts({
    page,
    limit: 10,
    search,
    type: typeFilter || undefined,
  });

  const summary = summaryData?.data;
  const products = productsData?.data || [];
  const pagination = productsData?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("dealer.inventory.title")}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("dealer.inventory.subtitle")}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t("dealer.inventory.stats.products")}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold">
              {summaryLoading ? "..." : summary?.totalProducts || 0}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {t("dealer.inventory.stats.inInventory")}
            </p>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t("dealer.inventory.stats.value")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold">
              रू {summaryLoading ? "..." : (summary?.totalInventoryValue?.toFixed(2) || "0.00")}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {t("dealer.inventory.stats.totalCost")}
            </p>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t("dealer.inventory.stats.lowStock")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-yellow-600">
              {summaryLoading ? "..." : summary?.lowStockProducts || 0}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {t("dealer.inventory.stats.belowMin")}
            </p>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t("dealer.inventory.stats.outOfStock")}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-red-600">
              {summaryLoading ? "..." : summary?.outOfStockProducts || 0}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {t("dealer.inventory.stats.zeroStock")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("dealer.inventory.filters.searchPlaceholder")}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select
              value={typeFilter}
              onValueChange={(value) => { setTypeFilter(value === "ALL" ? "" : value); setPage(1); }}
            >
              <SelectTrigger className="w-full sm:w-[140px] bg-white">
                <SelectValue placeholder={t("dealer.inventory.filters.allTypes")} />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="ALL">{t("dealer.inventory.filters.allTypes")}</SelectItem>
                <SelectItem value="FEED">{t("dealer.inventory.filters.feed")}</SelectItem>
                <SelectItem value="CHICKS">Chicks</SelectItem>
                <SelectItem value="MEDICINE">Medicine</SelectItem>
                <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                <SelectItem value="OTHER">{t("dealer.inventory.filters.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CardDescription className="text-xs md:text-sm">
            {pagination?.total || 0} {t("dealer.inventory.stats.products")}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={products}
            loading={isLoading}
            emptyMessage={t("dealer.inventory.table.empty")}
            columns={[
              {
                key: 'name',
                label: t("dealer.inventory.table.name"),
                width: '180px',
                render: (val, row) => (
                  <div>
                    <span className="font-medium">{val}</span>
                    {row.sku && (
                      <span className="text-xs text-muted-foreground ml-1">({row.sku})</span>
                    )}
                  </div>
                )
              },
              {
                key: "supplier",
                label: "Company",
                width: "160px",
                render: (_val, row: any) => {
                  const supplierName =
                    row.manualCompany?.name || row.supplierCompany?.name || "—";
                  return <span className="text-sm">{supplierName}</span>;
                },
              },
              {
                key: 'type',
                label: t("dealer.inventory.table.type"),
                width: '80px',
                render: (val) => (
                  <Badge variant="secondary" className="text-xs">
                    {val}
                  </Badge>
                )
              },
              {
                key: 'unit',
                label: t("dealer.inventory.table.unit"),
                width: '120px',
                render: (val: string, row: any) => {
                  const conversions: Array<{ unitName: string; conversionFactor: number }> =
                    row.unitConversions || row.companyProduct?.unitConversions || [];
                  if (conversions.length === 0) {
                    return <span>{val}</span>;
                  }
                  return (
                    <div>
                      <span className="font-medium">{val}</span>
                      <div className="mt-0.5 space-y-0.5">
                        {conversions.map((conv: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <ArrowRightLeft className="h-2.5 w-2.5 shrink-0" />
                            <span>1 {conv.unitName} = {conv.conversionFactor} {val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              },
              {
                key: 'costPrice',
                label: t("dealer.inventory.table.cost"),
                type: 'currency',
                align: 'right',
                width: '100px',
                render: (val) => `रू ${Number(val).toFixed(2)}`
              },
              {
                key: 'sellingPrice',
                label: t("dealer.inventory.table.sell"),
                align: 'right',
                width: '120px',
                render: (val, row) => (
                  <EditablePriceCell value={Number(val)} productId={row.id} />
                )
              },
              {
                key: 'currentStock',
                label: t("dealer.inventory.table.stock"),
                align: 'right',
                width: '100px',
                render: (val, row) => (
                  <div className={
                    row.minStock && Number(val) <= Number(row.minStock)
                      ? "text-red-600 font-semibold"
                      : ""
                  }>
                    <span>{Number(val).toFixed(2)}</span>
                    <span className="text-[10px] text-muted-foreground ml-1">{row.unit}</span>
                  </div>
                )
              },
              {
                key: 'minStock',
                label: t("dealer.inventory.table.min"),
                align: 'right',
                width: '70px',
                render: (val) => val ? Number(val).toFixed(2) : '-'
              },
              {
                key: "actions",
                label: "Actions",
                width: "120px",
                align: "right",
                render: (_val, row: any) => {
                  const stock = Number(row.currentStock || 0);
                  const canReorder = !!row.manualCompanyId;
                  if (!canReorder && stock !== 0) return null;

                  return (
                    <div className="flex items-center justify-end gap-1">
                      {canReorder && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setReorderRow(row);
                            setReorderDate(new Date(getTodayLocalDate()).toISOString());
                            setReorderQty("");
                          }}
                          title="Reorder (create a new purchase)"
                        >
                          <Repeat className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                },
              },
            ] as Column[]}
          />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 md:p-4 border-t">
              <span className="text-xs md:text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reorder dialog */}
      <Dialog open={!!reorderRow} onOpenChange={(o) => !o && setReorderRow(null)}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>Reorder item</DialogTitle>
            <DialogDescription>
              This will create a new purchase record under the same manual company and increase stock.
            </DialogDescription>
          </DialogHeader>

          {!!reorderRow?.manualCompanyId && !reorderRow?.manualCompany && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              This company no longer exists (deleted). Reorder is disabled.
            </div>
          )}

          {!!reorderRow?.manualCompany?.archivedAt && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              This company is archived. You can reorder, but consider unarchiving it.
            </div>
          )}

          <div className="grid gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Company</Label>
                <div className="h-9 px-3 flex items-center rounded-md border bg-muted/30 text-sm">
                  {reorderRow?.manualCompany?.name || "—"}
                </div>
              </div>
              <div className="space-y-1">
                <DateInput
                  label="Date"
                  value={reorderDate}
                  onChange={setReorderDate}
                />
              </div>
            </div>

            <div className="rounded-md border p-3 text-sm space-y-1">
              <div className="font-medium">{reorderRow?.name}</div>
              <div className="text-xs text-muted-foreground">
                Type: {reorderRow?.type} • Unit: {reorderRow?.unit}
              </div>
              <div className="text-xs text-muted-foreground">
                Cost: रू {Number(reorderRow?.costPrice || 0).toFixed(2)} • Sell: रू {Number(reorderRow?.sellingPrice || 0).toFixed(2)}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter quantity"
                value={reorderQty}
                onChange={(e) => setReorderQty(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReorderRow(null)}
              disabled={recordPurchaseMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!reorderRow?.manualCompanyId) return;
                if (!reorderRow?.manualCompany) {
                  toast.error("Company not found (deleted)");
                  return;
                }
                const qty = Number(reorderQty);
                if (!qty || Number.isNaN(qty) || qty <= 0) {
                  toast.error("Please enter a valid quantity");
                  return;
                }
                try {
                  await recordPurchaseMutation.mutateAsync({
                    companyId: reorderRow.manualCompanyId,
                    date: reorderDate,
                    items: [
                      {
                        productName: reorderRow.name,
                        type: reorderRow.type,
                        unit: reorderRow.unit,
                        quantity: qty,
                        costPrice: Number(reorderRow.costPrice || 0),
                        sellingPrice: Number(reorderRow.sellingPrice || 0),
                      },
                    ],
                  } as any);
                  toast.success("Purchase created");
                  setReorderRow(null);
                } catch (e: any) {
                  toast.error(e?.response?.data?.message || "Failed to reorder");
                }
              }}
              disabled={
                recordPurchaseMutation.isPending ||
                !reorderRow?.manualCompanyId ||
                (!!reorderRow?.manualCompanyId && !reorderRow?.manualCompany)
              }
            >
              {recordPurchaseMutation.isPending ? "Saving..." : "Create purchase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

