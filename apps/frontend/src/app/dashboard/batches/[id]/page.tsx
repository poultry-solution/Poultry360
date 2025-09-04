/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layers, ArrowLeft, Plus, Pencil, Trash2 } from "lucide-react";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BatchDetail {
  id: number;
  code: string;
  farm: string;
  startDate: string; // ISO yyyy-mm-dd
  status: "Active" | "Closed";
  initialBirds: number;
}

type ExpenseCategory = "Feed" | "Medicine" | "Hatchery" | "Other";

type ExpenseRow = {
  id: number;
  category: ExpenseCategory;
  amount: number;
  notes?: string;
  date: string;
  feedBrand?: string;
  feedQuantity?: number;
  feedRate?: number;
  hatcheryName?: string;
  hatcheryRate?: number;
  hatcheryQuantity?: number;
  medicineName?: string;
  medicineRate?: number;
  medicineQuantity?: number;
  otherName?: string;
  otherRate?: number;
  otherQuantity?: number;
};

type SaleRow = {
  id: number;
  item: string;
  rate: number;
  quantity: number;
  remaining: boolean;
  customer?: {
    name: string;
    contact: string;
    category: "Chicken" | "Other";
    balance: number;
  } | null;
  date: string; // yyyy-mm-dd
};

type LedgerRow = {
  id: number;
  name: string;
  contact: string;
  category: "Chicken" | "Other";
  sales: number;
  received: number;
  balance: number;
};

const MOCK_BATCHES: BatchDetail[] = [
  {
    id: 1,
    code: "B-2024-001",
    farm: "Farm A",
    startDate: "2024-01-15",
    status: "Active",
    initialBirds: 2500,
  },
  {
    id: 2,
    code: "B-2024-002",
    farm: "Farm B",
    startDate: "2024-01-20",
    status: "Active",
    initialBirds: 2000,
  },
];

const TABS = [
  "Overview",
  "Expenses",
  "Sales",
  "Sales Balance",
  "Profit & Loss",
] as const;

function formatDateYYYYMMDD(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { timeZone: "UTC" });
}

