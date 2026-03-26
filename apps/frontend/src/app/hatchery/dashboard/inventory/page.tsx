"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Badge } from "@/common/components/ui/badge";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { DateInput } from "@/common/components/ui/date-input";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Minus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { getNowLocalDateTime } from "@/common/lib/utils";
import {
  useGetHatcheryInventoryTable,
  useGetHatcheryInventoryStatistics,
  useGetHatcheryLowStock,
  useUpdateHatcheryInventoryItem,
  useDeleteHatcheryInventoryItem,
  useReorderHatcheryInventoryItem,
  useRecordHatcheryInventoryUsage,
  type HatcheryInventoryItemType,
  type HatcheryInventoryItem,
} from "@/fetchers/hatchery/hatcheryInventoryQueries";

// ==================== HELPERS ====================

const TABS: { type: HatcheryInventoryItemType | "ALL"; label: string }[] = [
  { type: "ALL", label: "All" },
  { type: "FEED", label: "Feed" },
  { type: "MEDICINE", label: "Medicine" },
  { type: "CHICKS", label: "Chicks" },
  { type: "OTHER", label: "Other" },
];

const TYPE_COLORS: Record<HatcheryInventoryItemType, string> = {
  FEED: "bg-amber-100 text-amber-800",
  MEDICINE: "bg-blue-100 text-blue-800",
  CHICKS: "bg-yellow-100 text-yellow-800",
  OTHER: "bg-purple-100 text-purple-800",
};

