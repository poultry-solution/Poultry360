"use client";

import { useState } from "react";
import { Egg, CheckCircle } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import {
  useHatcheryEggInventory,
  useHatcheryBatches,
  useHatcheryEggTypes,
  type HatcheryEggStockRow,
} from "@/fetchers/hatchery/hatcheryBatchQueries";
import { DataTable, type Column } from "@/common/components/ui/data-table";

export default function HatcheryEggInventoryPage() {
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");

  const { data: stockRows = [], isLoading } = useHatcheryEggInventory({
    batchId: selectedBatchId || undefined,
    typeId: selectedTypeId || undefined,
  });
  const { data: batchData } = useHatcheryBatches({ limit: 100 });
  const { data: eggTypes = [] } = useHatcheryEggTypes();

  const batches = batchData?.batches ?? [];
  const totalStock = stockRows.reduce((s, r) => s + r.currentStock, 0);

  const columns: Column<HatcheryEggStockRow>[] = [
    {
      key: "batch",
      label: "Batch",
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{row.batch?.code}</span>
          {row.batch?.name && (
            <span className="text-xs text-gray-500">{row.batch.name}</span>
          )}
        </div>
      ),
    },
    {
      key: "eggType",
      label: "Egg Type",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <span>{row.eggType.name}</span>
          {row.eggType.isHatchable && (
            <Badge className="bg-green-100 text-green-800 text-xs border-green-200">
              <CheckCircle className="h-3 w-3 mr-1" />
              Hatchable
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "batchStatus",
      label: "Batch Status",
      render: (_, row) => (
        <Badge
          className={
            row.batch?.status === "ACTIVE"
              ? "bg-green-100 text-green-800 border-green-200"
              : "bg-gray-100 text-gray-600 border-gray-200"
          }
        >
          {row.batch?.status ?? "—"}
        </Badge>
      ),
    },
    {
      key: "currentStock",
      label: "Current Stock",
      align: "right",
      render: (_, row) => (
        <span
          className={`text-lg font-bold ${row.currentStock === 0 ? "text-gray-400" : "text-gray-900"}`}
        >
          {row.currentStock.toLocaleString()}
          <span className="text-xs font-normal text-gray-500 ml-1">eggs</span>
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Egg className="h-6 w-6 text-yellow-600" />
          Egg Inventory
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Batch-wise egg stock overview. Filter by batch or egg type.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Eggs in Stock</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {totalStock.toLocaleString()}
          </p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Stock Rows</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{stockRows.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Filter by Batch</label>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-w-[200px]"
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code}{b.name ? ` – ${b.name}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Filter by Egg Type</label>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-w-[160px]"
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
          >
            <option value="">All Types</option>
            {eggTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <DataTable
          data={stockRows}
          columns={columns}
          loading={isLoading}
          emptyMessage="No egg stock found. Record egg production in a batch to see stock here."
          getRowKey={(row) => row.id}
          rowClassName={(row) =>
            row.currentStock === 0 ? "opacity-50" : ""
          }
        />
      </div>
    </div>
  );
}
