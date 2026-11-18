"use client";

import { HatcheryNotesTab } from "@/components/hatchery/HatcheryNotesTab";
import { RemindMeButton } from "@/components/reminders/RemindMeButton";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatBSLong, getNepalTodayAd, toNepalDayAd } from "@/common/lib/nepali-date";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Plus,
  FlaskConical,
  CheckCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DateInput } from "@/common/components/ui/date-input";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { apiErrorText, formatRupeesExact } from "@/common/lib/utils";
import {
  useIncubationBatch,
  useIncubationLosses,
  useRecordCandling,
  useTransferToHatcher,
  useHatchResults,
  useAddHatchResult,
  useDeleteHatchResult,
  useChickSales,
  useAddChickSale,
  useDeleteChickSale,
  type IncubationLoss,
  type HatchResult,
  type ChickSale,
  type ChickGrade,
} from "@/fetchers/hatchery/hatcheryIncubationQueries";
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
import { toast } from "sonner";
import { useHatcheryParties } from "@/fetchers/hatchery/hatcheryPartyQueries";
import { HatcherySaleBill } from "../../sales/_components/HatcherySaleBill";
import { SaleSavedPrompt } from "../../sales/_components/SaleSavedPrompt";
import type { HatcherySaleType } from "@/fetchers/hatchery/hatcherySaleQueries";

type Tab = "overview" | "candling" | "transfer" | "hatch-results" | "chick-stock" | "chick-sales" | "notes";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "candling", label: "Candling" },
  { id: "transfer", label: "Move to hatcher" },
  { id: "hatch-results", label: "Hatch result" },
  { id: "chick-stock", label: "Chick stock" },
  { id: "chick-sales", label: "Chick sales" },
  { id: "notes", label: "Notes" },
];

const STAGE_COLORS: Record<string, string> = {
  SETTER: "bg-blue-100 text-blue-800",
  CANDLING: "bg-yellow-100 text-yellow-800",
  HATCHER: "bg-orange-100 text-orange-800",
  COMPLETED: "bg-green-100 text-green-800",
};

