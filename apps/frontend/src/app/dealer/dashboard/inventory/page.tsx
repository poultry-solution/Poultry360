"use client";

import { useState } from "react";
import { Plus, Search, Filter, Edit, Trash2, Package, AlertTriangle, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { DataTable, Column } from "@/common/components/ui/data-table";
import { Badge } from "@/common/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,

} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";
import { Label } from "@/common/components/ui/label";
import { toast } from "sonner";
import {
  useGetDealerProducts,
  useGetInventorySummary,
  useCreateDealerProduct,
  useUpdateDealerProduct,
  useDeleteDealerProduct,
  type CreateDealerProductInput,
} from "@/fetchers/dealer/dealerProductQueries";
import { useI18n } from "@/i18n/useI18n";

export default function DealerInventoryPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState("");
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateDealerProductInput>({
    name: "",
    description: "",
    type: "FEED",
    unit: "kg",
    costPrice: 0,
    sellingPrice: 0,
    currentStock: 0,
    minStock: 0,
    sku: "",
  });

  // Queries
  const { data: summaryData, isLoading: summaryLoading } = useGetInventorySummary();
  const { data: productsData, isLoading } = useGetDealerProducts({
    page,
    limit: 10,
    search,
    type: typeFilter || undefined,
  });

  const summary = summaryData?.data;

  const createMutation = useCreateDealerProduct();
  const updateMutation = useUpdateDealerProduct();
  const deleteMutation = useDeleteDealerProduct();

  const handleOpenDialog = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        type: product.type,
        unit: product.unit,
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.sellingPrice),
        minStock: product.minStock ? Number(product.minStock) : 0,
        sku: product.sku || "",
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        type: "FEED",
        unit: "kg",
        costPrice: 0,
        sellingPrice: 0,
        currentStock: 0,
        minStock: 0,
        sku: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingProduct) {
        await updateMutation.mutateAsync({
          id: editingProduct.id,
          ...formData,
        });
        toast.success(t("dealer.inventory.messages.updateSuccess"));
      } else {
        await createMutation.mutateAsync(formData);
        toast.success(t("dealer.inventory.messages.createSuccess"));
      }
      handleCloseDialog();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("dealer.inventory.messages.error"));
    }
  };

  const handleDeleteProduct = (id: string) => {
    setProductToDelete(id);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      await deleteMutation.mutateAsync(productToDelete);
      toast.success(t("dealer.inventory.messages.deleteSuccess"));
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("dealer.inventory.messages.deleteFailed"));
    } finally {
      setProductToDelete(null);
    }
  };

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
        <Button variant="outline" onClick={() => handleOpenDialog()} className="w-full sm:w-auto hover:bg-green-50 hover:text-green-700 border-green-200">
          <Plus className="mr-2 h-4 w-4" />
          {t("dealer.inventory.addProduct")}
        </Button>
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
            <CardTitle className="text-xs md:text-sm font-medium">{t("dealer.inventory.stats.lowStock")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-xl md:text-2xl font-bold text-orange-600">
              {summaryLoading ? "..." : summary?.lowStockProducts || 0}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {t("dealer.inventory.stats.belowMin")}
            </p>
          </CardContent>
        </Card>

        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">{t("dealer.inventory.stats.outOfStock")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
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

        <Card className="p-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-4 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">
              {t("dealer.inventory.stats.value")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0">
            <div className="text-lg md:text-2xl font-bold">
              {summaryLoading
                ? "..."
                : `रू ${(summary?.totalInventoryValue || 0).toLocaleString()}`}
            </div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {t("dealer.inventory.stats.totalCost")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("dealer.inventory.filters.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter || "ALL"} onValueChange={(value) => setTypeFilter(value === "ALL" ? "" : value)}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder={t("dealer.inventory.filters.allTypes")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("dealer.inventory.filters.allTypes")}</SelectItem>
                <SelectItem value="FEED">{t("dealer.inventory.filters.feed")}</SelectItem>
                <SelectItem value="OTHER">{t("dealer.inventory.filters.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table - Unified DataTable */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-lg">{t("dealer.inventory.title")}</CardTitle>
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
                width: '60px'
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
                width: '140px',
                render: (val, row) => {
                  const isEditing = editingPriceId === row.id;

                  if (isEditing) {
                    return (
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          autoFocus
                          type="number"
                          step="0.01"
                          className="h-8 w-24 px-2 text-right"
                          value={tempPrice}
                          onChange={(e) => setTempPrice(e.target.value)}
                          onBlur={() => setEditingPriceId(null)}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter") {
                              try {
                                await updateMutation.mutateAsync({
                                  id: row.id,
                                  sellingPrice: Number(tempPrice),
                                });
                                toast.success(t("dealer.inventory.messages.priceUpdated"));
                                setEditingPriceId(null);
                              } catch (err) {
                                toast.error(t("dealer.inventory.messages.updateFailed"));
                              }
                            } else if (e.key === "Escape") {
                              setEditingPriceId(null);
                            }
                          }}
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      className="cursor-pointer hover:bg-muted/50 py-1 px-2 rounded flex items-center justify-end gap-2 group transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingPriceId(row.id);
                        setTempPrice(Number(val).toString());
                      }}
                      title="Click to edit selling price"
                    >
                      <span className="font-medium">रू {Number(val).toFixed(2)}</span>
                      <Edit className="h-3 w-3 opacity-0 group-hover:opacity-50 text-muted-foreground" />
                    </div>
                  );
                },
              },
              {
                key: 'currentStock',
                label: t("dealer.inventory.table.stock"),
                align: 'right',
                width: '80px',
                render: (val, row) => (
                  <span className={
                    row.minStock && Number(val) <= Number(row.minStock)
                      ? "text-red-600 font-semibold"
                      : ""
                  }>
                    {Number(val).toFixed(2)}
                  </span>
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
                key: 'actions',
                label: t("dealer.inventory.table.actions"),
                align: 'right',
                width: '100px',
                render: (_, row) => (
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleOpenDialog(row)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDeleteProduct(row.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>
                )
              }
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

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? t("dealer.inventory.dialogs.editTitle") : t("dealer.inventory.dialogs.addTitle")}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? t("dealer.inventory.dialogs.editDesc")
                  : t("dealer.inventory.dialogs.addDesc")}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("dealer.inventory.dialogs.name")}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sku">{t("dealer.inventory.dialogs.sku")}</Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t("dealer.inventory.dialogs.description")}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4 ">
                <div className="space-y-2">
                  <Label htmlFor="type">{t("dealer.inventory.dialogs.type")}</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="FEED">{t("dealer.inventory.filters.feed")}</SelectItem>
                      <SelectItem value="OTHER">{t("dealer.inventory.filters.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">{t("dealer.inventory.dialogs.unit")}</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    placeholder={t("dealer.inventory.dialogs.unitPlaceholder")}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="costPrice">{t("dealer.inventory.dialogs.costPrice")}</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    value={formData.costPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        costPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">{t("dealer.inventory.dialogs.sellingPrice")}</Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sellingPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {!editingProduct && (
                  <div className="space-y-2">
                    <Label htmlFor="currentStock">{t("dealer.inventory.dialogs.initialStock")}</Label>
                    <Input
                      id="currentStock"
                      type="number"
                      step="0.01"
                      value={formData.currentStock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentStock: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="minStock">{t("dealer.inventory.dialogs.minStock")}</Label>
                  <Input
                    id="minStock"
                    type="number"
                    step="0.01"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minStock: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                {t("dealer.inventory.dialogs.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t("dealer.inventory.dialogs.saving")
                  : editingProduct
                    ? t("dealer.inventory.dialogs.update")
                    : t("dealer.inventory.dialogs.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!productToDelete}
        onOpenChange={(open) => !open && setProductToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dealer.inventory.dialogs.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dealer.inventory.dialogs.deleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dealer.inventory.dialogs.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProduct}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {t("dealer.inventory.dialogs.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

