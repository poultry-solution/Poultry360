"use client";
import { StatTile, rupees } from "@/components/dashboard/StatsCards";

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
  Loader2,
  Egg,
  RefreshCw,
  Trash2,
  Factory,
  FlaskConical,
  Pencil,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { useState, useEffect } from "react";
import { Modal } from "@/common/components/ui/modal";
import { Input } from "@/common/components/ui/input";
import { DateInput } from "@/common/components/ui/date-input";
import { Label } from "@/common/components/ui/label";
import { DataTable, Column, createColumn } from "@/common/components/ui/data-table";
import { useInventoryDashboard } from "@/fetchers/inventory/inventoryQueries";
import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import { useGetEggInventory } from "@/fetchers/sale/saleQueries";
import { DateDisplay } from "@/common/components/ui/date-display";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";
import { useAddDealerTransaction } from "@/fetchers/dealers/dealerQueries";
import { inventoryKeys, useDeleteInventoryItem } from "@/fetchers/inventory/inventoryQueries";
import { useQueryClient } from "@tanstack/react-query";
import { formatRatePerUnit, formatRupeesExact, getTodayLocalDate } from "@/common/lib/utils";
import { getNepalTodayAd, toNepalDayAd } from "@/common/lib/nepali-date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  useArchiveFarmerProduct,
  useCreateFarmerProduct,
  useGetFarmerProducts,
  useUpdateFarmerProduct,
  type FarmerManufacturedProduct,
  type FarmerProductOutputType,
} from "@/fetchers/farmer/farmerProductQueries";
import {
  ACCOUNT_FEATURE_KEYS,
  useAccountFeature,
} from "@/fetchers/accountFeatureQueries";
import axiosInstance from "@/common/lib/axios";
import { BusinessDownloadDialog } from "@/components/downloads/BusinessDownloadDialog";

const PRODUCT_TYPES: Array<{
  value: FarmerProductOutputType;
  label: string;
}> = [
  { value: "FEED", label: "Feed" },
  { value: "MEDICINE", label: "Medicine" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "OTHER", label: "Other" },
];