/** Plain words for the stage pill. */
const STAGE_LABEL: Record<string, string> = {
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

/** Day number of the incubation today (start day = day 1), by Nepal day. */
function incubationDay(startDate: string) {
  const start = Date.parse(toNepalDayAd(startDate));
  const today = Date.parse(getNepalTodayAd());
  return Math.round((today - start) / DAY_MS) + 1;
}

/** Nepal date of a given incubation day, e.g. day 9 -> "Kartik 2, 2083". */
function dateOfDay(startDate: string, day: number) {
  const start = Date.parse(toNepalDayAd(startDate));
  return formatBSLong(new Date(start + (day - 1) * DAY_MS).toISOString().slice(0, 10));
}

export default function IncubationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const { data: batch, isLoading } = useIncubationBatch(id);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!batch) {
    return <div className="p-8 text-center text-muted-foreground">Incubation batch not found</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header (buttons drop to their own line on a phone) */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <FlaskConical className="h-6 w-6 text-primary" />
        <div className="min-w-0 flex-1 basis-56">
          <h1 className="text-2xl font-bold">
            {batch.code}
            {batch.name ? <span className="ml-2 text-base font-normal text-muted-foreground">{batch.name}</span> : null}
          </h1>
          <p className="text-sm text-muted-foreground">
            Started {formatBSLong(toNepalDayAd(batch.startDate))}
            {batch.stage !== "COMPLETED"
              ? incubationDay(batch.startDate) > HATCH_DAY
                ? ` · Day ${incubationDay(batch.startDate)} · hatch was due on day ${HATCH_DAY}`
                : ` · Day ${incubationDay(batch.startDate)} of ${HATCH_DAY}`
              : ""}
          </p>
        </div>
        <RemindMeButton module="hatchery" link={{ incubationId: batch.id }} className="ml-auto h-9" />
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STAGE_COLORS[batch.stage]}`}>
          {STAGE_LABEL[batch.stage] ?? batch.stage}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && <OverviewTab batch={batch} />}
        {activeTab === "candling" && <CandlingTab batch={batch} batchId={id} />}
        {activeTab === "transfer" && <TransferTab batch={batch} batchId={id} />}
        {activeTab === "hatch-results" && <HatchResultsTab batch={batch} batchId={id} />}
        {activeTab === "chick-stock" && <ChickStockTab batch={batch} onSell={() => setActiveTab("chick-sales")} />}
        {activeTab === "chick-sales" && <ChickSalesTab batchId={id} batch={batch} />}
        {activeTab === "notes" && <HatcheryNotesTab kind="incubation" id={id} />}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ batch }: { batch: any }) {
  const s = batch.summary;
  const hatched = batch.stage === "COMPLETED" || Number(s.totalHatched) > 0;
  const n = (v: number | string) => Number(v ?? 0).toLocaleString();
  const pctOf = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "—");
  const today = incubationDay(batch.startDate);

  // The 4 steps of an incubation, with done / due / late.
  const steps = [
    { label: "Eggs set", day: 1, doneAt: batch.startDate as string | null },
    { label: "Candling", day: CANDLE_DAY, doneAt: batch.candledAt as string | null },
    { label: "Move to hatcher", day: TRANSFER_DAY, doneAt: batch.transferredAt as string | null },
    { label: "Hatch", day: HATCH_DAY, doneAt: batch.hatchedAt as string | null },
  ];

  return (
    <div className="space-y-4">
      {/* Progress */}
      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Progress</h3>
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {steps.map((step) => {
            const done = Boolean(step.doneAt);
            const late = !done && today > step.day;
            const dueToday = !done && today === step.day;
            const tone = done
              ? "border-green-200 bg-green-50"
              : late
                ? "border-red-200 bg-red-50"
                : dueToday
                  ? "border-amber-200 bg-amber-50"
                  : "border-gray-200 bg-white";
            return (
              <li key={step.label} className={`rounded-lg border px-3 py-2.5 ${tone}`}>
                <p className="flex items-center gap-1 text-xs font-medium text-gray-700">
                  {done ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> : null}
                  {step.label}
                  <span className="font-normal text-gray-400">· day {step.day}</span>
                </p>
                <p className={`mt-0.5 text-sm font-semibold ${done ? "text-green-800" : late ? "text-red-700" : "text-gray-900"}`}>
                  {done ? "Done" : late ? `${today - step.day} day${today - step.day === 1 ? "" : "s"} late` : dueToday ? "Due today" : `In ${step.day - today} day${step.day - today === 1 ? "" : "s"}`}
                </p>
                <p className="text-[11px] text-gray-500">
                  {done ? formatBSLong(toNepalDayAd(step.doneAt as string)) : `Due ${dateOfDay(batch.startDate, step.day)}`}
                </p>
              </li>
            );
          })}
        </ol>
      </section>

      <OverviewGroup title="Eggs" cols="grid-cols-2 sm:grid-cols-3">
        <OverviewTile label="Eggs set" value={n(s.eggsSet)} sub="Put in the setter" />
        <OverviewTile
          label="Removed at candling"
          value={n(s.candlingLoss)}
          sub={batch.candledAt ? `${pctOf(Number(s.candlingLoss), Number(s.eggsSet))} · infertile + early dead` : "Not candled yet"}
          tone={Number(s.candlingLoss) > 0 ? "text-red-600" : ""}
        />
        <OverviewTile label="Fertile eggs" value={n(s.fertileEggs)} sub={pctOf(Number(s.fertileEggs), Number(s.eggsSet)) + " of eggs set"} />
      </OverviewGroup>

      {hatched ? (
        <OverviewGroup title="Hatch" cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <OverviewTile label="Chicks hatched" value={n(s.totalHatched)} sub="A + B + cull" />
          <OverviewTile label="Grade A" value={n(s.totalHatchedA)} sub={pctOf(Number(s.totalHatchedA), Number(s.totalHatched)) + " of chicks"} tone="text-green-700" />
          <OverviewTile label="Grade B" value={n(s.totalHatchedB)} sub={pctOf(Number(s.totalHatchedB), Number(s.totalHatched)) + " of chicks"} tone="text-amber-700" />
          <OverviewTile label="Cull" value={n(s.totalCull)} sub={pctOf(Number(s.totalCull), Number(s.totalHatched)) + " of chicks"} tone="text-red-600" />
          <OverviewTile label="Hatch % (fertile eggs)" value={`${Number(s.hatchability).toFixed(1)}%`} sub="Chicks ÷ fertile eggs" tone="text-green-700" />
          <OverviewTile label="Hatch % (all eggs set)" value={`${Number(s.hatchOfTotal).toFixed(1)}%`} sub="Chicks ÷ eggs set" />
        </OverviewGroup>
      ) : (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Hatch</h3>
          <p className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-3 text-sm text-gray-500">
            Hatch numbers show here after you save the hatch result (day {HATCH_DAY}, {dateOfDay(batch.startDate, HATCH_DAY)}).
          </p>
        </section>
      )}

      {hatched ? (
        <OverviewGroup title="Sales" cols="grid-cols-2 sm:grid-cols-3">
          <OverviewTile label="Chicks sold" value={n(s.totalSalesCount)} sub={pctOf(Number(s.totalSalesCount), Number(s.totalHatched)) + " of chicks hatched"} />
          <OverviewTile label="Sales" value={formatRupeesExact(s.totalSalesRevenue)} sub="Chick sales" tone="text-green-700" />
          <OverviewTile
            label="Average price"
            value={Number(s.totalSalesCount) > 0 ? formatRupeesExact(Number(s.totalSalesRevenue) / Number(s.totalSalesCount)) : "—"}
            sub="Per chick sold"
          />
        </OverviewGroup>
      ) : null}

      <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
        <span>
          <span className="text-gray-500">Parent batch: </span>
          {batch.parentBatch ? (
            <a href={`/hatchery/dashboard/batches/${batch.parentBatch.id}`} className="font-medium text-primary hover:underline">
              {batch.parentBatch.code}
              {batch.parentBatch.name ? ` · ${batch.parentBatch.name}` : ""}
            </a>
          ) : (
            <span className="font-medium">{batch.parentBatchId}</span>
          )}
        </span>
        <span>
          <span className="text-gray-500">Started: </span>
          <span className="font-medium">{formatBSLong(toNepalDayAd(batch.startDate))}</span>
        </span>
        {batch.notes ? (
          <span>
            <span className="text-gray-500">Note: </span>
            {batch.notes}
          </span>
        ) : null}
      </div>

      {/* Eggs taken from the parent batch's stock */}
      {batch.eggMoves?.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Eggs taken from stock</h3>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <DataTable
              data={batch.eggMoves}
              getRowKey={(row: any) => row.id}
              columns={[
                { key: "date", label: "Date", render: (_, m: any) => <DateDisplay date={m.date} format="long" /> },
                { key: "eggType", label: "Egg type", render: (_, m: any) => m.eggType?.name ?? m.eggTypeId },
                { key: "count", label: "Eggs", align: "right", render: (_, m: any) => <span className="font-semibold">{Number(m.count).toLocaleString()}</span> },
              ]}
            />
          </div>
        </section>
      )}
    </div>
  );
}

/** Small heading plus a row of tiles. */
function OverviewGroup({ title, cols, children }: { title: string; cols: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <div className={`grid gap-3 ${cols}`}>{children}</div>
    </section>
  );
}

/** Small tile, same size as Home and batch detail tiles. */
function OverviewTile({ label, value, sub, tone = "" }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5">
      <p className="truncate text-xs font-medium text-gray-600">{label}</p>
      <p className={`mt-0.5 truncate text-lg font-bold md:text-xl ${tone || "text-gray-900"}`}>{value}</p>
      {sub ? <p className="truncate text-[11px] text-gray-500" title={sub}>{sub}</p> : null}
    </div>
  );
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <span className="mb-1 block text-xs font-medium text-gray-600">
      {children}
      {hint ? <span className="ml-1 font-normal text-gray-400">· {hint}</span> : null}
    </span>
  );
}

/** One-line status box: green when done, grey when waiting/locked. */
function StatusBox({ tone, title, children }: { tone: "done" | "wait"; title: string; children?: React.ReactNode }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
        tone === "done" ? "border-green-200 bg-green-50 text-green-900" : "border-gray-200 bg-gray-50 text-gray-700"
      }`}
    >
      <CheckCircle className={`mt-0.5 h-4 w-4 shrink-0 ${tone === "done" ? "text-green-600" : "text-gray-400"}`} />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">{title}</p>
        {children ? <div className="text-gray-600">{children}</div> : null}
      </div>
    </div>
  );
}

