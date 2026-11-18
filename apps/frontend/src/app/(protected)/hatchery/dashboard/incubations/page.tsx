"use client";

import { useEffect, useMemo, useState } from "react";
import { formatBSLong, getNepalTodayAd, toNepalDayAd } from "@/common/lib/nepali-date";
import { useRouter } from "next/navigation";
import { Plus, FlaskConical, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DateInput } from "@/common/components/ui/date-input";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/common/components/ui/dialog";
import {
  useIncubationBatches,
  useCreateIncubationBatch,
  useHatchableStock,
  type IncubationBatch,
  type IncubationStage,
} from "@/fetchers/hatchery/hatcheryIncubationQueries";
import { useHatcheryBatches } from "@/fetchers/hatchery/hatcheryBatchQueries";
import { useGetHatcheryAnalyticsIncubations } from "@/fetchers/hatchery/hatcheryAnalyticsQueries";
import { useAuthStore } from "@/common/store/store";

// Same words as the incubation detail page.
const STAGE_LABELS: Record<IncubationStage, string> = {
  SETTER: "In setter",
  CANDLING: "Candled",
  HATCHER: "In hatcher",
  COMPLETED: "Hatched",
};

// 21-day chicken-egg cycle (same days as Home "Today's work").
const CANDLE_DAY = 9;
const TRANSFER_DAY = 18;
const HATCH_DAY = 21;
const DAY_MS = 86_400_000;

function dayOf(startDate: string) {
  return Math.round((Date.parse(getNepalTodayAd()) - Date.parse(toNepalDayAd(startDate))) / DAY_MS) + 1;
}

