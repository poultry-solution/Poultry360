"use client";

import { HatcheryNotesTab } from "@/components/hatchery/HatcheryNotesTab";
import { RemindMeButton } from "@/components/reminders/RemindMeButton";
import { useEffect, useState, useMemo } from "react";
import { getNepalTodayAd } from "@/common/lib/nepali-date";
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
  FileText,
} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Badge } from "@/common/components/ui/badge";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DateInput } from "@/common/components/ui/date-input";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";
import { formatRupeesExact } from "@/common/lib/utils";
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
  type HatcheryEggProduction,
  type HatcheryEggStockRow,
} from "@/fetchers/hatchery/hatcheryBatchQueries";
import {
  useGetHatcheryInventory,
  type HatcheryInventoryItemType,
  type HatcheryInventoryItem,
} from "@/fetchers/hatchery/hatcheryInventoryQueries";
import { useHatcheryParties } from "@/fetchers/hatchery/hatcheryPartyQueries";
import { HatcherySaleBill } from "../../sales/_components/HatcherySaleBill";
import { SaleSavedPrompt } from "../../sales/_components/SaleSavedPrompt";
import type { HatcherySaleType } from "@/fetchers/hatchery/hatcherySaleQueries";

type Tab =
  | "overview"
  | "expenses"
  | "mortality"
  | "egg-production"
  | "egg-stock"
  | "sales"
  | "notes";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "expenses", label: "Expenses" },
  { id: "mortality", label: "Mortality" },
  { id: "egg-production", label: "Egg Production" },
  { id: "egg-stock", label: "Egg Stock" },
  { id: "sales", label: "Sales" },
  { id: "notes", label: "Notes" },
];

function fmtNPR(n: number | string) {
  return formatRupeesExact(n);
}

function today() {
  return getNepalTodayAd();
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
  // Replaces the two legacy `window.confirm` prompts in this file; see §2.1-4
  // of the hatchery handoff.
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);

  const isClosed = batch?.status === "CLOSED";

  async function handleDeleteBatch() {
    setShowDeleteDialog(false);
    setActionError(null);
    const password = window.prompt(
      "Enter your password to delete this batch. This is allowed only when no operational data exists."
    );
    if (!password) return;
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <RemindMeButton module="hatchery" link={{ hatcheryBatchId: batch.id }} className="h-9" />
            <Button
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => setShowDeleteDialog(true)}
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            <RemindMeButton module="hatchery" link={{ hatcheryBatchId: batch.id }} className="h-9" />
            <Button
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => setShowDeleteDialog(true)}
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
              onClick={() => setShowCloseDialog(true)}
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
          initialParents={batch.initialParents ?? 0}
        />
      )}
      {activeTab === "egg-production" && <EggProductionTab batchId={id} batch={batch} />}
      {activeTab === "egg-stock" && <EggStockTab batch={batch} />}
      {activeTab === "sales" && (
        <SalesTab
          batchId={id}
          currentMale={batch.currentMaleParents ?? 0}
          currentFemale={batch.currentFemaleParents ?? 0}
          eggStock={batch.summary?.eggStock ?? []}
        />
      )}
      {activeTab === "notes" && <HatcheryNotesTab kind="batch" id={id} />}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the batch and all its records. You will be asked for
              your password next.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBatch}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this batch?</AlertDialogTitle>
            <AlertDialogDescription>
              Closed batches can be reopened later, but no new entries can be
              added while the batch is closed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowCloseDialog(false);
                closeMutation.mutate();
              }}
            >
              Close batch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

  const fin = snapshot?.financial;
  const prod = snapshot?.production;
  const inc = snapshot?.incubation;
  const profit = fin?.profitOrLoss ?? 0;
  const deaths = batch.summary?.totalMortality ?? 0;
  const deathPct =
    batch.initialParents && batch.initialParents > 0
      ? `${((deaths / batch.initialParents) * 100).toFixed(1)}% of birds placed`
      : "Since start";

  return (
    <div className="space-y-4">
      <OverviewGroup title="Birds" cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        <OverviewTile label="Birds now" value={batch.currentParents?.toLocaleString() ?? "—"} sub={`Started with ${batch.initialParents?.toLocaleString() ?? "—"}`} />
        <OverviewTile label="Female now" value={currentFemale.toLocaleString()} sub="Hens" />
        <OverviewTile label="Male now" value={currentMale.toLocaleString()} sub="Cocks" />
        <OverviewTile label="Males per 100 females" value={sexRatio === "—" ? "—" : sexRatio.split(" : ")[0]} sub="Sex ratio" />
        <OverviewTile
          label="Started with"
          value={`${(batch.initialFemaleParents ?? 0).toLocaleString()} / ${(batch.initialMaleParents ?? 0).toLocaleString()}`}
          sub="Female / male"
        />
        <OverviewTile label="Deaths" value={deaths.toLocaleString()} sub={deathPct} tone={deaths > 0 ? "text-red-600" : ""} />
      </OverviewGroup>

      <OverviewGroup title="Money" cols="grid-cols-1 sm:grid-cols-3">
        <OverviewTile
          label="Income"
          value={fmtNPR(fin?.totalRevenue ?? 0)}
          sub={`Eggs ${fmtNPR(fin?.eggSalesRevenue ?? 0)} · Parents ${fmtNPR(fin?.parentSalesRevenue ?? 0)} · Chicks ${fmtNPR(fin?.chickSalesRevenue ?? 0)}`}
          tone="text-green-700"
        />
        <OverviewTile
          label="Cost"
          value={fmtNPR(fin?.totalExpenses ?? batch.summary?.totalExpenses ?? 0)}
          sub="All expenses of this batch"
          tone="text-red-600"
        />
        <OverviewTile
          label={profit >= 0 ? "Profit" : "Loss"}
          value={fmtNPR(profit)}
          sub="Income − cost"
          tone={profit >= 0 ? "text-green-700" : "text-red-600"}
        />
      </OverviewGroup>

      <OverviewGroup title="Chicks" cols="grid-cols-1 sm:grid-cols-3">
        <OverviewTile
          label="Chicks hatched"
          value={(prod?.producedTotal ?? 0).toLocaleString()}
          sub={`A ${(prod?.producedA ?? 0).toLocaleString()} · B ${(prod?.producedB ?? 0).toLocaleString()} · Cull ${(prod?.producedCull ?? 0).toLocaleString()}`}
        />
        <OverviewTile label="Chicks sold" value={(prod?.soldTotal ?? 0).toLocaleString()} sub="From this batch's eggs" />
        <OverviewTile label="Chicks not sold yet" value={(prod?.unsoldTotal ?? 0).toLocaleString()} sub="In stock" />
      </OverviewGroup>

      <OverviewGroup title="Hatching" cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <OverviewTile label="Incubations done" value={(inc?.incubationCount ?? 0).toLocaleString()} sub="Finished" />
        <OverviewTile label="Removed at candling" value={(inc?.candlingLossTotal ?? 0).toLocaleString()} sub="Infertile + early dead" />
        <OverviewTile label="Fertile eggs" value={(inc?.fertileEggsTotal ?? 0).toLocaleString()} sub="After candling" />
        <OverviewTile
          label="Hatch % (fertile eggs)"
          value={`${Number(inc?.weightedHatchabilityPct ?? 0).toFixed(1)}%`}
          sub="Chicks ÷ fertile eggs"
        />
        <OverviewTile
          label="Hatch % (all eggs set)"
          value={`${Number(inc?.weightedHatchOfTotalPct ?? 0).toFixed(1)}%`}
          sub="Chicks ÷ eggs set"
        />
      </OverviewGroup>

      <OverviewGroup title="Cost per chick" cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <OverviewTile label="Total cost" value={fmtNPR(costEngine?.totalRelevantCost ?? 0)} sub="This batch's expenses" />
        <OverviewTile label="Chicks hatched" value={(costEngine?.producedTotal ?? 0).toLocaleString()} sub="A + B + cull" />
        <OverviewTile label="Chicks to sell" value={(costEngine?.saleableTotal ?? 0).toLocaleString()} sub="A + B" />
        <OverviewTile
          label="Cost per chick"
          value={costEngine?.costPerProducedChick == null ? "—" : fmtNPR(costEngine.costPerProducedChick)}
          sub="All chicks hatched"
        />
        <OverviewTile
          label="Cost per saleable chick"
          value={costEngine?.costPerSaleableChick == null ? "—" : fmtNPR(costEngine.costPerSaleableChick)}
          sub="A + B only"
        />
      </OverviewGroup>
      {costEngine?.costPerProducedChick == null ? (
        <p className="-mt-2 text-xs text-gray-500">Cost per chick shows after the first hatch result is saved.</p>
      ) : null}

      {batch.notes && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
          <p className="text-xs font-medium text-gray-600">Notes</p>
          <p className="text-sm text-gray-800">{batch.notes}</p>
        </div>
      )}
    </div>
  );
}