/** "Candling is due on day 9 (Kartik 2, 2083) · today is day 7". */
function WhereWeAre({ batch, label, day }: { batch: any; label: string; day: number }) {
  if (batch.stage === "COMPLETED") return null;
  const today = incubationDay(batch.startDate);
  return (
    <p className="text-sm text-gray-500">
      {label} is due on day {day} ({dateOfDay(batch.startDate, day)}) · today is day {today}
      {today > day ? <span className="font-medium text-red-600"> · {today - day} day{today - day === 1 ? "" : "s"} late</span> : null}
    </p>
  );
}

function SaveButton({ pending, disabled, children }: { pending: boolean; disabled: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" disabled={disabled} className="h-10 w-full sm:w-auto">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        children
      )}
    </Button>
  );
}

const LOSS_LABEL: Record<string, { label: string; className: string }> = {
  INFERTILE: { label: "Infertile", className: "border-gray-200 bg-gray-50 text-gray-700" },
  EARLY_DEAD: { label: "Early dead", className: "border-red-200 bg-red-50 text-red-700" },
  LATE_DEAD: { label: "Late dead", className: "border-orange-200 bg-orange-50 text-orange-700" },
  UNHATCHED: { label: "Unhatched", className: "border-gray-200 bg-gray-50 text-gray-700" },
};

// ─── Candling Tab ─────────────────────────────────────────────────────────────