/** The next step of a running incubation and how far off it is. */
function nextStep(b: IncubationBatch): { text: string; late: number; dueToday: boolean } | null {
  if (b.stage === "COMPLETED") return null;
  const day = dayOf(b.startDate);
  const [label, due] = !b.candledAt
    ? ["Candling", CANDLE_DAY]
    : !b.transferredAt
      ? ["Move to hatcher", TRANSFER_DAY]
      : ["Hatch", HATCH_DAY];
  const diff = day - due;
  if (diff > 0) return { text: `${label} · ${diff} day${diff === 1 ? "" : "s"} late`, late: diff, dueToday: false };
  if (diff === 0) return { text: `${label} · today`, late: 0, dueToday: true };
  return { text: `${label} · in ${-diff} day${diff === -1 ? "" : "s"}`, late: 0, dueToday: false };
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

const STAGE_COLORS: Record<IncubationStage, string> = {
  SETTER: "bg-blue-100 text-blue-800",
  CANDLING: "bg-yellow-100 text-yellow-800",
  HATCHER: "bg-orange-100 text-orange-800",
  COMPLETED: "bg-green-100 text-green-800",
};

function StagePreview({ parentBatchId }: { parentBatchId: string }) {
  const { data } = useHatchableStock(parentBatchId);
  if (!parentBatchId) return null;
  return (
    <p className="text-xs text-muted-foreground mt-1">
      Hatchable eggs in stock:{" "}
      <span className="font-semibold text-foreground">{data?.stock != null ? Number(data.stock).toLocaleString() : "—"}</span>
      {data?.eggTypeName ? ` (${data.eggTypeName})` : ""}
    </p>
  );
}

export default function IncubationsPage() {
  const router = useRouter();
  const [stageFilter, setStageFilter] = useState<IncubationStage | "">("");
  const [parentBatchFilter, setParentBatchFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useIncubationBatches({
    stage: stageFilter || undefined,
    parentBatchId: parentBatchFilter === "all" ? undefined : parentBatchFilter,
    search: search || undefined,
    page,
    limit: 10,
  });
  const batches = data?.batches ?? [];

  // Tiles look at every incubation, not just this page.
  const { data: allData } = useIncubationBatches({ limit: 200 });
  const allBatches = allData?.batches ?? [];
  const user = useAuthStore((st) => st.user);
  const canViewAnalytics = !user?.isStaff || Boolean(user.permissions?.includes("HATCHERY_VIEW_ANALYTICS"));
  // Chicks and hatch % per finished incubation (whole incubation, all time).
  const { data: resultData } = useGetHatcheryAnalyticsIncubations(
    { startDate: "2000-01-01", stage: "COMPLETED", page: 1, limit: 200 },
    canViewAnalytics
  );
  const resultById = useMemo(() => {
    const map = new Map<string, { chicks: number; hatchPct: number }>();
    for (const r of resultData?.incubations ?? []) {
      map.set(r.id, { chicks: r.totalHatched, hatchPct: r.hatchability });
    }
    return map;
  }, [resultData]);

  const running = allBatches.filter((b) => b.stage !== "COMPLETED");
  const lateCount = running.filter((b) => {
    const step = nextStep(b);
    return step && (step.late > 0 || step.dueToday);
  }).length;
  const finishedRows = resultData?.incubations ?? [];
  const totalChicks = finishedRows.reduce((sum, r) => sum + r.totalHatched, 0);
  const totalFertile = finishedRows.reduce((sum, r) => sum + r.fertileEggs, 0);
  const paginationTotal = Number(data?.total ?? 0);
  const paginationLimit = Number(data?.limit ?? 10);
  const paginationPage = Math.max(1, Number(data?.page ?? page));
  const totalPages = Math.max(1, Math.ceil(paginationTotal / paginationLimit));

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [parentBatchId, setParentBatchId] = useState("");
  const [startDate, setStartDate] = useState(getNepalTodayAd());
  const [eggsSetCount, setEggsSetCount] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useCreateIncubationBatch();
  const { data: batchesData } = useHatcheryBatches({ limit: 100 });
  const parentBatches = (batchesData?.batches ?? []).filter(
    (b) => b.type === "PARENT_FLOCK"
  );

  // Home "Start incubation" links here with ?new=1 to open the form at once.
  // Read from window (not useSearchParams) so the page needs no Suspense wrap.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") !== "1") return;
    setShowCreate(true);
    router.replace("/hatchery/dashboard/incubations");
  }, [router]);

  useEffect(() => {
    setPage(1);
  }, [stageFilter, parentBatchFilter, search]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function resetCreate() {
    setParentBatchId("");
    setStartDate(getNepalTodayAd());
    setEggsSetCount("");
    setName("");
    setNotes("");
    setFormError(null);
    setShowCreate(false);
  }

  async function handleCreate() {
    setFormError(null);
    if (!parentBatchId) return setFormError("Select a parent flock batch");
    if (!eggsSetCount || parseInt(eggsSetCount) <= 0)
      return setFormError("Eggs set count must be greater than 0");

    try {
      await createMutation.mutateAsync({
        parentBatchId,
        startDate,
        eggsSetCount: parseInt(eggsSetCount),
        name: name || undefined,
        notes: notes || undefined,
      });
      resetCreate();
    } catch (err: any) {
      const d = err?.response?.data;
      setFormError(d?.message ?? d?.error ?? "Could not start the incubation. Please try again.");
    }
  }

  const open = (b: IncubationBatch) => router.push(`/hatchery/dashboard/incubations/${b.id}`);

  const stagePill = (b: IncubationBatch) => (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[b.stage as IncubationStage]}`}>
      {STAGE_LABELS[b.stage as IncubationStage]}
    </span>
  );

  const nextCell = (b: IncubationBatch) => {
    const step = nextStep(b);
    if (!step) {
      const r = resultById.get(b.id);
      return (
        <span className="text-sm text-gray-500">
          {b.hatchedAt ? `Hatched ${formatBSLong(toNepalDayAd(b.hatchedAt))}` : "Hatched"}
          {r ? ` · ${r.chicks.toLocaleString()} chicks` : ""}
        </span>
      );
    }
    return (
      <span className={`text-sm ${step.late > 0 ? "font-medium text-red-600" : step.dueToday ? "font-medium text-amber-700" : "text-gray-600"}`}>
        {step.text}
      </span>
    );
  };

  const columns: Column<IncubationBatch>[] = [
    {
      key: "code",
      label: "Incubation",
      render: (_, b) => (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900">{b.code}</span>
          {b.name ? <span className="text-xs text-gray-500">{b.name}</span> : null}
        </div>
      ),
    },
    { key: "parentBatch", label: "Parent batch", render: (_, b) => <span className="text-sm">{b.parentBatch?.code ?? b.parentBatchId}</span> },
    { key: "startDate", label: "Started", render: (_, b) => <DateDisplay date={b.startDate} format="long" className="whitespace-nowrap text-sm" /> },
    { key: "eggsSetCount", label: "Eggs set", align: "right", render: (_, b) => <span className="font-medium">{Number(b.eggsSetCount).toLocaleString()}</span> },
    { key: "stage", label: "Stage", render: (_, b) => stagePill(b) },
    { key: "next", label: "Next step", render: (_, b) => nextCell(b) },
    {
      key: "hatch",
      label: "Hatch %",
      align: "right",
      render: (_, b) => {
        const r = resultById.get(b.id);
        return r ? <span className="font-medium text-green-700">{r.hatchPct.toFixed(1)}%</span> : <span className="text-gray-300">—</span>;
      },
    },
    { key: "go", label: "", align: "right", render: () => <ChevronRight className="ml-auto h-4 w-4 text-gray-400" /> },
  ];

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <FlaskConical className="h-6 w-6 text-primary" />
            Incubations
          </h1>
          <p className="mt-1 text-sm text-gray-500">Each batch of eggs set in the incubator, from setting to hatch.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" />
          New incubation
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Running now" value={running.length.toLocaleString()} sub="In setter or hatcher" />
        <Tile
          label="Late or due today"
          value={lateCount.toLocaleString()}
          sub={lateCount > 0 ? "Need work now" : "All on time"}
          tone={lateCount > 0 ? "text-red-600" : "text-green-700"}
        />
        <Tile
          label="Chicks hatched"
          value={canViewAnalytics ? totalChicks.toLocaleString() : "—"}
          sub={`${finishedRows.length} finished incubation${finishedRows.length === 1 ? "" : "s"}`}
        />
        <Tile
          label="Average hatch %"
          value={canViewAnalytics && totalFertile > 0 ? `${((totalChicks / totalFertile) * 100).toFixed(1)}%` : "—"}
          sub="Chicks ÷ fertile eggs"
          tone="text-green-700"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by code or name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full max-w-56"
        />
        <div className="flex flex-wrap gap-1.5">
          {(["", "SETTER", "CANDLING", "HATCHER", "COMPLETED"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStageFilter(st as any)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                stageFilter === st
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted"
              }`}
            >
              {st === "" ? "All" : STAGE_LABELS[st as IncubationStage]}
            </button>
          ))}
        </div>
        <Select value={parentBatchFilter} onValueChange={setParentBatchFilter}>
          <SelectTrigger className="h-9 w-full max-w-56">
            <SelectValue placeholder="All parent batches" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="all">All parent batches</SelectItem>
            {parentBatches.map((batch) => (
              <SelectItem key={batch.id} value={batch.id}>
                {batch.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="hidden sm:block">
          <DataTable
            columns={columns}
            data={batches}
            loading={isLoading}
            getRowKey={(b) => b.id}
            onRowClick={open}
            emptyMessage={isError ? "Could not load incubations. Check your connection and try again." : "No incubations yet. Tap New incubation to start one."}
          />
        </div>
        {/* Phone: one card per incubation */}
        <div className="sm:hidden">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : batches.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">No incubations yet. Tap New incubation to start one.</p>
          ) : (
            <ul className="divide-y">
              {batches.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => open(b)} className="flex w-full items-start gap-2 px-4 py-3 text-left active:bg-gray-50">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-gray-900">
                        {b.code} {stagePill(b)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {b.parentBatch?.code ?? ""} · {Number(b.eggsSetCount).toLocaleString()} eggs · <DateDisplay date={b.startDate} format="long" />
                      </p>
                      <p>{nextCell(b)}</p>
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
      <Dialog open={showCreate} onOpenChange={(open) => !open && resetCreate()}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>Start a new incubation</DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="bg-destructive/10 text-destructive text-sm px-3 py-2 rounded-md">
              {formError}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Eggs from parent batch <span className="text-destructive">*</span>
              </label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={parentBatchId}
                onChange={(e) => setParentBatchId(e.target.value)}
              >
                <option value="">Choose a parent batch</option>
                {parentBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code}{b.name ? ` – ${b.name}` : ""}
                  </option>
                ))}
              </select>
              {parentBatchId && <StagePreview parentBatchId={parentBatchId} />}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Date set <span className="text-destructive">*</span>
                </label>
                <DateInput value={startDate} onChange={setStartDate} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Eggs set <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 500"
                  value={eggsSetCount}
                  onChange={(e) => setEggsSetCount(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Name (optional)</label>
              <Input
                placeholder="e.g. Setter 1, Kartik"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Note (optional)</label>
              <Input
                placeholder="e.g. Setter machine 1"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={resetCreate}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {createMutation.isPending ? "Saving..." : "Start incubation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
