"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Plus,
  FlaskConical,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DataTable, type Column } from "@/common/components/ui/data-table";
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

type Tab = "overview" | "candling" | "transfer" | "hatch-results" | "chick-stock" | "chick-sales";

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "candling", label: "Candling" },
  { id: "transfer", label: "Transfer" },
  { id: "hatch-results", label: "Hatch Results" },
  { id: "chick-stock", label: "Chick Stock" },
  { id: "chick-sales", label: "Chick Sales" },
];

const STAGE_COLORS: Record<string, string> = {
  SETTER: "bg-blue-100 text-blue-800",
  CANDLING: "bg-yellow-100 text-yellow-800",
  HATCHER: "bg-orange-100 text-orange-800",
  COMPLETED: "bg-green-100 text-green-800",
};

const GRADE_COLORS: Record<ChickGrade, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-yellow-100 text-yellow-800",
  CULL: "bg-red-100 text-red-800",
};

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
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <FlaskConical className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">{batch.code}</h1>
          {batch.name && <p className="text-sm text-muted-foreground">{batch.name}</p>}
        </div>
        <span className={`ml-auto px-3 py-1 rounded-full text-sm font-medium ${STAGE_COLORS[batch.stage]}`}>
          {batch.stage}
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
        {activeTab === "candling" && <CandlingTab batchId={id} />}
        {activeTab === "transfer" && <TransferTab batch={batch} batchId={id} />}
        {activeTab === "hatch-results" && <HatchResultsTab batchId={id} />}
        {activeTab === "chick-stock" && <ChickStockTab batch={batch} />}
        {activeTab === "chick-sales" && <ChickSalesTab batchId={id} batch={batch} />}
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ batch }: { batch: any }) {
  const s = batch.summary;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Eggs Set" value={s.eggsSet} />
        <StatCard label="Candling Loss" value={s.candlingLoss} />
        <StatCard label="Fertile Eggs" value={s.fertileEggs} />
        <StatCard label="Total Hatched" value={s.totalHatched} />
        <StatCard label="Grade A" value={s.totalHatchedA} />
        <StatCard label="Grade B" value={s.totalHatchedB} />
        <StatCard label="Cull" value={s.totalCull} />
        <StatCard label="Hatchability" value={`${s.hatchability}%`} />
        <StatCard label="Hatch of Total" value={`${s.hatchOfTotal}%`} />
        <StatCard label="Chicks Sold" value={s.totalSalesCount} />
        <StatCard label="Sales Revenue" value={`₹${s.totalSalesRevenue.toLocaleString()}`} />
      </div>

      <div className="border rounded-lg p-4 space-y-2 text-sm">
        <div className="flex gap-8 flex-wrap">
          <div>
            <span className="text-muted-foreground">Start Date: </span>
            <DateDisplay date={batch.startDate} />
          </div>
          <div>
            <span className="text-muted-foreground">Parent Batch: </span>
            <span className="font-semibold">{batch.parentBatch?.code ?? batch.parentBatchId}</span>
          </div>
          {batch.eggsSetCount && (
            <div>
              <span className="text-muted-foreground">Eggs in Setter: </span>
              <span className="font-semibold">{batch.eggsSetCount}</span>
            </div>
          )}
        </div>
        {batch.notes && <p className="text-muted-foreground">{batch.notes}</p>}
      </div>

      {/* Egg moves */}
      {batch.eggMoves?.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Egg Consumption</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Egg Type</th>
                  <th className="text-right px-4 py-2">Count</th>
                </tr>
              </thead>
              <tbody>
                {batch.eggMoves.map((m: any) => (
                  <tr key={m.id} className="border-t">
                    <td className="px-4 py-2"><DateDisplay date={m.date} /></td>
                    <td className="px-4 py-2">{m.eggType?.name ?? m.eggTypeId}</td>
                    <td className="px-4 py-2 text-right font-semibold">{m.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border rounded-lg p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

// ─── Candling Tab ─────────────────────────────────────────────────────────────

function CandlingTab({ batchId }: { batchId: string }) {
  const { data: losses, isLoading } = useIncubationLosses(batchId);
  const candlingMutation = useRecordCandling(batchId);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [infertile, setInfertile] = useState("");
  const [earlyDead, setEarlyDead] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit() {
    setErr(null);
    if (!infertile && !earlyDead) return setErr("Enter at least one count");
    try {
      await candlingMutation.mutateAsync({
        date,
        infertile: infertile ? parseInt(infertile) : 0,
        earlyDead: earlyDead ? parseInt(earlyDead) : 0,
        note: note || undefined,
      });
      setInfertile("");
      setEarlyDead("");
      setNote("");
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? e.message);
    }
  }

  const columns: Column<IncubationLoss>[] = [
    { key: "date", label: "Date", render: (_, l) => <DateDisplay date={l.date} /> },
    { key: "type", label: "Type", render: (_, l) => <span className="capitalize">{l.type.replace("_", " ")}</span> },
    { key: "count", label: "Count", render: (_, l) => <span className="font-semibold">{l.count}</span> },
    { key: "note", label: "Note", render: (_, l) => l.note ?? "—" },
  ];

  const candlingLosses = (losses ?? []).filter(
    (l) => l.type === "INFERTILE" || l.type === "EARLY_DEAD"
  );

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold">Record Candling</h3>
        {err && <p className="text-destructive text-sm">{err}</p>}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Infertile</label>
            <Input type="number" min={0} value={infertile} onChange={(e) => setInfertile(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Early Dead</label>
            <Input type="number" min={0} value={earlyDead} onChange={(e) => setEarlyDead(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Note</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={candlingMutation.isPending}>
            {candlingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Plus className="h-4 w-4 mr-2" />
            Record Candling
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={candlingLosses}
        loading={isLoading}
        emptyMessage="No candling records yet"
      />
    </div>
  );
}

// ─── Transfer Tab ─────────────────────────────────────────────────────────────

function TransferTab({ batch, batchId }: { batch: any; batchId: string }) {
  const transferMutation = useTransferToHatcher(batchId);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [err, setErr] = useState<string | null>(null);

  const alreadyTransferred = !!batch.transferredAt;

  async function handleTransfer() {
    setErr(null);
    try {
      await transferMutation.mutateAsync({ date });
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? e.message);
    }
  }

  return (
    <div className="space-y-4">
      {alreadyTransferred ? (
        <div className="flex items-center gap-3 border rounded-lg p-4 bg-green-50 text-green-800">
          <CheckCircle className="h-5 w-5" />
          <div>
            <p className="font-semibold">Transferred to Hatcher</p>
            <p className="text-sm">
              Transferred on <DateDisplay date={batch.transferredAt} />
            </p>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold">Transfer to Hatcher</h3>
          <p className="text-sm text-muted-foreground">
            Record the date when eggs were moved from setter to hatcher (typically day 18).
          </p>
          {err && <p className="text-destructive text-sm">{err}</p>}
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Transfer Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <Button onClick={handleTransfer} disabled={transferMutation.isPending}>
              {transferMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Transfer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Hatch Results Tab ────────────────────────────────────────────────────────

function HatchResultsTab({ batchId }: { batchId: string }) {
  const { data: results, isLoading } = useHatchResults(batchId);
  const addMutation = useAddHatchResult(batchId);
  const deleteMutation = useDeleteHatchResult(batchId);

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [hatchedA, setHatchedA] = useState("");
  const [hatchedB, setHatchedB] = useState("");
  const [cull, setCull] = useState("");
  const [lateDead, setLateDead] = useState("");
  const [unhatched, setUnhatched] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    setErr(null);
    const total = [hatchedA, hatchedB, cull, lateDead, unhatched].reduce(
      (s, v) => s + (parseInt(v) || 0),
      0
    );
    if (total === 0) return setErr("Enter at least one count");
    try {
      await addMutation.mutateAsync({
        date,
        hatchedA: parseInt(hatchedA) || 0,
        hatchedB: parseInt(hatchedB) || 0,
        cull: parseInt(cull) || 0,
        lateDead: parseInt(lateDead) || 0,
        unhatched: parseInt(unhatched) || 0,
        note: note || undefined,
      });
      setHatchedA("");
      setHatchedB("");
      setCull("");
      setLateDead("");
      setUnhatched("");
      setNote("");
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? e.message);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteMutation.mutateAsync(id);
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? e.message);
    } finally {
      setDeletingId(null);
    }
  }

  const columns: Column<HatchResult>[] = [
    { key: "date", label: "Date", render: (_, r) => <DateDisplay date={r.date} /> },
    { key: "hatchedA", label: "Grade A", render: (_, r) => <span className="font-semibold text-green-700">{r.hatchedA}</span> },
    { key: "hatchedB", label: "Grade B", render: (_, r) => <span className="font-semibold text-yellow-700">{r.hatchedB}</span> },
    { key: "cull", label: "Cull", render: (_, r) => <span className="font-semibold text-red-700">{r.cull}</span> },
    { key: "lateDead", label: "Late Dead", render: (_, r) => r.lateDead },
    { key: "unhatched", label: "Unhatched", render: (_, r) => r.unhatched },
    { key: "note", label: "Note", render: (_, r) => r.note ?? "—" },
    {
      key: "actions",
      label: "",
      render: (_, r) => (
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => handleDelete(r.id)}
          disabled={deletingId === r.id}
        >
          {deletingId === r.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold">Record Hatch Result</h3>
        {err && <p className="text-destructive text-sm">{err}</p>}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Grade A Chicks</label>
            <Input type="number" min={0} value={hatchedA} onChange={(e) => setHatchedA(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Grade B Chicks</label>
            <Input type="number" min={0} value={hatchedB} onChange={(e) => setHatchedB(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cull</label>
            <Input type="number" min={0} value={cull} onChange={(e) => setCull(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Late Dead</label>
            <Input type="number" min={0} value={lateDead} onChange={(e) => setLateDead(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unhatched</label>
            <Input type="number" min={0} value={unhatched} onChange={(e) => setUnhatched(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Note</label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </div>
        <div className="flex justify-end">
          <Button onClick={handleAdd} disabled={addMutation.isPending}>
            {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Plus className="h-4 w-4 mr-2" />
            Add Result
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={results ?? []}
        loading={isLoading}
        emptyMessage="No hatch results yet"
      />
    </div>
  );
}

// ─── Chick Stock Tab ──────────────────────────────────────────────────────────

function ChickStockTab({ batch }: { batch: any }) {
  const stocks: Array<{ grade: ChickGrade; currentStock: number }> = batch.chickStocks ?? [];

  const grades: ChickGrade[] = ["A", "B", "CULL"];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Current Chick Stock by Grade</h3>
      <div className="grid grid-cols-3 gap-4">
        {grades.map((grade) => {
          const s = stocks.find((x) => x.grade === grade);
          return (
            <div key={grade} className={`border rounded-lg p-4 ${GRADE_COLORS[grade]}`}>
              <p className="text-sm font-medium">Grade {grade}</p>
              <p className="text-3xl font-bold mt-1">{s?.currentStock ?? 0}</p>
              <p className="text-xs mt-1 opacity-70">chicks available</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Chick Sales Tab ──────────────────────────────────────────────────────────

function ChickSalesTab({ batchId, batch }: { batchId: string; batch: any }) {
  const { data: sales, isLoading } = useChickSales(batchId);
  const addMutation = useAddChickSale(batchId);
  const deleteMutation = useDeleteChickSale(batchId);

  const [grade, setGrade] = useState<ChickGrade>("A");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [count, setCount] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const stocks: Array<{ grade: ChickGrade; currentStock: number }> = batch.chickStocks ?? [];

  async function handleAdd() {
    setErr(null);
    if (!count || parseInt(count) <= 0) return setErr("Count must be greater than 0");
    if (!unitPrice || parseFloat(unitPrice) < 0) return setErr("Unit price is required");
    try {
      await addMutation.mutateAsync({
        grade,
        date,
        count: parseInt(count),
        unitPrice: parseFloat(unitPrice),
        customerName: customerName || undefined,
        note: note || undefined,
      });
      setCount("");
      setUnitPrice("");
      setCustomerName("");
      setNote("");
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? e.message);
    }
  }

  async function handleDelete(saleId: string) {
    setDeletingId(saleId);
    try {
      await deleteMutation.mutateAsync(saleId);
    } catch (e: any) {
      setErr(e?.response?.data?.error ?? e.message);
    } finally {
      setDeletingId(null);
    }
  }

  const columns: Column<ChickSale>[] = [
    { key: "date", label: "Date", render: (_, s) => <DateDisplay date={s.date} /> },
    {
      key: "grade",
      label: "Grade",
      render: (_, s) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${GRADE_COLORS[s.grade]}`}>
          Grade {s.grade}
        </span>
      ),
    },
    { key: "count", label: "Count", render: (_, s) => <span className="font-semibold">{s.count}</span> },
    { key: "unitPrice", label: "Unit Price", render: (_, s) => `₹${Number(s.unitPrice).toFixed(2)}` },
    { key: "amount", label: "Amount", render: (_, s) => <span className="font-semibold">₹{Number(s.amount).toLocaleString()}</span> },
    { key: "customerName", label: "Customer", render: (_, s) => s.customerName ?? "—" },
    { key: "note", label: "Note", render: (_, s) => s.note ?? "—" },
    {
      key: "actions",
      label: "",
      render: (_, s) => (
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          onClick={() => handleDelete(s.id)}
          disabled={deletingId === s.id}
        >
          {deletingId === s.id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stock summary */}
      <div className="grid grid-cols-3 gap-3">
        {(["A", "B", "CULL"] as ChickGrade[]).map((g) => {
          const s = stocks.find((x) => x.grade === g);
          return (
            <div key={g} className={`rounded-lg p-3 text-sm font-medium ${GRADE_COLORS[g]}`}>
              Grade {g}: <span className="font-bold">{s?.currentStock ?? 0}</span> available
            </div>
          );
        })}
      </div>

      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold">Record Chick Sale</h3>
        {err && <p className="text-destructive text-sm">{err}</p>}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">Grade</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm bg-background"
              value={grade}
              onChange={(e) => setGrade(e.target.value as ChickGrade)}
            >
              <option value="A">Grade A</option>
              <option value="B">Grade B</option>
              <option value="CULL">Cull</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Count</label>
            <Input type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Unit Price (₹)</label>
            <Input type="number" min={0} step={0.01} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Customer Name</label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Note</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        {count && unitPrice && (
          <p className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">₹{(parseInt(count) * parseFloat(unitPrice)).toLocaleString()}</span>
          </p>
        )}
        <div className="flex justify-end">
          <Button onClick={handleAdd} disabled={addMutation.isPending}>
            {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Plus className="h-4 w-4 mr-2" />
            Add Sale
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={sales ?? []}
        loading={isLoading}
        emptyMessage="No chick sales yet"
      />
    </div>
  );
}