function CandlingTab({ batch, batchId }: { batch: any; batchId: string }) {
  const { data: losses, isLoading } = useIncubationLosses(batchId);
  const candlingMutation = useRecordCandling(batchId);

  const [date, setDate] = useState(getNepalTodayAd());
  const [infertile, setInfertile] = useState("");
  const [earlyDead, setEarlyDead] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const s = batch.summary;
  const eggsSet = Number(s.eggsSet ?? batch.eggsSetCount ?? 0);
  const removedSoFar = Number(s.candlingLoss ?? 0);
  const enteredNow = (Number(infertile) || 0) + (Number(earlyDead) || 0);
  const pct = (n: number) => (eggsSet > 0 ? `${((n / eggsSet) * 100).toFixed(1)}%` : "—");

  async function handleSubmit() {
    if (candlingMutation.isPending) return;
    setErr(null);
    if (!infertile && !earlyDead) return setErr("Enter infertile or early dead eggs");
    try {
      await candlingMutation.mutateAsync({
        date,
        infertile: infertile ? Number(infertile) : 0,
        earlyDead: earlyDead ? Number(earlyDead) : 0,
        note: note || undefined,
      });
      setInfertile("");
      setEarlyDead("");
      setNote("");
    } catch (e: any) {
      setErr(apiErrorText(e, "Could not save candling. Please try again."));
    }
  }

  const columns: Column<IncubationLoss>[] = [
    { key: "date", label: "Date", render: (_, l) => <DateDisplay date={l.date} format="long" /> },
    {
      key: "type",
      label: "Type",
      render: (_, l) => {
        const style = LOSS_LABEL[l.type] ?? { label: l.type, className: "border-gray-200 bg-gray-50 text-gray-700" };
        return <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium ${style.className}`}>{style.label}</span>;
      },
    },
    { key: "count", label: "Eggs", align: "right", render: (_, l) => <span className="font-semibold">{Number(l.count).toLocaleString()}</span> },
    { key: "note", label: "Note", render: (_, l) => <span className="text-sm text-gray-500">{l.note || "—"}</span> },
  ];

  const candlingLosses = (losses ?? []).filter((l) => l.type === "INFERTILE" || l.type === "EARLY_DEAD");
  const canRecordCandling = !batch.transferredAt && (batch.stage === "SETTER" || batch.stage === "CANDLING");

  return (
    <div className="space-y-4">
      {!batch.candledAt ? <WhereWeAre batch={batch} label="Candling" day={CANDLE_DAY} /> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <OverviewTile label="Eggs set" value={eggsSet.toLocaleString()} sub="Put in the setter" />
        <OverviewTile
          label="Removed at candling"
          value={removedSoFar.toLocaleString()}
          sub={`${pct(removedSoFar)} of eggs set`}
          tone={removedSoFar > 0 ? "text-red-600" : ""}
        />
        <OverviewTile label="Fertile eggs left" value={Number(s.fertileEggs ?? 0).toLocaleString()} sub={`${pct(Number(s.fertileEggs ?? 0))} of eggs set`} />
      </div>

      {canRecordCandling ? (
        <form
          className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div>
            <h3 className="font-semibold text-gray-900">Record candling</h3>
            <p className="text-xs text-gray-500">Remove the eggs that will not hatch. You can add more than once until you move eggs to the hatcher.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-[170px_150px_150px_120px_minmax(0,1fr)_auto] lg:items-end">
            <div className="col-span-2 sm:col-span-4 lg:col-span-1">
              <FieldLabel>Date</FieldLabel>
              <DateInput value={date} onChange={setDate} className="w-full" />
            </div>
            <label className="block">
              <FieldLabel hint="clear egg">Infertile</FieldLabel>
              <Input type="number" inputMode="numeric" min={0} value={infertile} onChange={(e) => setInfertile(e.target.value)} placeholder="0" className="h-10" />
            </label>
            <label className="block">
              <FieldLabel hint="died early">Early dead</FieldLabel>
              <Input type="number" inputMode="numeric" min={0} value={earlyDead} onChange={(e) => setEarlyDead(e.target.value)} placeholder="0" className="h-10" />
            </label>
            <div>
              <FieldLabel>Total removed</FieldLabel>
              <div className="flex h-10 items-center rounded-md border border-dashed border-gray-200 bg-gray-50 px-3 text-sm font-semibold text-gray-900">
                {enteredNow.toLocaleString()}
              </div>
            </div>
            <label className="col-span-2 block sm:col-span-3 lg:col-span-1">
              <FieldLabel>Note (optional)</FieldLabel>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Setter 2, tray 4" className="h-10" />
            </label>
            <div className="col-span-2 sm:col-span-1">
              <SaveButton pending={candlingMutation.isPending} disabled={candlingMutation.isPending || enteredNow <= 0}>
                <Plus className="h-4 w-4" />
                Save
              </SaveButton>
            </div>
          </div>
          {enteredNow > 0 ? (
            <p className="text-sm text-gray-600">
              This removes {enteredNow.toLocaleString()} eggs ({pct(enteredNow)} of eggs set).
            </p>
          ) : null}
          {err && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
        </form>
      ) : (
        <StatusBox tone="done" title={batch.transferredAt ? "Candling is closed" : "Candling can't be changed now"}>
          {batch.transferredAt ? (
            <>Eggs moved to the hatcher on {formatBSLong(toNepalDayAd(batch.transferredAt))}. {removedSoFar.toLocaleString()} eggs were removed at candling.</>
          ) : (
            <>This incubation is {STAGE_LABEL[batch.stage]?.toLowerCase() ?? batch.stage}.</>
          )}
        </StatusBox>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <DataTable
          columns={columns}
          data={candlingLosses}
          loading={isLoading}
          emptyMessage="No candling saved yet."
          getRowKey={(row) => row.id}
          showFooter={candlingLosses.length > 0}
          footerContent={
            <div className="flex items-center justify-between px-2 text-sm">
              <span className="font-semibold text-gray-900">Total removed at candling</span>
              <span className="font-bold text-red-600">{removedSoFar.toLocaleString()} eggs</span>
            </div>
          }
        />
      </div>
    </div>
  );
}

// ─── Transfer Tab ─────────────────────────────────────────────────────────────

function TransferTab({ batch, batchId }: { batch: any; batchId: string }) {
  const transferMutation = useTransferToHatcher(batchId);
  const [date, setDate] = useState(getNepalTodayAd());
  const [err, setErr] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const alreadyTransferred = !!batch.transferredAt;
  const canTransfer = !alreadyTransferred && (batch.stage === "SETTER" || batch.stage === "CANDLING");
  const fertile = Number(batch.summary?.fertileEggs ?? 0);
  const today = incubationDay(batch.startDate);

  async function handleTransfer() {
    if (transferMutation.isPending) return;
    setErr(null);
    try {
      await transferMutation.mutateAsync({ date });
      setConfirmOpen(false);
    } catch (e: any) {
      setConfirmOpen(false);
      setErr(apiErrorText(e, "Could not move eggs. Please try again."));
    }
  }

  const transferDay = alreadyTransferred
    ? Math.round((Date.parse(toNepalDayAd(batch.transferredAt)) - Date.parse(toNepalDayAd(batch.startDate))) / DAY_MS) + 1
    : null;

  return (
    <div className="space-y-4">
      {!alreadyTransferred ? <WhereWeAre batch={batch} label="Moving to the hatcher" day={TRANSFER_DAY} /> : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <OverviewTile label="Fertile eggs" value={fertile.toLocaleString()} sub={alreadyTransferred ? "Moved to the hatcher" : "To move to the hatcher"} />
        <OverviewTile
          label="Usual day"
          value={`Day ${TRANSFER_DAY}`}
          sub={dateOfDay(batch.startDate, TRANSFER_DAY)}
        />
        <OverviewTile
          label={alreadyTransferred ? "Moved on" : "Today"}
          value={alreadyTransferred ? `Day ${transferDay}` : batch.stage === "COMPLETED" ? "—" : `Day ${today}`}
          sub={alreadyTransferred ? formatBSLong(toNepalDayAd(batch.transferredAt)) : formatBSLong(getNepalTodayAd())}
          tone={!alreadyTransferred && today > TRANSFER_DAY ? "text-red-600" : ""}
        />
      </div>

      {alreadyTransferred ? (
        <StatusBox tone="done" title={`Moved to the hatcher on ${formatBSLong(toNepalDayAd(batch.transferredAt))} (day ${transferDay})`}>
          {batch.stage === "COMPLETED" ? "The hatch is done. This step is closed." : "Next: save the hatch result on day 21."}
        </StatusBox>
      ) : canTransfer ? (
        <form
          className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setConfirmOpen(true);
          }}
        >
          <div>
            <h3 className="font-semibold text-gray-900">Move eggs to the hatcher</h3>
            <p className="text-xs text-gray-500">Do this when you move the eggs from the setter to the hatcher (usually day {TRANSFER_DAY}).</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[200px_max-content] sm:items-end">
            <div>
              <FieldLabel>Date moved</FieldLabel>
              <DateInput value={date} onChange={setDate} className="w-full" />
            </div>
            <SaveButton pending={transferMutation.isPending} disabled={transferMutation.isPending}>
              Move {fertile.toLocaleString()} eggs
            </SaveButton>
          </div>
          {err && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
        </form>
      ) : (
        <StatusBox tone="wait" title="Can't move eggs now">
          This incubation is {STAGE_LABEL[batch.stage]?.toLowerCase() ?? batch.stage}.
        </StatusBox>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Move {fertile.toLocaleString()} eggs to the hatcher?</AlertDialogTitle>
            <AlertDialogDescription>
              Date: {date ? formatBSLong(date.split("T")[0]) : "—"}. After this, candling can&apos;t be changed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={transferMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleTransfer();
              }}
              disabled={transferMutation.isPending}
            >
              {transferMutation.isPending ? "Moving…" : "Yes, move eggs"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Hatch Results Tab ────────────────────────────────────────────────────────

function HatchResultsTab({ batch, batchId }: { batch: any; batchId: string }) {
  const { data: results, isLoading } = useHatchResults(batchId);
  const addMutation = useAddHatchResult(batchId);
  const deleteMutation = useDeleteHatchResult(batchId);

  const [date, setDate] = useState(getNepalTodayAd());
  const [hatchedA, setHatchedA] = useState("");
  const [hatchedB, setHatchedB] = useState("");
  const [cull, setCull] = useState("");
  const [lateDead, setLateDead] = useState("");
  const [unhatched, setUnhatched] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const hasHatchResult = (results?.length ?? 0) > 0;
  const canAddHatchResult =
    !isLoading && batch.stage === "HATCHER" && !!batch.transferredAt && !hasHatchResult;
  const isFinalized = batch.stage === "COMPLETED" || hasHatchResult;
  // Backend allows deleting the hatch result when none of the produced chicks
  // have been sold (service re-checks per-grade).
  const existingHatchResult = results?.[0];

  async function handleDeleteHatchResult() {
    if (!existingHatchResult) return;
    try {
      await deleteMutation.mutateAsync(existingHatchResult.id);
      toast.success("Hatch result deleted. You can save a new one.");
      setConfirmDeleteOpen(false);
    } catch (e: any) {
      // Backend message surfaces the per-grade "chicks sold" guard.
      toast.error(apiErrorText(e, "Could not delete the hatch result"));
    }
  }
  const fertileEggs = Number(batch?.summary?.fertileEggs ?? 0);
  const chicksEntered = (Number(hatchedA) || 0) + (Number(hatchedB) || 0) + (Number(cull) || 0);
  const enteredTotal = chicksEntered + (Number(lateDead) || 0) + (Number(unhatched) || 0);
  const remainingEggs = fertileEggs - enteredTotal;
  const isBalanced = enteredTotal > 0 && remainingEggs === 0;

  async function handleAdd() {
    if (addMutation.isPending) return;
    setErr(null);
    if (!isBalanced) {
      return setErr(
        remainingEggs > 0
          ? `${remainingEggs.toLocaleString()} eggs are not counted yet. All ${fertileEggs.toLocaleString()} fertile eggs must be counted.`
          : `You counted ${Math.abs(remainingEggs).toLocaleString()} eggs too many.`
      );
    }
    try {
      await addMutation.mutateAsync({
        date,
        hatchedA: Number(hatchedA) || 0,
        hatchedB: Number(hatchedB) || 0,
        cull: Number(cull) || 0,
        lateDead: Number(lateDead) || 0,
        unhatched: Number(unhatched) || 0,
        note: note || undefined,
      });
      setHatchedA("");
      setHatchedB("");
      setCull("");
      setLateDead("");
      setUnhatched("");
      setNote("");
    } catch (e: any) {
      setErr(apiErrorText(e, "Could not save the hatch result. Please try again."));
    }
  }

  const s = batch.summary;
  const n = (v: number | string) => Number(v ?? 0).toLocaleString();

  const columns: Column<HatchResult>[] = [
    { key: "date", label: "Date", render: (_, r) => <DateDisplay date={r.date} format="long" /> },
    { key: "hatchedA", label: "Grade A", align: "right", render: (_, r) => <span className="font-semibold text-green-700">{n(r.hatchedA)}</span> },
    { key: "hatchedB", label: "Grade B", align: "right", render: (_, r) => <span className="font-semibold text-amber-700">{n(r.hatchedB)}</span> },
    { key: "cull", label: "Cull", align: "right", render: (_, r) => <span className="font-semibold text-red-600">{n(r.cull)}</span> },
    { key: "lateDead", label: "Late dead", align: "right", render: (_, r) => n(r.lateDead) },
    { key: "unhatched", label: "Unhatched", align: "right", render: (_, r) => n(r.unhatched) },
    { key: "note", label: "Note", render: (_, r) => <span className="text-sm text-gray-500">{r.note || "—"}</span> },
  ];

  const numBox = (label: string, value: string, set: (v: string) => void, hint?: string) => (
    <label className="block">
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <Input type="number" inputMode="numeric" min={0} value={value} onChange={(e) => set(e.target.value)} placeholder="0" className="h-10" />
    </label>
  );

  return (
    <div className="space-y-4">
      {!isFinalized ? <WhereWeAre batch={batch} label="The hatch" day={HATCH_DAY} /> : null}

      {!batch.transferredAt && batch.stage !== "COMPLETED" && (
        <StatusBox tone="wait" title="Move eggs to the hatcher first">
          Then save the hatch result here (due day {HATCH_DAY}, {dateOfDay(batch.startDate, HATCH_DAY)}).
        </StatusBox>
      )}

      {isFinalized && (
        <>
          <div className="flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 sm:flex-row sm:items-center">
            <CheckCircle className="hidden h-4 w-4 shrink-0 text-green-600 sm:block" />
            <div className="min-w-0 flex-1 text-sm text-green-900">
              <p className="font-medium">
                Hatch result saved
                {existingHatchResult ? ` on ${formatBSLong(toNepalDayAd(existingHatchResult.date))}` : ""}
              </p>
              <p className="text-gray-600">If it is wrong, delete it and save again. This works only while no chick is sold.</p>
            </div>
            {existingHatchResult && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => setConfirmDeleteOpen(true)}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Delete result
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <OverviewTile label="Chicks hatched" value={n(s.totalHatched)} sub="A + B + cull" />
            <OverviewTile label="Grade A" value={n(s.totalHatchedA)} tone="text-green-700" />
            <OverviewTile label="Grade B" value={n(s.totalHatchedB)} tone="text-amber-700" />
            <OverviewTile label="Cull" value={n(s.totalCull)} tone="text-red-600" />
            <OverviewTile label="Late dead" value={n(existingHatchResult?.lateDead ?? 0)} />
            <OverviewTile label="Unhatched" value={n(existingHatchResult?.unhatched ?? 0)} />
            <OverviewTile label="Hatch %" value={`${Number(s.hatchability).toFixed(1)}%`} sub="Of fertile eggs" tone="text-green-700" />
          </div>
        </>
      )}

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the hatch result?</AlertDialogTitle>
            <AlertDialogDescription>
              The chicks it added to stock are removed too, and the incubation goes back to &quot;In hatcher&quot; so you
              can save it again. If any of these chicks are already sold, it can&apos;t be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHatchResult}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete result"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {canAddHatchResult && (
        <form
          className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleAdd();
          }}
        >
          <div>
            <h3 className="font-semibold text-gray-900">Save hatch result</h3>
            <p className="text-xs text-gray-500">Count every fertile egg: chicks, plus eggs that did not hatch.</p>
          </div>

          {/* Live check: every fertile egg must be counted once. */}
          <div
            className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border px-3 py-2 text-sm ${
              isBalanced ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"
            }`}
          >
            <span>Fertile eggs <span className="font-semibold">{fertileEggs.toLocaleString()}</span></span>
            <span>Counted <span className="font-semibold">{enteredTotal.toLocaleString()}</span></span>
            <span className="font-semibold">
              {isBalanced
                ? "All eggs counted ✓"
                : remainingEggs > 0
                  ? `${remainingEggs.toLocaleString()} left to count`
                  : `${Math.abs(remainingEggs).toLocaleString()} too many`}
            </span>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Chicks · {chicksEntered.toLocaleString()}</p>
            <div className="grid grid-cols-3 gap-3 sm:max-w-xl">
              {numBox("Grade A", hatchedA, setHatchedA, "good")}
              {numBox("Grade B", hatchedB, setHatchedB, "weak")}
              {numBox("Cull", cull, setCull)}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Did not hatch</p>
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              {numBox("Late dead", lateDead, setLateDead, "died in shell")}
              {numBox("Unhatched", unhatched, setUnhatched)}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[200px_minmax(0,1fr)_max-content] sm:items-end">
            <div>
              <FieldLabel>Hatch date</FieldLabel>
              <DateInput value={date} onChange={setDate} className="w-full" />
            </div>
            <label className="block">
              <FieldLabel>Note (optional)</FieldLabel>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Hatcher 1" className="h-10" />
            </label>
            <SaveButton pending={addMutation.isPending} disabled={addMutation.isPending || !isBalanced}>
              <Plus className="h-4 w-4" />
              Save result
            </SaveButton>
          </div>
          {err && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
        </form>
      )}

      {hasHatchResult ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <DataTable columns={columns} data={results ?? []} loading={isLoading} emptyMessage="No hatch result yet." getRowKey={(row) => row.id} />
        </div>
      ) : null}
    </div>
  );
}

