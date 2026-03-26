"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Layers,
  ChevronRight,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Badge } from "@/common/components/ui/badge";
import { DateDisplay } from "@/common/components/ui/date-display";
import {
  useHatcheryBatches,
  useCreateHatcheryBatch,
  type HatcheryBatch,
} from "@/fetchers/hatchery/hatcheryBatchQueries";
import { useGetHatcheryInventoryTable } from "@/fetchers/hatchery/hatcheryInventoryQueries";
import { DataTable, type Column } from "@/common/components/ui/data-table";

type StatusFilter = "" | "ACTIVE" | "CLOSED";

// Placement row in the create form
interface PlacementRow {
  inventoryItemId: string;
  quantity: string;
}

export default function HatcheryBatchesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useHatcheryBatches({
    status: statusFilter || undefined,
    search: search || undefined,
    limit: 50,
  });
  const batches = data?.batches ?? [];

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [placements, setPlacements] = useState<PlacementRow[]>([
    { inventoryItemId: "", quantity: "" },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateHatcheryBatch();
  const { data: inventoryTableRes } = useGetHatcheryInventoryTable("CHICKS");
  const inventoryItems: any[] = inventoryTableRes?.data ?? [];

  function addPlacementRow() {
    setPlacements((prev) => [...prev, { inventoryItemId: "", quantity: "" }]);
  }

  function removePlacementRow(idx: number) {
    setPlacements((prev) => prev.filter((_, i) => i !== idx));
  }

  function updatePlacement(idx: number, field: keyof PlacementRow, value: string) {
    setPlacements((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  }

  async function handleCreate() {
    setFormError(null);
    const validPlacements = placements.filter(
      (p) => p.inventoryItemId && p.quantity
    );
    if (validPlacements.length === 0) {
      setFormError("At least one inventory placement is required");
      return;
    }

    try {
      const batch = await createMutation.mutateAsync({
        type: "PARENT_FLOCK",
        startDate,
        notes: notes || undefined,
        placements: validPlacements.map((p) => ({
          inventoryItemId: p.inventoryItemId,
          quantity: parseInt(p.quantity),
        })),
      });
      setShowCreate(false);
      resetForm();
      router.push(`/hatchery/dashboard/batches/${batch.id}`);
    } catch (err: any) {
      setFormError(err?.response?.data?.error ?? "Failed to create batch");
    }
  }

  function resetForm() {
    setStartDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setPlacements([{ inventoryItemId: "", quantity: "" }]);
    setFormError(null);
  }

  const columns: Column<HatcheryBatch>[] = [
    {
      key: "code",
      label: "Batch",
      render: (_, row) => (
        <div>
          <p className="font-semibold text-gray-900">
            {row.code}
            {row.name && <span className="text-gray-500 font-normal ml-2">– {row.name}</span>}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            <DateDisplay date={row.startDate} />
          </p>
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      render: (_, row) => (
        <Badge
          className={
            row.type === "PARENT_FLOCK"
              ? "bg-amber-100 text-amber-800 border-amber-200"
              : "bg-purple-100 text-purple-800 border-purple-200"
          }
        >
          {row.type === "PARENT_FLOCK" ? "Parent Flock" : "Incubation"}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (_, row) => (
        <Badge
          className={
            row.status === "ACTIVE"
              ? "bg-green-100 text-green-800 border-green-200"
              : "bg-gray-100 text-gray-600 border-gray-200"
          }
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "currentParents",
      label: "Birds",
      align: "right",
      render: (_, row) =>
        row.currentParents !== null ? (
          <span className="font-medium">{row.currentParents.toLocaleString()}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "__actions",
      label: "",
      align: "right",
      width: "80px",
      render: (_, row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => router.push(`/hatchery/dashboard/batches/${row.id}`)}
        >
          View
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="h-6 w-6 text-amber-600" />
            Batches
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your parent flock batches
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Batch
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search batches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <div className="flex gap-1 border rounded-lg p-1 bg-gray-50">
          {(["", "ACTIVE", "CLOSED"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s === "" ? "All" : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <DataTable
          data={batches}
          columns={columns}
          loading={isLoading}
          emptyMessage="No batches found. Create your first batch."
          getRowKey={(row) => row.id}
        />
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">Create Parent Flock Batch</h2>
              <button
                onClick={() => { setShowCreate(false); resetForm(); }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-600">{formError}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <Input
                  placeholder="Any notes about this batch"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Placements */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Chick Placements (from Inventory)
                  </label>
                  <button
                    onClick={addPlacementRow}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Add Row
                  </button>
                </div>

                <div className="space-y-2">
                  {placements.map((placement, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                        value={placement.inventoryItemId}
                        onChange={(e) => updatePlacement(idx, "inventoryItemId", e.target.value)}
                      >
                        <option value="">Select inventory item</option>
                        {inventoryItems.map((item: any) => (
                          <option key={item.id} value={item.id}>
                            {item.name} — {Number(item.currentStock).toLocaleString()} {item.unit} in stock
                          </option>
                        ))}
                      </select>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        className="w-28"
                        value={placement.quantity}
                        onChange={(e) => updatePlacement(idx, "quantity", e.target.value)}
                      />
                      {placements.length > 1 && (
                        <button
                          onClick={() => removePlacementRow(idx)}
                          className="p-1 hover:bg-red-50 text-red-400 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {inventoryItems.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No chick inventory items found. Add chicks to inventory first.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t">
              <Button
                className="flex-1"
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Batch
              </Button>
              <Button
                variant="outline"
                onClick={() => { setShowCreate(false); resetForm(); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
