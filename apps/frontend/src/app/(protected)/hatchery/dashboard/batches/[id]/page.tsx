"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle,
  LockIcon,
  UnlockIcon,
} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Badge } from "@/common/components/ui/badge";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { LedgerPagination } from "@/common/components/ui/ledger-pagination";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import {
  useHatcheryBatch,
  useCloseHatcheryBatch,
  useReopenHatcheryBatch,
  useDeleteHatcheryBatch,
  useHatcheryMortalities,
  useAddHatcheryMortality,
  useDeleteHatcheryMortality,
  useHatcheryExpenses,
  useAddHatcheryExpense,
  useDeleteHatcheryExpense,
  useHatcheryEggProductions,
  useAddHatcheryEggProduction,
  useDeleteHatcheryEggProduction,
  useHatcheryEggSales,
  useAddHatcheryEggSale,
  useDeleteHatcheryEggSale,
  useHatcheryParentSales,
  useAddHatcheryParentSale,
  useDeleteHatcheryParentSale,
  useHatcheryEggTypes,
  type HatcheryBatchDetail,
  type HatcheryBatchMortality,
  type HatcheryBatchExpense,
  type HatcheryEggSale,
  type HatcheryParentSale,
  type HatcheryFeedTarget,
  type HatcheryFeedBucket,
} from "@/fetchers/hatchery/hatcheryBatchQueries";
import {
  useGetHatcheryInventory,
  type HatcheryInventoryItemType,
  type HatcheryInventoryItem,
} from "@/fetchers/hatchery/hatcheryInventoryQueries";
import { useHatcheryParties } from "@/fetchers/hatchery/hatcheryPartyQueries";

type Tab =
  | "overview"
  | "expenses"
  | "mortality"
  | "egg-production"
  | "egg-stock"
  | "sales";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "expenses", label: "Expenses" },
  { id: "mortality", label: "Mortality" },
  { id: "egg-production", label: "Egg Production" },
  { id: "egg-stock", label: "Egg Stock" },
  { id: "sales", label: "Sales" },
];