// ─── Chick Stock Tab ──────────────────────────────────────────────────────────

function ChickStockTab({ batch, onSell }: { batch: any; onSell: () => void }) {
  const stocks: Array<{ grade: ChickGrade; currentStock: number }> = batch.chickStocks ?? [];
  const stockOf = (grade: ChickGrade) => Number(stocks.find((x) => x.grade === grade)?.currentStock ?? 0);
  const a = stockOf("A");
  const b = stockOf("B");
  const c = stockOf("CULL");
  const total = a + b + c;
  const share = (v: number) => (total > 0 ? `${((v / total) * 100).toFixed(1)}% of stock` : "—");
  const s = batch.summary;
  const hatched = Number(s?.totalHatched ?? 0);

  if (hatched === 0 && total === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
        No chicks yet. They show here after the hatch result is saved.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <OverviewTile label="Chicks in stock" value={total.toLocaleString()} sub="Ready to sell" tone="text-amber-700" />
        <OverviewTile label="Grade A" value={a.toLocaleString()} sub={share(a)} tone="text-green-700" />
        <OverviewTile label="Grade B" value={b.toLocaleString()} sub={share(b)} tone="text-amber-700" />
        <OverviewTile label="Cull" value={c.toLocaleString()} sub={share(c)} tone="text-red-600" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm">
        <span className="text-gray-600">
          Hatched <span className="font-semibold text-gray-900">{hatched.toLocaleString()}</span> · sold{" "}
          <span className="font-semibold text-gray-900">{Number(s?.totalSalesCount ?? 0).toLocaleString()}</span> · left{" "}
          <span className="font-semibold text-gray-900">{total.toLocaleString()}</span>
        </span>
        {total > 0 ? (
          <Button size="sm" variant="outline" className="border-green-200 hover:bg-green-50 hover:text-green-700" onClick={onSell}>
            Sell chicks →
          </Button>
        ) : null}
      </div>
    </div>
  );
}