// helper banner
function Banner({
  type,
  message,
}: {
  type: "success" | "error";
  message: string;
}) {
  const base = "rounded-md px-3 py-2 text-sm border";
  const styles =
    type === "success"
      ? "bg-green-50 text-green-800 border-green-200"
      : "bg-red-50 text-red-800 border-red-200";
  return <div className={`${base} ${styles}`}>{message}</div>;
}

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>();
  const batchId = Number(params?.id);
  const batch = useMemo(
    () => MOCK_BATCHES.find((b) => b.id === batchId),
    [batchId]
  );
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Overview");

  // --- State (with localStorage persistence) ---
  const storageKey = (suffix: string) => `p360:batch:${batchId}:${suffix}`;

  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);

  // Load
  useEffect(() => {
    try {
      const ex = localStorage.getItem(storageKey("expenses"));
      const sa = localStorage.getItem(storageKey("sales"));
      const le = localStorage.getItem(storageKey("ledger"));
      setExpenses(
        ex
          ? JSON.parse(ex)
          : [
              {
                id: 1,
                category: "Feed",
                feedBrand: "Broiler Starter",
                feedQuantity: 10,
                feedRate: 4500,
                amount: 45000,
                date: "2024-02-10",
                notes: "25kg x 10",
              },
              {
                id: 2,
                category: "Medicine",
                medicineName: "Vitamin D3",
                medicineQuantity: 2,
                medicineRate: 3250,
                amount: 6500,
                date: "2024-02-12",
              },
            ]
      );
      setSales(
        sa
          ? JSON.parse(sa)
          : [
              {
                id: 1,
                item: "Chicken",
                rate: 240,
                quantity: 120,
                remaining: false,
                customer: null,
                date: "2024-03-01",
              },
              {
                id: 2,
                item: "Chicken",
                rate: 235,
                quantity: 90,
                remaining: true,
                customer: {
                  name: "Sharma Traders",
                  contact: "9800000000",
                  category: "Chicken",
                  balance: 5000,
                },
                date: "2024-03-05",
              },
            ]
      );
      setLedger(
        le
          ? JSON.parse(le)
          : [
              {
                id: 1,
                name: "Sharma Traders",
                contact: "9800000000",
                category: "Chicken",
                sales: 50000,
                received: 30000,
                balance: 20000,
              },
              {
                id: 2,
                name: "KTM Fresh",
                contact: "9811111111",
                category: "Chicken",
                sales: 38000,
                received: 38000,
                balance: 0,
              },
            ]
      );
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  // Save
  useEffect(() => {
    try {
      localStorage.setItem(storageKey("expenses"), JSON.stringify(expenses));
    } catch {}
  }, [expenses]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey("sales"), JSON.stringify(sales));
    } catch {}
  }, [sales]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey("ledger"), JSON.stringify(ledger));
    } catch {}
  }, [ledger]);

  // --- Expense Modal ---
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    category: "Feed" as ExpenseCategory,
    date: "",
    notes: "",
    feedBrand: "",
    feedQuantity: "",
    feedRate: "",
    hatcheryName: "",
    hatcheryRate: "",
    hatcheryQuantity: "",
    medicineName: "",
    medicineRate: "",
    medicineQuantity: "",
    otherName: "",
    otherRate: "",
    otherQuantity: "",
  });
  function updateExpenseField(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setExpenseForm((p) => ({ ...p, [name]: value }));
  }
  function openNewExpense() {
    setEditingExpenseId(null);
    setIsExpenseModalOpen(true);
  }
  function openEditExpense(row: ExpenseRow) {
    setEditingExpenseId(row.id);
    setExpenseForm({
      category: row.category,
      date: row.date,
      notes: row.notes ?? "",
      feedBrand: row.feedBrand?.toString() ?? "",
      feedQuantity: row.feedQuantity?.toString() ?? "",
      feedRate: row.feedRate?.toString() ?? "",
      hatcheryName: row.hatcheryName?.toString() ?? "",
      hatcheryRate: row.hatcheryRate?.toString() ?? "",
      hatcheryQuantity: row.hatcheryQuantity?.toString() ?? "",
      medicineName: row.medicineName?.toString() ?? "",
      medicineRate: row.medicineRate?.toString() ?? "",
      medicineQuantity: row.medicineQuantity?.toString() ?? "",
      otherName: row.otherName?.toString() ?? "",
      otherRate: row.otherRate?.toString() ?? "",
      otherQuantity: row.otherQuantity?.toString() ?? "",
    });
    setIsExpenseModalOpen(true);
  }
  function deleteExpense(id: number) {
    setExpenses((prev) => prev.filter((r) => r.id !== id));
  }

  // Banners
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  function flash(type: "success" | "error", message: string) {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 2500);
  }

  // Validation errors
  const [expenseErrors, setExpenseErrors] = useState<Record<string, string>>(
    {}
  );
  function validateExpense(): boolean {
    const errs: Record<string, string> = {};
    if (!expenseForm.date) errs.date = "Date is required";
    if (expenseForm.category === "Feed") {
      if (!expenseForm.feedBrand) errs.feedBrand = "Brand required";
      if (!expenseForm.feedQuantity) errs.feedQuantity = "Quantity required";
      if (!expenseForm.feedRate) errs.feedRate = "Rate required";
    } else if (expenseForm.category === "Hatchery") {
      if (!expenseForm.hatcheryName)
        errs.hatcheryName = "Hatchery name required";
      if (!expenseForm.hatcheryQuantity)
        errs.hatcheryQuantity = "Quantity required";
      if (!expenseForm.hatcheryRate) errs.hatcheryRate = "Rate required";
    } else if (expenseForm.category === "Medicine") {
      if (!expenseForm.medicineName)
        errs.medicineName = "Medicine name required";
      if (!expenseForm.medicineQuantity)
        errs.medicineQuantity = "Quantity required";
      if (!expenseForm.medicineRate) errs.medicineRate = "Rate required";
    } else {
      if (!expenseForm.otherName) errs.otherName = "Expense name required";
      if (!expenseForm.otherQuantity) errs.otherQuantity = "Quantity required";
      if (!expenseForm.otherRate) errs.otherRate = "Rate required";
    }
    setExpenseErrors(errs);
    return Object.keys(errs).length === 0;
  }
  function submitExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!validateExpense()) {
      flash("error", "Please fill all required fields");
      return;
    }
    let amount = 0;
    const ec = expenseForm.category;
    const base: any = {
      id:
        editingExpenseId ??
        (expenses.length ? Math.max(...expenses.map((r) => r.id)) + 1 : 1),
      category: ec,
      amount: 0,
      date: expenseForm.date || new Date().toISOString().slice(0, 10),
      notes: expenseForm.notes,
    };
    if (ec === "Feed") {
      const q = Number(expenseForm.feedQuantity || 0),
        r = Number(expenseForm.feedRate || 0);
      amount = q * r;
      Object.assign(base, {
        feedBrand: expenseForm.feedBrand,
        feedQuantity: q,
        feedRate: r,
        amount,
      });
    } else if (ec === "Hatchery") {
      const q = Number(expenseForm.hatcheryQuantity || 0),
        r = Number(expenseForm.hatcheryRate || 0);
      amount = q * r;
      Object.assign(base, {
        hatcheryName: expenseForm.hatcheryName,
        hatcheryQuantity: q,
        hatcheryRate: r,
        amount,
      });
    } else if (ec === "Medicine") {
      const q = Number(expenseForm.medicineQuantity || 0),
        r = Number(expenseForm.medicineRate || 0);
      amount = q * r;
      Object.assign(base, {
        medicineName: expenseForm.medicineName,
        medicineQuantity: q,
        medicineRate: r,
        amount,
      });
    } else {
      const q = Number(expenseForm.otherQuantity || 0),
        r = Number(expenseForm.otherRate || 0);
      amount = q * r;
      Object.assign(base, {
        otherName: expenseForm.otherName,
        otherQuantity: q,
        otherRate: r,
        amount,
      });
    }
    setExpenses((prev) =>
      editingExpenseId
        ? prev.map((r: any) => (r.id === editingExpenseId ? base : r))
        : [base, ...prev]
    );
    setIsExpenseModalOpen(false);
    setEditingExpenseId(null);
    setExpenseErrors({});
    flash("success", editingExpenseId ? "Expense updated" : "Expense added");
  }

  // --- Sales Modal ---
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [saleForm, setSaleForm] = useState({
    item: "Chicken",
    rate: "",
    quantity: "",
    remaining: false,
    customerName: "",
    contact: "",
    category: "Chicken",
    balance: "",
    date: "",
  });
  function updateSaleField(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target as HTMLInputElement;
    setSaleForm((p) => ({
      ...p,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  }
  function openNewSale() {
    setEditingSaleId(null);
    setIsSaleModalOpen(true);
  }
  function openEditSale(row: SaleRow) {
    setEditingSaleId(row.id);
    setSaleForm({
      item: row.item,
      rate: String(row.rate),
      quantity: String(row.quantity),
      remaining: row.remaining,
      customerName: row.customer?.name || "",
      contact: row.customer?.contact || "",
      category: row.customer?.category || "Chicken",
      balance: String(row.customer?.balance ?? ""),
      date: row.date,
    });
    setIsSaleModalOpen(true);
  }
  function deleteSale(id: number) {
    setSales((prev) => prev.filter((r) => r.id !== id));
  }

  const [saleErrors, setSaleErrors] = useState<Record<string, string>>({});
  function validateSale(): boolean {
    const errs: Record<string, string> = {};
    if (!saleForm.rate) errs.rate = "Rate required";
    if (!saleForm.quantity) errs.quantity = "Quantity required";
    if (saleForm.remaining) {
      if (!saleForm.customerName) errs.customerName = "Customer name required";
      if (!saleForm.balance) errs.balance = "Balance required";
    }
    setSaleErrors(errs);
    return Object.keys(errs).length === 0;
  }
  function submitSale(e: React.FormEvent) {
    e.preventDefault();
    const newRow: SaleRow = {
      id:
        editingSaleId ??
        (sales.length ? Math.max(...sales.map((r) => r.id)) + 1 : 1),
      item: saleForm.item,
      rate: Number(saleForm.rate || 0),
      quantity: Number(saleForm.quantity || 0),
      remaining: saleForm.remaining,
      customer: saleForm.remaining
        ? {
            name: saleForm.customerName,
            contact: saleForm.contact,
            category: saleForm.category as any,
            balance: Number(saleForm.balance || 0),
          }
        : null,
      date: saleForm.date || new Date().toISOString().slice(0, 10),
    };
    setSales((prev) =>
      editingSaleId
        ? prev.map((r) => (r.id === editingSaleId ? newRow : r))
        : [newRow, ...prev]
    );
    setIsSaleModalOpen(false);
    setEditingSaleId(null);
    setSaleErrors({});
    flash("success", editingSaleId ? "Sale updated" : "Sale added");
  }

  // --- Ledger Modal ---
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [editingLedgerId, setEditingLedgerId] = useState<number | null>(null);
  const [ledgerForm, setLedgerForm] = useState({
    name: "",
    contact: "",
    category: "Chicken" as "Chicken" | "Other",
    sales: "",
    received: "",
  });
  function updateLedgerField(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setLedgerForm((p) => ({ ...p, [name]: value }));
  }
  function openNewLedger() {
    setEditingLedgerId(null);
    setIsLedgerModalOpen(true);
  }
  function openEditLedger(row: LedgerRow) {
    setEditingLedgerId(row.id);
    setLedgerForm({
      name: row.name,
      contact: row.contact,
      category: row.category,
      sales: String(row.sales),
      received: String(row.received),
    });
    setIsLedgerModalOpen(true);
  }
  function deleteLedger(id: number) {
    setLedger((prev) => prev.filter((r) => r.id !== id));
  }

  const [ledgerErrors, setLedgerErrors] = useState<Record<string, string>>({});
  function validateLedger(): boolean {
    const errs: Record<string, string> = {};
    if (!ledgerForm.name) errs.name = "Name required";
    setLedgerErrors(errs);
    return Object.keys(errs).length === 0;
  }
  function submitLedger(e: React.FormEvent) {
    e.preventDefault();
    const s = Number(ledgerForm.sales || 0),
      r = Number(ledgerForm.received || 0);
    const newRow: LedgerRow = {
      id:
        editingLedgerId ??
        (ledger.length ? Math.max(...ledger.map((r) => r.id)) + 1 : 1),
      name: ledgerForm.name,
      contact: ledgerForm.contact,
      category: ledgerForm.category,
      sales: s,
      received: r,
      balance: s - r,
    };
    setLedger((prev) =>
      editingLedgerId
        ? prev.map((l) => (l.id === editingLedgerId ? newRow : l))
        : [newRow, ...prev]
    );
    setIsLedgerModalOpen(false);
    setEditingLedgerId(null);
    setLedgerErrors({});
    flash("success", editingLedgerId ? "Ledger updated" : "Ledger entry added");
  }

  if (!batch) return notFound();

  const salesTotal = sales.reduce((sum, s) => sum + s.rate * s.quantity, 0);
  const expensesTotal = expenses.reduce((sum, ex) => sum + ex.amount, 0);
  const receivableTotal = ledger.reduce((sum, l) => sum + l.balance, 0);
  const profit = salesTotal - expensesTotal;
  const perBirdRevenue = batch.initialBirds
    ? salesTotal / batch.initialBirds
    : 0;
  const perBirdExpense = batch.initialBirds
    ? expensesTotal / batch.initialBirds
    : 0;

  return (
    <div className="space-y-6">
      {banner && <Banner type={banner.type} message={banner.message} />}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/batches"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> {batch.code}
          </h1>
          <Badge
            variant="outline"
            className={
              batch.status === "Active"
                ? "text-green-600 border-green-600/30"
                : ""
            }
          >
            {batch.status}
          </Badge>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Farm</div>
          <div className="font-medium">{batch.farm}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Start Date</CardTitle>
            <CardDescription>
              {formatDateYYYYMMDD(batch.startDate)}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Initial Birds</CardTitle>
            <CardDescription>
              {batch.initialBirds.toLocaleString()}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Current Age</CardTitle>
            <CardDescription>— days</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="border-b">
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "outline"}
              className={
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "hover:border-primary hover:text-primary"
              }
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>

      {activeTab === "Overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Key Stats</CardTitle>
              <CardDescription>Snapshot of current performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">
                    Expense per Broiler
                  </div>
                  <div className="font-medium">
                    ₹{perBirdExpense.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">
                    Revenue per Broiler
                  </div>
                  <div className="font-medium">
                    ₹{perBirdRevenue.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total Expenses</div>
                  <div className="font-medium">
                    ₹{expensesTotal.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total Revenue</div>
                  <div className="font-medium">
                    ₹{salesTotal.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates for this batch</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full" /> Expense
                  added: Feed purchase
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full" /> Sales
                  recorded: 120 birds
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary rounded-full" /> Medicine
                  issued: Vitamin D3
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "Expenses" && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Expenses</CardTitle>
              <CardDescription>
                List of expenses broiler for this batch with all category
              </CardDescription>
            </div>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={openNewExpense}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0 rounded-lg overflow-hidden">
                <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Category</th>
                    <th className="text-left px-3 py-2 border-b">Details</th>
                    <th className="text-right px-3 py-2 border-b">Amount</th>
                    <th className="text-left px-3 py-2 border-b">Date</th>
                    <th className="text-left px-3 py-2 border-b">Notes</th>
                    <th className="text-right px-3 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((ex) => (
                    <tr key={ex.id} className="hover:bg-primary/5">
                      <td className="px-3 py-2 border-b">{ex.category}</td>
                      <td className="px-3 py-2 border-b">
                        {ex.category === "Feed" &&
                          `${ex.feedBrand ?? ""} • Qty ${ex.feedQuantity ?? 0} • Rate ₹${ex.feedRate?.toLocaleString()}`}
                        {ex.category === "Hatchery" &&
                          `${ex.hatcheryName ?? ""} • Qty ${ex.hatcheryQuantity ?? 0} • Rate ₹${ex.hatcheryRate?.toLocaleString()}`}
                        {ex.category === "Medicine" &&
                          `${ex.medicineName ?? ""} • Qty ${ex.medicineQuantity ?? 0} • Rate ₹${ex.medicineRate?.toLocaleString()}`}
                        {ex.category === "Other" &&
                          `${ex.otherName ?? ""} • Qty ${ex.otherQuantity ?? 0} • Rate ₹${ex.otherRate?.toLocaleString()}`}
                      </td>
                      <td className="px-3 py-2 border-b text-right">
                        ₹{ex.amount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 border-b">
                        {formatDateYYYYMMDD(ex.date)}
                      </td>
                      <td className="px-3 py-2 border-b">{ex.notes ?? "—"}</td>
                      <td className="px-3 py-2 border-b text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 mr-2"
                          onClick={() => openEditExpense(ex)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => deleteExpense(ex.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="px-3 py-2" colSpan={2}>
                      Total
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      ₹{expensesTotal.toLocaleString()}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "Sales" && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Sales</CardTitle>
              <CardDescription>Items sold from this batch</CardDescription>
            </div>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={openNewSale}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Sale
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0 rounded-lg overflow-hidden">
                <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Item</th>
                    <th className="text-right px-3 py-2 border-b">Rate</th>
                    <th className="text-right px-3 py-2 border-b">Quantity</th>
                    <th className="text-center px-3 py-2 border-b">
                      Remaining
                    </th>
                    <th className="text-left px-3 py-2 border-b">Customer</th>
                    <th className="text-left px-3 py-2 border-b">Contact</th>
                    <th className="text-left px-3 py-2 border-b">Category</th>
                    <th className="text-right px-3 py-2 border-b">Balance</th>
                    <th className="text-left px-3 py-2 border-b">Date</th>
                    <th className="text-right px-3 py-2 border-b">Amount</th>
                    <th className="text-right px-3 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((s) => (
                    <tr key={s.id} className="hover:bg-primary/5">
                      <td className="px-3 py-2 border-b">{s.item}</td>
                      <td className="px-3 py-2 border-b text-right">
                        ₹{s.rate.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 border-b text-right">
                        {s.quantity.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 border-b text-center">
                        {s.remaining ? "Yes" : "No"}
                      </td>
                      <td className="px-3 py-2 border-b">
                        {s.customer?.name ?? "—"}
                      </td>
                      <td className="px-3 py-2 border-b">
                        {s.customer?.contact ?? "—"}
                      </td>
                      <td className="px-3 py-2 border-b">
                        {s.customer?.category ?? "—"}
                      </td>
                      <td className="px-3 py-2 border-b text-right">
                        {s.customer
                          ? `₹${s.customer.balance.toLocaleString()}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 border-b">
                        {formatDateYYYYMMDD(s.date)}
                      </td>
                      <td className="px-3 py-2 border-b text-right">
                        ₹{(s.rate * s.quantity).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 border-b text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 mr-2"
                          onClick={() => openEditSale(s)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => deleteSale(s.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="px-3 py-2" colSpan={9}>
                      Total
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      ₹{salesTotal.toLocaleString()}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "Sales Balance" && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Customer Ledger</CardTitle>
              <CardDescription>
                Balances with customers for this batch
              </CardDescription>
            </div>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={openNewLedger}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0 rounded-lg overflow-hidden">
                <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur supports-[backdrop-filter]:bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Name</th>
                    <th className="text-left px-3 py-2 border-b">Contact</th>
                    <th className="text-left px-3 py-2 border-b">Category</th>
                    <th className="text-right px-3 py-2 border-b">Sales</th>
                    <th className="text-right px-3 py-2 border-b">Received</th>
                    <th className="text-right px-3 py-2 border-b">Balance</th>
                    <th className="text-right px-3 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((l) => (
                    <tr key={l.id} className="hover:bg-primary/5">
                      <td className="px-3 py-2 border-b">{l.name}</td>
                      <td className="px-3 py-2 border-b">{l.contact}</td>
                      <td className="px-3 py-2 border-b">{l.category}</td>
                      <td className="px-3 py-2 border-b text-right">
                        ₹{l.sales.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 border-b text-right">
                        ₹{l.received.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 border-b text-right">
                        ₹{l.balance.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 border-b text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 mr-2"
                          onClick={() => openEditLedger(l)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => deleteLedger(l.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="px-3 py-2" colSpan={5}>
                      Total Receivable
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      ₹{receivableTotal.toLocaleString()}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "Profit & Loss" && (
        <Card>
          <CardHeader>
            <CardTitle>Profit & Loss</CardTitle>
            <CardDescription>
              Computed from Sales and Expenses (mock)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Revenue (Sales)</span>
                  <span className="font-medium">
                    ₹{salesTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Expenses</span>
                  <span className="font-medium">
                    ₹{expensesTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Per-bird Revenue
                  </span>
                  <span className="font-medium">
                    ₹{perBirdRevenue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Per-bird Expense
                  </span>
                  <span className="font-medium">
                    ₹{perBirdExpense.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net Profit</span>
                  <span
                    className={
                      profit >= 0
                        ? "font-medium text-green-600"
                        : "font-medium text-red-600"
                    }
                  >
                    ₹{profit.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Receivable (from Ledger)
                  </span>
                  <span className="font-medium">
                    ₹{receivableTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense Modal */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpenseId(null);
        }}
        title={editingExpenseId ? "Edit Expense" : "Add Expense"}
      >
        <form onSubmit={submitExpense}>
          <ModalContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  value={expenseForm.category}
                  onChange={updateExpenseField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="Feed">Feed</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Hatchery">Hatchery</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={expenseForm.date}
                  onChange={updateExpenseField}
                />
                {expenseErrors.date && (
                  <p className="text-xs text-red-600 mt-1">
                    {expenseErrors.date}
                  </p>
                )}
              </div>
              {expenseForm.category === "Feed" && (
                <div className="md:col-span-2 grid md:grid-cols-3 gap-4 border rounded-md p-4">
                  <div>
                    <Label htmlFor="feedBrand">Feed Brand</Label>
                    <Input
                      id="feedBrand"
                      name="feedBrand"
                      value={expenseForm.feedBrand}
                      onChange={updateExpenseField}
                    />
                    {expenseErrors.feedBrand && (
                      <p className="text-xs text-red-600 mt-1">
                        {expenseErrors.feedBrand}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="feedQuantity">Quantity</Label>
                    <Input
                      id="feedQuantity"
                      name="feedQuantity"
                      type="number"
                      value={expenseForm.feedQuantity}
                      onChange={updateExpenseField}
                    />
                    {expenseErrors.feedQuantity && (
                      <p className="text-xs text-red-600 mt-1">
                        {expenseErrors.feedQuantity}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="feedRate">Rate per piece</Label>
                    <Input
                      id="feedRate"
                      name="feedRate"
                      type="number"
                      value={expenseForm.feedRate}
                      onChange={updateExpenseField}
                    />
                    {expenseErrors.feedRate && (
                      <p className="text-xs text-red-600 mt-1">
                        {expenseErrors.feedRate}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {expenseForm.category === "Hatchery" && (
                <div className="md:col-span-2 grid md:grid-cols-3 gap-4 border rounded-md p-4">
                  <div>
                    <Label htmlFor="hatcheryName">Hatchery Name</Label>
                    <Input
                      id="hatcheryName"
                      name="hatcheryName"
                      value={expenseForm.hatcheryName}
                      onChange={updateExpenseField}
                    />
                    {expenseErrors.hatcheryName && (
                      <p className="text-xs text-red-600 mt-1">
                        {expenseErrors.hatcheryName}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="hatcheryQuantity">Quantity</Label>
                    <Input
                      id="hatcheryQuantity"
                      name="hatcheryQuantity"
                      type="number"
                      value={expenseForm.hatcheryQuantity}
                      onChange={updateExpenseField}
                    />
                    {expenseErrors.hatcheryQuantity && (
                      <p className="text-xs text-red-600 mt-1">
                        {expenseErrors.hatcheryQuantity}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="hatcheryRate">Rate</Label>
                    <Input
                      id="hatcheryRate"
                      name="hatcheryRate"
                      type="number"
                      value={expenseForm.hatcheryRate}
                      onChange={updateExpenseField}
                    />
                    {expenseErrors.hatcheryRate && (
                      <p className="text-xs text-red-600 mt-1">
                        {expenseErrors.hatcheryRate}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {expenseForm.category === "Medicine" && (
                <div className="md:col-span-2 grid md:grid-cols-3 gap-4 border rounded-md p-4">
                  <div>
                    <Label htmlFor="medicineName">Medicine Name</Label>
                    <Input
                      id="medicineName"
                      name="medicineName"
                      value={expenseForm.medicineName}
                      onChange={updateExpenseField}
                    />
                    {expenseErrors.medicineName && (
                      <p className="text-xs text-red-600 mt-1">
                        {expenseErrors.medicineName}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="medicineQuantity">Quantity</Label>
                    <Input
                      id="medicineQuantity"
                      name="medicineQuantity"
                      type="number"
                      value={expenseForm.medicineQuantity}
                      onChange={updateExpenseField}
                    />
                    {expenseErrors.medicineQuantity && (
                      <p className="text-xs text-red-600 mt-1">
                        {expenseErrors.medicineQuantity}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="medicineRate">Rate</Label>
                    <Input
                      id="medicineRate"
                      name="medicineRate"
                      type="number"
                      value={expenseForm.medicineRate}
                      onChange={updateExpenseField}
                    />
                    {expenseErrors.medicineRate && (
                      <p className="text-xs text-red-600 mt-1">
                        {expenseErrors.medicineRate}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {expenseForm.category === "Other" && (
                <div className="md:col-span-2 grid md:grid-cols-3 gap-4 border rounded-md p-4">
                  <div>
                    <Label htmlFor="otherName">Expense Name</Label>
                    <Input
                      id="otherName"
                      name="otherName"
                      value={expenseForm.otherName}
                      onChange={updateExpenseField}
                    />
                    {expenseErrors.otherName && (
                      <p className="text-xs text-red-600 mt-1">
                        {expenseErrors.otherName}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="otherQuantity">Quantity</Label>
                    <Input
                      id="otherQuantity"
                      name="otherQuantity"
                      type="number"
                      value={expenseForm.otherQuantity}
                      onChange={updateExpenseField}
                    />
                    {expenseErrors.otherQuantity && (
                      <p className="text-xs text-red-600 mt-1">
                        {expenseErrors.otherQuantity}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="otherRate">Rate</Label>
                    <Input
                      id="otherRate"
                      name="otherRate"
                      type="number"
                      value={expenseForm.otherRate}
                      onChange={updateExpenseField}
                    />
                    {expenseErrors.otherRate && (
                      <p className="text-xs text-red-600 mt-1">
                        {expenseErrors.otherRate}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsExpenseModalOpen(false);
                setEditingExpenseId(null);
                setExpenseErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Save
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Sale Modal with errors */}
      <Modal
        isOpen={isSaleModalOpen}
        onClose={() => {
          setIsSaleModalOpen(false);
          setEditingSaleId(null);
        }}
        title={editingSaleId ? "Edit Sale" : "Add Sale"}
      >
        <form onSubmit={submitSale}>
          <ModalContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="item">Item</Label>
                <select
                  id="item"
                  name="item"
                  value={saleForm.item}
                  onChange={updateSaleField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="Chicken">Chicken</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label htmlFor="rate">Rate</Label>
                <Input
                  id="rate"
                  name="rate"
                  type="number"
                  value={saleForm.rate}
                  onChange={updateSaleField}
                />
                {saleErrors.rate && (
                  <p className="text-xs text-red-600 mt-1">{saleErrors.rate}</p>
                )}
              </div>
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  value={saleForm.quantity}
                  onChange={updateSaleField}
                />
                {saleErrors.quantity && (
                  <p className="text-xs text-red-600 mt-1">
                    {saleErrors.quantity}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={saleForm.date}
                  onChange={updateSaleField}
                />
              </div>
              <div className="col-span-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="remaining"
                    checked={saleForm.remaining}
                    onChange={updateSaleField}
                    className="h-4 w-4"
                  />
                  Remaining balance?
                </label>
              </div>
              {saleForm.remaining && (
                <div className="col-span-2 grid md:grid-cols-2 gap-4 border rounded-md p-4">
                  <div>
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                      id="customerName"
                      name="customerName"
                      value={saleForm.customerName}
                      onChange={updateSaleField}
                    />
                    {saleErrors.customerName && (
                      <p className="text-xs text-red-600 mt-1">
                        {saleErrors.customerName}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="contact">Contact</Label>
                    <Input
                      id="contact"
                      name="contact"
                      value={saleForm.contact}
                      onChange={updateSaleField}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      name="category"
                      value={saleForm.category}
                      onChange={updateSaleField}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    >
                      <option value="Chicken">Chicken</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="balance">Balance Amount</Label>
                    <Input
                      id="balance"
                      name="balance"
                      type="number"
                      value={saleForm.balance}
                      onChange={updateSaleField}
                    />
                    {saleErrors.balance && (
                      <p className="text-xs text-red-600 mt-1">
                        {saleErrors.balance}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsSaleModalOpen(false);
                setEditingSaleId(null);
                setSaleErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Save
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Ledger Modal with errors */}
      <Modal
        isOpen={isLedgerModalOpen}
        onClose={() => {
          setIsLedgerModalOpen(false);
          setEditingLedgerId(null);
        }}
        title={editingLedgerId ? "Edit Ledger Entry" : "Add Ledger Entry"}
      >
        <form onSubmit={submitLedger}>
          <ModalContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Customer Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={ledgerForm.name}
                  onChange={updateLedgerField}
                  required
                />
                {ledgerErrors.name && (
                  <p className="text-xs text-red-600 mt-1">
                    {ledgerErrors.name}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="contact">Contact</Label>
                <Input
                  id="contact"
                  name="contact"
                  value={ledgerForm.contact}
                  onChange={updateLedgerField}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  value={ledgerForm.category}
                  onChange={updateLedgerField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="Chicken">Chicken</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <Label htmlFor="sales">Sales</Label>
                <Input
                  id="sales"
                  name="sales"
                  type="number"
                  value={ledgerForm.sales}
                  onChange={updateLedgerField}
                />
              </div>
              <div>
                <Label htmlFor="received">Received</Label>
                <Input
                  id="received"
                  name="received"
                  type="number"
                  value={ledgerForm.received}
                  onChange={updateLedgerField}
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsLedgerModalOpen(false);
                setEditingLedgerId(null);
                setLedgerErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              Save
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
