"use client";

import { useEffect, useMemo, useState } from "react";
import { getNepalTodayAd, toNepalDayAd } from "@/common/lib/nepali-date";
import { useRouter } from "next/navigation";
import {
  Plus,
  Layers,
  ChevronRight,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/common/components/ui/dialog";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DateInput } from "@/common/components/ui/date-input";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import {
  useHatcheryBatches,
  useCreateHatcheryBatch,
  type HatcheryBatch,
} from "@/fetchers/hatchery/hatcheryBatchQueries";
import { useGetHatcheryInventoryTable } from "@/fetchers/hatchery/hatcheryInventoryQueries";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { useGetHatcheryAnalyticsBatches } from "@/fetchers/hatchery/hatcheryAnalyticsQueries";
import { useAuthStore } from "@/common/store/store";
import { formatRupeesExact } from "@/common/lib/utils";

/** Flock age from the start date, by Nepal day: "Week 32 (day 220)". */
function flockAge(startDate: string, endDate?: string | null) {
  const end = endDate ? toNepalDayAd(endDate) : getNepalTodayAd();
  const days = Math.round((Date.parse(end) - Date.parse(toNepalDayAd(startDate))) / 86_400_000) + 1;
  return { days, weeks: Math.ceil(days / 7) };
}

function Tile({ label, value, sub, tone = "text-gray-900" }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <p className="truncate text-xs font-medium text-gray-600">{label}</p>
      <p className={`mt-0.5 text-lg font-bold md:text-xl ${tone}`}>{value}</p>
      <p className="truncate text-[11px] text-gray-500">{sub}</p>
    </div>
  );
}

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
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useHatcheryBatches({
    status: statusFilter || undefined,
    search: search || undefined,
    page,
    limit: 10,
  });
  const batches = data?.batches ?? [];

  // Tiles look at every batch, not just this page.
  const { data: allData } = useHatcheryBatches({ type: "PARENT_FLOCK", limit: 200 });
  const allBatches = allData?.batches ?? [];
  const activeBatches = allBatches.filter((b) => b.status === "ACTIVE");
  const femaleAlive = activeBatches.reduce((sum, b) => sum + Number(b.currentFemaleParents ?? 0), 0);
  const maleAlive = activeBatches.reduce((sum, b) => sum + Number(b.currentMaleParents ?? 0), 0);

  // Whole-batch profit (all time), for people allowed to see analytics.
  const user = useAuthStore((st) => st.user);
  const canViewAnalytics = !user?.isStaff || Boolean(user.permissions?.includes("HATCHERY_VIEW_ANALYTICS"));
  const { data: moneyData } = useGetHatcheryAnalyticsBatches({ startDate: "2000-01-01", page: 1, limit: 200 }, canViewAnalytics);
  const profitById = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of moneyData?.batches ?? []) map.set(r.id, Number(r.profit ?? 0));
    return map;
  }, [moneyData]);
  const paginationTotal = Number(data?.total ?? 0);
  const paginationLimit = Number(data?.limit ?? 10);
  const paginationPage = Math.max(1, Number(data?.page ?? page));
  const totalPages = Math.max(1, Math.ceil(paginationTotal / paginationLimit));

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [startDate, setStartDate] = useState(getNepalTodayAd());
  const [notes, setNotes] = useState("");
  const [placements, setPlacements] = useState<PlacementRow[]>([
    { inventoryItemId: "", quantity: "" },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateHatcheryBatch();
  const { data: inventoryTableRes } = useGetHatcheryInventoryTable("CHICKS");
  const inventoryItems: any[] = inventoryTableRes?.data ?? [];

  // Sex comes from the inventory lot, so the preview is derived rather than
  // entered — there is no separate male/female field to keep in sync.
  const placementTotals = useMemo(() => {
    let male = 0;
    let female = 0;
    for (const p of placements) {
      const item = inventoryItems.find((i: any) => i.id === p.inventoryItemId);
      const qty = Number(p.quantity || 0);
      if (!item || !Number.isFinite(qty) || qty <= 0) continue;
      if (item.sex === "MALE") male += qty;
      else if (item.sex === "FEMALE") female += qty;
    }
    return { male, female, total: male + female };
  }, [placements, inventoryItems]);

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
      setFormError("Choose the parent birds from stock and how many");
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
      const d = err?.response?.data;
      setFormError(d?.message ?? d?.error ?? "Could not start the batch. Please try again.");
    }
  }

  function resetForm() {
    setStartDate(getNepalTodayAd());
    setNotes("");
    setPlacements([{ inventoryItemId: "", quantity: "" }]);
    setFormError(null);
  }

  const open = (row: HatcheryBatch) => router.push(`/hatchery/dashboard/batches/${row.id}`);

  const statusText = (row: HatcheryBatch) => (
    <span
      className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
        row.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
      }`}
    >
      {row.status === "ACTIVE" ? "Active" : "Closed"}
    </span>
  );

  const ageText = (row: HatcheryBatch) => {
    const age = flockAge(row.startDate, row.status === "CLOSED" ? row.endDate : null);
    return `Week ${age.weeks} · day ${age.days}`;
  };

  const birdsText = (row: HatcheryBatch) =>
    `female ${(row.currentFemaleParents ?? 0).toLocaleString()} · male ${(row.currentMaleParents ?? 0).toLocaleString()}`;

  const profitCell = (row: HatcheryBatch) => {
    const v = profitById.get(row.id);
    if (v === undefined) return <span className="text-gray-300">—</span>;
    return <span className={`whitespace-nowrap font-medium ${v < 0 ? "text-red-600" : "text-green-700"}`}>{formatRupeesExact(v)}</span>;
  };

  const columns: Column<HatcheryBatch>[] = [
    {
      key: "code",
      label: "Batch",
      render: (_, row) => (
        <div>
          <p className="font-semibold text-gray-900">
            {row.code}
            {row.name && <span className="ml-1 font-normal text-gray-500">· {row.name}</span>}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Started <DateDisplay date={row.startDate} format="long" />
          </p>
        </div>
      ),
    },
    { key: "age", label: "Age", render: (_, row) => <span className="whitespace-nowrap text-sm text-gray-600">{ageText(row)}</span> },
    {
      key: "currentParents",
      label: "Birds",
      align: "right",
      render: (_, row) =>
        row.currentParents !== null ? (
          <div className="leading-tight">
            <span className="font-medium">{row.currentParents.toLocaleString()}</span>
            <p className="text-[11px] text-gray-500">{birdsText(row)}</p>
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    ...(canViewAnalytics
      ? [{ key: "profit", label: "Profit (whole batch)", align: "right" as const, render: (_: unknown, row: HatcheryBatch) => profitCell(row) }]
      : []),
    { key: "status", label: "Status", render: (_, row) => statusText(row) },
    { key: "__go", label: "", align: "right", width: "40px", render: () => <ChevronRight className="ml-auto h-4 w-4 text-gray-400" /> },
  ];

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Layers className="h-6 w-6 text-amber-600" />
            Batches
          </h1>
          <p className="mt-1 text-sm text-gray-500">Your parent flocks. Open one to record eggs, feed, deaths and sales.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New batch
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Active batches" value={activeBatches.length.toLocaleString()} sub={`${allBatches.length - activeBatches.length} closed`} />
        <Tile label="Birds alive" value={(femaleAlive + maleAlive).toLocaleString()} sub="In active batches" />
        <Tile label="Female alive" value={femaleAlive.toLocaleString()} sub="Hens" />
        <Tile label="Male alive" value={maleAlive.toLocaleString()} sub="Cocks" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by code or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full max-w-64"
        />
        <div className="flex gap-1 rounded-lg border bg-gray-50 p-1">
          {(["", "ACTIVE", "CLOSED"] as StatusFilter[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                statusFilter === st ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {st === "" ? "All" : st === "ACTIVE" ? "Active" : "Closed"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="hidden sm:block">
          <DataTable
            data={batches}
            columns={columns}
            loading={isLoading}
            emptyMessage={isError ? "Could not load batches. Check your connection and try again." : "No batches yet. Tap New batch to add one."}
            getRowKey={(row) => row.id}
            onRowClick={open}
          />
        </div>
        {/* Phone: one card per batch */}
        <div className="sm:hidden">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : batches.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">No batches yet. Tap New batch to add one.</p>
          ) : (
            <ul className="divide-y">
              {batches.map((row) => (
                <li key={row.id}>
                  <button type="button" onClick={() => open(row)} className="flex w-full items-start gap-2 px-4 py-3 text-left active:bg-gray-50">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-gray-900">
                        {row.code} {statusText(row)}
                      </p>
                      <p className="text-xs text-gray-500">{ageText(row)} · {(row.currentParents ?? 0).toLocaleString()} birds</p>
                      <p className="text-xs text-gray-500">{birdsText(row)}</p>
                      {canViewAnalytics ? <p className="text-xs">Profit {profitCell(row)}</p> : null}
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <LedgerPagination
          page={paginationPage}
          totalPages={totalPages}
          totalRows={paginationTotal}
          pageLimit={paginationLimit}
          onPageChange={setPage}
          loading={isLoading}
          className="px-4"
        />
      </div>

      {/* Create Modal */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); resetForm(); } }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[85vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Start a new parent batch</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {formError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <p className="text-sm text-red-600">{formError}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date placed
              </label>
              <DateInput value={startDate} onChange={setStartDate} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (optional)
              </label>
              <Input
                placeholder="e.g. Day-old parent chicks from Kalika"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Placements */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Parent birds from stock
                </label>
                <button
                  type="button"
                  onClick={addPlacementRow}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add another
                </button>
              </div>

              <div className="space-y-2">
                {placements.map((placement, idx) => (
                  <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_112px_auto] sm:items-center">
                    <select
                      className="min-w-0 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                      value={placement.inventoryItemId}
                      onChange={(e) => updatePlacement(idx, "inventoryItemId", e.target.value)}
                    >
                      <option value="">Choose birds from stock</option>
                      {inventoryItems.map((item: any) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                          {item.sex === "FEMALE"
                            ? " (Female)"
                            : item.sex === "MALE"
                              ? " (Male)"
                              : ""}
                          {" — "}
                          {Number(item.currentStock).toLocaleString()} {item.unit} in stock
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min="1"
                      placeholder="How many"
                      className="w-full sm:w-28"
                      value={placement.quantity}
                      onChange={(e) => updatePlacement(idx, "quantity", e.target.value)}
                    />
                    {placements.length > 1 && (
                      <button
                        onClick={() => removePlacementRow(idx)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded p-1 text-red-400 hover:bg-red-50 sm:justify-self-start"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {placementTotals.total > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-xs">
                  <span className="rounded bg-pink-100 px-2 py-0.5 font-semibold text-pink-700">
                    {placementTotals.female.toLocaleString()} female
                  </span>
                  <span className="rounded bg-sky-100 px-2 py-0.5 font-semibold text-sky-700">
                    {placementTotals.male.toLocaleString()} male
                  </span>
                  <span className="text-gray-600">
                    = {placementTotals.total.toLocaleString()} birds
                  </span>
                </div>
              )}

              {inventoryItems.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  No parent birds in stock. Buy them on the Inventory page first.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {createMutation.isPending ? "Saving..." : "Start batch"}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowCreate(false); resetForm(); }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
