"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  X,
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
  type HatcheryBatchMortality,
  type HatcheryBatchExpense,
  type HatcheryEggProduction,
  type HatcheryEggSale,
  type HatcheryParentSale,
} from "@/fetchers/hatchery/hatcheryBatchQueries";
import { useGetHatcheryInventory } from "@/fetchers/hatchery/hatcheryInventoryQueries";
import { useHatcheryParties, type HatcheryParty } from "@/fetchers/hatchery/hatcheryPartyQueries";

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
      {activeTab === "mortality" && <MortalityTab batchId={id} currentParents={batch.currentParents ?? 0} />}
      {activeTab === "egg-production" && <EggProductionTab batchId={id} />}
      {activeTab === "egg-stock" && <EggStockTab batch={batch} />}
      {activeTab === "sales" && <SalesTab batchId={id} currentParents={batch.currentParents ?? 0} />}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ batch }: { batch: any }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Initial Birds" value={batch.initialParents?.toLocaleString() ?? "—"} />
        <StatCard label="Current Birds" value={batch.currentParents?.toLocaleString() ?? "—"} />
        <StatCard
          label="Total Mortality"
          value={batch.summary?.totalMortality?.toLocaleString() ?? "0"}
          variant="danger"
        />
        <StatCard
          label="Total Expenses"
          value={fmtNPR(batch.summary?.totalExpenses ?? 0)}
          variant="primary"
        />
      </div>

      {/* Placements */}
      {batch.placements && batch.placements.length > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Initial Placements</h3>
          <div className="space-y-2">
            {batch.placements.map((p: any) => (
              <div
                key={p.id}
                className="flex items-center justify-between text-sm py-2 border-b last:border-0"
              >
                <span className="text-gray-700">{p.inventoryItem?.name}</span>
                <span className="font-medium">
                  {p.quantity.toLocaleString()} {p.inventoryItem?.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Egg Stock Summary */}
      {batch.summary?.eggStock?.length > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Current Egg Stock</h3>
          <div className="space-y-2">
            {batch.summary.eggStock.map((s: any) => (
              <div
                key={s.id}
                className="flex items-center justify-between text-sm py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-700">{s.eggType?.name}</span>
                  {s.eggType?.isHatchable && (
                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                  )}
                </div>
                <span className="font-bold text-gray-900">
                  {s.currentStock.toLocaleString()} eggs
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
  currentParents,
}: {
  batchId: string;
  currentParents: number;
}) {
  const { data: mortalities = [], isLoading } = useHatcheryMortalities(batchId);
  const addMutation = useAddHatcheryMortality(batchId);
  const deleteMutation = useDeleteHatcheryMortality(batchId);

  const [date, setDate] = useState(today());
  const [count, setCount] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleAdd() {
    setFormError(null);
    if (!date || !count) return;
    try {
      await addMutation.mutateAsync({ date, count: parseInt(count), note: note || undefined });
      setCount("");
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
    { key: "count", label: "Deaths", align: "right", render: (_, row) => <span className="font-bold text-red-600">{row.count}</span> },
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

  const totalMortality = mortalities.reduce((s, m) => s + m.count, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Total Deaths" value={totalMortality.toLocaleString()} variant="danger" />
        <StatCard label="Current Birds" value={currentParents.toLocaleString()} />
      </div>

      {/* Add form */}
      <div className="bg-white border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-gray-900">Record Mortality</h3>
        {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
        <div className="flex flex-wrap gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          <Input
            type="number"
            min="1"
            placeholder="Deaths"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="w-28"
          />
          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1 min-w-40"
          />
          <Button onClick={handleAdd} disabled={addMutation.isPending || !count}>
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
      </div>
    </div>
  );
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = ["feed", "medicine", "utilities", "labor", "other"];

function ExpensesTab({ batchId }: { batchId: string }) {
  const { data: expenses = [], isLoading } = useHatcheryExpenses(batchId);
  const addMutation = useAddHatcheryExpense(batchId);
  const deleteMutation = useDeleteHatcheryExpense(batchId);
  const { data: inventoryRes } = useGetHatcheryInventory();
  const inventoryItems: any[] = inventoryRes?.data ?? [];

  const [expenseType, setExpenseType] = useState<"INVENTORY" | "MANUAL">("INVENTORY");
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState("feed");
  const [customCategory, setCustomCategory] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [itemName, setItemName] = useState("");
  const [unit, setUnit] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const effectiveCategory = category === "_custom" ? customCategory : category;

  // Auto-fill amount when picking inventory item + qty
  const selectedItem = inventoryItems.find((i) => i.id === inventoryItemId);
  const computedAmount =
    expenseType === "INVENTORY" && selectedItem && quantity
      ? Math.round(Number(selectedItem.unitPrice) * Number(quantity) * 100) / 100
      : null;

  async function handleAdd() {
    setFormError(null);
    try {
      if (expenseType === "INVENTORY") {
        await addMutation.mutateAsync({
          date,
          type: "INVENTORY",
          category: effectiveCategory,
          inventoryItemId,
          quantity: Number(quantity),
        });
      } else {
        await addMutation.mutateAsync({
          date,
          type: "MANUAL",
          category: effectiveCategory,
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
      setItemName("");
      setUnit("");
      setUnitPrice("");
      setAmount("");
      setNote("");
    } catch (err: any) {
      setFormError(err?.response?.data?.error ?? "Failed to add expense");
    }
  }

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

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

          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="_custom">custom...</option>
          </select>

          {category === "_custom" && (
            <Input
              placeholder="Category name"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="w-36"
            />
          )}

          {expenseType === "INVENTORY" ? (
            <>
              <select
                className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={inventoryItemId}
                onChange={(e) => setInventoryItemId(e.target.value)}
              >
                <option value="">Select item</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.unit}) — {Number(item.currentStock)} in stock @ NPR {Number(item.unitPrice)}
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-28"
              />
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
        <DataTable
          data={expenses}
          columns={columns}
          loading={isLoading}
          emptyMessage="No expenses recorded yet."
          getRowKey={(row) => row.id}
        />
      </div>
    </div>
  );
}

// ─── Egg Production Tab ───────────────────────────────────────────────────────

function EggProductionTab({ batchId }: { batchId: string }) {
  const { data: productions = [], isLoading } = useHatcheryEggProductions(batchId);
  const { data: eggTypes = [] } = useHatcheryEggTypes();
  const addMutation = useAddHatcheryEggProduction(batchId);
  const deleteMutation = useDeleteHatcheryEggProduction(batchId);

  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  // Compute totals per type across all productions
  const typeTotals: Record<string, number> = {};
  productions.forEach((prod) => {
    prod.lines.forEach((line) => {
      typeTotals[line.eggTypeId] = (typeTotals[line.eggTypeId] ?? 0) + line.count;
    });
  });
  const grandTotal = Object.values(typeTotals).reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {eggTypes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
  currentParents,
}: {
  batchId: string;
  currentParents: number;
}) {
  const { data: eggTypes = [] } = useHatcheryEggTypes();
  const { data: eggSales = [], isLoading: eggSalesLoading } = useHatcheryEggSales(batchId);
  const { data: parentSales = [], isLoading: parentSalesLoading } = useHatcheryParentSales(batchId);
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
  const [parentCount, setParentCount] = useState("");
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
    parentTotalWeight && parentCount && parseInt(parentCount) > 0
      ? Math.round((parseFloat(parentTotalWeight) / parseInt(parentCount)) * 1000) / 1000
      : null;

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
    try {
      await addParentSaleMutation.mutateAsync({
        date: parentDate,
        count: parseInt(parentCount),
        totalWeightKg: parseFloat(parentTotalWeight),
        ratePerKg: parseFloat(parentRatePerKg),
        partyId: parentPartyId || undefined,
        note: parentNote || undefined,
      });
      setParentCount("");
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
    { key: "count", label: "Birds", align: "right", render: (_, r) => r.count.toLocaleString() },
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

  const totalEggRevenue = eggSales.reduce((s, e) => s + Number(e.amount), 0);
  const totalParentRevenue = parentSales.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Egg Sale Revenue" value={fmtNPR(totalEggRevenue)} variant="primary" />
        <StatCard label="Parent Sale Revenue" value={fmtNPR(totalParentRevenue)} variant="primary" />
        <StatCard label="Current Birds" value={currentParents.toLocaleString()} />
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
            <Input type="number" min="1" placeholder="Bird count" value={parentCount} onChange={(e) => setParentCount(e.target.value)} className="w-28" />
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
            <Button onClick={handleAddParentSale} disabled={addParentSaleMutation.isPending || !parentCount || !parentTotalWeight || !parentRatePerKg}>
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
        </div>
      </div>
    </div>
  );
}
