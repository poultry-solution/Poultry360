"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Egg, Loader2 } from "lucide-react";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import {
  useHatcheryEggInventory,
  useHatcheryBatches,
  useHatcheryEggTypes,
  type HatcheryEggStockRow,
} from "@/fetchers/hatchery/hatcheryBatchQueries";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import axiosInstance from "@/common/lib/axios";
import { BusinessDownloadDialog, fetchAllPages } from "@/components/downloads/BusinessDownloadDialog";

// The stock list is small (batches × egg types), so load it all once and
// group / page it here. That keeps totals right and hides empty rows.
const ALL_ROWS = 500;
const PAGE_SIZE = 10;

type BatchStockRow = {
  id: string;
  code: string;
  name: string | null;
  status: string;
  byType: Record<string, number>;
  total: number;
};

function StatusText({ status }: { status: string }) {
  const active = status === "ACTIVE";
  return (
    <span className={`text-[11px] font-medium ${active ? "text-green-700" : "text-gray-400"}`}>
      {active ? "Active" : "Closed"}
    </span>
  );
}

export default function HatcheryEggInventoryPage() {
  const router = useRouter();
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [showEmpty, setShowEmpty] = useState(false);
  const [page, setPage] = useState(1);

  const { data: stockRes, isLoading, isError } = useHatcheryEggInventory({
    batchId: selectedBatchId || undefined,
    page: 1,
    limit: ALL_ROWS,
  });
  const { data: batchData } = useHatcheryBatches({ type: "PARENT_FLOCK", limit: 200 });
  const { data: eggTypes = [] } = useHatcheryEggTypes();

  const batches = batchData?.batches ?? [];
  const stockRows: HatcheryEggStockRow[] = stockRes?.data ?? [];

  // Egg types to show as columns: all, or only the picked one.
  const shownTypes = selectedTypeId ? eggTypes.filter((t) => t.id === selectedTypeId) : eggTypes;

  const typeTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const row of stockRows) totals[row.eggTypeId] = (totals[row.eggTypeId] ?? 0) + Number(row.currentStock || 0);
    return totals;
  }, [stockRows]);
  const totalStock = Object.values(typeTotals).reduce((sum, n) => sum + n, 0);

  // One row per batch, with a count for each egg type.
  const batchRows = useMemo<BatchStockRow[]>(() => {
    const map = new Map<string, BatchStockRow>();
    for (const row of stockRows) {
      if (!row.batch) continue;
      const entry =
        map.get(row.batchId) ??
        ({ id: row.batchId, code: row.batch.code, name: row.batch.name, status: row.batch.status, byType: {}, total: 0 } as BatchStockRow);
      entry.byType[row.eggTypeId] = (entry.byType[row.eggTypeId] ?? 0) + Number(row.currentStock || 0);
      map.set(row.batchId, entry);
    }
    const typeIds = shownTypes.map((t) => t.id);
    return Array.from(map.values())
      .map((entry) => ({ ...entry, total: typeIds.reduce((sum, id) => sum + (entry.byType[id] ?? 0), 0) }))
      .filter((entry) => showEmpty || entry.total > 0)
      .sort((a, b) => (a.status === b.status ? b.code.localeCompare(a.code) : a.status === "ACTIVE" ? -1 : 1));
  }, [stockRows, shownTypes, showEmpty]);

  const totalPages = Math.max(1, Math.ceil(batchRows.length / PAGE_SIZE));
  const pageRows = batchRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const shownTotal = batchRows.reduce((sum, r) => sum + r.total, 0);

  useEffect(() => {
    setPage(1);
  }, [selectedBatchId, selectedTypeId, showEmpty]);

  const downloadEggInventory = async () => {
    const allRows = await fetchAllPages<HatcheryEggStockRow>(async (downloadPage, limit) => {
      const { data } = await axiosInstance.get("/hatchery/batches/egg-inventory", { params: { page: downloadPage, limit } });
      return { rows: data.data || [], totalPages: data.pagination?.totalPages };
    });
    const rows = allRows.filter((row: HatcheryEggStockRow) => Number(row.currentStock || 0) > 0);
    return {
      columns: [
        { label: "Batch", value: (row: HatcheryEggStockRow) => row.batch?.code || "" },
        { label: "Egg type", value: (row: HatcheryEggStockRow) => row.eggType?.name || "" },
        { label: "Hatchable", value: (row: HatcheryEggStockRow) => row.eggType?.isHatchable ? "Yes" : "No" },
        { label: "Stock", value: (row: HatcheryEggStockRow) => Number(row.currentStock || 0).toLocaleString() },
      ],
      rows,
      summary: [{ label: "Rows with stock", value: rows.length }],
    };
  };

  const columns: Column<BatchStockRow>[] = [
    {
      key: "code",
      label: "Batch",
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">
            {row.code}
            {row.name ? <span className="font-normal text-gray-500"> · {row.name}</span> : null}
          </span>
          <StatusText status={row.status} />
        </div>
      ),
    },
    ...shownTypes.map<Column<BatchStockRow>>((type) => ({
      key: `type-${type.id}`,
      label: type.isHatchable ? `${type.name} ✓` : type.name,
      align: "right",
      render: (_, row) => {
        const n = row.byType[type.id] ?? 0;
        return <span className={n === 0 ? "text-gray-300" : type.isHatchable ? "font-medium text-green-700" : ""}>{n.toLocaleString()}</span>;
      },
    })),
    {
      key: "total",
      label: "Total",
      align: "right",
      render: (_, row) => <span className="font-semibold">{row.total.toLocaleString()}</span>,
    },
  ];

  const selectClass = "h-9 rounded-md border border-gray-200 bg-white px-3 text-sm";
  const emptyText = isError
    ? "Could not load egg stock. Check your connection and try again."
    : "No eggs in stock. Record eggs in a batch to see them here.";

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Egg className="h-6 w-6 text-yellow-600" />
            Egg inventory
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Eggs in stock in each batch. Hatchable eggs can be set in incubators.
          </p>
        </div>
        <BusinessDownloadDialog title="egg inventory" fileName="hatchery-egg-inventory" getData={downloadEggInventory} hasDateFilter={false} buttonLabel="Download inventory" />
      </div>

      {/* Total plus one tile per egg type */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
          <p className="truncate text-xs font-medium text-gray-600">Eggs in stock</p>
          <p className="mt-0.5 text-lg font-bold text-amber-700 md:text-xl">{isLoading ? "…" : totalStock.toLocaleString()}</p>
          <p className="truncate text-[11px] text-gray-500">{selectedBatchId ? "This batch" : "All batches"}</p>
        </div>
        {eggTypes.map((type) => {
          const n = typeTotals[type.id] ?? 0;
          return (
            <div key={type.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
              <p className="truncate text-xs font-medium text-gray-600">{type.isHatchable ? `${type.name} ✓` : type.name}</p>
              <p className={`mt-0.5 text-lg font-bold md:text-xl ${n === 0 ? "text-gray-400" : type.isHatchable ? "text-green-700" : "text-gray-900"}`}>
                {isLoading ? "…" : n.toLocaleString()}
              </p>
              <p className="truncate text-[11px] text-gray-500">{type.isHatchable ? "Ready to set" : "For sale"}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Batch</span>
          <select className={`${selectClass} min-w-[200px]`} value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)}>
            <option value="">All batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code}
                {b.name ? ` – ${b.name}` : ""}
                {b.status === "CLOSED" ? " (closed)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Egg type</span>
          <select className={`${selectClass} min-w-[160px]`} value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)}>
            <option value="">All types</option>
            {eggTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="h-4 w-4" checked={showEmpty} onChange={(e) => setShowEmpty(e.target.checked)} />
          Show empty batches
        </label>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="hidden sm:block">
          <DataTable
            data={pageRows}
            columns={columns}
            loading={isLoading}
            emptyMessage={emptyText}
            getRowKey={(row) => row.id}
            onRowClick={(row) => router.push(`/hatchery/dashboard/batches/${row.id}`)}
            showFooter={pageRows.length > 0}
            footerContent={
              <div className="flex items-center justify-between px-2 text-sm">
                <span className="font-semibold text-gray-900">
                  Total of {batchRows.length} batch{batchRows.length === 1 ? "" : "es"}
                </span>
                <span className="font-bold text-amber-700">{shownTotal.toLocaleString()} eggs</span>
              </div>
            }
          />
        </div>

        {/* Phone: one card per batch */}
        <div className="sm:hidden">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : pageRows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">{emptyText}</p>
          ) : (
            <ul className="divide-y">
              {pageRows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-2 px-4 py-3 text-left active:bg-gray-50"
                    onClick={() => router.push(`/hatchery/dashboard/batches/${row.id}`)}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-medium text-gray-900">
                        {row.code}
                        {row.name ? <span className="font-normal text-gray-500"> · {row.name}</span> : null}
                      </p>
                      <StatusText status={row.status} />
                      <p className="text-xs text-gray-500">
                        {shownTypes.map((t) => `${t.name} ${(row.byType[t.id] ?? 0).toLocaleString()}`).join(" · ")}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold">{row.total.toLocaleString()} eggs</span>
                  </button>
                </li>
              ))}
              <li className="flex items-center justify-between bg-gray-50 px-4 py-2.5 text-sm">
                <span className="font-semibold text-gray-900">Total of {batchRows.length} batch{batchRows.length === 1 ? "" : "es"}</span>
                <span className="font-bold text-amber-700">{shownTotal.toLocaleString()} eggs</span>
              </li>
            </ul>
          )}
        </div>

        <LedgerPagination
          page={page}
          totalPages={totalPages}
          totalRows={batchRows.length}
          pageLimit={PAGE_SIZE}
          onPageChange={setPage}
          loading={isLoading}
          className="px-4"
        />
      </div>
    </div>
  );
}