const fmtStock = (n: number | string) =>
  Number(n || 0).toLocaleString("en-NP", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

// ==================== PAGE ====================

export default function HatcheryInventoryPage() {
  const [activeTab, setActiveTab] = useState<HatcheryInventoryItemType | "ALL">(
    "ALL"
  );
  const [selectedItem, setSelectedItem] =
    useState<HatcheryInventoryItem | null>(null);

  // Modals
  const [isReorderOpen, setIsReorderOpen] = useState(false);
  const [isUsageOpen, setIsUsageOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Forms
  const [reorderForm, setReorderForm] = useState({ quantity: "", date: "" });
  const [usageForm, setUsageForm] = useState({ quantity: "", date: "", note: "" });
  const [editForm, setEditForm] = useState({ name: "", unit: "", minStock: "" });

  // Queries
  const { data: tableRes, isLoading } = useGetHatcheryInventoryTable(
    activeTab !== "ALL" ? activeTab : undefined
  );
  const { data: statsRes } = useGetHatcheryInventoryStatistics();
  const { data: lowStockRes } = useGetHatcheryLowStock();

  // Mutations
  const updateItem = useUpdateHatcheryInventoryItem();
  const deleteItem = useDeleteHatcheryInventoryItem();
  const reorderItem = useReorderHatcheryInventoryItem();
  const recordUsage = useRecordHatcheryInventoryUsage();

  const items: HatcheryInventoryItem[] = tableRes?.data || [];
  const stats = statsRes?.data || {};
  const lowStockItems: HatcheryInventoryItem[] = lowStockRes?.data || [];

  const openReorder = (item: HatcheryInventoryItem) => {
    setSelectedItem(item);
    setReorderForm({ quantity: "", date: getNowLocalDateTime() });
    setIsReorderOpen(true);
  };

  const openUsage = (item: HatcheryInventoryItem) => {
    setSelectedItem(item);
    setUsageForm({ quantity: "", date: getNowLocalDateTime(), note: "" });
    setIsUsageOpen(true);
  };

  const openEdit = (item: HatcheryInventoryItem) => {
    setSelectedItem(item);
    setEditForm({
      name: item.name,
      unit: item.unit,
      minStock: item.minStock !== null ? String(item.minStock) : "",
    });
    setIsEditOpen(true);
  };

  const openDelete = (item: HatcheryInventoryItem) => {
    setSelectedItem(item);
    setIsDeleteOpen(true);
  };

  // ==================== HANDLERS ====================

  const handleReorder = async () => {
    if (!reorderForm.quantity || Number(reorderForm.quantity) <= 0) {
      toast.error("Quantity must be > 0");
      return;
    }
    if (!selectedItem) return;
    try {
      await reorderItem.mutateAsync({
        id: selectedItem.id,
        quantity: Number(reorderForm.quantity),
        date: reorderForm.date,
        note: `Reorder for ${selectedItem.name}`,
      });
      toast.success("Reorder purchase created and inventory updated");
      setIsReorderOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reorder");
    }
  };

  const handleUsage = async () => {
    if (!usageForm.quantity || Number(usageForm.quantity) <= 0) {
      toast.error("Quantity must be > 0");
      return;
    }
    if (!selectedItem) return;
    try {
      await recordUsage.mutateAsync({
        id: selectedItem.id,
        quantity: Number(usageForm.quantity),
        date: usageForm.date,
        note: usageForm.note || undefined,
      });
      toast.success("Usage recorded");
      setIsUsageOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to record usage");
    }
  };

  const handleEdit = async () => {
    if (!selectedItem || !editForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await updateItem.mutateAsync({
        id: selectedItem.id,
        data: {
          name: editForm.name.trim(),
          unit: editForm.unit || undefined,
          minStock:
            editForm.minStock !== ""
              ? Number(editForm.minStock)
              : null,
        },
      });
      toast.success("Item updated");
      setIsEditOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update item");
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      await deleteItem.mutateAsync(selectedItem.id);
      toast.success("Item removed");
      setIsDeleteOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete item");
    }
  };

  // ==================== RENDER ====================

  const canReorder = (item: HatcheryInventoryItem) =>
    item.supplierKey &&
    item.supplierKey !== "NONE" &&
    item.supplierKey.startsWith("HATCHERY_SUPPLIER:");

  const columns: Column<HatcheryInventoryItem>[] = [
    {
      key: "name",
      label: "Item",
      width: "220px",
      render: (_value, row) => {
        const isLow =
          row.minStock !== null &&
          Number(row.currentStock) < Number(row.minStock);
        return (
          <div className="flex items-center gap-1.5">
            {isLow && (
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
            )}
            <span className="font-medium">{row.name}</span>
          </div>
        );
      },
    },
    {
      key: "itemType",
      label: "Type",
      width: "140px",
      render: (value) => (
        <Badge className={`text-xs ${TYPE_COLORS[value as HatcheryInventoryItemType]}`}>
          {String(value)}
        </Badge>
      ),
    },
    {
      key: "currentStock",
      label: "Stock",
      align: "right",
      width: "160px",
      render: (value, row) => (
        <span className="font-semibold">
          {fmtStock(value)}{" "}
          <span className="text-muted-foreground font-normal">{row.unit}</span>
        </span>
      ),
    },
    {
      key: "unitPrice",
      label: "Unit Price",
      align: "right",
      width: "140px",
      render: (value) => (
        <span className="text-muted-foreground">
          Rs.{" "}
          {Number(value || 0).toLocaleString("en-NP", {
            minimumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      key: "minStock",
      label: "Min Stock",
      align: "right",
      width: "160px",
      render: (value, row) =>
        value !== null && value !== undefined ? (
          <span className="text-muted-foreground">
            {fmtStock(value)} {row.unit}
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "__actions",
      label: "Actions",
      align: "right",
      width: "260px",
      render: (_value, row) => (
        <div className="flex items-center justify-end gap-1">
          {canReorder(row) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-orange-600 hover:text-orange-700"
              onClick={() => openReorder(row)}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Reorder
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => openUsage(row)}
          >
            <Minus className="w-3 h-3 mr-1" />
            Use
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => openEdit(row)}
          >
            Edit
          </Button>
          {Number(row.currentStock) === 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-red-500 hover:text-red-600"
              onClick={() => openDelete(row)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Package className="w-6 h-6 text-orange-500" />
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-muted-foreground">
            Stock levels for feed, medicine, chicks and equipment
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Total Items", value: stats.totalItems ?? 0 },
          { label: "Feed", value: stats.feedCount ?? 0, color: "text-amber-600" },
          { label: "Medicine", value: stats.medicineCount ?? 0, color: "text-blue-600" },
          { label: "Chicks", value: stats.chicksCount ?? 0, color: "text-yellow-600" },
          {
            label: "Low Stock",
            value: stats.lowStockCount ?? 0,
            color: stats.lowStockCount > 0 ? "text-red-600" : "text-green-600",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-xl font-bold ${s.color ?? ""}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold text-red-700">
                Low Stock Alert ({lowStockItems.length} item
                {lowStockItems.length !== 1 ? "s" : ""})
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((item) => (
                <Badge
                  key={item.id}
                  variant="outline"
                  className="border-red-300 text-red-700"
                >
                  {item.name}: {fmtStock(item.currentStock)} {item.unit}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex border-b gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.type}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.type
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab(tab.type)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Inventory table */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Loading...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          <Package className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium">No inventory items</p>
          <p className="text-sm mt-1">
            Items are automatically added when you record purchases from
            suppliers.
          </p>
        </div>
      ) : (
        <DataTable
          data={items}
          columns={columns}
          emptyMessage="No inventory items"
          rowClassName={(row) => {
            const isLow =
              row.minStock !== null &&
              Number(row.currentStock) < Number(row.minStock);
            return isLow ? "bg-red-50/50" : "";
          }}
        />
      )}

      {/* ==================== MODALS ==================== */}

      {/* Reorder */}
      <Modal
        isOpen={isReorderOpen}
        onClose={() => setIsReorderOpen(false)}
        title={`Reorder: ${selectedItem?.name}`}
      >
        <ModalContent>
          <p className="text-sm text-muted-foreground mb-4">
            This will create a new purchase transaction from the linked supplier
            and update inventory stock automatically.
          </p>
          <div className="space-y-4">
            <div>
              <Label>
                Quantity ({selectedItem?.unit})
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={reorderForm.quantity}
                onChange={(e) =>
                  setReorderForm((p) => ({ ...p, quantity: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Date</Label>
              <DateInput
                value={reorderForm.date}
                onChange={(v) => setReorderForm((p) => ({ ...p, date: v }))}
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsReorderOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            onClick={handleReorder}
            disabled={reorderItem.isPending}
          >
            {reorderItem.isPending ? "Creating..." : "Create Reorder"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Usage */}
      <Modal
        isOpen={isUsageOpen}
        onClose={() => setIsUsageOpen(false)}
        title={`Record Usage: ${selectedItem?.name}`}
      >
        <ModalContent>
          <div className="space-y-4">
            <div>
              <Label>
                Quantity used ({selectedItem?.unit})
              </Label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={usageForm.quantity}
                onChange={(e) =>
                  setUsageForm((p) => ({ ...p, quantity: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Available:{" "}
                <strong>
                  {fmtStock(selectedItem?.currentStock ?? 0)} {selectedItem?.unit}
                </strong>
              </p>
            </div>
            <div>
              <Label>Date</Label>
              <DateInput
                value={usageForm.date}
                onChange={(v) => setUsageForm((p) => ({ ...p, date: v }))}
              />
            </div>
            <div>
              <Label>Note</Label>
              <Input
                placeholder="Optional"
                value={usageForm.note}
                onChange={(e) =>
                  setUsageForm((p) => ({ ...p, note: e.target.value }))
                }
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsUsageOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            onClick={handleUsage}
            disabled={recordUsage.isPending}
          >
            {recordUsage.isPending ? "Saving..." : "Record Usage"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Item */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Edit: ${selectedItem?.name}`}
      >
        <ModalContent>
          <div className="space-y-4">
            <div>
              <Label>Item Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Unit</Label>
              <Input
                value={editForm.unit}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, unit: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Minimum Stock (alert threshold)</Label>
              <Input
                type="number"
                min="0"
                placeholder="Leave blank for no alert"
                value={editForm.minStock}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, minStock: e.target.value }))
                }
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsEditOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-orange-500 hover:bg-orange-600"
            onClick={handleEdit}
            disabled={updateItem.isPending}
          >
            {updateItem.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Item */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Remove Item"
      >
        <ModalContent>
          <p className="text-sm text-muted-foreground">
            Remove <strong>{selectedItem?.name}</strong> from inventory? This
            is only allowed when stock is 0.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteItem.isPending}
          >
            {deleteItem.isPending ? "Removing..." : "Remove"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