// ─── Chick Sales Tab ──────────────────────────────────────────────────────────

const GRADE_LABEL: Record<ChickGrade, { label: string; className: string }> = {
  A: { label: "Grade A", className: "border-green-200 bg-green-50 text-green-800" },
  B: { label: "Grade B", className: "border-amber-200 bg-amber-50 text-amber-800" },
  CULL: { label: "Cull", className: "border-red-200 bg-red-50 text-red-700" },
};

function GradeBadge({ grade }: { grade: ChickGrade }) {
  const style = GRADE_LABEL[grade];
  return <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] font-medium ${style.className}`}>{style.label}</span>;
}

function ChickSalesTab({ batchId, batch }: { batchId: string; batch: any }) {
  const { data: sales, isLoading } = useChickSales(batchId);
  const addMutation = useAddChickSale(batchId);
  const deleteMutation = useDeleteChickSale(batchId);
  const { data: partiesData } = useHatcheryParties();

  const [grade, setGrade] = useState<ChickGrade>("A");
  const [date, setDate] = useState(getNepalTodayAd());
  const [count, setCount] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [partyId, setPartyId] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [billSaleId, setBillSaleId] = useState<string | null>(null);
  const [savedSale, setSavedSale] = useState<{ type: HatcherySaleType; id: string } | null>(null);

  const stocks: Array<{ grade: ChickGrade; currentStock: number }> = batch.chickStocks ?? [];
  const stockOf = (g: ChickGrade) => Number(stocks.find((x) => x.grade === g)?.currentStock ?? 0);
  const parties = partiesData?.parties ?? [];
  const saleRows: ChickSale[] = sales ?? [];

  const s = batch.summary;
  const soldCount = Number(s?.totalSalesCount ?? saleRows.reduce((sum, r) => sum + r.count, 0));
  const soldAmount = Number(s?.totalSalesRevenue ?? saleRows.reduce((sum, r) => sum + Number(r.amount), 0));
  const inStock = stockOf("A") + stockOf("B") + stockOf("CULL");

  const countNum = parseInt(count || "0", 10) || 0;
  const tooMany = countNum > stockOf(grade);
  const total = count && unitPrice ? countNum * (parseFloat(unitPrice) || 0) : null;
  const canSell = !addMutation.isPending && countNum > 0 && unitPrice !== "" && !tooMany;

  // The sale list may not include the party, so fall back to the loaded party list.
  const partyName = (r: ChickSale) =>
    r.party?.name ?? (r.partyId ? parties.find((p) => p.id === r.partyId)?.name ?? "Party" : "Cash sale");

  async function handleAdd() {
    if (addMutation.isPending) return;
    setErr(null);
    if (countNum <= 0) return setErr("Enter how many chicks");
    if (unitPrice === "" || parseFloat(unitPrice) < 0) return setErr("Enter the price per chick");
    if (tooMany) return setErr(`Only ${stockOf(grade).toLocaleString()} ${GRADE_LABEL[grade].label} chicks in stock`);
    try {
      const sale = await addMutation.mutateAsync({
        grade,
        date,
        count: countNum,
        unitPrice: parseFloat(unitPrice),
        partyId: partyId || undefined,
        note: note || undefined,
      });
      setCount("");
      setUnitPrice("");
      setPartyId("");
      setNote("");
      if (sale?.id) setSavedSale({ type: "chick_sale", id: sale.id });
    } catch (e: any) {
      setErr(apiErrorText(e, "Could not save the sale. Please try again."));
    }
  }

  async function handleDelete(saleId: string) {
    try {
      await deleteMutation.mutateAsync(saleId);
      setConfirmDeleteId(null);
    } catch (e: any) {
      setConfirmDeleteId(null);
      toast.error(apiErrorText(e, "Could not delete the sale"));
    }
  }

  const deleteControl = (r: ChickSale) =>
    confirmDeleteId === r.id ? (
      <div className="flex justify-end gap-1.5">
        <Button
          size="sm"
          variant="destructive"
          className="h-7 px-2 text-xs"
          disabled={deleteMutation.isPending}
          onClick={() => handleDelete(r.id)}
        >
          {deleteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delete"}
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setConfirmDeleteId(null)}>
          Cancel
        </Button>
      </div>
    ) : (
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600"
        aria-label="Delete sale"
        title="Delete"
        onClick={() => setConfirmDeleteId(r.id)}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    );

  const billButton = (r: ChickSale) => (
    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => setBillSaleId(r.id)}>
      <FileText className="mr-1 h-3.5 w-3.5" /> Bill
    </Button>
  );

  const columns: Column<ChickSale>[] = [
    { key: "date", label: "Date", render: (_, r) => <DateDisplay date={r.date} format="long" className="whitespace-nowrap text-sm" /> },
    { key: "grade", label: "Grade", render: (_, r) => <GradeBadge grade={r.grade} /> },
    { key: "count", label: "Chicks", align: "right", render: (_, r) => <span className="font-semibold">{r.count.toLocaleString()}</span> },
    { key: "unitPrice", label: "Price / chick", align: "right", render: (_, r) => formatRupeesExact(r.unitPrice) },
    { key: "amount", label: "Amount", align: "right", render: (_, r) => <span className="whitespace-nowrap font-semibold">{formatRupeesExact(r.amount)}</span> },
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
      key: "actions",
      label: "",
      align: "right",
      render: (_, r) => (
        <div className="flex items-center justify-end gap-1">
          {billButton(r)}
          {deleteControl(r)}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <HatcherySaleBill
        saleType={billSaleId ? "chick_sale" : null}
        saleId={billSaleId}
        onClose={() => setBillSaleId(null)}
      />
      <SaleSavedPrompt
        savedSale={savedSale}
        onDismiss={() => setSavedSale(null)}
        onShare={({ id }) => setBillSaleId(id)}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <OverviewTile label="Chick sales" value={formatRupeesExact(soldAmount)} sub={`${saleRows.length} sale${saleRows.length === 1 ? "" : "s"}`} tone="text-green-700" />
        <OverviewTile label="Chicks sold" value={soldCount.toLocaleString()} sub={soldCount > 0 ? `Avg ${formatRupeesExact(soldAmount / soldCount)} each` : "—"} />
        <OverviewTile label="Chicks in stock" value={inStock.toLocaleString()} sub={`A ${stockOf("A").toLocaleString()} · B ${stockOf("B").toLocaleString()} · Cull ${stockOf("CULL").toLocaleString()}`} tone="text-amber-700" />
        <OverviewTile label="Chicks hatched" value={Number(s?.totalHatched ?? 0).toLocaleString()} sub="From this incubation" />
      </div>

      {inStock > 0 ? (
        <form
          className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleAdd();
          }}
        >
          <h3 className="font-semibold text-gray-900">Sell chicks</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-[170px_190px_120px_140px_minmax(0,1fr)]">
            <div className="col-span-2 sm:col-span-1">
              <FieldLabel>Date</FieldLabel>
              <DateInput value={date} onChange={setDate} className="w-full" />
            </div>
            <label className="col-span-2 block sm:col-span-1">
              <FieldLabel>Grade</FieldLabel>
              <select
                className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                value={grade}
                onChange={(e) => setGrade(e.target.value as ChickGrade)}
              >
                {(["A", "B", "CULL"] as ChickGrade[]).map((g) => (
                  <option key={g} value={g}>
                    {GRADE_LABEL[g].label} ({stockOf(g).toLocaleString()} in stock)
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <FieldLabel>Chicks</FieldLabel>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={stockOf(grade)}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                placeholder="0"
                className={`h-10 ${tooMany ? "border-red-400" : ""}`}
              />
            </label>
            <label className="block">
              <FieldLabel>Price per chick (रू)</FieldLabel>
              <Input type="number" inputMode="decimal" min={0} step={0.01} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0" className="h-10" />
            </label>
            <label className="col-span-2 block sm:col-span-1">
              <FieldLabel>Sold to</FieldLabel>
              <select
                className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm"
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
              >
                <option value="">Cash sale (no party)</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.phone})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_max-content] sm:items-end">
            <label className="block">
              <FieldLabel>Note (optional)</FieldLabel>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Delivered to Bharatpur" className="h-10" />
            </label>
            <SaveButton pending={addMutation.isPending} disabled={!canSell}>
              <Plus className="h-4 w-4" />
              Sell
            </SaveButton>
          </div>
          <p className={`text-sm ${tooMany ? "text-red-600" : "text-gray-600"}`}>
            {tooMany
              ? `Not enough chicks: only ${stockOf(grade).toLocaleString()} ${GRADE_LABEL[grade].label} in stock.`
              : `${stockOf(grade).toLocaleString()} ${GRADE_LABEL[grade].label} in stock`}
            {total !== null ? (
              <>
                {" · Total "}
                <span className="font-semibold text-gray-900">{formatRupeesExact(total)}</span>
              </>
            ) : null}
          </p>
          {err && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
        </form>
      ) : (
        <StatusBox tone="wait" title={Number(s?.totalHatched ?? 0) > 0 ? "All chicks are sold" : "No chicks to sell yet"}>
          {Number(s?.totalHatched ?? 0) > 0
            ? "There are no chicks left in stock from this incubation."
            : "Chicks can be sold after the hatch result is saved."}
        </StatusBox>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="hidden sm:block">
          <DataTable
            columns={columns}
            data={saleRows}
            loading={isLoading}
            emptyMessage="No chick sales yet."
            getRowKey={(row) => row.id}
            showFooter={saleRows.length > 0}
            footerContent={
              <div className="flex items-center justify-between px-2 text-sm">
                <span className="font-semibold text-gray-900">
                  Total of {saleRows.length} sale{saleRows.length === 1 ? "" : "s"} · {soldCount.toLocaleString()} chicks
                </span>
                <span className="font-bold text-green-700">{formatRupeesExact(soldAmount)}</span>
              </div>
            }
          />
        </div>
        <div className="sm:hidden">
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
          ) : saleRows.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-500">No chick sales yet.</p>
          ) : (
            <ul className="divide-y">
              {saleRows.map((r) => (
                <li key={r.id} className="flex items-start gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-gray-900">
                      {r.count.toLocaleString()} chicks <GradeBadge grade={r.grade} />
                    </p>
                    <p className="text-xs text-gray-500">
                      <DateDisplay date={r.date} format="long" /> · {formatRupeesExact(r.unitPrice)} each · {partyName(r)}
                    </p>
                    {r.note ? <p className="text-xs text-gray-500">{r.note}</p> : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-semibold">{formatRupeesExact(r.amount)}</span>
                    <div className="flex items-center gap-1">
                      {billButton(r)}
                      {deleteControl(r)}
                    </div>
                  </div>
                </li>
              ))}
              <li className="flex items-center justify-between bg-gray-50 px-4 py-2.5 text-sm">
                <span className="font-semibold text-gray-900">Total of {saleRows.length} sales</span>
                <span className="font-bold text-green-700">{formatRupeesExact(soldAmount)}</span>
              </li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
