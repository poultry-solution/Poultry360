"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bird, Loader2 } from "lucide-react";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import { useHatcheryBatches } from "@/fetchers/hatchery/hatcheryBatchQueries";
import {
  useIncubationBatches,
  useProducedChickStock,
  type ProducedChickStockRow,
} from "@/fetchers/hatchery/hatcheryIncubationQueries";

// Stock rows are one per incubation per grade (A, B, Cull) — a small list.
// Load it all once and show one row per incubation here.
const ALL_ROWS = 500;
const PAGE_SIZE = 10;

type IncubationStockRow = {
  id: string;
  code: string;
  name: string | null;
  parentCode: string;
  parentName: string | null;
  A: number;
  B: number;
  CULL: number;
  total: number;
};

function Tile({ label, value, sub, tone = "text-gray-900" }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <p className="truncate text-xs font-medium text-gray-600">{label}</p>
      <p className={`mt-0.5 text-lg font-bold md:text-xl ${tone}`}>{value}</p>
      <p className="truncate text-[11px] text-gray-500">{sub}</p>
    </div>
  );
}

export default function HatcheryProducedChicksPage() {
  const router = useRouter();
  const [selectedParentBatchId, setSelectedParentBatchId] = useState("");
  const [selectedIncubationBatchId, setSelectedIncubationBatchId] = useState("");
  const [showSoldOut, setShowSoldOut] = useState(false);
  const [page, setPage] = useState(1);

  const { data: parentBatchData } = useHatcheryBatches({
    type: "PARENT_FLOCK",
    status: "ACTIVE",
    limit: 100,
  });
  const { data: incubationData } = useIncubationBatches({
    parentBatchId: selectedParentBatchId || undefined,
    limit: 200,
  });
  const { data: stockRes, isLoading, isError } = useProducedChickStock({
    parentBatchId: selectedParentBatchId || undefined,
    incubationBatchId: selectedIncubationBatchId || undefined,
    page: 1,
    limit: ALL_ROWS,
  });

  const parentBatches = parentBatchData?.batches ?? [];
  const activeParentBatchIds = new Set(parentBatches.map((batch) => batch.id));
  const incubations = (incubationData?.batches ?? []).filter((batch) =>
    activeParentBatchIds.has(batch.parentBatchId)
  );
  const stockRows: ProducedChickStockRow[] = stockRes?.data ?? [];

  // One row per incubation with A / B / Cull side by side.
  const allIncubationRows = useMemo<IncubationStockRow[]>(() => {
    const map = new Map<string, IncubationStockRow>();
    for (const row of stockRows) {
      const inc = row.incubationBatch;
      const entry =
        map.get(inc.id) ??
        ({
          id: inc.id,
          code: inc.code,
          name: inc.name,
          parentCode: inc.parentBatch.code,
          parentName: inc.parentBatch.name,
          A: 0,
          B: 0,
          CULL: 0,
          total: 0,
        } as IncubationStockRow);
      entry[row.grade] += Number(row.currentStock || 0);
      entry.total += Number(row.currentStock || 0);
      map.set(inc.id, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.code.localeCompare(a.code));
  }, [stockRows]);

  const totals = allIncubationRows.reduce(
    (acc, r) => ({ A: acc.A + r.A, B: acc.B + r.B, CULL: acc.CULL + r.CULL, total: acc.total + r.total }),
    { A: 0, B: 0, CULL: 0, total: 0 }
  );
  const share = (n: number) => (totals.total > 0 ? `${((n / totals.total) * 100).toFixed(1)}% of stock` : "—");

  const incubationRows = allIncubationRows.filter((r) => showSoldOut || r.total > 0);
  const totalPages = Math.max(1, Math.ceil(incubationRows.length / PAGE_SIZE));
  const pageRows = incubationRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [selectedParentBatchId, selectedIncubationBatchId, showSoldOut]);

  const open = (row: IncubationStockRow) => router.push(`/hatchery/dashboard/incubations/${row.id}`);
  const num = (n: number, tone: string) => <span className={n === 0 ? "text-gray-300" : tone}>{n.toLocaleString()}</span>;

  const columns: Column<IncubationStockRow>[] = [
    {
      key: "code",
      label: "Incubation",
      render: (_, row) => (
        <span className="font-medium text-gray-900">
          {row.code}
          {row.name ? <span className="font-normal text-gray-500"> · {row.name}</span> : null}
        </span>
      ),
    },
    {
      key: "parentCode",
      label: "Parent batch",
      render: (_, row) => (
        <span className="text-sm text-gray-600">
          {row.parentCode}
          {row.parentName ? ` · ${row.parentName}` : ""}
        </span>
      ),
    },
    { key: "A", label: "Grade A", align: "right", render: (_, row) => num(row.A, "font-medium text-green-700") },
    { key: "B", label: "Grade B", align: "right", render: (_, row) => num(row.B, "text-amber-700") },
    { key: "CULL", label: "Cull", align: "right", render: (_, row) => num(row.CULL, "text-red-600") },
    { key: "total", label: "Total", align: "right", render: (_, row) => <span className="font-semibold">{row.total.toLocaleString()}</span> },
  ];

  const selectClass = "h-9 min-w-[220px] rounded-md border border-gray-200 bg-white px-3 text-sm";
  const emptyText = isError
    ? "Could not load chicks. Check your connection and try again."
    : "No chicks in stock. Save a hatch result in an incubation to see chicks here.";

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Bird className="h-6 w-6 text-green-600" />
          Chicks in stock
        </h1>
        <p className="mt-1 text-sm text-gray-500">Chicks hatched and not sold yet, by incubation. Open an incubation to sell chicks.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Chicks in stock" value={isLoading ? "…" : totals.total.toLocaleString()} sub="Ready to sell" tone="text-amber-700" />
        <Tile label="Grade A" value={isLoading ? "…" : totals.A.toLocaleString()} sub={share(totals.A)} tone="text-green-700" />
        <Tile label="Grade B" value={isLoading ? "…" : totals.B.toLocaleString()} sub={share(totals.B)} tone="text-amber-700" />
        <Tile label="Cull" value={isLoading ? "…" : totals.CULL.toLocaleString()} sub={share(totals.CULL)} tone="text-red-600" />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Parent batch</span>
          <select
            className={selectClass}
            value={selectedParentBatchId}
            onChange={(e) => {
              setSelectedParentBatchId(e.target.value);
              setSelectedIncubationBatchId("");
            }}
          >
            <option value="">All active parent batches</option>
            {parentBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code}
                {b.name ? ` – ${b.name}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-600">Incubation</span>
          <select className={selectClass} value={selectedIncubationBatchId} onChange={(e) => setSelectedIncubationBatchId(e.target.value)}>
            <option value="">All incubations</option>
            {incubations.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code}
                {b.name ? ` – ${b.name}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-flex h-9 cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="h-4 w-4" checked={showSoldOut} onChange={(e) => setShowSoldOut(e.target.checked)} />
          Show sold-out incubations
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
            onRowClick={open}
            showFooter={pageRows.length > 0}
            footerContent={
              <div className="flex items-center justify-between px-2 text-sm">
                <span className="font-semibold text-gray-900">
                  Total of {incubationRows.length} incubation{incubationRows.length === 1 ? "" : "s"}
                </span>
                <span className="font-bold text-amber-700">{totals.total.toLocaleString()} chicks</span>
              </div>
            }
          />
        </div>

        {/* Phone: one card per incubation */}
        <div className="sm:hidden">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : pageRows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">{emptyText}</p>
          ) : (
            <ul className="divide-y">
              {pageRows.map((row) => (
                <li key={row.id}>
                  <button type="button" className="flex w-full items-start gap-2 px-4 py-3 text-left active:bg-gray-50" onClick={() => open(row)}>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-medium text-gray-900">
                        {row.code}
                        {row.name ? <span className="font-normal text-gray-500"> · {row.name}</span> : null}
                      </p>
                      <p className="text-xs text-gray-500">Parent {row.parentCode}</p>
                      <p className="text-xs text-gray-500">
                        A {row.A.toLocaleString()} · B {row.B.toLocaleString()} · Cull {row.CULL.toLocaleString()}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold">{row.total.toLocaleString()} chicks</span>
                  </button>
                </li>
              ))}
              <li className="flex items-center justify-between bg-gray-50 px-4 py-2.5 text-sm">
                <span className="font-semibold text-gray-900">Total of {incubationRows.length} incubation{incubationRows.length === 1 ? "" : "s"}</span>
                <span className="font-bold text-amber-700">{totals.total.toLocaleString()} chicks</span>
              </li>
            </ul>
          )}
        </div>

        <LedgerPagination
          page={page}
          totalPages={totalPages}
          totalRows={incubationRows.length}
          pageLimit={PAGE_SIZE}
          onPageChange={setPage}
          loading={isLoading}
          className="px-4"
        />
      </div>
    </div>
  );
}