function fmtNPR(n: number | string) {
  return `NPR ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

const ALL_CATEGORIES = "All";

/** "RAW_MATERIAL" -> "Raw Material", "manual" -> "Manual". */
function expenseCategoryLabel(category: string) {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/** "800 kg" — or "800 kg · 5 bag" when a batch mixes feed units. */
function formatFeedQuantities(quantities: Record<string, number>) {
  const parts = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([unit, qty]) => `${qty.toLocaleString()}${unit ? ` ${unit}` : ""}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * One bucket of the feed-by-sex breakdown. Local on purpose: shared UI is used
 * by farmer/dealer/company pages too, so hatchery-only affordances stay here.
 * Colours match the SexTag on the inventory page and the F · M sublines.
 */
function FeedSexStat({
  label,
  bucket,
  tone,
}: {
  label: string;
  bucket: HatcheryFeedBucket;
  tone: "female" | "male" | "neutral";
}) {
  const quantity = formatFeedQuantities(bucket.quantities);
  if (!quantity && bucket.amount === 0) return null;
  const toneClass =
    tone === "female"
      ? "text-pink-700"
      : tone === "male"
        ? "text-sky-700"
        : "text-gray-600";
  return (
    <span>
      <span className={`font-semibold ${toneClass}`}>{label}</span>{" "}
      {quantity ?? "—"}
      {bucket.amount > 0 ? ` (${fmtNPR(bucket.amount)})` : ""}
    </span>
  );
}

function isInitialPlacementExpense(expense: HatcheryBatchExpense) {
  return (
    expense.type === "INVENTORY" &&
    expense.category === "CHICKS" &&
    !!expense.inventoryTxnId &&
    expense.note === "Initial flock placement"
  );
}

export default function HatcheryBatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: batch, isLoading, error } = useHatcheryBatch(id);
  const closeMutation = useCloseHatcheryBatch(id);
  const reopenMutation = useReopenHatcheryBatch(id);
  const deleteBatchMutation = useDeleteHatcheryBatch(id);
  const [actionError, setActionError] = useState<string | null>(null);

  const isClosed = batch?.status === "CLOSED";

  async function handleDeleteBatch() {
    setActionError(null);
    const password = window.prompt(
      "Enter your password to delete this batch. This is allowed only when no operational data exists."
    );
    if (!password) return;
    if (!confirm("Delete this batch permanently?")) return;
    try {
      await deleteBatchMutation.mutateAsync({ password });
      router.push("/hatchery/dashboard/batches");
    } catch (err: any) {
      setActionError(err?.response?.data?.error ?? "Failed to delete batch");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="p-6 text-center text-red-600">
        Batch not found or failed to load.
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/hatchery/dashboard/batches")}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{batch.code}</h1>
              {batch.name && <span className="text-gray-500 text-lg">– {batch.name}</span>}
              <Badge
                className={
                  isClosed
                    ? "bg-gray-100 text-gray-600 border-gray-200"
                    : "bg-green-100 text-green-800 border-green-200"
                }
              >
                {batch.status}
              </Badge>
              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                {batch.type === "PARENT_FLOCK" ? "Parent Flock" : "Incubation"}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Started <DateDisplay date={batch.startDate} />
              {batch.endDate && (
                <> · Closed <DateDisplay date={batch.endDate} /></>
              )}
            </p>
          </div>
        </div>

        {isClosed ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={handleDeleteBatch}
              disabled={deleteBatchMutation.isPending}
            >
              {deleteBatchMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Delete Batch
            </Button>
            <Button
              variant="outline"
              onClick={() => reopenMutation.mutate()}
              disabled={reopenMutation.isPending}
            >
              <UnlockIcon className="h-4 w-4 mr-1" />
              Reopen
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={handleDeleteBatch}
              disabled={deleteBatchMutation.isPending}
            >
              {deleteBatchMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-1" />
              )}
              Delete Batch
            </Button>
            <Button
              variant="outline"
              className="border-gray-300 text-gray-700"
              onClick={() => {
                if (confirm("Mark this batch as CLOSED?")) closeMutation.mutate();
              }}
              disabled={closeMutation.isPending}
            >
              <LockIcon className="h-4 w-4 mr-1" />
              Close Batch
            </Button>
          </div>
        )}
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {/* CLOSED warning */}
      {isClosed && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            This batch is <strong>CLOSED</strong>. You can still view and edit records, but consider that this batch is no longer active.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-amber-500 text-amber-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && <OverviewTab batch={batch} />}
      {activeTab === "expenses" && <ExpensesTab batchId={id} />}
      {activeTab === "mortality" && (
        <MortalityTab
          batchId={id}
          currentMale={batch.currentMaleParents ?? 0}
          currentFemale={batch.currentFemaleParents ?? 0}
        />
      )}
      {activeTab === "egg-production" && <EggProductionTab batchId={id} batch={batch} />}
      {activeTab === "egg-stock" && <EggStockTab batch={batch} />}
      {activeTab === "sales" && (
        <SalesTab
          batchId={id}
          currentMale={batch.currentMaleParents ?? 0}
          currentFemale={batch.currentFemaleParents ?? 0}
        />
      )}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ batch }: { batch: HatcheryBatchDetail }) {
  const snapshot = batch.summary?.businessSnapshot;
  const costEngine = batch.summary?.costEngine;

  const currentFemale = batch.currentFemaleParents ?? 0;
  const currentMale = batch.currentMaleParents ?? 0;
  // Industry convention: males per 100 females.
  const sexRatio =
    currentFemale > 0
      ? `${(Math.round((currentMale / currentFemale) * 1000) / 10).toFixed(1)} : 100`
      : "—";

  return (
    <div className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Initial Birds" value={batch.initialParents?.toLocaleString() ?? "—"} />
        <StatCard label="Current Birds" value={batch.currentParents?.toLocaleString() ?? "—"} />
        <StatCard label="Current Female" value={currentFemale.toLocaleString()} />
        <StatCard label="Current Male" value={currentMale.toLocaleString()} />
        <StatCard label="Sex Ratio (M : 100 F)" value={sexRatio} />
        <StatCard
          label="Initial F / M"
          value={`${(batch.initialFemaleParents ?? 0).toLocaleString()} / ${(batch.initialMaleParents ?? 0).toLocaleString()}`}
        />
        <StatCard
          label="Total Mortality"
          value={batch.summary?.totalMortality?.toLocaleString() ?? "0"}
          variant="danger"
        />
    
      </div>

      <div className="bg-white border rounded-xl p-4 space-y-4">
        <h3 className="font-semibold text-gray-900">Business Snapshot</h3>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Financial</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Total Revenue</p>
              <p className="text-lg font-bold text-gray-900">
                {fmtNPR(snapshot?.financial.totalRevenue ?? 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Egg: {fmtNPR(snapshot?.financial.eggSalesRevenue ?? 0)} · Parent: {fmtNPR(snapshot?.financial.parentSalesRevenue ?? 0)} · Chick: {fmtNPR(snapshot?.financial.chickSalesRevenue ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Total Expenses</p>
              <p className="text-lg font-bold text-gray-900">
                {fmtNPR(snapshot?.financial.totalExpenses ?? batch.summary?.totalExpenses ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Profit / Loss</p>
              <p
                className={`text-lg font-bold ${
                  (snapshot?.financial.profitOrLoss ?? 0) >= 0 ? "text-green-700" : "text-red-600"
                }`}
              >
                {fmtNPR(snapshot?.financial.profitOrLoss ?? 0)}
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Production</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Total Chicks Produced</p>
              <p className="text-lg font-bold text-gray-900">
                {(snapshot?.production.producedTotal ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                A: {(snapshot?.production.producedA ?? 0).toLocaleString()} · B: {(snapshot?.production.producedB ?? 0).toLocaleString()} · CULL: {(snapshot?.production.producedCull ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Total Produced Chicks Sold</p>
              <p className="text-lg font-bold text-gray-900">
                {(snapshot?.production.soldTotal ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Unsold Produced Chicks</p>
              <p className="text-lg font-bold text-gray-900">
                {(snapshot?.production.unsoldTotal ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Incubation Performance</p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Incubations Done</p>
              <p className="text-lg font-bold text-gray-900">
                {(snapshot?.incubation.incubationCount ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Total Candling Loss</p>
              <p className="text-lg font-bold text-gray-900">
                {(snapshot?.incubation.candlingLossTotal ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Fertile Eggs (Total)</p>
              <p className="text-lg font-bold text-gray-900">
                {(snapshot?.incubation.fertileEggsTotal ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Avg Hatchability (Weighted)</p>
              <p className="text-lg font-bold text-gray-900">
                {Number(snapshot?.incubation.weightedHatchabilityPct ?? 0).toFixed(2)}%
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Hatch of Total (Weighted)</p>
              <p className="text-lg font-bold text-gray-900">
                {Number(snapshot?.incubation.weightedHatchOfTotalPct ?? 0).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Cost Engine</p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Total Relevant Cost</p>
              <p className="text-lg font-bold text-gray-900">
                {fmtNPR(costEngine?.totalRelevantCost ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Produced Chicks (A+B+CULL)</p>
              <p className="text-lg font-bold text-gray-900">
                {(costEngine?.producedTotal ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Saleable Chicks (A+B)</p>
              <p className="text-lg font-bold text-gray-900">
                {(costEngine?.saleableTotal ?? 0).toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Cost / Produced Chick</p>
              <p className="text-lg font-bold text-gray-900">
                {costEngine?.costPerProducedChick === null
                  ? "—"
                  : fmtNPR(costEngine?.costPerProducedChick ?? 0)}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-gray-500">Cost / Saleable Chick</p>
              <p className="text-lg font-bold text-gray-900">
                {costEngine?.costPerSaleableChick === null
                  ? "—"
                  : fmtNPR(costEngine?.costPerSaleableChick ?? 0)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            V1 includes parent batch expenses only.
          </p>
          {costEngine?.warnings?.length ? (
            <ul className="text-xs text-amber-700 mt-2 space-y-1 list-disc list-inside">
              {costEngine.warnings.map((w: string, idx: number) => (
                <li key={`${w}-${idx}`}>{w}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {batch.notes && (
        <div className="bg-gray-50 border rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-500 mb-1">Notes</h3>
          <p className="text-gray-800">{batch.notes}</p>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "danger" | "primary";
}) {
  const colorMap = {
    default: "text-gray-900",
    danger: "text-red-600",
    primary: "text-amber-700",
  };
  return (
    <div className="bg-white border rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${colorMap[variant]}`}>{value}</p>
    </div>
  );
}

// ─── Mortality Tab ────────────────────────────────────────────────────────────

function MortalityTab({
  batchId,
  currentMale,
  currentFemale,
}: {
  batchId: string;
  currentMale: number;
  currentFemale: number;
}) {
  const [page, setPage] = useState(1);
  const { data: mortalityRes, isLoading } = useHatcheryMortalities(batchId, { page, limit: 10 });
  const addMutation = useAddHatcheryMortality(batchId);
  const deleteMutation = useDeleteHatcheryMortality(batchId);

  const [date, setDate] = useState(today());
  const [maleCount, setMaleCount] = useState("");
  const [femaleCount, setFemaleCount] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Total is derived, never typed.
  const male = parseInt(maleCount || "0", 10) || 0;
  const female = parseInt(femaleCount || "0", 10) || 0;
  const totalEntered = male + female;

  const mortalities = mortalityRes?.mortalities ?? [];
  const totalMortality = Number(mortalityRes?.summary.totalMortality ?? 0);
  const totalRows = Number(mortalityRes?.total ?? 0);
  const totalPages = Math.max(1, Number(mortalityRes?.totalPages ?? 1));
  const currentPage = Math.max(1, Number(mortalityRes?.page ?? page));
  const pageLimit = Number(mortalityRes?.limit ?? 10);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function handleAdd() {
    setFormError(null);
    if (!date) return;
    if (totalEntered <= 0) {
      setFormError("Enter at least one male or female death");
      return;
    }
    // Server enforces this too, at the database; this is just a faster message.
    if (male > currentMale || female > currentFemale) {
      setFormError(
        `Only ${currentFemale.toLocaleString()} female and ${currentMale.toLocaleString()} male birds remain`
      );
      return;
    }
    try {
      await addMutation.mutateAsync({
        date,
        maleCount: male,
        femaleCount: female,
        note: note || undefined,
      });
      setMaleCount("");
      setFemaleCount("");
      setNote("");
    } catch (err: any) {
      setFormError(err?.response?.data?.error ?? "Failed to add mortality");
    }
  }

  const columns: Column<HatcheryBatchMortality>[] = [
    {
      key: "date",
      label: "Date",
      render: (_, row) => <DateDisplay date={row.date} />,
    },
    {
      key: "count",
      label: "Deaths",
      align: "right",
      render: (_, row) => (
        <div className="leading-tight">
          <span className="font-bold text-red-600">{row.count}</span>
          <p className="text-[11px] text-gray-500">
            {row.femaleCount}F · {row.maleCount}M
          </p>
        </div>
      ),
    },
    { key: "note", label: "Note", render: (_, row) => <span className="text-gray-500 text-sm">{row.note ?? "—"}</span> },
    {
      key: "__actions",
      label: "",
      align: "right",
      render: (_, row) =>
        deleteId === row.id ? (
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                await deleteMutation.mutateAsync(row.id);
                setDeleteId(null);
              }}
            >
              Confirm
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="text-red-500 border-red-200"
            onClick={() => setDeleteId(row.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Deaths" value={totalMortality.toLocaleString()} variant="danger" />
        <StatCard
          label="Live Birds (F / M)"
          value={`${currentFemale.toLocaleString()} / ${currentMale.toLocaleString()}`}
        />
      </div>

      {/* Add form */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-gray-900">Record Mortality</h3>
        {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
        <div className="flex flex-wrap gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          <Input
            type="number"
            min="0"
            max={currentFemale}
            placeholder="Female"
            value={femaleCount}
            onChange={(e) => setFemaleCount(e.target.value)}
            className="w-28"
          />
          <Input
            type="number"
            min="0"
            max={currentMale}
            placeholder="Male"
            value={maleCount}
            onChange={(e) => setMaleCount(e.target.value)}
            className="w-28"
          />
          <div className="flex items-center px-2 text-sm text-gray-600">
            Total:{" "}
            <span className="ml-1 font-semibold text-gray-900">
              {totalEntered.toLocaleString()}
            </span>
          </div>
          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1 min-w-40"
          />
          <Button onClick={handleAdd} disabled={addMutation.isPending || totalEntered <= 0}>
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <DataTable
          data={mortalities}
          columns={columns}
          loading={isLoading}
          emptyMessage="No mortality records yet."
          getRowKey={(row) => row.id}
        />
        <LedgerPagination
          page={currentPage}
          totalPages={totalPages}
          totalRows={totalRows}
          pageLimit={pageLimit}
          onPageChange={setPage}
          loading={isLoading}
        />
      </div>
    </div>
  );
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

const INVENTORY_ITEM_TYPE_OPTIONS: { value: HatcheryInventoryItemType; label: string }[] = [
  { value: "FEED", label: "Feed" },
  { value: "MEDICINE", label: "Medicine" },
  { value: "CHICKS", label: "Chicks" },
  { value: "SELF_MADE", label: "Self Feed" },
  { value: "OTHER", label: "Other" },
];

function ExpensesTab({ batchId }: { batchId: string }) {
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const { data: expenseRes, isLoading } = useHatcheryExpenses(batchId, {
    page,
    limit: 10,
    category: categoryFilter === ALL_CATEGORIES ? undefined : categoryFilter,
  });
  const addMutation = useAddHatcheryExpense(batchId);
  const deleteMutation = useDeleteHatcheryExpense(batchId);
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryCategory, setInventoryCategory] = useState<HatcheryInventoryItemType>("FEED");
  const { data: inventoryRes, isLoading: inventoryLoading } = useGetHatcheryInventory({
    itemType: inventoryCategory,
    search: inventorySearch || undefined,
    limit: 30,
  });

  const [expenseType, setExpenseType] = useState<"INVENTORY" | "MANUAL">("INVENTORY");
  const [date, setDate] = useState(today());
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [itemName, setItemName] = useState("");
  const [unit, setUnit] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Feed attribution. Feed is still PURCHASED as one total stock; this only
  // records which parent group consumed it.
  const [feedTarget, setFeedTarget] = useState<HatcheryFeedTarget>("BOTH");
  const [maleFeedQty, setMaleFeedQty] = useState("");
  const [femaleFeedQty, setFemaleFeedQty] = useState("");
  const isFeedCategory =
    inventoryCategory === "FEED" || inventoryCategory === "SELF_MADE";
  const showFeedSplit = isFeedCategory && feedTarget === "BOTH";

  const filteredInventoryItems = useMemo<HatcheryInventoryItem[]>(
    () =>
      ((inventoryRes?.data ?? []) as HatcheryInventoryItem[]).filter(
        (item: HatcheryInventoryItem) => item.itemType === inventoryCategory
      ),
    [inventoryRes?.data, inventoryCategory]
  );

  // Auto-fill amount when picking inventory item + qty
  const selectedItem = filteredInventoryItems.find((item: HatcheryInventoryItem) => item.id === inventoryItemId);
  const computedAmount =
    expenseType === "INVENTORY" && selectedItem && quantity
      ? Math.round(Number(selectedItem.effectiveUnitCost ?? selectedItem.unitPrice) * Number(quantity) * 100) / 100
      : null;

  const expenses = expenseRes?.expenses ?? [];
  const totalExpenses = Number(expenseRes?.summary.totalExpenses ?? 0);
  const filteredExpenses = Number(expenseRes?.summary.filteredExpenses ?? 0);
  const byCategory = expenseRes?.summary.byCategory ?? [];
  const feedBySex = expenseRes?.summary.feedBySex ?? null;
  const totalRows = Number(expenseRes?.total ?? 0);
  const totalPages = Math.max(1, Number(expenseRes?.totalPages ?? 1));
  const currentPage = Math.max(1, Number(expenseRes?.page ?? page));
  const pageLimit = Number(expenseRes?.limit ?? 10);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Filtering while on page 3 would otherwise land on an empty page.
  useEffect(() => {
    setPage(1);
  }, [categoryFilter]);

  // The last row of a category can be deleted while it is selected; drop back
  // to All rather than showing an empty table behind a stale filter.
  useEffect(() => {
    if (
      categoryFilter !== ALL_CATEGORIES &&
      byCategory.length > 0 &&
      !byCategory.some(
        (row) => row.category.toUpperCase() === categoryFilter.toUpperCase()
      )
    ) {
      setCategoryFilter(ALL_CATEGORIES);
    }
  }, [byCategory, categoryFilter]);

  async function handleAdd() {
    setFormError(null);
    try {
      if (expenseType === "INVENTORY") {
        const hasSplit = showFeedSplit && (maleFeedQty !== "" || femaleFeedQty !== "");
        if (hasSplit) {
          const male = Number(maleFeedQty || 0);
          const female = Number(femaleFeedQty || 0);
          if (Math.abs(male + female - Number(quantity)) > 0.0001) {
            setFormError(
              `Male + female feed (${male + female}) must equal the total quantity (${Number(quantity)})`
            );
            return;
          }
        }
        await addMutation.mutateAsync({
          date,
          type: "INVENTORY",
          category: inventoryCategory,
          inventoryItemId,
          quantity: Number(quantity),
          ...(isFeedCategory ? { feedTarget } : {}),
          ...(hasSplit
            ? {
                maleFeedQuantity: Number(maleFeedQty || 0),
                femaleFeedQuantity: Number(femaleFeedQty || 0),
              }
            : {}),
        });
      } else {
        await addMutation.mutateAsync({
          date,
          type: "MANUAL",
          category: "manual",
          itemName,
          quantity: quantity ? Number(quantity) : undefined,
          unit: unit || undefined,
          unitPrice: unitPrice ? Number(unitPrice) : undefined,
          amount: Number(amount),
          note: note || undefined,
        });
      }
      // Reset
      setInventoryItemId("");
      setQuantity("");
      setMaleFeedQty("");
      setFemaleFeedQty("");
      setItemName("");
      setUnit("");
      setUnitPrice("");
      setAmount("");
      setNote("");
    } catch (err: any) {
      setFormError(err?.response?.data?.error ?? "Failed to add expense");
    }
  }

  const columns: Column<HatcheryBatchExpense>[] = [
    {
      key: "date",
      label: "Date",
      render: (_, row) => <DateDisplay date={row.date} />,
    },
    {
      key: "category",
      label: "Category",
      render: (_, row) => (
        <div className="flex flex-col">
          <Badge
            className={
              row.type === "INVENTORY"
                ? "bg-blue-100 text-blue-800 border-blue-200 w-fit"
                : "bg-gray-100 text-gray-700 border-gray-200 w-fit"
            }
          >
            {row.category}
          </Badge>
          <span className="text-xs text-gray-500 mt-0.5">{row.itemName}</span>
          {row.feedTarget && (
            <span className="text-[11px] text-gray-500">
              Fed to:{" "}
              {row.feedTarget === "BOTH"
                ? row.femaleFeedQuantity != null && row.maleFeedQuantity != null
                  ? `${Number(row.femaleFeedQuantity)}F / ${Number(row.maleFeedQuantity)}M`
                  : "both"
                : row.feedTarget === "FEMALE"
                  ? "female"
                  : "male"}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "quantity",
      label: "Qty",
      align: "right",
      render: (_, row) =>
        row.quantity ? `${Number(row.quantity)} ${row.unit ?? ""}` : "—",
    },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      render: (_, row) => <span className="font-medium">{fmtNPR(row.amount)}</span>,
    },
    { key: "note", label: "Note", render: (_, row) => <span className="text-xs text-gray-500">{row.note ?? "—"}</span> },
    {
      key: "__actions",
      label: "",
      align: "right",
      render: (_, row) =>
        isInitialPlacementExpense(row) ? (
          <span className="text-xs text-gray-400">Locked</span>
        ) : deleteId === row.id ? (
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                await deleteMutation.mutateAsync(row.id);
                setDeleteId(null);
              }}
            >
              Confirm
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="text-red-500 border-red-200"
            onClick={() => setDeleteId(row.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <StatCard label="Total Expenses" value={fmtNPR(totalExpenses)} variant="primary" />

      {/* Add Form */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-gray-900">Add Expense</h3>
        {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}

        {/* Type toggle */}
        <div className="flex gap-1 border rounded-lg p-1 bg-gray-50 w-fit">
          {(["INVENTORY", "MANUAL"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setExpenseType(t)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                expenseType === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
              }`}
            >
              {t === "INVENTORY" ? "From Inventory" : "Manual"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />

          {expenseType === "INVENTORY" && (
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              value={inventoryCategory}
              onChange={(e) => {
                setInventoryCategory(e.target.value as HatcheryInventoryItemType);
                setInventoryItemId("");
              }}
            >
              {INVENTORY_ITEM_TYPE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}

          {/* Feed is bought as one total stock; only consumption is attributed. */}
          {expenseType === "INVENTORY" && isFeedCategory && (
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              value={feedTarget}
              onChange={(e) => {
                setFeedTarget(e.target.value as HatcheryFeedTarget);
                setMaleFeedQty("");
                setFemaleFeedQty("");
              }}
            >
              <option value="BOTH">Fed to: Both</option>
              <option value="FEMALE">Fed to: Female only</option>
              <option value="MALE">Fed to: Male only</option>
            </select>
          )}

          {expenseType === "INVENTORY" ? (
            <>
              <div className="flex-1 min-w-48">
                <SearchableSelect<HatcheryInventoryItem>
                  value={inventoryItemId}
                  options={filteredInventoryItems.map((item) => ({
                    value: item.id,
                    label: item.name,
                    subtitle: `${item.itemType === "SELF_MADE" ? "Self Feed · " : ""}${Number(item.currentStock)} ${item.unit} in stock · NPR ${Number(item.effectiveUnitCost ?? item.unitPrice)}/${item.unit}`,
                    data: item,
                  }))}
                  placeholder="Search inventory item"
                  searchPlaceholder="Search by name..."
                  isLoading={inventoryLoading}
                  onSearch={setInventorySearch}
                  onValueChange={setInventoryItemId}
                />
              </div>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-28"
              />
              {/* Optional split — many hatcheries feed both groups together and
                  leave this blank. Stock is deducted once on the total either way. */}
              {showFeedSplit && (
                <>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Female qty (opt.)"
                    value={femaleFeedQty}
                    onChange={(e) => setFemaleFeedQty(e.target.value)}
                    className="w-32"
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Male qty (opt.)"
                    value={maleFeedQty}
                    onChange={(e) => setMaleFeedQty(e.target.value)}
                    className="w-32"
                  />
                </>
              )}
              {computedAmount !== null && (
                <span className="flex items-center text-sm font-medium text-gray-700 px-2">
                  = {fmtNPR(computedAmount)}
                </span>
              )}
            </>
          ) : (
            <>
              <Input
                placeholder="Item name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-48"
              />
              <Input
                type="number"
                placeholder="Qty"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-20"
              />
              <Input
                placeholder="Unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-20"
              />
              <Input
                type="number"
                placeholder="Unit price"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-28"
              />
              <Input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-28"
              />
            </>
          )}

          <Input
            placeholder="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1 min-w-32"
          />

          <Button
            onClick={handleAdd}
            disabled={addMutation.isPending || (expenseType === "INVENTORY" ? !inventoryItemId || !quantity : !itemName || !amount)}
          >
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add
          </Button>
        </div>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        {byCategory.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <label className="text-xs font-medium text-gray-600">Category</label>
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value={ALL_CATEGORIES}>All — {fmtNPR(totalExpenses)}</option>
              {/* Built from the data, so custom categories appear on their own. */}
              {byCategory.map((row) => (
                <option key={row.category} value={row.category}>
                  {expenseCategoryLabel(row.category)} — {fmtNPR(row.amount)}
                </option>
              ))}
            </select>
          </div>
        )}
        <DataTable
          data={expenses}
          columns={columns}
          loading={isLoading}
          emptyMessage="No expenses recorded yet."
          getRowKey={(row) => row.id}
          showFooter={expenses.length > 0}
          footerContent={
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2 text-sm">
                <span className="font-semibold text-gray-900">
                  {categoryFilter === ALL_CATEGORIES
                    ? "Total"
                    : `Total (${expenseCategoryLabel(categoryFilter)})`}
                </span>
                <span className="font-bold text-amber-700">
                  {fmtNPR(filteredExpenses)}
                </span>
              </div>
              {feedBySex && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 text-xs text-gray-500">
                  <span className="font-medium text-gray-600">Feed consumed</span>
                  <FeedSexStat label="Female" bucket={feedBySex.female} tone="female" />
                  <FeedSexStat label="Male" bucket={feedBySex.male} tone="male" />
                  {(feedBySex.unallocated.amount > 0 ||
                    formatFeedQuantities(feedBySex.unallocated.quantities)) && (
                    <FeedSexStat
                      label="Unsplit"
                      bucket={feedBySex.unallocated}
                      tone="neutral"
                    />
                  )}
                </div>
              )}
            </div>
          }
        />
        <LedgerPagination
          page={currentPage}
          totalPages={totalPages}
          totalRows={totalRows}
          pageLimit={pageLimit}
          onPageChange={setPage}
          loading={isLoading}
        />
      </div>
    </div>
  );
}

// ─── Egg Production Tab ───────────────────────────────────────────────────────

function EggProductionTab({
  batchId,
  batch,
}: {
  batchId: string;
  batch: HatcheryBatchDetail;
}) {
  const [page, setPage] = useState(1);
  const { data: productionRes, isLoading } = useHatcheryEggProductions(batchId, {
    page,
    limit: 10,
  });
  const { data: eggTypes = [] } = useHatcheryEggTypes();
  const addMutation = useAddHatcheryEggProduction(batchId);
  const deleteMutation = useDeleteHatcheryEggProduction(batchId);

  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const productions = productionRes?.productions ?? [];
  const totalRows = Number(productionRes?.total ?? 0);
  const totalPages = Math.max(1, Number(productionRes?.totalPages ?? 1));
  const currentPage = Math.max(1, Number(productionRes?.page ?? page));
  const pageLimit = Number(productionRes?.limit ?? 10);
  const typeTotals = productionRes?.summary.typeTotals ?? {};
  const grandTotal = Number(productionRes?.summary.grandTotal ?? 0);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function handleAdd() {
    setFormError(null);
    const lines = eggTypes
      .filter((t) => counts[t.id] && parseInt(counts[t.id]) > 0)
      .map((t) => ({ eggTypeId: t.id, count: parseInt(counts[t.id]) }));

    if (lines.length === 0) {
      setFormError("Enter at least one count > 0");
      return;
    }

    try {
      await addMutation.mutateAsync({ date, note: note || undefined, lines });
      setCounts({});
      setNote("");
    } catch (err: any) {
      setFormError(err?.response?.data?.error ?? "Failed to add production");
    }
  }

  // Lay rate now comes from the server, computed over true female-days.
  // The old client-side formula divided by ALL current birds and counted days
  // from batch start (including the rearing period before first lay), so it
  // was wrong on both the numerator's denominator and the day count.
  const layRate = productionRes?.summary.layRate ?? null;

  return (
    <div className="space-y-4">
      {/* Summary cards (mix % per type kept; lay rate is server-computed female-days) */}
      {eggTypes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {eggTypes.map((type) => (
            <div key={type.id} className="bg-white border rounded-xl p-3">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-xs text-gray-500">{type.name}</span>
                {type.isHatchable && <CheckCircle className="h-3 w-3 text-green-600" />}
              </div>
              <p className="text-xl font-bold text-gray-900">
                {(typeTotals[type.id] ?? 0).toLocaleString()}
              </p>
              {grandTotal > 0 && (
                <p className="text-xs text-gray-400">
                  {(((typeTotals[type.id] ?? 0) / grandTotal) * 100).toFixed(1)}%
                </p>
              )}
            </div>
          ))}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-600 mb-1">Total Eggs</p>
            <p className="text-xl font-bold text-amber-800">{grandTotal.toLocaleString()}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 md:col-span-2 lg:col-span-2">
            <p className="text-xs text-emerald-700 mb-1">Lay rate (female basis)</p>
            <p className="text-xl font-bold text-emerald-900">
              {layRate != null ? `${layRate.layPercent.toFixed(1)}%` : "—"}
            </p>
            {layRate != null && (
              <p className="text-xs text-emerald-700/85 mt-1 leading-snug">
                {layRate.eggsPerFemaleDay.toFixed(3)} eggs / female / day ·{" "}
                {layRate.totalEggs.toLocaleString()} eggs ÷{" "}
                {layRate.femaleDays.toLocaleString()} female-days
              </p>
            )}
            {layRate == null &&
              batch.type === "PARENT_FLOCK" &&
              grandTotal > 0 &&
              (batch.initialFemaleParents ?? 0) === 0 && (
                <p className="text-xs text-amber-800 mt-1 leading-snug">
                  This flock has no female parents recorded, so lay rate cannot be
                  calculated.
                </p>
              )}
            {batch.type !== "PARENT_FLOCK" && grandTotal > 0 && (
              <p className="text-xs text-gray-600 mt-1">Lay rate applies to parent flocks.</p>
            )}
          </div>
        </div>
      )}

      {/* Add form */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-gray-900">Record Egg Production</h3>
        {eggTypes.length === 0 && (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            No egg types configured. Go to Egg Types page to add types first.
          </p>
        )}
        {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}

        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          </div>

          {eggTypes.map((type) => (
            <div key={type.id}>
              <label className="text-xs font-medium text-gray-600 block mb-1 flex items-center gap-1">
                {type.name}
                {type.isHatchable && <CheckCircle className="h-3 w-3 text-green-600" />}
              </label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={counts[type.id] ?? ""}
                onChange={(e) => setCounts((prev) => ({ ...prev, [type.id]: e.target.value }))}
                className="w-24"
              />
            </div>
          ))}

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Note</label>
            <Input
              placeholder="Optional"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-40"
            />
          </div>

          <Button
            onClick={handleAdd}
            disabled={addMutation.isPending || eggTypes.length === 0}
          >
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Record
          </Button>
        </div>
      </div>

      {/* Production history */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Production History</h3>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : productions.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No production records yet.</div>
        ) : (
          <div className="divide-y">
            {productions.map((prod) => {
              const total = prod.lines.reduce((s, l) => s + l.count, 0);
              return (
                <div key={prod.id} className="px-4 py-3 flex items-center justify-between group">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <DateDisplay date={prod.date} />
                      <div className="flex gap-3 flex-wrap">
                        {prod.lines.map((line) => (
                          <span key={line.id} className="text-sm">
                            <span className="font-medium">{line.count.toLocaleString()}</span>
                            <span className="text-gray-500 ml-1">{line.eggType.name}</span>
                          </span>
                        ))}
                      </div>
                      <span className="text-xs text-gray-400">Total: {total.toLocaleString()}</span>
                    </div>
                    {prod.note && <p className="text-xs text-gray-500 mt-0.5">{prod.note}</p>}
                  </div>
                  {deleteId === prod.id ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={async () => { await deleteMutation.mutateAsync(prod.id); setDeleteId(null); }}>
                        Confirm
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="opacity-0 group-hover:opacity-100 text-red-500 border-red-200"
                      onClick={() => setDeleteId(prod.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <LedgerPagination
          page={currentPage}
          totalPages={totalPages}
          totalRows={totalRows}
          pageLimit={pageLimit}
          onPageChange={setPage}
          loading={isLoading}
        />
      </div>
    </div>
  );
}

// ─── Egg Stock Tab ────────────────────────────────────────────────────────────

function EggStockTab({ batch }: { batch: any }) {
  const eggStock = batch.summary?.eggStock ?? [];

  return (
    <div className="space-y-4">
      {eggStock.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
          No egg stock yet. Record egg production first.
        </div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="divide-y">
            {eggStock.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{s.eggType?.name}</span>
                  {s.eggType?.isHatchable && (
                    <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Hatchable
                    </Badge>
                  )}
                </div>
                <span
                  className={`text-2xl font-bold ${
                    s.currentStock === 0 ? "text-gray-300" : "text-gray-900"
                  }`}
                >
                  {s.currentStock.toLocaleString()}
                  <span className="text-sm font-normal text-gray-400 ml-1">eggs</span>
                </span>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 bg-amber-50 border-t flex items-center justify-between">
            <span className="font-semibold text-amber-800">Total Stock</span>
            <span className="text-2xl font-bold text-amber-800">
              {eggStock.reduce((s: number, r: any) => s + r.currentStock, 0).toLocaleString()}
              <span className="text-sm font-normal ml-1">eggs</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sales Tab ────────────────────────────────────────────────────────────────

function SalesTab({
  batchId,
  currentMale,
  currentFemale,
}: {
  batchId: string;
  currentMale: number;
  currentFemale: number;
}) {
  const { data: eggTypes = [] } = useHatcheryEggTypes();
  const [eggPage, setEggPage] = useState(1);
  const [parentPage, setParentPage] = useState(1);
  const { data: eggSalesRes, isLoading: eggSalesLoading } = useHatcheryEggSales(batchId, {
    page: eggPage,
    limit: 10,
  });
  const { data: parentSalesRes, isLoading: parentSalesLoading } = useHatcheryParentSales(batchId, {
    page: parentPage,
    limit: 10,
  });
  const { data: partiesData } = useHatcheryParties();

  const addEggSaleMutation = useAddHatcheryEggSale(batchId);
  const deleteEggSaleMutation = useDeleteHatcheryEggSale(batchId);
  const addParentSaleMutation = useAddHatcheryParentSale(batchId);
  const deleteParentSaleMutation = useDeleteHatcheryParentSale(batchId);

  const parties = partiesData?.parties ?? [];

  // Egg sale form
  const [eggDate, setEggDate] = useState(today());
  const [eggTypeId, setEggTypeId] = useState("");
  const [eggCount, setEggCount] = useState("");
  const [eggUnitPrice, setEggUnitPrice] = useState("");
  const [eggPartyId, setEggPartyId] = useState("");
  const [eggNote, setEggNote] = useState("");
  const [eggFormError, setEggFormError] = useState<string | null>(null);
  const [deleteEggSaleId, setDeleteEggSaleId] = useState<string | null>(null);

  // Parent sale form
  const [parentDate, setParentDate] = useState(today());
  const [parentMaleCount, setParentMaleCount] = useState("");
  const [parentFemaleCount, setParentFemaleCount] = useState("");
  // Total sold is derived, never typed.
  const parentMale = parseInt(parentMaleCount || "0", 10) || 0;
  const parentFemale = parseInt(parentFemaleCount || "0", 10) || 0;
  const parentCount = parentMale + parentFemale;
  const [parentTotalWeight, setParentTotalWeight] = useState("");
  const [parentRatePerKg, setParentRatePerKg] = useState("");
  const [parentPartyId, setParentPartyId] = useState("");
  const [parentNote, setParentNote] = useState("");
  const [parentFormError, setParentFormError] = useState<string | null>(null);
  const [deleteParentSaleId, setDeleteParentSaleId] = useState<string | null>(null);

  // Computed preview for parent sale
  const parentAmount =
    parentTotalWeight && parentRatePerKg
      ? Math.round(parseFloat(parentTotalWeight) * parseFloat(parentRatePerKg) * 100) / 100
      : null;
  const parentAvgWeight =
    parentTotalWeight && parentCount > 0
      ? Math.round((parseFloat(parentTotalWeight) / parentCount) * 1000) / 1000
      : null;

  const eggSales = eggSalesRes?.data ?? [];
  const parentSales = parentSalesRes?.data ?? [];
  const eggTotalRows = Number(eggSalesRes?.total ?? 0);
  const eggTotalPages = Math.max(1, Number(eggSalesRes?.totalPages ?? 1));
  const eggCurrentPage = Math.max(1, Number(eggSalesRes?.page ?? eggPage));
  const eggPageLimit = Number(eggSalesRes?.limit ?? 10);
  const totalEggRevenue = Number(eggSalesRes?.summary?.totalRevenue ?? 0);

  const parentTotalRows = Number(parentSalesRes?.total ?? 0);
  const parentTotalPages = Math.max(1, Number(parentSalesRes?.totalPages ?? 1));
  const parentCurrentPage = Math.max(1, Number(parentSalesRes?.page ?? parentPage));
  const parentPageLimit = Number(parentSalesRes?.limit ?? 10);
  const totalParentRevenue = Number(parentSalesRes?.summary?.totalRevenue ?? 0);

  useEffect(() => {
    if (eggPage > eggTotalPages) {
      setEggPage(eggTotalPages);
    }
  }, [eggPage, eggTotalPages]);

  useEffect(() => {
    if (parentPage > parentTotalPages) {
      setParentPage(parentTotalPages);
    }
  }, [parentPage, parentTotalPages]);

  async function handleAddEggSale() {
    setEggFormError(null);
    try {
      await addEggSaleMutation.mutateAsync({
        eggTypeId,
        date: eggDate,
        count: parseInt(eggCount),
        unitPrice: Number(eggUnitPrice),
        partyId: eggPartyId || undefined,
        note: eggNote || undefined,
      });
      setEggCount("");
      setEggUnitPrice("");
      setEggPartyId("");
      setEggNote("");
    } catch (err: any) {
      setEggFormError(err?.response?.data?.error ?? "Failed to record sale");
    }
  }

  async function handleAddParentSale() {
    setParentFormError(null);
    if (parentCount <= 0) {
      setParentFormError("Enter at least one male or female bird");
      return;
    }
    // Server enforces this too, at the database; this is just a faster message.
    if (parentMale > currentMale || parentFemale > currentFemale) {
      setParentFormError(
        `Only ${currentFemale.toLocaleString()} female and ${currentMale.toLocaleString()} male birds remain`
      );
      return;
    }
    try {
      await addParentSaleMutation.mutateAsync({
        date: parentDate,
        maleCount: parentMale,
        femaleCount: parentFemale,
        totalWeightKg: parseFloat(parentTotalWeight),
        ratePerKg: parseFloat(parentRatePerKg),
        partyId: parentPartyId || undefined,
        note: parentNote || undefined,
      });
      setParentMaleCount("");
      setParentFemaleCount("");
      setParentTotalWeight("");
      setParentRatePerKg("");
      setParentPartyId("");
      setParentNote("");
    } catch (err: any) {
      setParentFormError(err?.response?.data?.error ?? "Failed to record sale");
    }
  }

  const eggSaleColumns: Column<HatcheryEggSale>[] = [
    { key: "date", label: "Date", render: (_, r) => <DateDisplay date={r.date} /> },
    { key: "eggType", label: "Type", render: (_, r) => <span>{r.eggType.name}</span> },
    { key: "count", label: "Qty", align: "right", render: (_, r) => r.count.toLocaleString() },
    { key: "amount", label: "Amount", align: "right", render: (_, r) => <span className="font-medium">{fmtNPR(r.amount)}</span> },
    {
      key: "partyId",
      label: "Party",
      render: (_, r) => <span className="text-gray-500 text-sm">{r.party?.name ?? (r.partyId ? "—" : "Cash")}</span>,
    },
    {
      key: "__actions",
      label: "",
      align: "right",
      render: (_, r) =>
        deleteEggSaleId === r.id ? (
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="destructive" onClick={async () => { await deleteEggSaleMutation.mutateAsync(r.id); setDeleteEggSaleId(null); }}>Confirm</Button>
            <Button size="sm" variant="outline" onClick={() => setDeleteEggSaleId(null)}>Cancel</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={() => setDeleteEggSaleId(r.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        ),
    },
  ];

  const parentSaleColumns: Column<HatcheryParentSale>[] = [
    { key: "date", label: "Date", render: (_, r) => <DateDisplay date={r.date} /> },
    {
      key: "count",
      label: "Birds",
      align: "right",
      render: (_, r) => (
        <div className="leading-tight">
          <span>{r.count.toLocaleString()}</span>
          <p className="text-[11px] text-gray-500">
            {r.femaleCount}F · {r.maleCount}M
          </p>
        </div>
      ),
    },
    { key: "totalWeightKg", label: "Total Wt (kg)", align: "right", render: (_, r) => Number(r.totalWeightKg).toFixed(2) },
    { key: "avgWeightKg", label: "Avg Wt (kg)", align: "right", render: (_, r) => Number(r.avgWeightKg).toFixed(3) },
    { key: "ratePerKg", label: "Rate/kg", align: "right", render: (_, r) => `Rs ${Number(r.ratePerKg).toFixed(2)}` },
    { key: "amount", label: "Amount", align: "right", render: (_, r) => <span className="font-medium">{fmtNPR(r.amount)}</span> },
    {
      key: "partyId",
      label: "Party",
      render: (_, r) => <span className="text-gray-500 text-sm">{r.party?.name ?? (r.partyId ? "—" : "Cash")}</span>,
    },
    {
      key: "__actions",
      label: "",
      align: "right",
      render: (_, r) =>
        deleteParentSaleId === r.id ? (
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="destructive" onClick={async () => { await deleteParentSaleMutation.mutateAsync(r.id); setDeleteParentSaleId(null); }}>Confirm</Button>
            <Button size="sm" variant="outline" onClick={() => setDeleteParentSaleId(null)}>Cancel</Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" className="text-red-500 border-red-200" onClick={() => setDeleteParentSaleId(r.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Egg Sale Revenue" value={fmtNPR(totalEggRevenue)} variant="primary" />
        <StatCard label="Parent Sale Revenue" value={fmtNPR(totalParentRevenue)} variant="primary" />
        <StatCard
          label="Live Birds (F / M)"
          value={`${currentFemale.toLocaleString()} / ${currentMale.toLocaleString()}`}
        />
      </div>

      {/* Egg Sales */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Egg Sales</h3>

        <div className="bg-white border rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Record Egg Sale</h4>
          {eggFormError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{eggFormError}</p>}
          <div className="flex flex-wrap gap-2">
            <Input type="date" value={eggDate} onChange={(e) => setEggDate(e.target.value)} className="w-40" />
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-w-36"
              value={eggTypeId}
              onChange={(e) => setEggTypeId(e.target.value)}
            >
              <option value="">Select egg type</option>
              {eggTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <Input type="number" min="1" placeholder="Count" value={eggCount} onChange={(e) => setEggCount(e.target.value)} className="w-24" />
            <Input type="number" min="0" placeholder="Unit price" value={eggUnitPrice} onChange={(e) => setEggUnitPrice(e.target.value)} className="w-28" />
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-w-36"
              value={eggPartyId}
              onChange={(e) => setEggPartyId(e.target.value)}
            >
              <option value="">Cash sale</option>
              {parties.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
            </select>
            <Input placeholder="Note" value={eggNote} onChange={(e) => setEggNote(e.target.value)} className="flex-1 min-w-28" />
            <Button onClick={handleAddEggSale} disabled={addEggSaleMutation.isPending || !eggTypeId || !eggCount || !eggUnitPrice}>
              {addEggSaleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Sell
            </Button>
          </div>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <DataTable
            data={eggSales}
            columns={eggSaleColumns}
            loading={eggSalesLoading}
            emptyMessage="No egg sales yet."
            getRowKey={(r) => r.id}
          />
          <LedgerPagination
            page={eggCurrentPage}
            totalPages={eggTotalPages}
            totalRows={eggTotalRows}
            pageLimit={eggPageLimit}
            onPageChange={setEggPage}
            loading={eggSalesLoading}
          />
        </div>
      </div>

      {/* Parent Sales */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Parent Bird Sales</h3>

        <div className="bg-white border rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Record Parent Sale</h4>
          {parentFormError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{parentFormError}</p>}
          <div className="flex flex-wrap gap-2">
            <Input type="date" value={parentDate} onChange={(e) => setParentDate(e.target.value)} className="w-40" />
            <Input type="number" min="0" max={currentFemale} placeholder="Female" value={parentFemaleCount} onChange={(e) => setParentFemaleCount(e.target.value)} className="w-28" />
            <Input type="number" min="0" max={currentMale} placeholder="Male" value={parentMaleCount} onChange={(e) => setParentMaleCount(e.target.value)} className="w-28" />
            <div className="flex items-center px-2 text-sm text-gray-600">
              Total: <span className="ml-1 font-semibold text-gray-900">{parentCount.toLocaleString()}</span>
            </div>
            <Input type="number" min="0" step="0.001" placeholder="Total weight (kg)" value={parentTotalWeight} onChange={(e) => setParentTotalWeight(e.target.value)} className="w-36" />
            <Input type="number" min="0" step="0.01" placeholder="Rate/kg" value={parentRatePerKg} onChange={(e) => setParentRatePerKg(e.target.value)} className="w-28" />
            <select
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white min-w-36"
              value={parentPartyId}
              onChange={(e) => setParentPartyId(e.target.value)}
            >
              <option value="">Cash sale</option>
              {parties.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
            </select>
            <Input placeholder="Note" value={parentNote} onChange={(e) => setParentNote(e.target.value)} className="flex-1 min-w-28" />
            <Button onClick={handleAddParentSale} disabled={addParentSaleMutation.isPending || parentCount <= 0 || !parentTotalWeight || !parentRatePerKg}>
              {addParentSaleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Sell
            </Button>
          </div>
          {(parentAmount !== null || parentAvgWeight !== null) && (
            <p className="text-xs text-muted-foreground">
              {parentAvgWeight !== null && <>Avg weight: <span className="font-medium">{parentAvgWeight} kg/bird</span>{" · "}</>}
              {parentAmount !== null && <>Total amount: <span className="font-medium text-foreground">Rs {parentAmount.toFixed(2)}</span></>}
            </p>
          )}
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <DataTable
            data={parentSales}
            columns={parentSaleColumns}
            loading={parentSalesLoading}
            emptyMessage="No parent sales yet."
            getRowKey={(r) => r.id}
          />
          <LedgerPagination
            page={parentCurrentPage}
            totalPages={parentTotalPages}
            totalRows={parentTotalRows}
            pageLimit={parentPageLimit}
            onPageChange={setParentPage}
            loading={parentSalesLoading}
          />
        </div>
      </div>
    </div>
  );
}
