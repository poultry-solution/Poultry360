"use client";

import { useState } from "react";
import { Bird, FlaskConical, Layers } from "lucide-react";
import { Badge } from "@/common/components/ui/badge";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { useHatcheryBatches } from "@/fetchers/hatchery/hatcheryBatchQueries";
import {
  useIncubationBatches,
  useProducedChickStock,
  type ProducedChickStockRow,
  type ChickGrade,
} from "@/fetchers/hatchery/hatcheryIncubationQueries";

const GRADE_COLORS: Record<ChickGrade, string> = {
  A: "bg-green-100 text-green-800 border-green-200",
  B: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CULL: "bg-red-100 text-red-800 border-red-200",
};

const STAGE_COLORS: Record<string, string> = {
  SETTER: "bg-blue-100 text-blue-800 border-blue-200",
  CANDLING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HATCHER: "bg-orange-100 text-orange-800 border-orange-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
};

export default function HatcheryProducedChicksPage() {
  const [selectedParentBatchId, setSelectedParentBatchId] = useState("");
  const [selectedIncubationBatchId, setSelectedIncubationBatchId] = useState("");

  const { data: parentBatchData } = useHatcheryBatches({ type: "PARENT_FLOCK", limit: 100 });
  const { data: incubationData } = useIncubationBatches({
    parentBatchId: selectedParentBatchId || undefined,
    limit: 200,
  });
  const { data: rows = [], isLoading } = useProducedChickStock({
    parentBatchId: selectedParentBatchId || undefined,
    incubationBatchId: selectedIncubationBatchId || undefined,
  });

  const parentBatches = parentBatchData?.batches ?? [];
  const incubations = incubationData?.batches ?? [];

  const totalChicks = rows.reduce((sum, row) => sum + row.currentStock, 0);
  const gradeTotals = rows.reduce(
    (acc, row) => {
      acc[row.grade] += row.currentStock;
      return acc;
    },
    { A: 0, B: 0, CULL: 0 } as Record<ChickGrade, number>
  );

  const columns: Column<ProducedChickStockRow>[] = [
    {
      key: "parentBatch",
      label: "Parent Batch",
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{row.incubationBatch.parentBatch.code}</span>
          {row.incubationBatch.parentBatch.name && (
            <span className="text-xs text-gray-500">{row.incubationBatch.parentBatch.name}</span>
          )}
        </div>
      ),
    },
    {
      key: "incubationBatch",
      label: "Incubation",
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{row.incubationBatch.code}</span>
          {row.incubationBatch.name && (
            <span className="text-xs text-gray-500">{row.incubationBatch.name}</span>
          )}
        </div>
      ),
    },
    {
      key: "stage",
      label: "Incubation Stage",
      render: (_, row) => (
        <Badge className={STAGE_COLORS[row.incubationBatch.stage] ?? "bg-gray-100 text-gray-700 border-gray-200"}>
          {row.incubationBatch.stage}
        </Badge>
      ),
    },
    {
      key: "grade",
      label: "Grade",
      render: (_, row) => (
        <Badge className={GRADE_COLORS[row.grade]}>
          Grade {row.grade}
        </Badge>
      ),
    },
    {
      key: "currentStock",
      label: "Current Stock",
      align: "right",
      render: (_, row) => (
        <span className={`text-lg font-bold ${row.currentStock === 0 ? "text-gray-400" : "text-gray-900"}`}>
          {row.currentStock.toLocaleString()}
          <span className="text-xs font-normal text-gray-500 ml-1">chicks</span>
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bird className="h-6 w-6 text-green-600" />
          Produced Chicks
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Hatchery-wide chick stock by incubation and grade. Filter by parent batch or incubation.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Chicks in Stock</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalChicks.toLocaleString()}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Grade A</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{gradeTotals.A.toLocaleString()}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Grade B</p>
          <p className="text-3xl font-bold text-yellow-700 mt-1">{gradeTotals.B.toLocaleString()}</p>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <p className="text-sm text-gray-500">Cull</p>
          <p className="text-3xl font-bold text-red-700 mt-1">{gradeTotals.CULL.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4 flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Filter by Parent Batch</label>
          <div className="relative">
            <Layers className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <select
              className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm bg-white min-w-[220px]"
              value={selectedParentBatchId}
              onChange={(e) => {
                const nextParent = e.target.value;
                setSelectedParentBatchId(nextParent);
                setSelectedIncubationBatchId("");
              }}
            >
              <option value="">All Parent Batches</option>
              {parentBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code}{b.name ? ` – ${b.name}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Filter by Incubation</label>
          <div className="relative">
            <FlaskConical className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <select
              className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm bg-white min-w-[220px]"
              value={selectedIncubationBatchId}
              onChange={(e) => setSelectedIncubationBatchId(e.target.value)}
            >
              <option value="">All Incubations</option>
              {incubations.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code}{b.name ? ` – ${b.name}` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <DataTable
          data={rows}
          columns={columns}
          loading={isLoading}
          emptyMessage="No produced chick stock found. Add hatch results in an incubation batch to see stock here."
          getRowKey={(row) => row.id}
          rowClassName={(row) => (row.currentStock === 0 ? "opacity-50" : "")}
        />
      </div>
    </div>
  );
}