/** Small heading plus a row of tiles (Overview tab only). */
function OverviewGroup({ title, cols, children }: { title: string; cols: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <div className={`grid gap-3 ${cols}`}>{children}</div>
    </section>
  );
}

/** Small tile, same size as the Home tiles. */
function OverviewTile({ label, value, sub, tone = "" }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <p className="truncate text-xs font-medium text-gray-600">{label}</p>
      <p className={`mt-0.5 truncate text-lg font-bold md:text-xl ${tone || "text-gray-900"}`}>{value}</p>
      {sub ? <p className="truncate text-[11px] text-gray-500" title={sub}>{sub}</p> : null}
    </div>
  );
}

// ─── Mortality Tab ────────────────────────────────────────────────────────────

function MortalityTab({
  batchId,
  currentMale,
  currentFemale,
  initialParents,
}: {
  batchId: string;
  currentMale: number;
  currentFemale: number;
  initialParents: number;
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
  const tooManyFemale = female > currentFemale;
  const tooManyMale = male > currentMale;

  const mortalities = mortalityRes?.mortalities ?? [];
  const totalMortality = Number(mortalityRes?.summary.totalMortality ?? 0);
  const totalRows = Number(mortalityRes?.total ?? 0);
  const totalPages = Math.max(1, Number(mortalityRes?.totalPages ?? 1));
  const currentPage = Math.max(1, Number(mortalityRes?.page ?? page));
  const pageLimit = Number(mortalityRes?.limit ?? 10);
  const deathPct = initialParents > 0 ? (totalMortality / initialParents) * 100 : null;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function handleAdd() {
    if (addMutation.isPending) return;
    setFormError(null);
    if (!date) return;
    if (totalEntered <= 0) {
      setFormError("Enter at least one female or male death");
      return;
    }
    // Server enforces this too, at the database; this is just a faster message.
    if (tooManyMale || tooManyFemale) {
      setFormError(
        `Only ${currentFemale.toLocaleString()} female and ${currentMale.toLocaleString()} male birds are alive`
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
      const data = err?.response?.data;
      setFormError(data?.message ?? data?.error ?? "Could not save the deaths. Please try again.");
    }
  }

  const renderDelete = (row: HatcheryBatchMortality) =>
    deleteId === row.id ? (
      <div className="flex justify-end gap-1.5">
        <Button
          size="sm"
          variant="destructive"
          className="h-7 px-2 text-xs"
          disabled={deleteMutation.isPending}
          onClick={async () => {
            await deleteMutation.mutateAsync(row.id);
            setDeleteId(null);
          }}
        >
          {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setDeleteId(null)}>
          Cancel
        </Button>
      </div>
    ) : (
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
        aria-label="Delete record"
        title="Delete"
        onClick={() => setDeleteId(row.id)}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );

  const columns: Column<HatcheryBatchMortality>[] = [
    {
      key: "date",
      label: "Date",
      render: (_, row) => <DateDisplay date={row.date} format="long" className="whitespace-nowrap text-sm" />,
    },
    { key: "femaleCount", label: "Female", align: "right", render: (_, row) => row.femaleCount.toLocaleString() },
    { key: "maleCount", label: "Male", align: "right", render: (_, row) => row.maleCount.toLocaleString() },
    {
      key: "count",
      label: "Total",
      align: "right",
      render: (_, row) => <span className="font-semibold text-red-600">{row.count.toLocaleString()}</span>,
    },
    {
      key: "note",
      label: "Note",
      render: (_, row) => <span className="text-sm text-gray-500">{row.note || "—"}</span>,
    },
    { key: "__actions", label: "", align: "right", render: (_, row) => renderDelete(row) },
  ];

  const totalLabel = `Total of all ${totalRows} record${totalRows === 1 ? "" : "s"}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <OverviewTile
          label="Total deaths"
          value={totalMortality.toLocaleString()}
          sub={`${totalRows} record${totalRows === 1 ? "" : "s"}`}
          tone={totalMortality > 0 ? "text-red-600" : ""}
        />
        <OverviewTile
          label="Death rate"
          value={deathPct === null ? "—" : `${deathPct.toFixed(1)}%`}
          sub={initialParents > 0 ? `Of ${initialParents.toLocaleString()} birds placed` : "Since start"}
          tone={deathPct !== null && deathPct > 0 ? "text-red-600" : ""}
        />
        <OverviewTile label="Female alive" value={currentFemale.toLocaleString()} sub="Hens now" />
        <OverviewTile label="Male alive" value={currentMale.toLocaleString()} sub="Cocks now" />
      </div>

      {/* Add form */}
      <form
        className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleAdd();
        }}
      >
        <h3 className="font-semibold text-gray-900">Record deaths</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-[180px_130px_130px_100px_minmax(0,1fr)_auto] lg:items-start">
          <div className="col-span-2 sm:col-span-1">
            <FieldLabel>Date</FieldLabel>
            <DateInput value={date} onChange={setDate} className="w-full" />
          </div>
          <label className="block">
            <FieldLabel>Female deaths</FieldLabel>
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              max={currentFemale}
              placeholder="0"
              value={femaleCount}
              onChange={(e) => {
                setFemaleCount(e.target.value);
                setFormError(null);
              }}
              className={`h-10 ${tooManyFemale ? "border-red-400" : ""}`}
            />
            <span className={`mt-1 block text-[11px] ${tooManyFemale ? "text-red-600" : "text-gray-500"}`}>
              {currentFemale.toLocaleString()} alive
            </span>
          </label>
          <label className="block">
            <FieldLabel>Male deaths</FieldLabel>
            <Input
              type="number"
              inputMode="numeric"
              min="0"
              max={currentMale}
              placeholder="0"
              value={maleCount}
              onChange={(e) => {
                setMaleCount(e.target.value);
                setFormError(null);
              }}
              className={`h-10 ${tooManyMale ? "border-red-400" : ""}`}
            />
            <span className={`mt-1 block text-[11px] ${tooManyMale ? "text-red-600" : "text-gray-500"}`}>
              {currentMale.toLocaleString()} alive
            </span>
          </label>
          <div>
            <FieldLabel>Total</FieldLabel>
            <div className="flex h-10 items-center rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-900">
              {totalEntered.toLocaleString()}
            </div>
          </div>
          <label className="col-span-2 block sm:col-span-3 lg:col-span-1">
            <FieldLabel>Note (optional)</FieldLabel>
            <Input placeholder="e.g. Heat stress" value={note} onChange={(e) => setNote(e.target.value)} className="h-10" />
          </label>
          <div className="col-span-2 sm:col-span-1 lg:pt-5">
            <Button type="submit" disabled={addMutation.isPending || totalEntered <= 0} className="h-10 w-full">
              {addMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add
                </>
              )}
            </Button>
          </div>
        </div>
        {formError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
        )}
      </form>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Computer / tablet: table */}
        <div className="hidden sm:block">
          <DataTable
            data={mortalities}
            columns={columns}
            loading={isLoading}
            emptyMessage="No deaths recorded yet."
            getRowKey={(row) => row.id}
            showFooter={mortalities.length > 0}
            footerContent={
              <div className="flex items-center justify-between px-2 text-sm">
                <span className="font-semibold text-gray-900">{totalLabel}</span>
                <span className="font-bold text-red-600">{totalMortality.toLocaleString()} birds</span>
              </div>
            }
          />
        </div>

        {/* Phone: one small card per record */}
        <div className="sm:hidden">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : mortalities.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">No deaths recorded yet.</p>
          ) : (
            <ul className="divide-y">
              {mortalities.map((row) => (
                <li key={row.id} className="flex items-start gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-medium text-gray-900"><DateDisplay date={row.date} format="long" /></p>
                    <p className="text-xs text-gray-500">
                      Female {row.femaleCount.toLocaleString()} · Male {row.maleCount.toLocaleString()}
                      {row.note ? ` · ${row.note}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-red-600">{row.count.toLocaleString()} dead</span>
                    {renderDelete(row)}
                  </div>
                </li>
              ))}
              <li className="flex items-center justify-between bg-gray-50 px-4 py-2.5 text-sm">
                <span className="font-semibold text-gray-900">{totalLabel}</span>
                <span className="font-bold text-red-600">{totalMortality.toLocaleString()} birds</span>
              </li>
            </ul>
          )}
        </div>

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
  { value: "SELF_MADE", label: "Self feed" },
  { value: "MEDICINE", label: "Medicine" },
  { value: "CHICKS", label: "Parent birds" },
  { value: "OTHER", label: "Other" },
];

