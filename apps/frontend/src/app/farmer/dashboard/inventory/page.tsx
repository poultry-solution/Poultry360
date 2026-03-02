"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  Package,
  AlertTriangle,
  Wheat,
  Pill,
  Box,
  Plus,
  Loader2,
  Egg,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { useState, useEffect } from "react";
import { Modal } from "@/common/components/ui/modal";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { DataTable, Column, createColumn } from "@/common/components/ui/data-table";
import {
  useInventoryDashboard,
  useCreateInventoryItem,
} from "@/fetchers/inventory/inventoryQueries";
import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import { useGetEggInventory } from "@/fetchers/sale/saleQueries";
import { InventoryItemType } from "@myapp/shared-types";
import { DateDisplay } from "@/common/components/ui/date-display";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";
import { useAddDealerTransaction } from "@/fetchers/dealers/dealerQueries";
import { inventoryKeys } from "@/fetchers/inventory/inventoryQueries";
import { useQueryClient } from "@tanstack/react-query";

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<
    "feed" | "chicks" | "medicine" | "other" | "eggs"
  >("feed");
  const { t } = useI18n();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [reorderRow, setReorderRow] = useState<any>(null);
  const [reorderQuantity, setReorderQuantity] = useState("");
  const [reorderDate, setReorderDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const reorderMutation = useAddDealerTransaction();
  const queryClient = useQueryClient();

  // Use TanStack Query hooks
  const {
    stats,
    tableData,
    feedItems,
    medicineItems,
    chicksItems,
    isLoading,
    error,
  } = useInventoryDashboard();

  const { data: batchesData } = useGetAllBatches({}, { enabled: true });
  const layerBatches = (batchesData?.data ?? []).filter((b: any) => b.batchType === "LAYERS");
  const hasLayerBatch = layerBatches.length > 0;

  const [selectedEggBatchId, setSelectedEggBatchId] = useState<string | "">("");

  useEffect(() => {
    if (activeTab === "eggs" && layerBatches.length === 1 && !selectedEggBatchId) {
      setSelectedEggBatchId(layerBatches[0].id);
    }
  }, [activeTab, layerBatches, selectedEggBatchId]);

  const { data: eggData, isLoading: isEggLoading } = useGetEggInventory({
    batchId: activeTab === "eggs" ? (selectedEggBatchId || null) : null,
    enabled: hasLayerBatch && (activeTab !== "eggs" || !!selectedEggBatchId),
  });

  const createInventoryMutation = useCreateInventoryItem();

  const [formData, setFormData] = useState({
    name: "",
    quantity: "",
    unit: "",
    rate: "",
    supplier: "",
    batchNumber: "",
    description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filter table data based on active tab
  const getFilteredInventory = () => {
    if (activeTab === "eggs") {
      if (!selectedEggBatchId) return [];
      const types = eggData?.data?.types;
      if (!types || !Array.isArray(types)) return [];
      return types.map((t: { id: string; name: string; code: string; quantity: number }) => ({
        id: t.id,
        name: `${t.name} Eggs`,
        quantity: t.quantity ?? 0,
        unit: "pcs",
        itemType: "EGGS",
        status: (t.quantity ?? 0) > 0 ? "In Stock" : "Out of Stock",
        rate: 0,
        value: 0,
      }));
    }

    if (!tableData) return [];

    switch (activeTab) {
      case "feed":
        return tableData.filter((item: any) => item.itemType === "FEED");
      case "chicks":
        return tableData.filter((item: any) => item.itemType === "CHICKS");
      case "medicine":
        return tableData.filter((item: any) => item.itemType === "MEDICINE");
      case "other":
        return tableData.filter(
          (item: any) =>
            item.itemType === "OTHER" || item.itemType === "EQUIPMENT"
        );
      default:
        return [];
    }
  };

  const filteredInventory = getFilteredInventory();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = t("farmer.inventory.validation.nameRequired");
    if (!formData.quantity || parseFloat(formData.quantity) <= 0)
      newErrors.quantity = t("farmer.inventory.validation.quantityRequired");
    if (!formData.unit.trim()) newErrors.unit = t("farmer.inventory.validation.unitRequired");
    if (!formData.rate || parseFloat(formData.rate) <= 0)
      newErrors.rate = t("farmer.inventory.validation.rateRequired");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await createInventoryMutation.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        currentStock: parseFloat(formData.quantity),
        unit: formData.unit,
        minStock: 0,
        itemType: (activeTab === "feed"
          ? "FEED"
          : activeTab === "chicks"
            ? "CHICKS"
            : activeTab === "medicine"
              ? "MEDICINE"
              : "OTHER") as InventoryItemType,
        // categoryId will be automatically created by the backend
        rate: parseFloat(formData.rate), // Pass rate for initial transaction
      });

      toast.success(t("farmer.inventory.toasts.added"));
      setIsAddModalOpen(false);
      setFormData({
        name: "",
        quantity: "",
        unit: "",
        rate: "",
        supplier: "",
        batchNumber: "",
        description: "",
      });
      setErrors({});
    } catch (error) {
      console.error("Failed to add item:", error);
      // Error toast is handled by axios interceptor
    }
  };

  const openAddModal = () => {
    setIsAddModalOpen(true);
  };

  const openReorderModal = (row: any) => {
    setReorderRow(row);
    setReorderQuantity("");
    setReorderDate(new Date().toISOString().split("T")[0]);
  };

  const handleReorderSubmit = async () => {
    if (!reorderRow || !reorderQuantity || parseFloat(reorderQuantity) <= 0) {
      toast.error(t("farmer.inventory.validation.quantityRequired"));
      return;
    }

    const qty = parseFloat(reorderQuantity);
    try {
      await reorderMutation.mutateAsync({
        dealerId: reorderRow.dealerId,
        data: {
          type: "PURCHASE",
          amount: reorderRow.rate * qty,
          quantity: qty,
          itemName: reorderRow.name,
          purchaseCategory: reorderRow.purchaseCategory || reorderRow.itemType,
          unitPrice: reorderRow.rate,
          unit: reorderRow.unit,
          date: new Date(reorderDate).toISOString(),
        },
      });

      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      toast.success(t("farmer.inventory.reorder.success"));
      setReorderRow(null);
    } catch (error) {
      console.error("Reorder failed:", error);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "eggs":
        return <Egg className="h-4 w-4" />;
      case "feed":
        return <Wheat className="h-4 w-4" />;
      case "chicks":
        return <Package className="h-4 w-4" />;
      case "medicine":
        return <Pill className="h-4 w-4" />;
      case "other":
        return <Box className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  // Column configurations for different categories
  const getInventoryColumns = (
    category: "feed" | "medicine" | "chicks" | "other" | "eggs"
  ) => {
    if (category === "eggs") {
      return [
        createColumn("name", t("farmer.inventory.table.item"), {
          render: (_, item: any) => (
            <div>
              <p className="font-medium">{item.name}</p>
            </div>
          ),
        }),
        createColumn("quantity", t("farmer.inventory.table.quantity"), {
          render: (_, item: any) => (
            <div className="flex items-center space-x-1">
              <span className="font-medium">{item.quantity}</span>
              <span className="text-sm text-gray-600">{item.unit}</span>
            </div>
          ),
        }),
        createColumn("status", "Status", {
          render: (_, item: any) => (
            <Badge
              variant={item.quantity === 0 ? "destructive" : "secondary"}
              className={
                item.quantity === 0
                  ? "bg-red-100 text-red-800"
                  : "bg-green-100 text-green-800"
              }
            >
              {item.quantity === 0 ? "Out of Stock" : "In Stock"}
            </Badge>
          ),
        })
      ];
    }

    const baseColumns = [
      createColumn("name", t("farmer.inventory.table.item"), {
        render: (_, item: any) => (
          <div>
            <p className="font-medium">{item.name}</p>
            {item.batchNumber && (
              <p className="text-sm text-gray-600">
                {t("farmer.inventory.table.batch")}: {item.batchNumber}
              </p>
            )}
          </div>
        ),
      }),
      createColumn("quantity", t("farmer.inventory.table.quantity"), {
        render: (_, item: any) => (
          <div className="flex items-center space-x-1">
            <span className="font-medium">{item.quantity}</span>
            <span className="text-sm text-gray-600">{item.unit}</span>
          </div>
        ),
      }),
      createColumn("rate", t("farmer.inventory.table.rate"), {
        render: (_, item: any) => `₹${item.rate}`,
        align: "right",
      }),
      createColumn("value", t("farmer.inventory.table.value"), {
        render: (_, item: any) => `₹${item.value.toLocaleString()}`,
        align: "right",
      }),
      createColumn("supplier", t("farmer.inventory.table.supplier"), {
        render: (value: any) => value || t("common.notAvailable"),
      }),
    ];

    // Add expiry date column for medicine
    if (category === "medicine") {
      baseColumns.splice(
        4,
        0,
        createColumn("expiryDate", t("farmer.inventory.table.expiry"), {
          render: (value) => {
            if (!value) return t("common.notAvailable");
            const isExpired = new Date(value) < new Date();
            return (
              <span className={isExpired ? "text-red-600 font-medium" : ""}>
                <DateDisplay date={value} format="short" />
              </span>
            );
          },
        })
      );
    }

    // Add status column
    baseColumns.push(
      createColumn("status", "Status", {
        render: (_, item: any) => (
          <Badge
            variant={item.status === "Low Stock" ? "destructive" : "secondary"}
            className={
              item.status === "Low Stock"
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            }
          >
            {item.status === "Low Stock"
              ? t("farmer.inventory.table.lowStock")
              : item.status}
          </Badge>
        ),
      })
    );

    // Reorder action column — only for non-connected dealers
    baseColumns.push(
      createColumn("dealerId", "", {
        render: (_, item: any) => {
          if (!item.dealerId || item.isConnectedDealer) return null;
          return (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => openReorderModal(item)}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              {t("farmer.inventory.reorder.button")}
            </Button>
          );
        },
      })
    );

    return baseColumns;
  };

  // Loading state
  if (isLoading || isEggLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">{t("farmer.inventory.loading")}</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">
          {t("farmer.inventory.error")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 md:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t("farmer.inventory.title")}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {activeTab === "other"
              ? t("farmer.inventory.subtitleOther")
              : activeTab === "eggs"
                ? "Track your egg inventory from daily production"
                : t("farmer.inventory.subtitleDefault")}
          </p>
        </div>
        {activeTab === "other" ? (
          <Button
            size="sm"
            className="text-xs md:text-sm bg-primary hover:bg-primary/90 w-full sm:w-auto"
            onClick={openAddModal}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("farmer.inventory.addItem")}
          </Button>
        ) : activeTab === "eggs" ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
            <Label htmlFor="egg-batch-select" className="text-sm font-medium whitespace-nowrap">
              Layers batch
            </Label>
            <select
              id="egg-batch-select"
              value={selectedEggBatchId}
              onChange={(e) => setSelectedEggBatchId(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[180px]"
            >
              <option value="">Select batch to see egg stock</option>
              {layerBatches.map((batch: any) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batchNumber ?? batch.id}
                  {batch.farm?.name ? ` (${batch.farm.name})` : ""}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">
            {t("farmer.inventory.autoAdded")}{" "}
            {activeTab === "feed"
              ? t("farmer.inventory.dealerLedger")
              : t("farmer.inventory.medicalSupplierLedger")}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <CardTitle className="text-sm font-medium">{t("farmer.inventory.stats.totalItems")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">
              {stats?.totalItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("farmer.inventory.stats.inStock")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <CardTitle className="text-sm font-medium">{t("farmer.inventory.stats.lowStock")}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">
              {stats?.lowStockItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("farmer.inventory.stats.needReorder")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("farmer.inventory.stats.totalValue")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">
              <span className="hidden md:inline">रू</span>{(stats?.totalValue || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{t("farmer.inventory.stats.inventoryWorth")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("farmer.inventory.stats.categories")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">
              {stats?.categories || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t("farmer.inventory.stats.itemTypes")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-1 md:space-x-8 overflow-x-auto pb-1">
          {[
            ...(hasLayerBatch ? [{ key: "eggs", label: "Eggs", icon: <Egg className="h-4 w-4" /> }] : []),
            { key: "feed", label: t("farmer.inventory.tabs.feed"), icon: <Wheat className="h-4 w-4" /> },
            {
              key: "chicks",
              label: t("farmer.inventory.tabs.chicks"),
              icon: <Package className="h-4 w-4" />,
            },
            {
              key: "medicine",
              label: t("farmer.inventory.tabs.medicine"),
              icon: <Pill className="h-4 w-4" />,
            },
            { key: "other", label: t("farmer.inventory.tabs.other"), icon: <Box className="h-4 w-4" /> },
          ].map((tab) => {
            const getTabCount = () => {
              if (tab.key === "eggs") {
                if (!selectedEggBatchId) return 0;
                return (eggData?.data?.types ?? []).reduce((s: number, t: { quantity?: number }) => s + (t.quantity ?? 0), 0);
              }
              if (!tableData) return 0;
              switch (tab.key) {
                case "feed":
                  return tableData.filter(
                    (item: any) => item.itemType === "FEED"
                  ).length;
                case "chicks":
                  return tableData.filter(
                    (item: any) => item.itemType === "CHICKS"
                  ).length;
                case "medicine":
                  return tableData.filter(
                    (item: any) => item.itemType === "MEDICINE"
                  ).length;
                case "other":
                  return tableData.filter(
                    (item: any) =>
                      item.itemType === "OTHER" || item.itemType === "EQUIPMENT"
                  ).length;
                default:
                  return 0;
              }
            };

            return (
              <button
                key={tab.key}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-1 md:space-x-2 py-2 px-2 md:px-1 border-b-2 font-medium text-xs md:text-sm whitespace-nowrap ${activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
                  }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <Badge variant="secondary" className="ml-0.5 md:ml-1 text-[10px] md:text-xs px-1.5 md:px-2">
                  {getTabCount()}
                </Badge>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="flex items-center gap-1 md:space-x-2 text-base md:text-lg">
            {getCategoryIcon(activeTab)}
            <span>
              {activeTab === "eggs"
                ? "Egg Inventory"
                : t("farmer.inventory.categoryTitle", {
                  category:
                    activeTab === "feed"
                      ? t("farmer.inventory.tabs.feed")
                      : activeTab === "chicks"
                        ? t("farmer.inventory.tabs.chicks")
                        : activeTab === "medicine"
                          ? t("farmer.inventory.tabs.medicine")
                          : t("farmer.inventory.tabs.other"),
                })}
            </span>
          </CardTitle>
          <CardDescription>
            {activeTab === "eggs"
              ? "Current stock of eggs by category"
              : t("farmer.inventory.categoryDesc", {
                count: filteredInventory.length,
                category:
                  activeTab === "feed"
                    ? t("farmer.inventory.tabs.feed")
                    : activeTab === "chicks"
                      ? t("farmer.inventory.tabs.chicks")
                      : activeTab === "medicine"
                        ? t("farmer.inventory.tabs.medicine")
                        : t("farmer.inventory.tabs.other"),
              })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredInventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("farmer.inventory.empty", { category: activeTab })}</p>
              {activeTab === "other" ? (
                <Button
                  size="sm"
                  className="mt-3 text-xs bg-primary hover:bg-primary/90"
                  onClick={openAddModal}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t("farmer.inventory.emptyAddFirst", {
                    category: t("farmer.inventory.tabs.other"),
                  })}
                </Button>
              ) : activeTab === "eggs" ? (
                <p className="text-sm mt-2">
                  {selectedEggBatchId
                    ? (isEggLoading
                      ? "Loading..."
                      : "No eggs in stock for this batch. Record daily egg production on the batch page.")
                    : "Select a Layers batch above to see egg inventory."}
                </p>
              ) : (
                <p className="text-sm mt-2">
                  {t("farmer.inventory.emptyHelp")}{" "}
                  {activeTab === "feed"
                    ? t("farmer.inventory.dealerLedger")
                    : t("farmer.inventory.medicalSupplierLedger")}
                </p>
              )}
            </div>
          ) : (
            <DataTable
              data={filteredInventory}
              columns={getInventoryColumns(activeTab)}
              emptyMessage={t("farmer.inventory.empty", { category: activeTab })}
            />
          )}
        </CardContent>
      </Card>

      {/* Reorder Modal */}
      <Modal
        isOpen={!!reorderRow}
        onClose={() => setReorderRow(null)}
        title={t("farmer.inventory.reorder.title")}
      >
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("farmer.inventory.reorder.heading")}</h2>

          <div className="grid gap-4">
            <div>
              <Label>{t("farmer.inventory.modal.itemName")}</Label>
              <Input value={reorderRow?.name || ""} disabled />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("farmer.inventory.table.rate")}</Label>
                <Input value={reorderRow ? `₹${reorderRow.rate}` : ""} disabled />
              </div>
              <div>
                <Label>{t("farmer.inventory.modal.unit")}</Label>
                <Input value={reorderRow?.unit || ""} disabled />
              </div>
            </div>

            <div>
              <Label htmlFor="reorderQuantity">{t("farmer.inventory.modal.quantity")} *</Label>
              <Input
                id="reorderQuantity"
                type="number"
                value={reorderQuantity}
                onChange={(e) => setReorderQuantity(e.target.value)}
                placeholder={t("farmer.inventory.reorder.quantityPlaceholder")}
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="reorderDate">{t("farmer.inventory.reorder.date")}</Label>
              <Input
                id="reorderDate"
                type="date"
                value={reorderDate}
                onChange={(e) => setReorderDate(e.target.value)}
              />
            </div>

            {reorderRow && reorderQuantity && parseFloat(reorderQuantity) > 0 && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <span className="font-medium">{t("farmer.inventory.reorder.total")}:</span>{" "}
                ₹{(reorderRow.rate * parseFloat(reorderQuantity)).toLocaleString()}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setReorderRow(null)}>
              {t("farmer.inventory.modal.cancel")}
            </Button>
            <Button
              onClick={handleReorderSubmit}
              className="bg-primary hover:bg-primary/90"
              disabled={reorderMutation.isPending || !reorderQuantity || parseFloat(reorderQuantity) <= 0}
            >
              {reorderMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.inventory.reorder.submitting")}
                </>
              ) : (
                t("farmer.inventory.reorder.submit")
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Item Modal (for Other tab only) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t("farmer.inventory.modal.addOtherTitle")}
      >
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("farmer.inventory.modal.heading")}</h2>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">{t("farmer.inventory.modal.itemName")}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder={t("farmer.inventory.modal.itemNamePlaceholder")}
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">{t("farmer.inventory.modal.quantity")}</Label>
                <Input
                  id="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      quantity: e.target.value,
                    }))
                  }
                  placeholder="0"
                />
                {errors.quantity && (
                  <p className="text-sm text-red-600 mt-1">{errors.quantity}</p>
                )}
              </div>
              <div>
                <Label htmlFor="unit">{t("farmer.inventory.modal.unit")}</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, unit: e.target.value }))
                  }
                  placeholder={
                    activeTab === "feed"
                      ? t("farmer.inventory.modal.unitPlaceholderFeed")
                      : activeTab === "chicks"
                        ? t("farmer.inventory.modal.unitPlaceholderChicks")
                        : activeTab === "medicine"
                          ? t("farmer.inventory.modal.unitPlaceholderMedicine")
                          : t("farmer.inventory.modal.unitPlaceholderOther")
                  }
                />
                {errors.unit && (
                  <p className="text-sm text-red-600 mt-1">{errors.unit}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="rate">{t("farmer.inventory.modal.rate")}</Label>
              <Input
                id="rate"
                type="number"
                value={formData.rate}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rate: e.target.value }))
                }
                placeholder="0"
              />
              {errors.rate && (
                <p className="text-sm text-red-600 mt-1">{errors.rate}</p>
              )}
            </div>

            <div>
              <Label htmlFor="supplier">{t("farmer.inventory.modal.supplier")}</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, supplier: e.target.value }))
                }
                placeholder={t("farmer.inventory.modal.supplierPlaceholder")}
              />
            </div>

            <div>
              <Label htmlFor="batchNumber">{t("farmer.inventory.modal.batchNumber")}</Label>
              <Input
                id="batchNumber"
                value={formData.batchNumber}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    batchNumber: e.target.value,
                  }))
                }
                placeholder={t("farmer.inventory.modal.batchPlaceholder")}
              />
            </div>

            <div>
              <Label htmlFor="description">{t("farmer.inventory.modal.description")}</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder={t("farmer.inventory.modal.descriptionPlaceholder")}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              {t("farmer.inventory.modal.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-primary hover:bg-primary/90"
              disabled={createInventoryMutation.isPending}
            >
              {createInventoryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.inventory.modal.adding")}
                </>
              ) : (
                t("farmer.inventory.addItem")
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
