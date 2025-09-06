/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { DataTable, Column, createActions, createColumn } from "@/components/ui/data-table";
import { useInventory } from "@/contexts/InventoryContext";

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
  
  // Inventory integration
  const { inventory, updateInventoryItem, getInventoryByCategory } = useInventory();
  const feedInventory = getInventoryByCategory('feed');
  const medicineInventory = getInventoryByCategory('medicine');

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
  }, [expenses, storageKey]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey("sales"), JSON.stringify(sales));
    } catch {}
  }, [sales, storageKey]);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey("ledger"), JSON.stringify(ledger));
    } catch {}
  }, [ledger, storageKey]);

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
    selectedFeedId: "", // New field for selected feed from inventory
    hatcheryName: "",
    hatcheryRate: "",
    hatcheryQuantity: "",
    medicineName: "",
    medicineRate: "",
    medicineQuantity: "",
    selectedMedicineId: "", // New field for selected medicine from inventory
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

  // Handle feed selection from inventory
  function handleFeedSelection(feedId: string) {
    const selectedFeed = feedInventory.find(feed => feed.id === feedId);
    if (selectedFeed) {
      setExpenseForm(prev => ({
        ...prev,
        selectedFeedId: feedId,
        feedBrand: selectedFeed.name,
        feedRate: selectedFeed.rate.toString()
      }));
    }
  }

  // Handle medicine selection from inventory
  function handleMedicineSelection(medicineId: string) {
    const selectedMedicine = medicineInventory.find(medicine => medicine.id === medicineId);
    if (selectedMedicine) {
      setExpenseForm(prev => ({
        ...prev,
        selectedMedicineId: medicineId,
        medicineName: selectedMedicine.name,
        medicineRate: selectedMedicine.rate.toString()
      }));
    }
  }
  function openNewExpense() {
    setEditingExpenseId(null);
    setExpenseForm({
      category: "Feed" as ExpenseCategory,
      date: "",
      notes: "",
      feedBrand: "",
      feedQuantity: "",
      feedRate: "",
      selectedFeedId: "",
      hatcheryName: "",
      hatcheryRate: "",
      hatcheryQuantity: "",
      medicineName: "",
      medicineRate: "",
      medicineQuantity: "",
      selectedMedicineId: "",
      otherName: "",
      otherRate: "",
      otherQuantity: "",
    });
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
      selectedFeedId: "", // For editing, we'll keep it empty to allow manual editing
      hatcheryName: row.hatcheryName?.toString() ?? "",
      hatcheryRate: row.hatcheryRate?.toString() ?? "",
      hatcheryQuantity: row.hatcheryQuantity?.toString() ?? "",
      medicineName: row.medicineName?.toString() ?? "",
      medicineRate: row.medicineRate?.toString() ?? "",
      medicineQuantity: row.medicineQuantity?.toString() ?? "",
      selectedMedicineId: "", // For editing, we'll keep it empty to allow manual editing
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
      if (!expenseForm.selectedFeedId) errs.feedBrand = "Please select a feed from inventory";
      if (!expenseForm.feedQuantity) errs.feedQuantity = "Quantity required";
      if (!expenseForm.feedRate) errs.feedRate = "Rate required";
      
      // Check if quantity exceeds available inventory
      if (expenseForm.selectedFeedId && expenseForm.feedQuantity) {
        const selectedFeed = feedInventory.find(feed => feed.id === expenseForm.selectedFeedId);
        const requestedQty = Number(expenseForm.feedQuantity);
        if (selectedFeed && requestedQty > selectedFeed.quantity) {
          errs.feedQuantity = `Only ${selectedFeed.quantity} ${selectedFeed.unit} available`;
        }
      }
    } else if (expenseForm.category === "Hatchery") {
      if (!expenseForm.hatcheryName)
        errs.hatcheryName = "Hatchery name required";
      if (!expenseForm.hatcheryQuantity)
        errs.hatcheryQuantity = "Quantity required";
      if (!expenseForm.hatcheryRate) errs.hatcheryRate = "Rate required";
    } else if (expenseForm.category === "Medicine") {
      if (!expenseForm.selectedMedicineId) errs.medicineName = "Please select a medicine from inventory";
      if (!expenseForm.medicineQuantity)
        errs.medicineQuantity = "Quantity required";
      if (!expenseForm.medicineRate) errs.medicineRate = "Rate required";
      
      // Check if quantity exceeds available inventory
      if (expenseForm.selectedMedicineId && expenseForm.medicineQuantity) {
        const selectedMedicine = medicineInventory.find(medicine => medicine.id === expenseForm.selectedMedicineId);
        const requestedQty = Number(expenseForm.medicineQuantity);
        if (selectedMedicine && requestedQty > selectedMedicine.quantity) {
          errs.medicineQuantity = `Only ${selectedMedicine.quantity} ${selectedMedicine.unit} available`;
        }
      }
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

      // Update inventory - subtract used quantity
      if (expenseForm.selectedFeedId && q > 0) {
        const selectedFeed = feedInventory.find(feed => feed.id === expenseForm.selectedFeedId);
        if (selectedFeed) {
          const newQuantity = Math.max(0, selectedFeed.quantity - q);
          updateInventoryItem(expenseForm.selectedFeedId, {
            quantity: newQuantity,
            totalValue: newQuantity * selectedFeed.rate
          });
        }
      }
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

      // Update inventory - subtract used quantity
      if (expenseForm.selectedMedicineId && q > 0) {
        const selectedMedicine = medicineInventory.find(medicine => medicine.id === expenseForm.selectedMedicineId);
        if (selectedMedicine) {
          const newQuantity = Math.max(0, selectedMedicine.quantity - q);
          updateInventoryItem(expenseForm.selectedMedicineId, {
            quantity: newQuantity,
            totalValue: newQuantity * selectedMedicine.rate
          });
        }
      }
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

  // Column configurations for DataTable
  const expenseColumns: Column<ExpenseRow>[] = [
    createColumn('category', 'Category', {
      type: 'badge',
      width: '120px',
      render: (value) => (
        <Badge 
          variant="secondary"
          className={
            value === "Feed" ? "bg-blue-100 text-blue-800" :
            value === "Medicine" ? "bg-red-100 text-red-800" :
            value === "Hatchery" ? "bg-green-100 text-green-800" :
            "bg-gray-100 text-gray-800"
          }
        >
          {value}
        </Badge>
      )
    }),
    createColumn('details', 'Details', {
      render: (_, row) => {
        if (row.category === "Feed") {
          return `${row.feedBrand ?? ""} • Qty ${row.feedQuantity ?? 0} • Rate ₹${row.feedRate?.toLocaleString()}`;
        } else if (row.category === "Hatchery") {
          return `${row.hatcheryName ?? ""} • Qty ${row.hatcheryQuantity ?? 0} • Rate ₹${row.hatcheryRate?.toLocaleString()}`;
        } else if (row.category === "Medicine") {
          return `${row.medicineName ?? ""} • Qty ${row.medicineQuantity ?? 0} • Rate ₹${row.medicineRate?.toLocaleString()}`;
        } else {
          return `${row.otherName ?? ""} • Qty ${row.otherQuantity ?? 0} • Rate ₹${row.otherRate?.toLocaleString()}`;
        }
      }
    }),
    createColumn('amount', 'Amount', {
      type: 'currency',
      align: 'right',
      width: '120px'
    }),
    createColumn('date', 'Date', {
      type: 'date',
      width: '100px',
      render: (value) => formatDateYYYYMMDD(value)
    }),
    createColumn('notes', 'Notes', {
      render: (value) => value || '—'
    }),
    {
      key: 'actions',
      label: 'Actions',
      type: 'actions',
      align: 'right',
      width: '120px',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300"
            onClick={() => openEditExpense(row)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300"
            onClick={() => deleteExpense(row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const salesColumns: Column<SaleRow>[] = [
    createColumn('item', 'Item', {
      type: 'badge',
      width: '100px',
      render: (value) => (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          {value}
        </Badge>
      )
    }),
    createColumn('rate', 'Rate', {
      type: 'currency',
      align: 'right',
      width: '100px'
    }),
    createColumn('quantity', 'Quantity', {
      type: 'number',
      align: 'right',
      width: '100px'
    }),
    createColumn('remaining', 'Remaining', {
      type: 'badge',
      align: 'center',
      width: '100px',
      render: (value) => (
        <Badge 
          variant="secondary"
          className={value ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800"}
        >
          {value ? "Yes" : "No"}
        </Badge>
      )
    }),
    createColumn('customerName', 'Customer', {
      render: (_, row) => row.customer?.name || '—'
    }),
    createColumn('customerContact', 'Contact', {
      render: (_, row) => row.customer?.contact || '—'
    }),
    createColumn('customerCategory', 'Category', {
      render: (_, row) => row.customer?.category ? (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          {row.customer.category}
        </Badge>
      ) : '—'
    }),
    createColumn('customerBalance', 'Balance', {
      type: 'currency',
      align: 'right',
      width: '120px',
      render: (_, row) => row.customer ? `₹${row.customer.balance.toLocaleString()}` : '—'
    }),
    createColumn('date', 'Date', {
      type: 'date',
      width: '100px',
      render: (value) => formatDateYYYYMMDD(value)
    }),
    createColumn('totalAmount', 'Amount', {
      type: 'currency',
      align: 'right',
      width: '120px',
      render: (_, row) => `₹${(row.rate * row.quantity).toLocaleString()}`
    }),
    {
      key: 'actions',
      label: 'Actions',
      type: 'actions',
      align: 'right',
      width: '120px',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300"
            onClick={() => openEditSale(row)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300"
            onClick={() => deleteSale(row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  const ledgerColumns: Column<LedgerRow>[] = [
    createColumn('name', 'Name', {
      render: (value) => <span className="font-medium">{value}</span>
    }),
    createColumn('contact', 'Contact'),
    createColumn('category', 'Category', {
      type: 'badge',
      render: (value) => (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          {value}
        </Badge>
      )
    }),
    createColumn('sales', 'Sales', {
      type: 'currency',
      align: 'right'
    }),
    createColumn('received', 'Received', {
      type: 'currency',
      align: 'right',
      render: (value) => <span className="text-green-600">₹{value.toLocaleString()}</span>
    }),
    createColumn('balance', 'Balance', {
      type: 'currency',
      align: 'right',
      render: (value) => (
        <span className={value > 0 ? 'text-orange-600 font-bold' : 'text-green-600 font-bold'}>
          ₹{value.toLocaleString()}
        </span>
      )
    }),
    {
      key: 'actions',
      label: 'Actions',
      type: 'actions',
      align: 'right',
      width: '120px',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300"
            onClick={() => openEditLedger(row)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300"
            onClick={() => deleteLedger(row.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

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
          <CardContent className="p-0">
            <DataTable
              data={expenses}
              columns={expenseColumns}
              showFooter={true}
              footerContent={
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Expenses</span>
                  <span className="font-bold text-lg text-gray-900">
                      ₹{expensesTotal.toLocaleString()}
                  </span>
            </div>
              }
              emptyMessage="No expenses recorded yet"
            />
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
          <CardContent className="p-0">
            <DataTable
              data={sales}
              columns={salesColumns}
              showFooter={true}
              footerContent={
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Sales</span>
                  <span className="font-bold text-lg text-green-600">
                      ₹{salesTotal.toLocaleString()}
                  </span>
            </div>
              }
              emptyMessage="No sales recorded yet"
            />
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
          <CardContent className="p-0">
            <DataTable
              data={ledger}
              columns={ledgerColumns}
              showFooter={true}
              footerContent={
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total Receivable</span>
                  <span className="font-bold text-lg text-orange-600">
                      ₹{receivableTotal.toLocaleString()}
                  </span>
            </div>
              }
              emptyMessage="No ledger entries yet"
            />
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
          setExpenseErrors({});
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
                    <Label htmlFor="selectedFeedId">Feed Brand</Label>
                    <select
                      id="selectedFeedId"
                      name="selectedFeedId"
                      value={expenseForm.selectedFeedId}
                      onChange={(e) => handleFeedSelection(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    >
                      <option value="">Select feed from inventory</option>
                      {feedInventory.map((feed) => (
                        <option key={feed.id} value={feed.id}>
                          {feed.name} ({feed.quantity} {feed.unit} available)
                        </option>
                      ))}
                    </select>
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
                      readOnly={!!expenseForm.selectedFeedId}
                      className={expenseForm.selectedFeedId ? "bg-gray-50" : ""}
                      placeholder={expenseForm.selectedFeedId ? "Auto-filled from inventory" : "Enter rate"}
                    />
                    {expenseErrors.feedRate && (
                      <p className="text-xs text-red-600 mt-1">
                        {expenseErrors.feedRate}
                      </p>
                    )}
                    {expenseForm.selectedFeedId && (
                      <p className="text-xs text-green-600 mt-1">
                        Rate auto-filled from inventory
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
                    <Label htmlFor="selectedMedicineId">Medicine Name</Label>
                    <select
                      id="selectedMedicineId"
                      name="selectedMedicineId"
                      value={expenseForm.selectedMedicineId}
                      onChange={(e) => handleMedicineSelection(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    >
                      <option value="">Select medicine from inventory</option>
                      {medicineInventory.map((medicine) => (
                        <option key={medicine.id} value={medicine.id}>
                          {medicine.name} ({medicine.quantity} {medicine.unit} available)
                        </option>
                      ))}
                    </select>
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
                      readOnly={!!expenseForm.selectedMedicineId}
                      className={expenseForm.selectedMedicineId ? "bg-gray-50" : ""}
                      placeholder={expenseForm.selectedMedicineId ? "Auto-filled from inventory" : "Enter rate"}
                    />
                    {expenseErrors.medicineRate && (
                      <p className="text-xs text-red-600 mt-1">
                        {expenseErrors.medicineRate}
                      </p>
                    )}
                    {expenseForm.selectedMedicineId && (
                      <p className="text-xs text-green-600 mt-1">
                        Rate auto-filled from inventory
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