/** Plain words and a colour for each expense type ("SELF_MADE" -> "Self feed"). */
const EXPENSE_TYPE_STYLE: Record<string, { label: string; className: string }> = {
  FEED: { label: "Feed", className: "bg-amber-50 text-amber-800 border-amber-200" },
  SELF_MADE: { label: "Self feed", className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  MEDICINE: { label: "Medicine", className: "bg-blue-50 text-blue-800 border-blue-200" },
  CHICKS: { label: "Parent birds", className: "bg-yellow-50 text-yellow-800 border-yellow-200" },
  OTHER: { label: "Other", className: "bg-gray-50 text-gray-700 border-gray-200" },
  MANUAL: { label: "Manual", className: "bg-slate-100 text-slate-700 border-slate-200" },
};

function expenseTypeStyle(category: string) {
  return (
    EXPENSE_TYPE_STYLE[category.toUpperCase()] ?? {
      label: expenseCategoryLabel(category),
      className: "bg-gray-50 text-gray-700 border-gray-200",
    }
  );
}

function ExpenseTypeBadge({ category }: { category: string }) {
  const style = expenseTypeStyle(category);
  return (
    <span className={`inline-flex w-fit shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-medium ${style.className}`}>
      {style.label}
    </span>
  );
}

/** "Fed to: female 373 kg · male 47 kg" plus the note, as one grey line. */
function expenseDetailLine(row: HatcheryBatchExpense) {
  const parts: string[] = [];
  if (row.feedTarget) {
    const unit = row.unit ? ` ${row.unit}` : "";
    if (row.feedTarget === "BOTH") {
      parts.push(
        row.femaleFeedQuantity != null && row.maleFeedQuantity != null
          ? `Fed to: female ${Number(row.femaleFeedQuantity).toLocaleString()}${unit} · male ${Number(row.maleFeedQuantity).toLocaleString()}${unit}`
          : "Fed to: both"
      );
    } else {
      parts.push(row.feedTarget === "FEMALE" ? "Fed to: female only" : "Fed to: male only");
    }
  }
  if (row.note) parts.push(row.note);
  return parts.join(" · ");
}

function expenseQty(row: HatcheryBatchExpense) {
  return row.quantity ? `${Number(row.quantity).toLocaleString()} ${row.unit ?? ""}`.trim() : "—";
}

/** Small label above a form box. */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-xs font-medium text-gray-600">{children}</span>;
}

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
  // True once the user types Amount themselves; then Qty × Unit price stops overwriting it.
  const [amountTyped, setAmountTyped] = useState(false);
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Feed attribution. Feed is still PURCHASED as one total stock; this only
  // records which parent group consumed it.
  const [feedTarget, setFeedTarget] = useState<HatcheryFeedTarget>("BOTH");
  const [splitOpen, setSplitOpen] = useState(false);
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
  const notEnoughStock =
    expenseType === "INVENTORY" && selectedItem && quantity !== ""
      ? Number(quantity) > Number(selectedItem.currentStock)
      : false;

  // Manual: Amount = Qty × Unit price until the user types Amount themselves.
  useEffect(() => {
    if (expenseType !== "MANUAL" || amountTyped) return;
    if (quantity !== "" && unitPrice !== "") {
      const value = Math.round(Number(quantity) * Number(unitPrice) * 100) / 100;
      setAmount(Number.isFinite(value) ? String(value) : "");
    }
  }, [expenseType, quantity, unitPrice, amountTyped]);

  const expenses = expenseRes?.expenses ?? [];
  const totalExpenses = Number(expenseRes?.summary.totalExpenses ?? 0);
  const filteredExpenses = Number(expenseRes?.summary.filteredExpenses ?? 0);
  const byCategory = expenseRes?.summary.byCategory ?? [];
  const feedBySex = expenseRes?.summary.feedBySex ?? null;
  const totalRows = Number(expenseRes?.total ?? 0);
  const allCount = byCategory.reduce((sum, row) => sum + Number(row.count ?? 0), 0);
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

  const canAdd =
    !addMutation.isPending &&
    (expenseType === "INVENTORY" ? Boolean(inventoryItemId && quantity) : Boolean(itemName && amount));

  async function handleAdd() {
    if (!canAdd) return;
    setFormError(null);
    try {
      if (expenseType === "INVENTORY") {
        const hasSplit = showFeedSplit && splitOpen && (maleFeedQty !== "" || femaleFeedQty !== "");
        if (hasSplit) {
          const male = Number(maleFeedQty || 0);
          const female = Number(femaleFeedQty || 0);
          if (Math.abs(male + female - Number(quantity)) > 0.0001) {
            setFormError(
              `Female + male (${male + female}) must equal the total quantity (${Number(quantity)})`
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
          // The server already saves this; the form used to drop it (dev list B3).
          note: note || undefined,
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
      setSplitOpen(false);
      setItemName("");
      setUnit("");
      setUnitPrice("");
      setAmount("");
      setAmountTyped(false);
      setNote("");
    } catch (err: any) {
      const data = err?.response?.data;
      setFormError(data?.message ?? data?.error ?? "Could not add the expense. Please try again.");
    }
  }

  const renderDelete = (row: HatcheryBatchExpense) =>
    isInitialPlacementExpense(row) ? (
      <span
        className="inline-flex h-8 w-8 items-center justify-center text-gray-300"
        title="Parent birds bought at the start can't be deleted"
      >
        <LockIcon className="h-3.5 w-3.5" />
      </span>
    ) : deleteId === row.id ? (
      <div className="flex justify-end gap-1.5">
        <Button
          size="sm"
          variant="destructive"
          className="h-7 px-2 text-xs"
          disabled={deleteMutation.isPending}
          onClick={async () => {
            await deleteMutation.mutateAsync(row.id);
            setDeleteId(null);
          }}
        >
          {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setDeleteId(null)}>
          Cancel
        </Button>
      </div>
    ) : (
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
        aria-label="Delete expense"
        title="Delete"
        onClick={() => setDeleteId(row.id)}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );

  const columns: Column<HatcheryBatchExpense>[] = [
    {
      key: "date",
      label: "Date",
      render: (_, row) => <DateDisplay date={row.date} format="long" className="whitespace-nowrap text-sm" />,
    },
    {
      key: "category",
      label: "Item",
      render: (_, row) => {
        const detail = expenseDetailLine(row);
        return (
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-medium text-gray-900">{row.itemName || expenseTypeStyle(row.category).label}</span>
              <ExpenseTypeBadge category={row.category} />
            </div>
            {detail ? <p className="mt-0.5 text-xs text-gray-500">{detail}</p> : null}
          </div>
        );
      },
    },
    {
      key: "quantity",
      label: "Quantity",
      align: "right",
      render: (_, row) => <span className="whitespace-nowrap">{expenseQty(row)}</span>,
    },
    {
      key: "amount",
      label: "Amount",
      align: "right",
      render: (_, row) => <span className="whitespace-nowrap font-medium">{fmtNPR(row.amount)}</span>,
    },
    {
      key: "__actions",
      label: "",
      align: "right",
      render: (_, row) => renderDelete(row),
    },
  ];

  const totalLabel =
    categoryFilter === ALL_CATEGORIES
      ? `Total of all ${totalRows} expense${totalRows === 1 ? "" : "s"}`
      : `Total for ${expenseTypeStyle(categoryFilter).label} (${totalRows})`;

  const fieldClass = "h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm";

  return (
    <div className="space-y-4">
      {/* Where the money went: total plus one tile per type. Click a type to show only it. */}
      {byCategory.length > 0 ? (
        <section className="space-y-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <OverviewTile label="Total cost" value={fmtNPR(totalExpenses)} sub={`${allCount} expense${allCount === 1 ? "" : "s"}`} tone="text-red-600" />
            {byCategory.map((row) => {
              const selected = categoryFilter.toUpperCase() === row.category.toUpperCase();
              return (
                <button
                  key={row.category}
                  type="button"
                  onClick={() => setCategoryFilter(selected ? ALL_CATEGORIES : row.category)}
                  className={`rounded-lg border bg-white px-3 py-2.5 text-left transition-colors hover:bg-gray-50 ${selected ? "border-primary ring-1 ring-primary" : "border-gray-200"}`}
                  title={selected ? "Show all" : `Show only ${expenseTypeStyle(row.category).label}`}
                >
                  <p className="truncate text-xs font-medium text-gray-600">{expenseTypeStyle(row.category).label}</p>
                  <p className="mt-0.5 truncate text-lg font-bold text-gray-900 md:text-xl">{fmtNPR(row.amount)}</p>
                  <p className="truncate text-[11px] text-gray-500">
                    {row.count} entr{row.count === 1 ? "y" : "ies"}
                    {selected ? " · showing" : ""}
                  </p>
                </button>
              );
            })}
          </div>
          {feedBySex && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
              <span className="font-medium text-gray-600">Feed eaten</span>
              <FeedSexStat label="Female" bucket={feedBySex.female} tone="female" />
              <FeedSexStat label="Male" bucket={feedBySex.male} tone="male" />
              {(feedBySex.unallocated.amount > 0 ||
                formatFeedQuantities(feedBySex.unallocated.quantities)) && (
                <FeedSexStat label="Not split" bucket={feedBySex.unallocated} tone="neutral" />
              )}
            </div>
          )}
        </section>
      ) : null}

      {/* Add form */}
      <form
        className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleAdd();
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-gray-900">Add expense</h3>
          <div className="flex w-fit gap-1 rounded-lg border bg-gray-50 p-1">
            {(["INVENTORY", "MANUAL"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setExpenseType(t);
                  setFormError(null);
                }}
                className={`rounded px-3 py-1 text-sm font-medium ${
                  expenseType === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                {t === "INVENTORY" ? "From inventory" : "Manual"}
              </button>
            ))}
          </div>
        </div>

        {expenseType === "INVENTORY" ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[180px_180px_minmax(0,1fr)]">
              <div>
                <FieldLabel>Date</FieldLabel>
                <DateInput value={date} onChange={setDate} className="w-full" />
              </div>
              <label className="block">
                <FieldLabel>Type</FieldLabel>
                <select
                  className={fieldClass}
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
              </label>
              <div className="sm:col-span-2 lg:col-span-1">
                <FieldLabel>Item</FieldLabel>
                <SearchableSelect<HatcheryInventoryItem>
                  value={inventoryItemId}
                  options={filteredInventoryItems.map((item) => ({
                    value: item.id,
                    label: item.name,
                    subtitle: `${Number(item.currentStock).toLocaleString()} ${item.unit} in stock · ${formatRupeesExact(item.effectiveUnitCost ?? item.unitPrice)}/${item.unit}`,
                    data: item,
                  }))}
                  placeholder="Search item"
                  searchPlaceholder="Search by name..."
                  isLoading={inventoryLoading}
                  onSearch={setInventorySearch}
                  onValueChange={setInventoryItemId}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[180px_180px_minmax(0,1fr)_auto] lg:items-end">
              <label className="block">
                <FieldLabel>Quantity</FieldLabel>
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    placeholder="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className={`h-10 ${selectedItem ? "pr-14" : ""}`}
                  />
                  {selectedItem ? (
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                      {selectedItem.unit}
                    </span>
                  ) : null}
                </div>
              </label>
              {isFeedCategory ? (
                <label className="block">
                  <FieldLabel>Fed to</FieldLabel>
                  <select
                    className={fieldClass}
                    value={feedTarget}
                    onChange={(e) => {
                      setFeedTarget(e.target.value as HatcheryFeedTarget);
                      setMaleFeedQty("");
                      setFemaleFeedQty("");
                      setSplitOpen(false);
                    }}
                  >
                    <option value="BOTH">Both</option>
                    <option value="FEMALE">Female only</option>
                    <option value="MALE">Male only</option>
                  </select>
                </label>
              ) : (
                <div className="hidden lg:block" />
              )}
              <label className="block">
                <FieldLabel>Note (optional)</FieldLabel>
                <Input placeholder="e.g. Morning feed" value={note} onChange={(e) => setNote(e.target.value)} className="h-10" />
              </label>
              <Button type="submit" disabled={!canAdd} className="h-10">
                {addMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add
                  </>
                )}
              </Button>
            </div>

            {/* Optional split — many hatcheries feed both groups together and
                leave this off. Stock is deducted once on the total either way. */}
            {showFeedSplit ? (
              <div className="space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={splitOpen}
                    onChange={(e) => {
                      setSplitOpen(e.target.checked);
                      if (!e.target.checked) {
                        setMaleFeedQty("");
                        setFemaleFeedQty("");
                      }
                    }}
                  />
                  Split between female and male
                </label>
                {splitOpen ? (
                  <div className="grid max-w-md grid-cols-2 gap-3">
                    <label className="block">
                      <FieldLabel>Female{selectedItem ? ` (${selectedItem.unit})` : ""}</FieldLabel>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={femaleFeedQty}
                        onChange={(e) => setFemaleFeedQty(e.target.value)}
                        className="h-10"
                      />
                    </label>
                    <label className="block">
                      <FieldLabel>Male{selectedItem ? ` (${selectedItem.unit})` : ""}</FieldLabel>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={maleFeedQty}
                        onChange={(e) => setMaleFeedQty(e.target.value)}
                        className="h-10"
                      />
                    </label>
                  </div>
                ) : null}
              </div>
            ) : null}

            {selectedItem ? (
              <p className={`text-sm ${notEnoughStock ? "text-red-600" : "text-gray-600"}`}>
                {notEnoughStock
                  ? `Not enough stock: only ${Number(selectedItem.currentStock).toLocaleString()} ${selectedItem.unit} left.`
                  : `In stock ${Number(selectedItem.currentStock).toLocaleString()} ${selectedItem.unit} · ${formatRupeesExact(selectedItem.effectiveUnitCost ?? selectedItem.unitPrice)}/${selectedItem.unit}`}
                {computedAmount !== null ? (
                  <>
                    {" → this expense "}
                    <span className="font-semibold text-gray-900">{fmtNPR(computedAmount)}</span>
                  </>
                ) : null}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[180px_minmax(0,1fr)]">
              <div>
                <FieldLabel>Date</FieldLabel>
                <DateInput value={date} onChange={setDate} className="w-full" />
              </div>
              <label className="block">
                <FieldLabel>What was it for</FieldLabel>
                <Input placeholder="e.g. Electricity bill" value={itemName} onChange={(e) => setItemName(e.target.value)} className="h-10" />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-[110px_110px_140px_160px_minmax(0,1fr)_auto] lg:items-end">
              <label className="block">
                <FieldLabel>Qty (optional)</FieldLabel>
                <Input type="number" inputMode="decimal" placeholder="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-10" />
              </label>
              <label className="block">
                <FieldLabel>Unit</FieldLabel>
                <Input placeholder="e.g. kg" value={unit} onChange={(e) => setUnit(e.target.value)} className="h-10" />
              </label>
              <label className="block">
                <FieldLabel>Unit price (रू)</FieldLabel>
                <Input type="number" inputMode="decimal" placeholder="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="h-10" />
              </label>
              <label className="block">
                <FieldLabel>Amount (रू) *</FieldLabel>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setAmountTyped(e.target.value !== "");
                  }}
                  className="h-10"
                />
              </label>
              <label className="col-span-2 block sm:col-span-3 lg:col-span-1">
                <FieldLabel>Note (optional)</FieldLabel>
                <Input placeholder="e.g. Paid in cash" value={note} onChange={(e) => setNote(e.target.value)} className="h-10" />
              </label>
              <Button type="submit" disabled={!canAdd} className="col-span-2 h-10 sm:col-span-1">
                {addMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500">Amount fills itself from Qty × Unit price, or type the total yourself.</p>
          </>
        )}

        {formError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
        )}
      </form>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {byCategory.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
            <label className="text-xs font-medium text-gray-600" htmlFor="expense-type-filter">Show</label>
            <select
              id="expense-type-filter"
              className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value={ALL_CATEGORIES}>All types</option>
              {/* Built from the data, so custom categories appear on their own. */}
              {byCategory.map((row) => (
                <option key={row.category} value={row.category}>
                  {expenseTypeStyle(row.category).label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Computer / tablet: table */}
        <div className="hidden sm:block">
          <DataTable
            data={expenses}
            columns={columns}
            loading={isLoading}
            emptyMessage="No expenses recorded yet."
            getRowKey={(row) => row.id}
            showFooter={expenses.length > 0}
            footerContent={
              <div className="flex items-center justify-between px-2 text-sm">
                <span className="font-semibold text-gray-900">{totalLabel}</span>
                <span className="font-bold text-red-600">{fmtNPR(filteredExpenses)}</span>
              </div>
            }
          />
        </div>

        {/* Phone: one small card per expense */}
        <div className="sm:hidden">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : expenses.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">No expenses recorded yet.</p>
          ) : (
            <ul className="divide-y">
              {expenses.map((row) => {
                const detail = expenseDetailLine(row);
                return (
                  <li key={row.id} className="flex items-start gap-2 px-4 py-3">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-900">{row.itemName || expenseTypeStyle(row.category).label}</span>
                        <ExpenseTypeBadge category={row.category} />
                      </div>
                      <p className="text-xs text-gray-500">
                        <DateDisplay date={row.date} format="long" />
                        {row.quantity ? ` · ${expenseQty(row)}` : ""}
                      </p>
                      {detail ? <p className="text-xs text-gray-500">{detail}</p> : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-semibold">{fmtNPR(row.amount)}</span>
                      {renderDelete(row)}
                    </div>
                  </li>
                );
              })}
              <li className="flex items-center justify-between bg-gray-50 px-4 py-2.5 text-sm">
                <span className="font-semibold text-gray-900">{totalLabel}</span>
                <span className="font-bold text-red-600">{fmtNPR(filteredExpenses)}</span>
              </li>
            </ul>
          )}
        </div>

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

// Static class names so Tailwind keeps them: tiles = egg types + total + lay rate.
const EGG_TILE_COLS: Record<number, string> = {
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

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
  const enteredTotal = eggTypes.reduce((sum, t) => sum + (parseInt(counts[t.id] || "0", 10) || 0), 0);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function handleAdd() {
    if (addMutation.isPending) return;
    setFormError(null);
    const lines = eggTypes
      .filter((t) => counts[t.id] && parseInt(counts[t.id]) > 0)
      .map((t) => ({ eggTypeId: t.id, count: parseInt(counts[t.id]) }));

    if (lines.length === 0) {
      setFormError("Enter at least one egg count");
      return;
    }

    try {
      await addMutation.mutateAsync({ date, note: note || undefined, lines });
      setCounts({});
      setNote("");
    } catch (err: any) {
      const data = err?.response?.data;
      setFormError(data?.message ?? data?.error ?? "Could not save the eggs. Please try again.");
    }
  }

  // Lay rate now comes from the server, computed over true female-days.
  // The old client-side formula divided by ALL current birds and counted days
  // from batch start (including the rearing period before first lay), so it
  // was wrong on both the numerator's denominator and the day count.
  const layRate = productionRes?.summary.layRate ?? null;
  const layRateSub =
    layRate != null
      ? `${layRate.eggsPerFemaleDay.toFixed(2)} eggs per hen per day`
      : batch.type !== "PARENT_FLOCK"
        ? "Only for parent flocks"
        : grandTotal > 0 && (batch.initialFemaleParents ?? 0) === 0
          ? "No female birds recorded"
          : "Shows after the first eggs";
  const layRateTitle =
    layRate != null
      ? `${layRate.totalEggs.toLocaleString()} eggs ÷ ${layRate.femaleDays.toLocaleString()} hen-days`
      : undefined;

  const countOf = (prod: HatcheryEggProduction, typeId: string) =>
    prod.lines.filter((l) => l.eggTypeId === typeId).reduce((s, l) => s + l.count, 0);
  const totalOf = (prod: HatcheryEggProduction) => prod.lines.reduce((s, l) => s + l.count, 0);

  const renderDelete = (prod: HatcheryEggProduction) =>
    deleteId === prod.id ? (
      <div className="flex justify-end gap-1.5">
        <Button
          size="sm"
          variant="destructive"
          className="h-7 px-2 text-xs"
          disabled={deleteMutation.isPending}
          onClick={async () => {
            await deleteMutation.mutateAsync(prod.id);
            setDeleteId(null);
          }}
        >
          {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setDeleteId(null)}>
          Cancel
        </Button>
      </div>
    ) : (
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
        aria-label="Delete record"
        title="Delete"
        onClick={() => setDeleteId(prod.id)}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );

  const columns: Column<HatcheryEggProduction>[] = [
    {
      key: "date",
      label: "Date",
      render: (_, row) => <DateDisplay date={row.date} format="long" className="whitespace-nowrap text-sm" />,
    },
    ...eggTypes.map<Column<HatcheryEggProduction>>((type) => ({
      key: `type-${type.id}`,
      label: type.name,
      align: "right",
      render: (_, row) => countOf(row, type.id).toLocaleString(),
    })),
    {
      key: "total",
      label: "Total",
      align: "right",
      render: (_, row) => <span className="font-semibold">{totalOf(row).toLocaleString()}</span>,
    },
    { key: "note", label: "Note", render: (_, row) => <span className="text-sm text-gray-500">{row.note || "—"}</span> },
    { key: "__actions", label: "", align: "right", render: (_, row) => renderDelete(row) },
  ];

  const totalLabel = `Total of all ${totalRows} day${totalRows === 1 ? "" : "s"}`;
  const tileCols = EGG_TILE_COLS[Math.min(Math.max(eggTypes.length + 2, 2), 6)] ?? "lg:grid-cols-6";

  return (
    <div className="space-y-4">
      {/* Total, one tile per egg type (with its share), and lay rate. */}
      {eggTypes.length > 0 && (
        <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${tileCols}`}>
          <OverviewTile label="Total eggs" value={grandTotal.toLocaleString()} sub="All types" tone="text-amber-700" />
          {eggTypes.map((type) => {
            const value = typeTotals[type.id] ?? 0;
            return (
              <OverviewTile
                key={type.id}
                label={type.isHatchable ? `${type.name} ✓` : type.name}
                value={value.toLocaleString()}
                sub={grandTotal > 0 ? `${((value / grandTotal) * 100).toFixed(1)}% of all eggs` : type.isHatchable ? "Can be set" : "—"}
                tone={type.isHatchable ? "text-green-700" : ""}
              />
            );
          })}
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5" title={layRateTitle}>
            <p className="truncate text-xs font-medium text-gray-600">Lay rate</p>
            <p className="mt-0.5 truncate text-lg font-bold text-emerald-700 md:text-xl">
              {layRate != null ? `${layRate.layPercent.toFixed(1)}%` : "—"}
            </p>
            <p className="truncate text-[11px] text-gray-500">{layRateSub}</p>
          </div>
        </div>
      )}

      {/* Add form */}
      <form
        className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleAdd();
        }}
      >
        <h3 className="font-semibold text-gray-900">Record eggs collected</h3>
        {eggTypes.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            No egg types yet. Add them on the Egg types page first.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:flex lg:flex-wrap lg:items-end">
            <div className="col-span-2 sm:col-span-1 lg:w-44">
              <FieldLabel>Date</FieldLabel>
              <DateInput value={date} onChange={setDate} className="w-full" />
            </div>
            {eggTypes.map((type) => (
              <label key={type.id} className="block lg:w-32">
                <FieldLabel>
                  {type.name}
                  {type.isHatchable ? <CheckCircle className="ml-1 inline h-3 w-3 text-green-600" /> : null}
                </FieldLabel>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  placeholder="0"
                  value={counts[type.id] ?? ""}
                  onChange={(e) => setCounts((prev) => ({ ...prev, [type.id]: e.target.value }))}
                  className="h-10"
                />
              </label>
            ))}
            <div className="lg:w-24">
              <FieldLabel>Total</FieldLabel>
              <div className="flex h-10 items-center rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-900">
                {enteredTotal.toLocaleString()}
              </div>
            </div>
            <label className="col-span-2 block sm:col-span-3 lg:min-w-40 lg:flex-1">
              <FieldLabel>Note (optional)</FieldLabel>
              <Input placeholder="e.g. Afternoon collection" value={note} onChange={(e) => setNote(e.target.value)} className="h-10" />
            </label>
            <Button type="submit" disabled={addMutation.isPending || enteredTotal <= 0} className="col-span-2 h-10 sm:col-span-1">
              {addMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add
                </>
              )}
            </Button>
          </div>
        )}
        {formError && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
        )}
      </form>

      {/* Daily records */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="hidden sm:block">
          <DataTable
            data={productions}
            columns={columns}
            loading={isLoading}
            emptyMessage="No eggs recorded yet."
            getRowKey={(row) => row.id}
            showFooter={productions.length > 0}
            footerContent={
              <div className="flex items-center justify-between px-2 text-sm">
                <span className="font-semibold text-gray-900">{totalLabel}</span>
                <span className="font-bold text-amber-700">{grandTotal.toLocaleString()} eggs</span>
              </div>
            }
          />
        </div>

        {/* Phone: one small card per day */}
        <div className="sm:hidden">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : productions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">No eggs recorded yet.</p>
          ) : (
            <ul className="divide-y">
              {productions.map((prod) => (
                <li key={prod.id} className="flex items-start gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-medium text-gray-900"><DateDisplay date={prod.date} format="long" /></p>
                    <p className="text-xs text-gray-500">
                      {eggTypes.map((t) => `${t.name} ${countOf(prod, t.id).toLocaleString()}`).join(" · ")}
                    </p>
                    {prod.note ? <p className="text-xs text-gray-500">{prod.note}</p> : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold">{totalOf(prod).toLocaleString()} eggs</span>
                    {renderDelete(prod)}
                  </div>
                </li>
              ))}
              <li className="flex items-center justify-between bg-gray-50 px-4 py-2.5 text-sm">
                <span className="font-semibold text-gray-900">{totalLabel}</span>
                <span className="font-bold text-amber-700">{grandTotal.toLocaleString()} eggs</span>
              </li>
            </ul>
          )}
        </div>

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
  const eggStock: HatcheryEggStockRow[] = batch.summary?.eggStock ?? [];
  const total = eggStock.reduce((sum, row) => sum + row.currentStock, 0);
  const hatchable = eggStock
    .filter((row) => row.eggType?.isHatchable)
    .reduce((sum, row) => sum + row.currentStock, 0);
  const tileCols = EGG_TILE_COLS[Math.min(Math.max(eggStock.length + 1, 2), 6)] ?? "lg:grid-cols-6";

  if (eggStock.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
        No eggs in stock yet. Record eggs on the Egg production tab first.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${tileCols}`}>
        <OverviewTile label="Eggs in stock" value={total.toLocaleString()} sub="All types" tone="text-amber-700" />
        {eggStock.map((row) => (
          <OverviewTile
            key={row.id}
            label={row.eggType?.isHatchable ? `${row.eggType?.name} ✓` : row.eggType?.name ?? "Eggs"}
            value={row.currentStock.toLocaleString()}
            sub={row.eggType?.isHatchable ? "Ready to set" : "For sale"}
            tone={row.currentStock === 0 ? "text-gray-400" : row.eggType?.isHatchable ? "text-green-700" : ""}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
        <p>Eggs collected, minus eggs set in incubators and eggs sold.</p>
        {hatchable > 0 && batch.status === "ACTIVE" ? (
          <a href="/hatchery/dashboard/incubations?new=1" className="font-medium text-primary hover:underline">
            Start an incubation →
          </a>
        ) : null}
      </div>
    </div>
  );
}

// ─── Sales Tab ────────────────────────────────────────────────────────────────

function SalesTab({
  batchId,
  currentMale,
  currentFemale,
  eggStock,
}: {
  batchId: string;
  currentMale: number;
  currentFemale: number;
  eggStock: HatcheryEggStockRow[];
}) {
  const { data: eggTypes = [] } = useHatcheryEggTypes();
  const [view, setView] = useState<"EGG" | "PARENT">("EGG");
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
  const [billSale, setBillSale] = useState<{ type: HatcherySaleType; id: string } | null>(null);
  const [savedSale, setSavedSale] = useState<{ type: HatcherySaleType; id: string } | null>(null);

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

  // Egg sale preview: stock of the chosen type in this batch, and count × price.
  const eggStockOfType = eggTypeId ? eggStock.find((row) => row.eggTypeId === eggTypeId)?.currentStock ?? 0 : null;
  const eggCountNum = parseInt(eggCount || "0", 10) || 0;
  const eggTooMany = eggStockOfType !== null && eggCountNum > eggStockOfType;
  const eggAmount =
    eggCount && eggUnitPrice ? Math.round(eggCountNum * Number(eggUnitPrice) * 100) / 100 : null;

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

  const errorText = (err: any, fallback: string) => {
    const data = err?.response?.data;
    return data?.message ?? data?.error ?? fallback;
  };

  const canSellEggs = !addEggSaleMutation.isPending && Boolean(eggTypeId && eggCount && eggUnitPrice);
  const canSellParents =
    !addParentSaleMutation.isPending && parentCount > 0 && Boolean(parentTotalWeight && parentRatePerKg);

  async function handleAddEggSale() {
    if (!canSellEggs) return;
    setEggFormError(null);
    try {
      const sale = await addEggSaleMutation.mutateAsync({
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
      if (sale?.id) setSavedSale({ type: "egg_sale", id: sale.id });
    } catch (err: any) {
      setEggFormError(errorText(err, "Could not save the sale. Please try again."));
    }
  }

  async function handleAddParentSale() {
    if (!canSellParents) return;
    setParentFormError(null);
    if (parentCount <= 0) {
      setParentFormError("Enter at least one female or male bird");
      return;
    }
    // Server enforces this too, at the database; this is just a faster message.
    if (parentMale > currentMale || parentFemale > currentFemale) {
      setParentFormError(
        `Only ${currentFemale.toLocaleString()} female and ${currentMale.toLocaleString()} male birds are alive`
      );
      return;
    }
    try {
      const sale = await addParentSaleMutation.mutateAsync({
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
      if (sale?.id) setSavedSale({ type: "parent_sale", id: sale.id });
    } catch (err: any) {
      setParentFormError(errorText(err, "Could not save the sale. Please try again."));
    }
  }

  // The sale list may not include the party, so fall back to the loaded party list.
  const partyName = (r: { party?: { name: string } | null; partyId: string | null }) =>
    r.party?.name ??
    (r.partyId ? parties.find((p) => p.id === r.partyId)?.name ?? "Party" : "Cash sale");

  const deleteControl = (
    id: string,
    pendingId: string | null,
    setPending: (id: string | null) => void,
    onDelete: () => Promise<unknown>,
    busy: boolean
  ) =>
    pendingId === id ? (
      <div className="flex justify-end gap-1.5">
        <Button
          size="sm"
          variant="destructive"
          className="h-7 px-2 text-xs"
          disabled={busy}
          onClick={async () => {
            await onDelete();
            setPending(null);
          }}
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPending(null)}>
          Cancel
        </Button>
      </div>
    ) : (
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
        aria-label="Delete sale"
        title="Delete"
        onClick={() => setPending(id)}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );

  const billButton = (type: HatcherySaleType, id: string) => (
    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setBillSale({ type, id })}>
      <FileText className="mr-1 h-3.5 w-3.5" /> Bill
    </Button>
  );

  const eggDelete = (r: HatcheryEggSale) =>
    deleteControl(r.id, deleteEggSaleId, setDeleteEggSaleId, () => deleteEggSaleMutation.mutateAsync(r.id), deleteEggSaleMutation.isPending);
  const parentDelete = (r: HatcheryParentSale) =>
    deleteControl(r.id, deleteParentSaleId, setDeleteParentSaleId, () => deleteParentSaleMutation.mutateAsync(r.id), deleteParentSaleMutation.isPending);

  const eggSaleColumns: Column<HatcheryEggSale>[] = [
    { key: "date", label: "Date", render: (_, r) => <DateDisplay date={r.date} format="long" className="whitespace-nowrap text-sm" /> },
    {
      key: "eggType",
      label: "Egg type",
      render: (_, r) => (
        <div className="min-w-0">
          <span className="text-sm font-medium text-gray-900">{r.eggType.name}</span>
          {r.note ? <p className="text-xs text-gray-500">{r.note}</p> : null}
        </div>
      ),
    },
    { key: "count", label: "Eggs", align: "right", render: (_, r) => r.count.toLocaleString() },
    { key: "unitPrice", label: "Price / egg", align: "right", render: (_, r) => formatRupeesExact(r.unitPrice) },
    { key: "amount", label: "Amount", align: "right", render: (_, r) => <span className="whitespace-nowrap font-medium">{fmtNPR(r.amount)}</span> },
    { key: "partyId", label: "Sold to", render: (_, r) => <span className="text-sm text-gray-600">{partyName(r)}</span> },
    {
      key: "__actions",
      label: "",
      align: "right",
      render: (_, r) => (
        <div className="flex items-center justify-end gap-1">
          {billButton("egg_sale", r.id)}
          {eggDelete(r)}
        </div>
      ),
    },
  ];

  const parentSaleColumns: Column<HatcheryParentSale>[] = [
    { key: "date", label: "Date", render: (_, r) => <DateDisplay date={r.date} format="long" className="whitespace-nowrap text-sm" /> },
    {
      key: "count",
      label: "Birds",
      align: "right",
      render: (_, r) => (
        <div className="leading-tight">
          <span className="font-medium">{r.count.toLocaleString()}</span>
          <p className="text-[11px] text-gray-500">
            female {r.femaleCount} · male {r.maleCount}
          </p>
        </div>
      ),
    },
    {
      key: "totalWeightKg",
      label: "Weight",
      align: "right",
      render: (_, r) => (
        <div className="leading-tight">
          <span>{Number(r.totalWeightKg).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg</span>
          <p className="text-[11px] text-gray-500">avg {Number(r.avgWeightKg).toFixed(2)} kg</p>
        </div>
      ),
    },
    { key: "ratePerKg", label: "Rate / kg", align: "right", render: (_, r) => formatRupeesExact(r.ratePerKg) },
    { key: "amount", label: "Amount", align: "right", render: (_, r) => <span className="whitespace-nowrap font-medium">{fmtNPR(r.amount)}</span> },
    {
      key: "partyId",
      label: "Sold to",
      render: (_, r) => (
        <div className="min-w-0">
          <span className="text-sm text-gray-600">{partyName(r)}</span>
          {r.note ? <p className="text-xs text-gray-500">{r.note}</p> : null}
        </div>
      ),
    },
    {
      key: "__actions",
      label: "",
      align: "right",
      render: (_, r) => (
        <div className="flex items-center justify-end gap-1">
          {billButton("parent_sale", r.id)}
          {parentDelete(r)}
        </div>
      ),
    },
  ];

  const submitButton = (pending: boolean, disabled: boolean) => (
    <Button type="submit" disabled={disabled} className="h-10 w-full lg:w-auto">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          Sell
        </>
      )}
    </Button>
  );

  const partySelect = (value: string, onChange: (v: string) => void) => (
    <select className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Cash sale (no party)</option>
      {parties.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.phone})
        </option>
      ))}
    </select>
  );

  return (
    <div className="space-y-4">
      <HatcherySaleBill
        saleType={billSale?.type ?? null}
        saleId={billSale?.id ?? null}
        onClose={() => setBillSale(null)}
      />
      <SaleSavedPrompt
        savedSale={savedSale}
        onDismiss={() => setSavedSale(null)}
        onShare={(s) => setBillSale(s)}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <OverviewTile label="Total sales" value={fmtNPR(totalEggRevenue + totalParentRevenue)} sub="Eggs + parent birds" tone="text-green-700" />
        <OverviewTile label="Egg sales" value={fmtNPR(totalEggRevenue)} sub={`${eggTotalRows} sale${eggTotalRows === 1 ? "" : "s"}`} />
        <OverviewTile label="Parent bird sales" value={fmtNPR(totalParentRevenue)} sub={`${parentTotalRows} sale${parentTotalRows === 1 ? "" : "s"}`} />
        <OverviewTile
          label="Birds alive"
          value={`${currentFemale.toLocaleString()} / ${currentMale.toLocaleString()}`}
          sub="Female / male"
        />
      </div>

      {/* One kind of sale at a time, so the page stays short. */}
      <div className="flex w-fit gap-1 rounded-lg border bg-gray-50 p-1">
        {([
          { key: "EGG", label: `Egg sales (${eggTotalRows})` },
          { key: "PARENT", label: `Parent bird sales (${parentTotalRows})` },
        ] as const).map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => setView(option.key)}
            className={`rounded px-3 py-1.5 text-sm font-medium ${view === option.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {view === "EGG" ? (
        <>
          <form
            className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleAddEggSale();
            }}
          >
            <h3 className="font-semibold text-gray-900">Sell eggs</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-[170px_minmax(0,1fr)_120px_130px_minmax(0,1.2fr)]">
              <div className="col-span-2 sm:col-span-1">
                <FieldLabel>Date</FieldLabel>
                <DateInput value={eggDate} onChange={setEggDate} className="w-full" />
              </div>
              <label className="col-span-2 block sm:col-span-1">
                <FieldLabel>Egg type</FieldLabel>
                <select
                  className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                  value={eggTypeId}
                  onChange={(e) => setEggTypeId(e.target.value)}
                >
                  <option value="">Choose egg type</option>
                  {eggTypes.map((t) => {
                    const stock = eggStock.find((row) => row.eggTypeId === t.id)?.currentStock ?? 0;
                    return (
                      <option key={t.id} value={t.id}>
                        {t.name} ({stock.toLocaleString()} in stock)
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="block">
                <FieldLabel>Eggs</FieldLabel>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  placeholder="0"
                  value={eggCount}
                  onChange={(e) => setEggCount(e.target.value)}
                  className={`h-10 ${eggTooMany ? "border-red-400" : ""}`}
                />
              </label>
              <label className="block">
                <FieldLabel>Price per egg (रू)</FieldLabel>
                <Input type="number" inputMode="decimal" min="0" placeholder="0" value={eggUnitPrice} onChange={(e) => setEggUnitPrice(e.target.value)} className="h-10" />
              </label>
              <label className="col-span-2 block sm:col-span-1">
                <FieldLabel>Sold to</FieldLabel>
                {partySelect(eggPartyId, setEggPartyId)}
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <label className="block">
                <FieldLabel>Note (optional)</FieldLabel>
                <Input placeholder="e.g. Delivered to shop" value={eggNote} onChange={(e) => setEggNote(e.target.value)} className="h-10" />
              </label>
              {submitButton(addEggSaleMutation.isPending, !canSellEggs)}
            </div>
            {eggStockOfType !== null || eggAmount !== null ? (
              <p className={`text-sm ${eggTooMany ? "text-red-600" : "text-gray-600"}`}>
                {eggStockOfType !== null
                  ? eggTooMany
                    ? `Not enough eggs: only ${eggStockOfType.toLocaleString()} in stock.`
                    : `${eggStockOfType.toLocaleString()} in stock`
                  : null}
                {eggAmount !== null ? (
                  <>
                    {eggStockOfType !== null ? " · " : ""}Total <span className="font-semibold text-gray-900">{fmtNPR(eggAmount)}</span>
                  </>
                ) : null}
              </p>
            ) : null}
            {eggFormError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{eggFormError}</p>
            )}
          </form>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="hidden sm:block">
              <DataTable
                data={eggSales}
                columns={eggSaleColumns}
                loading={eggSalesLoading}
                emptyMessage="No egg sales yet."
                getRowKey={(r) => r.id}
                showFooter={eggSales.length > 0}
                footerContent={
                  <div className="flex items-center justify-between px-2 text-sm">
                    <span className="font-semibold text-gray-900">Total of all {eggTotalRows} egg sales</span>
                    <span className="font-bold text-green-700">{fmtNPR(totalEggRevenue)}</span>
                  </div>
                }
              />
            </div>
            <div className="sm:hidden">
              {eggSalesLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
              ) : eggSales.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-500">No egg sales yet.</p>
              ) : (
                <ul className="divide-y">
                  {eggSales.map((r) => (
                    <li key={r.id} className="flex items-start gap-2 px-4 py-3">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-medium text-gray-900">{r.count.toLocaleString()} {r.eggType.name}</p>
                        <p className="text-xs text-gray-500">
                          <DateDisplay date={r.date} format="long" /> · {formatRupeesExact(r.unitPrice)} each · {partyName(r)}
                        </p>
                        {r.note ? <p className="text-xs text-gray-500">{r.note}</p> : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-semibold">{fmtNPR(r.amount)}</span>
                        <div className="flex items-center gap-1">
                          {billButton("egg_sale", r.id)}
                          {eggDelete(r)}
                        </div>
                      </div>
                    </li>
                  ))}
                  <li className="flex items-center justify-between bg-gray-50 px-4 py-2.5 text-sm">
                    <span className="font-semibold text-gray-900">Total of all {eggTotalRows} egg sales</span>
                    <span className="font-bold text-green-700">{fmtNPR(totalEggRevenue)}</span>
                  </li>
                </ul>
              )}
            </div>
            <LedgerPagination
              page={eggCurrentPage}
              totalPages={eggTotalPages}
              totalRows={eggTotalRows}
              pageLimit={eggPageLimit}
              onPageChange={setEggPage}
              loading={eggSalesLoading}
            />
          </div>
        </>
      ) : (
        <>
          <form
            className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleAddParentSale();
            }}
          >
            <h3 className="font-semibold text-gray-900">Sell parent birds</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-[170px_120px_120px_90px_150px_140px]">
              <div className="col-span-2 sm:col-span-4 lg:col-span-1">
                <FieldLabel>Date</FieldLabel>
                <DateInput value={parentDate} onChange={setParentDate} className="w-full" />
              </div>
              <label className="block">
                <FieldLabel>Female</FieldLabel>
                <Input type="number" inputMode="numeric" min="0" max={currentFemale} placeholder="0" value={parentFemaleCount} onChange={(e) => setParentFemaleCount(e.target.value)} className="h-10" />
                <span className="mt-1 block text-[11px] text-gray-500">{currentFemale.toLocaleString()} alive</span>
              </label>
              <label className="block">
                <FieldLabel>Male</FieldLabel>
                <Input type="number" inputMode="numeric" min="0" max={currentMale} placeholder="0" value={parentMaleCount} onChange={(e) => setParentMaleCount(e.target.value)} className="h-10" />
                <span className="mt-1 block text-[11px] text-gray-500">{currentMale.toLocaleString()} alive</span>
              </label>
              <div>
                <FieldLabel>Total birds</FieldLabel>
                <div className="flex h-10 items-center rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-900">
                  {parentCount.toLocaleString()}
                </div>
              </div>
              <label className="block">
                <FieldLabel>Total weight (kg)</FieldLabel>
                <Input type="number" inputMode="decimal" min="0" step="0.001" placeholder="0" value={parentTotalWeight} onChange={(e) => setParentTotalWeight(e.target.value)} className="h-10" />
              </label>
              <label className="block">
                <FieldLabel>Rate per kg (रू)</FieldLabel>
                <Input type="number" inputMode="decimal" min="0" step="0.01" placeholder="0" value={parentRatePerKg} onChange={(e) => setParentRatePerKg(e.target.value)} className="h-10" />
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
              <label className="block">
                <FieldLabel>Sold to</FieldLabel>
                {partySelect(parentPartyId, setParentPartyId)}
              </label>
              <label className="block">
                <FieldLabel>Note (optional)</FieldLabel>
                <Input placeholder="e.g. Spent hens" value={parentNote} onChange={(e) => setParentNote(e.target.value)} className="h-10" />
              </label>
              {submitButton(addParentSaleMutation.isPending, !canSellParents)}
            </div>
            {(parentAmount !== null || parentAvgWeight !== null) && (
              <p className="text-sm text-gray-600">
                {parentAvgWeight !== null && <>Average {parentAvgWeight} kg per bird</>}
                {parentAvgWeight !== null && parentAmount !== null ? " · " : ""}
                {parentAmount !== null && <>Total <span className="font-semibold text-gray-900">{formatRupeesExact(parentAmount)}</span></>}
              </p>
            )}
            {parentFormError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{parentFormError}</p>
            )}
          </form>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <div className="hidden sm:block">
              <DataTable
                data={parentSales}
                columns={parentSaleColumns}
                loading={parentSalesLoading}
                emptyMessage="No parent bird sales yet."
                getRowKey={(r) => r.id}
                showFooter={parentSales.length > 0}
                footerContent={
                  <div className="flex items-center justify-between px-2 text-sm">
                    <span className="font-semibold text-gray-900">Total of all {parentTotalRows} parent bird sales</span>
                    <span className="font-bold text-green-700">{fmtNPR(totalParentRevenue)}</span>
                  </div>
                }
              />
            </div>
            <div className="sm:hidden">
              {parentSalesLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
              ) : parentSales.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-500">No parent bird sales yet.</p>
              ) : (
                <ul className="divide-y">
                  {parentSales.map((r) => (
                    <li key={r.id} className="flex items-start gap-2 px-4 py-3">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-medium text-gray-900">
                          {r.count.toLocaleString()} birds · {Number(r.totalWeightKg).toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
                        </p>
                        <p className="text-xs text-gray-500">
                          <DateDisplay date={r.date} format="long" /> · {formatRupeesExact(r.ratePerKg)}/kg · {partyName(r)}
                        </p>
                        {r.note ? <p className="text-xs text-gray-500">{r.note}</p> : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-semibold">{fmtNPR(r.amount)}</span>
                        <div className="flex items-center gap-1">
                          {billButton("parent_sale", r.id)}
                          {parentDelete(r)}
                        </div>
                      </div>
                    </li>
                  ))}
                  <li className="flex items-center justify-between bg-gray-50 px-4 py-2.5 text-sm">
                    <span className="font-semibold text-gray-900">Total of all {parentTotalRows} parent bird sales</span>
                    <span className="font-bold text-green-700">{fmtNPR(totalParentRevenue)}</span>
                  </li>
                </ul>
              )}
            </div>
            <LedgerPagination
              page={parentCurrentPage}
              totalPages={parentTotalPages}
              totalRows={parentTotalRows}
              pageLimit={parentPageLimit}
              onPageChange={setParentPage}
              loading={parentSalesLoading}
            />
          </div>
        </>
      )}
    </div>
  );
}