const emptyProductForm = {
  name: "",
  unit: "kg",
  outputItemType: "FEED" as FarmerProductOutputType,
  minStock: "",
};

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<
    | "feed"
    | "chicks"
    | "medicine"
    | "raw-material"
    | "self-made"
    | "other"
    | "eggs"
  >("feed");
  const { t } = useI18n();

  // Cost per unit: lakh commas, keeps up to 4 decimals (e.g. chick cost after free chicks), no ".00".
  const ratePerUnit = formatRatePerUnit;
  const statusLabel = (status: string) =>
    status === "In Stock"
      ? t("farmer.inventory.ui.statusInStock")
      : status === "Low Stock"
        ? t("farmer.inventory.ui.statusLowStock")
        : status === "Out of Stock"
          ? t("farmer.inventory.ui.statusOutOfStock")
          : status;
  const [reorderRow, setReorderRow] = useState<any>(null);
  const [reorderQuantity, setReorderQuantity] = useState("");
  const [reorderDate, setReorderDate] = useState(getTodayLocalDate());
  const [isProductOpen, setIsProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<FarmerManufacturedProduct | null>(null);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const reorderMutation = useAddDealerTransaction();
  const deleteInventoryMutation = useDeleteInventoryItem();
  const createProduct = useCreateFarmerProduct();
  const updateProduct = useUpdateFarmerProduct();
  const archiveProduct = useArchiveFarmerProduct();
  const queryClient = useQueryClient();
  const { isEnabled: isSelfFeedEnabled } = useAccountFeature(
    ACCOUNT_FEATURE_KEYS.SELF_FEED_PRODUCTION
  );

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
  const { data: productsData, isLoading: productsLoading } =
    useGetFarmerProducts(
      { limit: 100 },
      { enabled: isSelfFeedEnabled }
    );
  const manufacturedProducts = productsData?.data ?? [];

  useEffect(() => {
    if (!isSelfFeedEnabled) {
      if (activeTab === "raw-material" || activeTab === "self-made") {
        setActiveTab("feed");
      }
      setIsProductOpen(false);
      setEditingProduct(null);
      setProductForm(emptyProductForm);
    }
  }, [activeTab, isSelfFeedEnabled]);

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
      case "raw-material":
        return tableData.filter(
          (item: any) => item.itemType === "RAW_MATERIAL"
        );
      case "self-made":
        return tableData.filter((item: any) => item.origin === "SELF_MADE");
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
  const downloadInventory = async () => {
    const { data } = await axiosInstance.get("/inventory/table");
    const purchasedRows = (data.data || []).filter((item: any) => Number(item.quantity ?? item.currentStock ?? 0) > 0);
    const selfMadeRows = manufacturedProducts
      .filter((product: any) => Number(product.currentStock || 0) > 0)
      .map((product: any) => ({
        ...product,
        itemType: product.outputItemType || "SELF_MADE",
        quantity: product.currentStock,
        rate: product.unitCost || product.unitPrice || 0,
      }));
    const rows = [...purchasedRows, ...selfMadeRows];
    return {
      columns: [
        { label: "Item", value: (row: any) => row.name || "" },
        { label: "Type", value: (row: any) => row.itemType || "" },
        { label: "Stock", value: (row: any) => `${Number(row.quantity ?? row.currentStock ?? 0).toFixed(2)} ${row.unit || ""}` },
        { label: "Cost per unit", value: (row: any) => Number(row.rate || row.unitCost || 0).toFixed(2) },
        { label: "Supplier", value: (row: any) => row.dealer?.name || row.supplier?.name || "" },
      ],
      rows,
      summary: [{ label: "Items with stock", value: rows.length }],
    };
  };
  const activeTabLabel =
    activeTab === "feed"
      ? t("farmer.inventory.tabs.feed")
      : activeTab === "chicks"
        ? t("farmer.inventory.tabs.chicks")
        : activeTab === "medicine"
          ? t("farmer.inventory.tabs.medicine")
          : activeTab === "raw-material"
            ? t("farmer.inventory.ui.tabRawMaterial")
            : activeTab === "self-made"
              ? t("farmer.inventory.ui.tabSelfFeed")
              : activeTab === "eggs"
                ? t("farmer.inventory.ui.tabEggs")
                : t("farmer.inventory.tabs.other");

  const openReorderModal = (row: any) => {
    setReorderRow(row);
    setReorderQuantity("");
    setReorderDate(getTodayLocalDate());
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

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setIsProductOpen(true);
  };

  const openEditProduct = (product: FarmerManufacturedProduct) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      unit: product.unit,
      outputItemType: product.outputItemType,
      minStock: product.minStock === null ? "" : String(product.minStock),
    });
    setIsProductOpen(true);
  };

  const closeProductModal = () => {
    setIsProductOpen(false);
    setEditingProduct(null);
    setProductForm(emptyProductForm);
  };

  const handleSaveProduct = async () => {
    const minStock =
      productForm.minStock === "" ? null : Number(productForm.minStock);

    if (!productForm.name.trim() || !productForm.unit.trim()) {
      toast.error(t("farmer.inventory.ui.toastNameUnitRequired"));
      return;
    }
    if (minStock !== null && (!Number.isFinite(minStock) || minStock < 0)) {
      toast.error(t("farmer.inventory.ui.toastMinStock"));
      return;
    }

    try {
      const input = {
        name: productForm.name.trim(),
        unit: productForm.unit.trim(),
        outputItemType: productForm.outputItemType,
        minStock,
      };

      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, input });
      } else {
        await createProduct.mutateAsync(input);
      }

      toast.success(
        editingProduct ? t("farmer.inventory.ui.toastProductUpdated") : t("farmer.inventory.ui.toastProductAdded")
      );
      closeProductModal();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("farmer.inventory.ui.toastSaveFailed"));
    }
  };

  const handleArchiveProduct = async (
    product: FarmerManufacturedProduct
  ) => {
    if (!confirm(t("farmer.inventory.ui.archiveConfirm", { name: product.name }))) return;

    try {
      await archiveProduct.mutateAsync(product.id);
      toast.success(t("farmer.inventory.ui.toastArchived"));
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || t("farmer.inventory.ui.toastArchiveFailed")
      );
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
      case "raw-material":
        return <FlaskConical className="h-4 w-4" />;
      case "self-made":
        return <Factory className="h-4 w-4" />;
      case "other":
        return <Box className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  // Column configurations for different categories
  const getInventoryColumns = (
    category:
      | "feed"
      | "medicine"
      | "chicks"
      | "raw-material"
      | "self-made"
      | "other"
      | "eggs"
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
        createColumn("status", t("farmer.inventory.ui.status"), {
          render: (_, item: any) => (
            <Badge
              variant={item.quantity === 0 ? "destructive" : "secondary"}
              className={
                item.quantity === 0
                  ? "bg-red-100 text-red-800"
                  : "bg-green-100 text-green-800"
              }
            >
              {item.quantity === 0 ? t("farmer.inventory.ui.statusOutOfStock") : t("farmer.inventory.ui.statusInStock")}
            </Badge>
          ),
        })
      ];
    }

    const baseColumns = [
      createColumn("name", t("farmer.inventory.table.item"), {
        render: (_, item: any) => (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{item.name}</p>
              {item.origin === "SELF_MADE" && (
                <Badge className="bg-emerald-100 text-emerald-800">
                  {t("farmer.inventory.ui.selfFeedBadge")}
                </Badge>
              )}
            </div>
            {item.batchNumber && (
              <p className="text-sm text-gray-600">
                {t("farmer.inventory.table.batch")}: {item.batchNumber}
              </p>
            )}
            {category === "raw-material" && item.firstPurchaseDate && (
              <p className="text-xs text-gray-500">
                {t("farmer.inventory.ui.boughtOn")}{" "}
                <DateDisplay date={item.firstPurchaseDate} format="short" />
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
      createColumn("rate", t("farmer.inventory.ui.costPerUnit"), {
        render: (_, item: any) => ratePerUnit(item.rate, item.unit),
        align: "right",
      }),
      createColumn("value", t("farmer.inventory.table.value"), {
        render: (_, item: any) => formatRupeesExact(item.value),
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
            if (!value) return "—";
            // Compare Nepal days, not the browser clock.
            const expiryDay = toNepalDayAd(value);
            const today = getNepalTodayAd();
            const soonLimit = new Date(`${today}T00:00:00Z`);
            soonLimit.setUTCDate(soonLimit.getUTCDate() + 30);
            const isExpired = expiryDay < today;
            const isSoon = !isExpired && expiryDay <= soonLimit.toISOString().slice(0, 10);
            return (
              <span className={isExpired ? "font-medium text-red-600" : isSoon ? "font-medium text-amber-600" : ""}>
                <DateDisplay date={value} format="short" />
                {isExpired && (
                  <span className="ml-1.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">
                    {t("farmer.inventory.ui.expired")}
                  </span>
                )}
                {isSoon && (
                  <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                    {t("farmer.inventory.ui.expiresSoon")}
                  </span>
                )}
              </span>
            );
          },
        })
      );
    }

    // Add status column
    baseColumns.push(
      createColumn("status", t("farmer.inventory.ui.status"), {
        render: (_, item: any) => (
          <Badge
            variant={item.status === "Low Stock" ? "destructive" : "secondary"}
            className={
              item.status === "Low Stock"
                ? "bg-red-100 text-red-800"
                : "bg-green-100 text-green-800"
            }
          >
            {statusLabel(item.status)}
          </Badge>
        ),
      })
    );

    // Action column: Reorder (when applicable) + Delete (shown only when stock is 0).
    // Rows with stock show no greyed-out button and no warning; one help line sits under the table.
    baseColumns.push(
      createColumn("action", t("farmer.inventory.ui.action"), {
        render: (_, item: any) => {
          const qty = Number(item.quantity ?? 0);
          const canDelete = qty === 0 && item.origin !== "SELF_MADE";
          const showReorder =
            item.origin !== "SELF_MADE" && item.dealerId && !item.hasDealerAccount;
          if (!showReorder && !canDelete) {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <div className="flex items-center gap-1">
              {showReorder && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  onClick={() => openReorderModal(item)}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  {t("farmer.inventory.reorder.button")}
                </Button>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={deleteInventoryMutation.isPending}
                  aria-label={t("farmer.inventory.ui.delete")}
                  title={t("farmer.inventory.ui.delete")}
                  onClick={() => {
                    if (!confirm(t("farmer.inventory.deleteConfirm", { name: item.name }))) return;
                    deleteInventoryMutation.mutate(item.id, {
                      onSuccess: () => toast.success(t("farmer.inventory.deleteSuccess")),
                      onError: (err: any) => toast.error(err?.message || t("farmer.inventory.ui.toastDeleteFailed")),
                    });
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        },
      })
    );

    return baseColumns;
  };

  const productColumns: Column<FarmerManufacturedProduct>[] = [
    {
      key: "name",
      label: t("farmer.inventory.ui.product"),
      render: (_, product) => (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{product.name}</span>
          <Badge className="bg-emerald-100 text-emerald-800">
            {t("farmer.inventory.ui.selfFeedBadge")}
          </Badge>
        </div>
      ),
    },
    {
      key: "outputItemType",
      label: t("farmer.inventory.ui.category"),
      render: (_, product) => (
        <Badge variant="outline">
          {t(`farmer.inventory.ui.type${product.outputItemType}`) === `farmer.inventory.ui.type${product.outputItemType}`
            ? product.outputItemType.replaceAll("_", " ")
            : t(`farmer.inventory.ui.type${product.outputItemType}`)}
        </Badge>
      ),
    },
    {
      key: "currentStock",
      label: t("farmer.inventory.ui.quantity"),
      render: (_, product) => (
        <span className="font-medium">
          {Number(product.currentStock)} {product.unit}
        </span>
      ),
    },
    {
      key: "lotCount",
      label: t("farmer.inventory.ui.productionLots"),
      render: (_, product) => product.lotCount,
    },
    {
      key: "unitCost",
      label: t("farmer.inventory.ui.costPerUnit"),
      render: (_, product) =>
        product.unitCost === null ? "—" : ratePerUnit(product.unitCost, product.unit),
    },
    {
      key: "minStock",
      label: t("farmer.inventory.ui.minimumStock"),
      render: (_, product) =>
        product.minStock === null
          ? "—"
          : `${Number(product.minStock)} ${product.unit}`,
    },
    {
      key: "actions",
      label: t("farmer.inventory.ui.actions"),
      render: (_, product) => {
        const hasStock = Number(product.currentStock) > 0;

        return (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditProduct(product)}
            >
              <Pencil className="mr-1 h-3.5 w-3.5" />
              {t("farmer.inventory.ui.edit")}
            </Button>
            {!hasStock && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                disabled={archiveProduct.isPending}
                onClick={() => handleArchiveProduct(product)}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                {t("farmer.inventory.ui.archive")}
              </Button>
            )}
          </div>
        );
      },
    },
  ];

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
                ? t("farmer.inventory.ui.eggSubtitle")
                : t("farmer.inventory.subtitleDefault")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BusinessDownloadDialog title="inventory" fileName="farmer-inventory" getData={downloadInventory} hasDateFilter={false} buttonLabel="Download inventory" />
        {activeTab === "self-made" ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openCreateProduct}>
              <Plus className="mr-1 h-4 w-4" />
              {t("farmer.inventory.ui.addProduct")}
            </Button>
            <Button asChild>
              <Link href="/farmer/dashboard/production/new">
                <Factory className="mr-1 h-4 w-4" />
                {t("farmer.inventory.ui.addProduction")}
              </Link>
            </Button>
          </div>
        ) : null}
        </div>
      </div>

      {/* Stats tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          tile={{
            label: t("farmer.inventory.stats.totalItems"),
            icon: Package,
            value: Number(stats?.totalItems || 0).toLocaleString("en-IN"),
            sub: t("farmer.inventory.stats.inStock"),
          }}
        />
        <StatTile
          tile={{
            label: t("farmer.inventory.stats.lowStock"),
            icon: AlertTriangle,
            iconClass: "text-orange-500",
            value: Number(stats?.lowStockItems || 0).toLocaleString("en-IN"),
            valueClass: Number(stats?.lowStockItems || 0) > 0 ? "text-orange-600" : "",
            sub: t("farmer.inventory.stats.needReorder"),
          }}
        />
        <StatTile
          tile={{
            label: t("farmer.inventory.stats.totalValue"),
            icon: Package,
            value: rupees(stats?.totalValue || 0),
            sub: t("farmer.inventory.stats.inventoryWorth"),
          }}
        />
        <StatTile
          tile={{
            label: t("farmer.inventory.stats.categories"),
            icon: Package,
            value: Number(stats?.categories || 0).toLocaleString("en-IN"),
            sub: t("farmer.inventory.stats.itemTypes"),
          }}
        />
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-1 md:space-x-8 overflow-x-auto pb-1">
          {[
            ...(hasLayerBatch ? [{ key: "eggs", label: t("farmer.inventory.ui.tabEggs"), icon: <Egg className="h-4 w-4" /> }] : []),
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
            ...(isSelfFeedEnabled
              ? [
                  {
                    key: "raw-material",
                    label: t("farmer.inventory.ui.tabRawMaterial"),
                    icon: <FlaskConical className="h-4 w-4" />,
                  },
                  {
                    key: "self-made",
                    label: t("farmer.inventory.ui.tabSelfFeed"),
                    icon: <Factory className="h-4 w-4" />,
                  },
                ]
              : []),
            { key: "other", label: t("farmer.inventory.tabs.other"), icon: <Box className="h-4 w-4" /> },
          ].map((tab) => {
            const getTabCount = () => {
              if (tab.key === "eggs") {
                if (!selectedEggBatchId) return 0;
                return (eggData?.data?.types ?? []).reduce((s: number, t: { quantity?: number }) => s + (t.quantity ?? 0), 0);
              }
              if (tab.key === "self-made") {
                return manufacturedProducts.length;
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
                case "raw-material":
                  return tableData.filter(
                    (item: any) => item.itemType === "RAW_MATERIAL"
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
                {tab.key !== "eggs" && (
                  <Badge variant="secondary" className="ml-0.5 md:ml-1 text-[10px] md:text-xs px-1.5 md:px-2">
                    {getTabCount()}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Inventory Table */}
      <Card className="gap-3 py-0">
        <CardHeader className="flex flex-col gap-2 px-3 pt-3 pb-0 sm:flex-row sm:items-center sm:justify-between md:px-6 md:pt-5">
          <CardTitle className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base md:text-lg">
            {getCategoryIcon(activeTab)}
            <span>
              {activeTab === "eggs"
                ? t("farmer.inventory.ui.eggInventory")
                : t("farmer.inventory.categoryTitle", {
                    category: activeTabLabel,
                  })}
            </span>
            <span className="text-sm font-normal text-muted-foreground">
              {activeTab === "eggs"
                ? selectedEggBatchId && filteredInventory.length > 0
                  ? t("farmer.inventory.ui.countEggTypes", {
                      types: filteredInventory.length,
                      eggs: filteredInventory
                        .reduce((sum: number, row: any) => sum + Number(row.quantity || 0), 0)
                        .toLocaleString("en-IN"),
                    })
                  : ""
                : activeTab === "self-made"
                  ? manufacturedProducts.length === 1
                    ? t("farmer.inventory.ui.countProduct")
                    : t("farmer.inventory.ui.countProducts", { count: manufacturedProducts.length })
                  : filteredInventory.length === 1
                    ? t("farmer.inventory.ui.countItem")
                    : t("farmer.inventory.ui.countItems", { count: filteredInventory.length })}
            </span>
          </CardTitle>
          {activeTab === "eggs" && (
<div className="flex w-full items-center gap-2 sm:w-auto">
            <Label htmlFor="egg-batch-select" className="whitespace-nowrap text-sm font-normal text-muted-foreground">
              {t("farmer.inventory.ui.layersBatch")}
            </Label>
            <select
              id="egg-batch-select"
              value={selectedEggBatchId}
              onChange={(e) => setSelectedEggBatchId(e.target.value)}
              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm font-normal sm:w-64 sm:flex-none"
            >
              <option value="">{t("farmer.inventory.ui.selectBatch")}</option>
              {layerBatches.map((batch: any) => (
                <option key={batch.id} value={batch.id}>
                  {batch.batchNumber ?? batch.id}
                  {batch.farm?.name ? ` (${batch.farm.name})` : ""}
                </option>
              ))}
            </select>
          </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {activeTab === "self-made" ? (
            productsLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t("farmer.inventory.ui.loadingProducts")}
              </div>
            ) : manufacturedProducts.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <Factory className="mx-auto mb-3 h-12 w-12 opacity-40" />
                <p className="font-medium">{t("farmer.inventory.ui.noSelfFeedProducts")}</p>
                <p className="mt-1 text-sm">
                  {t("farmer.inventory.ui.addProductHint")}
                </p>
                <Button className="mt-4" onClick={openCreateProduct}>
                  <Plus className="mr-1 h-4 w-4" />
                  {t("farmer.inventory.ui.addProduct")}
                </Button>
              </div>
            ) : (
              <DataTable
                data={manufacturedProducts}
                columns={productColumns}
                emptyMessage={t("farmer.inventory.ui.noSelfFeedProducts")}
              />
            )
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("farmer.inventory.empty", { category: activeTab })}</p>
              {activeTab === "eggs" ? (
                <p className="text-sm mt-2">
                  {selectedEggBatchId
                    ? (isEggLoading
                      ? t("farmer.inventory.ui.loading")
                      : t("farmer.inventory.ui.noEggsForBatch"))
                    : t("farmer.inventory.ui.selectBatchHint")}
                </p>
              ) : (
                <p className="text-sm mt-2">
                  {t("farmer.inventory.emptyHelp")}{" "}
                  {activeTab === "medicine"
                    ? t("farmer.inventory.medicalSupplierLedger")
                    : t("farmer.inventory.dealerLedger")}
                </p>
              )}
            </div>
          ) : (
            <>
              <DataTable
                data={filteredInventory}
                columns={getInventoryColumns(activeTab)}
                emptyMessage={t("farmer.inventory.empty", { category: activeTab })}
              />
              {activeTab !== "eggs" &&
                filteredInventory.some((item: any) => Number(item.quantity ?? 0) > 0 && item.origin !== "SELF_MADE") && (
                  <p className="px-4 py-2 text-xs text-muted-foreground">{t("farmer.inventory.ui.deleteHint")}</p>
                )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Self Feed product modal */}
      <Modal
        isOpen={isProductOpen}
        onClose={closeProductModal}
        title={
          editingProduct ? t("farmer.inventory.ui.editProductTitle") : t("farmer.inventory.ui.addProductTitle")
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="self-made-product-name">{t("farmer.inventory.ui.productName")}</Label>
            <Input
              id="self-made-product-name"
              value={productForm.name}
              onChange={(event) =>
                setProductForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder={t("farmer.inventory.ui.productNamePlaceholder")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("farmer.inventory.ui.inventoryCategory")}</Label>
              <Select
                value={productForm.outputItemType}
                disabled={Boolean(editingProduct?.lotCount)}
                onValueChange={(value) =>
                  setProductForm((current) => ({
                    ...current,
                    outputItemType: value as FarmerProductOutputType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {PRODUCT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {t(`farmer.inventory.ui.type${type.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="self-made-product-unit">{t("farmer.inventory.ui.unit")}</Label>
              <Input
                id="self-made-product-unit"
                value={productForm.unit}
                disabled={Boolean(editingProduct?.lotCount)}
                onChange={(event) =>
                  setProductForm((current) => ({
                    ...current,
                    unit: event.target.value,
                  }))
                }
                placeholder={t("farmer.inventory.ui.unitPlaceholder")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="self-made-product-min-stock">
              {t("farmer.inventory.ui.minStockOptional")}
            </Label>
            <Input
              id="self-made-product-min-stock"
              type="number"
              min="0"
              step="any"
              value={productForm.minStock}
              onChange={(event) =>
                setProductForm((current) => ({
                  ...current,
                  minStock: event.target.value,
                }))
              }
            />
          </div>

          {editingProduct && editingProduct.lotCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("farmer.inventory.ui.lockedHint")}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={closeProductModal}>
              {t("farmer.inventory.ui.cancel")}
            </Button>
            <Button
              onClick={handleSaveProduct}
              disabled={createProduct.isPending || updateProduct.isPending}
            >
              {createProduct.isPending || updateProduct.isPending
                ? t("farmer.inventory.ui.saving")
                : editingProduct
                  ? t("farmer.inventory.ui.saveChanges")
                  : t("farmer.inventory.ui.addProduct")}
            </Button>
          </div>
        </div>
      </Modal>

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
                <Input value={reorderRow ? ratePerUnit(reorderRow.rate, reorderRow.unit) : ""} disabled />
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
              <DateInput
                label={t("farmer.inventory.reorder.date")}
                value={reorderDate}
                onChange={setReorderDate}
              />
            </div>

            {reorderRow && reorderQuantity && parseFloat(reorderQuantity) > 0 && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <span className="font-medium">{t("farmer.inventory.reorder.total")}:</span>{" "}
                {formatRupeesExact(reorderRow.rate * parseFloat(reorderQuantity))}
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
    </div>
  );
}
