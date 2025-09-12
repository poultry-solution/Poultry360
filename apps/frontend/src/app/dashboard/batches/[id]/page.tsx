/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
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
import { Layers, ArrowLeft, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, Column, createColumn } from "@/components/ui/data-table";
import {
  useGetBatchById,
  useGetBatchAnalytics,
} from "@/fetchers/batches/batchQueries";
import {
  useGetBatchExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useGetExpenseCategories,
} from "@/fetchers/expenses/expenseQueries";
import { useGetInventoryTableData } from "@/fetchers/inventory/inventoryQueries";
import { 
  useBatchSalesManagement,
  useGetCustomersForSales,
} from "@/fetchers/sale/saleQueries";

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
    phone: string;
    category: "Chicken" | "Other";
    balance: number;
  } | null;
  date: string; // yyyy-mm-dd
};

type LedgerRow = {
  id: string | number;
  name: string;
  phone: string;
  category: "Chicken" | "Other";
  sales: number;
  received: number;
  balance: number;
};

const TABS = [
  "Overview",
  "Expenses",
  "Sales",
  "Sales Balance",
  "Profit & Loss",
] as const;

function formatDateYYYYMMDD(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toISOString().split("T")[0];
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
  const batchId = params?.id;

  // Fetch batch data
  const {
    data: batchResponse,
    isLoading: batchLoading,
    error: batchError,
  } = useGetBatchById(batchId || "");

  // Fetch batch analytics
  const {
    data: analyticsResponse,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useGetBatchAnalytics(batchId || "");

  const batch = batchResponse?.data;
  const analytics = analyticsResponse?.data;

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Overview");

  // --- State (with localStorage persistence) ---
  const storageKey = (suffix: string) => `p360:batch:${batchId}:${suffix}`;

  // Fetch real expense data
  const {
    data: expensesResponse,
    isLoading: expensesLoading,
    error: expensesError,
  } = useGetBatchExpenses(batchId || "");

  const expenses = expensesResponse?.data || [];

  // Fetch expense categories
  const { data: categoriesResponse } = useGetExpenseCategories("EXPENSE");
  const expenseCategories = categoriesResponse?.data || [];

  // Fetch inventory items for selection (using table data for better structure)
  const { data: inventoryResponse } = useGetInventoryTableData();
  const inventoryItems = inventoryResponse?.data || [];

  // Fetch sales data for this batch
  const {
    sales: batchSales,
    categories: salesCategories,
    isLoading: salesLoading,
    error: salesError,
    createSale,
    updateSale,
    deleteSale,
    addPayment,
    isCreating,
    isUpdating,
    isDeleting,
    isAddingPayment,
    refetch: refetchSales,
  } = useBatchSalesManagement(batchId || "");

  // Customer search for sales
  const [customerSearch, setCustomerSearch] = useState("");
  const { data: customers = [] } = useGetCustomersForSales(customerSearch);

  // Inventory integration - using the new data structure
  const feedInventory = inventoryItems.filter(
    (item: any) => item.itemType === "FEED"
  );
  const medicineInventory = inventoryItems.filter(
    (item: any) => item.itemType === "MEDICINE"
  );

  // Calculate customer balances from sales data
  const customerBalances = useMemo(() => {
    if (!batchSales) return [];

     const customerMap = new Map<
       string,
       {
         id: string;
         name: string;
         phone: string;
         category: "Chicken" | "Other";
         sales: number;
         received: number;
         balance: number;
       }
     >();

    batchSales.forEach((sale: any) => {
      if (sale.isCredit && sale.customerId) {
        const customerId = sale.customerId;
        const existing = customerMap.get(customerId) || {
          id: customerId,
          name: sale.customer?.name || `Customer ${customerId.slice(-4)}`,
          phone: sale.customer?.phone || "—",
          category: (sale.customer?.category as "Chicken" | "Other") || "Chicken",
          sales: 0,
          received: 0,
          balance: 0,
        };

        existing.sales += Number(sale.amount);
        existing.received += Number(sale.paidAmount);
        existing.balance += Number(sale.dueAmount || 0);

        customerMap.set(customerId, existing);
      }
    });

    return Array.from(customerMap.values());
  }, [batchSales]);

  // Calculate total receivable from customer balances
  const receivableTotal = customerBalances.reduce(
    (sum, customer) => sum + customer.balance,
    0
  );

  // Expense mutations
  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const deleteExpenseMutation = useDeleteExpense();
  const [ledger, setLedger] = useState<LedgerRow[]>([]);

  // Load ledger data from localStorage
  useEffect(() => {
    try {
      const le = localStorage.getItem(storageKey("ledger"));
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

  // Save ledger data to localStorage
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
    const selectedFeed = inventoryItems.find((feed: any) => feed.id === feedId);
    if (selectedFeed) {
      console.log("selectedFeed", selectedFeed);
      setExpenseForm((prev) => ({
        ...prev,
        selectedFeedId: feedId,
        feedBrand: selectedFeed.name,
        feedRate: selectedFeed.rate?.toString() || "0",
      }));
    }
  }

  // Handle medicine selection from inventory
  function handleMedicineSelection(medicineId: string) {
    const selectedMedicine = inventoryItems.find(
      (medicine: any) => medicine.id === medicineId
    );
    if (selectedMedicine) {
      setExpenseForm((prev) => ({
        ...prev,
        selectedMedicineId: medicineId,
        medicineName: selectedMedicine.name,
        medicineRate: selectedMedicine.rate?.toString() || "0",
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
  function openEditExpense(row: any) {
    setEditingExpenseId(parseInt(row.id));
    setExpenseForm({
      category: row.category?.name || "Other",
      date: row.date ? new Date(row.date).toISOString().slice(0, 10) : "",
      notes: row.description || "",
      feedBrand: "",
      feedQuantity: row.quantity?.toString() || "",
      feedRate: row.unitPrice?.toString() || "",
      selectedFeedId: "",
      hatcheryName: "",
      hatcheryRate: row.unitPrice?.toString() || "",
      hatcheryQuantity: row.quantity?.toString() || "",
      medicineName: "",
      medicineRate: row.unitPrice?.toString() || "",
      medicineQuantity: row.quantity?.toString() || "",
      selectedMedicineId: "",
      otherName: "",
      otherRate: row.unitPrice?.toString() || "",
      otherQuantity: row.quantity?.toString() || "",
    });
    setIsExpenseModalOpen(true);
  }
  async function deleteExpense(id: number) {
    try {
      await deleteExpenseMutation.mutateAsync(id.toString());
      flash("success", "Expense deleted successfully");
    } catch (error) {
      console.error("Failed to delete expense:", error);
      flash("error", "Failed to delete expense. Please try again.");
    }
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
      if (!expenseForm.selectedFeedId)
        errs.feedBrand = "Please select a feed from inventory";
      if (!expenseForm.feedQuantity) errs.feedQuantity = "Quantity required";
      if (!expenseForm.feedRate) errs.feedRate = "Rate required";

      // Check if quantity exceeds available inventory
      if (expenseForm.selectedFeedId && expenseForm.feedQuantity) {
        const selectedFeed = feedInventory.find(
          (feed: any) => feed.id === expenseForm.selectedFeedId
        );

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
      if (!expenseForm.selectedMedicineId)
        errs.medicineName = "Please select a medicine from inventory";
      if (!expenseForm.medicineQuantity)
        errs.medicineQuantity = "Quantity required";
      if (!expenseForm.medicineRate) errs.medicineRate = "Rate required";

      // Check if quantity exceeds available inventory
      if (expenseForm.selectedMedicineId && expenseForm.medicineQuantity) {
        const selectedMedicine = medicineInventory.find(
          (medicine: any) => medicine.id === expenseForm.selectedMedicineId
        );
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
  async function submitExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!validateExpense()) {
      flash("error", "Please fill all required fields");
      return;
    }

    try {
      let amount = 0;
      let quantity = 0;
      let unitPrice = 0;
      let description = expenseForm.notes || "";
      let inventoryItems: any[] = [];

      const ec = expenseForm.category;

      // Find the appropriate category
      const category = expenseCategories.find((cat: any) =>
        cat.name.toLowerCase().includes(ec.toLowerCase())
      );

      if (!category) {
        flash("error", "Category not found. Please create the category first.");
        return;
      }

      if (ec === "Feed") {
        const q = Number(expenseForm.feedQuantity || 0);
        const r = Number(expenseForm.feedRate || 0);
        amount = q * r;
        quantity = q;
        unitPrice = r;
        description = `${expenseForm.feedBrand} - ${description}`;

        // Add inventory item if selected
        if (expenseForm.selectedFeedId && q > 0) {
          console.log("expenseForm.selectedFeedId", expenseForm.selectedFeedId);
          inventoryItems.push({
            itemId: expenseForm.selectedFeedId,
            quantity: q,
            notes: `Feed: ${expenseForm.feedBrand}`,
          });
        }
      } else if (ec === "Hatchery") {
        const q = Number(expenseForm.hatcheryQuantity || 0);
        const r = Number(expenseForm.hatcheryRate || 0);
        amount = q * r;
        quantity = q;
        unitPrice = r;
        description = `${expenseForm.hatcheryName} - ${description}`;
      } else if (ec === "Medicine") {
        const q = Number(expenseForm.medicineQuantity || 0);
        const r = Number(expenseForm.medicineRate || 0);
        amount = q * r;
        quantity = q;
        unitPrice = r;
        description = `${expenseForm.medicineName} - ${description}`;

        // Add inventory item if selected
        if (expenseForm.selectedMedicineId && q > 0) {
          inventoryItems.push({
            itemId: expenseForm.selectedMedicineId,
            quantity: q,
            notes: `Medicine: ${expenseForm.medicineName}`,
          });
        }
      } else {
        const q = Number(expenseForm.otherQuantity || 0);
        const r = Number(expenseForm.otherRate || 0);
        amount = q * r;
        quantity = q;
        unitPrice = r;
        description = `${expenseForm.otherName} - ${description}`;
      }

      const expenseData = {
        date: expenseForm.date
          ? new Date(expenseForm.date).toISOString()
          : new Date().toISOString(),
        amount,
        description,
        quantity,
        unitPrice,
        farmId: batch?.farmId,
        batchId: batchId,
        categoryId: category.id,
        inventoryItems: inventoryItems.length > 0 ? inventoryItems : undefined,
      };

      if (editingExpenseId) {
        // Update existing expense
        await updateExpenseMutation.mutateAsync({
          id: editingExpenseId.toString(),
          data: expenseData,
        });
        flash("success", "Expense updated successfully");
      } else {
        // Create new expense
        await createExpenseMutation.mutateAsync(expenseData);
        flash("success", "Expense added successfully");
      }

      setIsExpenseModalOpen(false);
      setEditingExpenseId(null);
      setExpenseErrors({});
    } catch (error) {
      console.error("Failed to save expense:", error);
      flash("error", "Failed to save expense. Please try again.");
    }
  }

  // --- Sales Modal ---
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<number | null>(null);
  const [saleForm, setSaleForm] = useState({
    item: "Chicken",
    rate: "",
    quantity: "",
    remaining: false,
    customerId: "",
    customerName: "",
    contact: "",
    categoryId: "",
    customerCategory: "Chicken",
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
    setSaleForm({
      item: "Chicken",
      rate: "",
      quantity: "",
      remaining: false,
      customerId: "",
      customerName: "",
      contact: "",
      categoryId: salesCategories[0]?.id || "",
      customerCategory: "Chicken",
      balance: "",
      date: new Date().toISOString().split("T")[0], // Set today's date in YYYY-MM-DD format
    });
    setCustomerSearch("");
    setIsSaleModalOpen(true);
  }
  function openEditSale(row: SaleRow) {
    setEditingSaleId(row.id);
    setSaleForm({
      item: row.item,
      rate: String(row.rate),
      quantity: String(row.quantity),
      remaining: row.remaining,
      customerId: "", // TODO: Get customer ID from sale data
      customerName: row.customer?.name || "",
      contact: row.customer?.phone || "",
      categoryId: "", // TODO: Get category ID from sale data
      customerCategory: row.customer?.category || "Chicken",
      balance: String(row.customer?.balance ?? ""),
      date: row.date,
    });
    setCustomerSearch("");
    setIsSaleModalOpen(true);
  }
  async function handleDeleteSale(id: string) {
    try {
      await deleteSale(id);
      flash("success", "Sale deleted successfully");
    } catch (error) {
      console.error("Failed to delete sale:", error);
      flash("error", "Failed to delete sale");
    }
  }

  const [saleErrors, setSaleErrors] = useState<Record<string, string>>({});
  function validateSale(): boolean {
    const errs: Record<string, string> = {};
    if (!saleForm.item) errs.item = "Item description required";
    if (!saleForm.rate) errs.rate = "Rate required";
    if (!saleForm.quantity) errs.quantity = "Quantity required";
    if (!saleForm.date) errs.date = "Date required";
    if (saleForm.remaining) {
      if (!saleForm.customerId && !saleForm.customerName) {
        errs.customerName = "Please select existing customer or enter new customer name";
      }
      if (!saleForm.customerId && !saleForm.contact) {
        errs.contact = "Contact number required for new customer";
      }
      // Validate that paid amount doesn't exceed total amount
      const totalAmount = Number(saleForm.rate || 0) * Number(saleForm.quantity || 0);
      const paidAmount = Number(saleForm.balance || 0);
      if (paidAmount > totalAmount) {
        errs.balance = `Paid amount cannot exceed total amount of ₹${totalAmount.toLocaleString()}`;
      }
    }
    setSaleErrors(errs);
    return Object.keys(errs).length === 0;
  }
  async function submitSale(e: React.FormEvent) {
    e.preventDefault();

    if (!validateSale()) return;

    try {
      const saleData: any = {
        date: saleForm.date
          ? `${saleForm.date}T00:00:00.000Z`
          : new Date().toISOString(),
        amount: Number(saleForm.rate || 0) * Number(saleForm.quantity || 0),
        quantity: Number(saleForm.quantity || 0),
        unitPrice: Number(saleForm.rate || 0),
        description: saleForm.item,
        isCredit: saleForm.remaining,
        paidAmount: saleForm.remaining
          ? Number(saleForm.balance || 0)
          : Number(saleForm.rate || 0) * Number(saleForm.quantity || 0),
        farmId: batch?.farmId,
        batchId: batchId,
        categoryId: saleForm.categoryId || salesCategories[0]?.id || "", // Use selected or first available category
      };

      // Handle customer data
      if (saleForm.customerId) {
        // Use existing customer
        saleData.customerId = saleForm.customerId;
      } else if (saleForm.remaining && saleForm.customerName && saleForm.contact) {
        // Create new customer
        saleData.customerData = {
          name: saleForm.customerName,
          phone: saleForm.contact,
          category: saleForm.customerCategory,
          address: "", // Could add address field later
        };
      }

      if (editingSaleId) {
        await updateSale({ id: String(editingSaleId), data: saleData });
        flash("success", "Sale updated successfully");
      } else {
        await createSale(saleData);
        flash("success", "Sale added successfully");
      }

      setIsSaleModalOpen(false);
      setEditingSaleId(null);
      setSaleErrors({});
    } catch (error) {
      console.error("Failed to save sale:", error);
      flash("error", "Failed to save sale");
    }
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

  // Payment management state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{
    id: string;
    name: string;
    balance: number;
  } | null>(null);

  // Transactions modal state
  const [isTransactionsModalOpen, setIsTransactionsModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  // Customer transactions modal state
  const [isCustomerTransactionsModalOpen, setIsCustomerTransactionsModalOpen] = useState(false);
  const [selectedCustomerForTransactions, setSelectedCustomerForTransactions] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    reference: "",
  });
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>(
    {}
  );
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
    setEditingLedgerId(typeof row.id === "string" ? parseInt(row.id) : row.id);
    setLedgerForm({
      name: row.name,
      contact: row.phone,
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
        (customerBalances.length
          ? Math.max(
              ...customerBalances.map((r) =>
                typeof r.id === "number" ? r.id : parseInt(r.id)
              )
            ) + 1
          : 1),
      name: ledgerForm.name,
      phone: ledgerForm.contact,
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

  // Transactions modal function
  function openTransactionsModal(sale: any) {
    setSelectedSale(sale);
    setIsTransactionsModalOpen(true);
  }

  // Customer transactions modal function
  function openCustomerTransactionsModal(customer: any) {
    setSelectedCustomerForTransactions(customer);
    setIsCustomerTransactionsModalOpen(true);
  }

  // Payment management functions
  function openPaymentModal(customer: {
    id: string;
    name: string;
    balance: number;
  }) {
    setSelectedCustomer(customer);
    setPaymentForm({
      amount: "",
      date: new Date().toISOString().split("T")[0],
      description: `Payment from ${customer.name}`,
      reference: "",
    });
    setPaymentErrors({});
    setIsPaymentModalOpen(true);
  }

  function updatePaymentField(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setPaymentForm((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (paymentErrors[name]) {
      setPaymentErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }

  function validatePayment(): boolean {
    const errors: Record<string, string> = {};
    if (!paymentForm.amount) errors.amount = "Amount is required";
    if (!paymentForm.date) errors.date = "Date is required";
    if (
      selectedCustomer &&
      Number(paymentForm.amount) > selectedCustomer.balance
    ) {
      errors.amount = `Amount cannot exceed balance of ₹${selectedCustomer.balance.toLocaleString()}`;
    }
    setPaymentErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!validatePayment() || !selectedCustomer) return;

    try {
      // Find the first credit sale for this customer to add payment to
      const customerSale = batchSales?.find(
        (sale: any) => sale.isCredit && sale.customerId === selectedCustomer.id
      );

      if (!customerSale) {
        flash("error", "No credit sale found for this customer");
        return;
      }

      // Add payment using the existing addPayment function
      await addPayment({
        saleId: customerSale.id,
        data: {
          amount: Number(paymentForm.amount),
          date: paymentForm.date,
          description: paymentForm.description,
        },
      });

      flash("success", "Payment recorded successfully!");
      setIsPaymentModalOpen(false);
      setPaymentForm({
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        reference: "",
      });
      setSelectedCustomer(null);
    } catch (error) {
      console.error("Failed to record payment:", error);
      flash("error", "Failed to record payment");
    }
  }

  // Loading state
  if (batchLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading batch details...</span>
      </div>
    );
  }

  // Error state
  if (batchError || !batch) {
    return notFound();
  }

  // Calculate totals from real data
  const salesTotal =
    batchSales?.reduce(
      (sum: number, sale: any) => sum + Number(sale.amount),
      0
    ) || 0;
  const expensesTotal =
    (batch as any).expenses?.reduce(
      (sum: number, ex: any) => sum + Number(ex.amount),
      0
    ) || 0;

  const profit = salesTotal - expensesTotal;
  const perBirdRevenue = batch.initialChicks
    ? salesTotal / batch.initialChicks
    : 0;
  const perBirdExpense = batch.initialChicks
    ? expensesTotal / batch.initialChicks
    : 0;

  // Calculate current age in days
  const currentAge = Math.ceil(
    (new Date().getTime() - new Date(batch.startDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );

  // Column configurations for DataTable
  const expenseColumns: Column<any>[] = [
    createColumn("category", "Category", {
      type: "badge",
      width: "120px",
      render: (_, row) => (
        <Badge
          variant="secondary"
          className={
            row.category?.name === "Feed"
              ? "bg-blue-100 text-blue-800"
              : row.category?.name === "Medicine"
                ? "bg-red-100 text-red-800"
                : row.category?.name === "Hatchery"
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
          }
        >
          {row.category?.name || "Other"}
        </Badge>
      ),
    }),
    createColumn("details", "Details", {
      render: (_, row) => {
        const details = [];
        if (row.quantity) details.push(`Qty: ${row.quantity}`);
        if (row.unitPrice)
          details.push(`Rate: ₹${Number(row.unitPrice).toLocaleString()}`);
        if (row.inventoryUsages && row.inventoryUsages.length > 0) {
          const items = row.inventoryUsages
            .map(
              (usage: any) =>
                `${usage.item.name} (${usage.quantity}${usage.item.unit})`
            )
            .join(", ");
          details.push(`Items: ${items}`);
        }
        return details.join(" • ") || row.description || "—";
      },
    }),
    createColumn("amount", "Amount", {
      type: "currency",
      align: "right",
      width: "120px",
      render: (value) => `₹${Number(value).toLocaleString()}`,
    }),
    createColumn("date", "Date", {
      type: "date",
      width: "100px",
      render: (value) => formatDateYYYYMMDD(value),
    }),
    createColumn("description", "Notes", {
      render: (value) => value || "—",
    }),
    {
      key: "actions",
      label: "Actions",
      type: "actions",
      align: "right",
      width: "120px",
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
      ),
    },
  ];

  const salesColumns: Column<any>[] = [
    createColumn("date", "Date", {
      type: "date",
      width: "100px",
      render: (value) => formatDateYYYYMMDD(value),
    }),
    createColumn("description", "Item", {
      type: "badge",
      width: "120px",
      render: (value) => (
        <Badge variant="secondary" className="bg-green-100 text-green-800">
          {value || "Sale"}
        </Badge>
      ),
    }),
    createColumn("quantity", "Quantity", {
      type: "number",
      align: "right",
      width: "100px",
    }),
    createColumn("unitPrice", "Rate", {
      type: "currency",
      align: "right",
      width: "100px",
    }),
    createColumn("amount", "Total", {
      type: "currency",
      align: "right",
      width: "120px",
    }),
    createColumn("isCredit", "Credit", {
      type: "badge",
      align: "center",
      width: "80px",
      render: (value) => (
        <Badge
          variant="secondary"
          className={
            value
              ? "bg-orange-100 text-orange-800"
              : "bg-gray-100 text-gray-800"
          }
        >
          {value ? "Yes" : "No"}
        </Badge>
      ),
    }),
    createColumn("paidAmount", "Paid", {
      type: "currency",
      align: "right",
      width: "100px",
      render: (value) => (value ? `₹${Number(value).toLocaleString()}` : "—"),
    }),
    createColumn("dueAmount", "Due", {
      type: "currency",
      align: "right",
      width: "100px",
      render: (value) => (value ? `₹${Number(value).toLocaleString()}` : "—"),
    }),
    {
      key: "transactions",
      label: "Transactions",
      type: "actions",
      align: "center",
      width: "120px",
      render: (_, row) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs hover:bg-blue-50 hover:border-blue-300"
          onClick={() => openTransactionsModal(row)}
        >
          View ({row.payments?.length || 0})
        </Button>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      type: "actions",
      align: "right",
      width: "120px",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300"
            onClick={() => openEditSale(row)}
            disabled={isUpdating}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300"
            onClick={() => handleDeleteSale(row.id)}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const ledgerColumns: Column<LedgerRow>[] = [
    createColumn("name", "Name", {
      render: (value) => <span className="font-medium">{value}</span>,
    }),
    createColumn("phone", "Phone"),
    createColumn("category", "Category", {
      type: "badge",
      render: (value) => (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
          {value}
        </Badge>
      ),
    }),
    createColumn("sales", "Sales", {
      type: "currency",
      align: "right",
      render: (value) => (
        <span className="font-medium">₹{Number(value).toLocaleString()}</span>
      ),
    }),
    createColumn("received", "Received", {
      type: "currency",
      align: "right",
      render: (value) => (
        <span className="text-green-600">₹{Number(value).toLocaleString()}</span>
      ),
    }),
    createColumn("balance", "Balance", {
      type: "currency",
      align: "right",
      render: (value) => {
        const numValue = Number(value);
        return (
          <span
            className={
              numValue > 0 ? "text-orange-600 font-bold" : "text-green-600 font-bold"
            }
          >
            ₹{numValue.toLocaleString()}
          </span>
        );
      },
    }),
    {
      key: "transactions",
      label: "Transactions",
      type: "actions",
      align: "center",
      width: "120px",
      render: (_, row) => {
        // Count total transactions for this customer
        const customerTransactions = batchSales?.filter((sale: any) => 
          sale.isCredit && sale.customerId === row.id
        ) || [];
        
        const totalPayments = customerTransactions.reduce((sum: number, sale: any) => 
          sum + (sale.payments?.length || 0), 0
        );

        return (
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs hover:bg-blue-50 hover:border-blue-300"
            onClick={() => openCustomerTransactionsModal(row)}
          >
            View ({totalPayments})
          </Button>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      type: "actions",
      align: "right",
      width: "160px",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          {row.balance > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs hover:bg-green-50 hover:border-green-300 hover:text-green-700"
              onClick={() =>
                openPaymentModal({
                  id: typeof row.id === "string" ? row.id : row.id.toString(),
                  name: row.name,
                  balance: row.balance,
                })
              }
            >
              <Plus className="h-3 w-3 mr-1" />
              Pay
            </Button>
          )}
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
            onClick={() =>
              deleteLedger(
                typeof row.id === "string" ? parseInt(row.id) : row.id
              )
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
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
            <Layers className="h-6 w-6 text-primary" /> {batch.batchNumber}
          </h1>
          <Badge
            variant="outline"
            className={
              batch.status === "ACTIVE"
                ? "text-green-600 border-green-600/30"
                : "text-gray-600 border-gray-600/30"
            }
          >
            {batch.status}
          </Badge>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Farm</div>
          <div className="font-medium">{batch.farm.name}</div>
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
              {batch.initialChicks.toLocaleString()}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Current Age</CardTitle>
            <CardDescription>{currentAge} days</CardDescription>
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
                  <div className="text-muted-foreground">Current Birds</div>
                  <div className="font-medium">
                    {batch.currentChicks?.toLocaleString() ||
                      batch.initialChicks.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Mortality Rate</div>
                  <div className="font-medium">
                    {analytics?.mortalityRate?.toFixed(2) || 0}%
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
                <div>
                  <div className="text-muted-foreground">Expense per Bird</div>
                  <div className="font-medium">
                    ₹{perBirdExpense.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Revenue per Bird</div>
                  <div className="font-medium">
                    ₹{perBirdRevenue.toFixed(2)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Batch Information</CardTitle>
              <CardDescription>Details about this batch</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Farm Owner:</span>
                  <span className="font-medium">{batch.farm.owner.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Initial Weight:</span>
                  <span className="font-medium">
                    {batch.initialChickWeight}g
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Days Active:</span>
                  <span className="font-medium">{currentAge} days</span>
                </div>
                {analytics?.currentAvgWeight && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Current Avg Weight:
                    </span>
                    <span className="font-medium">
                      {analytics.currentAvgWeight.toFixed(2)}g
                    </span>
                  </div>
                )}
                {analytics?.fcr && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FCR:</span>
                    <span className="font-medium">
                      {analytics.fcr.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
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
            {expensesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading expenses...</span>
              </div>
            ) : expensesError ? (
              <div className="text-center py-8">
                <p className="text-red-600">
                  Failed to load expenses. Please try again.
                </p>
              </div>
            ) : (
              <DataTable
                data={expenses}
                columns={expenseColumns}
                showFooter={true}
                footerContent={
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">
                      Total Expenses
                    </span>
                    <span className="font-bold text-lg text-gray-900">
                      ₹{expensesTotal.toLocaleString()}
                    </span>
                  </div>
                }
                emptyMessage="No expenses recorded yet"
              />
            )}
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
            {salesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading sales...</span>
              </div>
            ) : salesError ? (
              <div className="text-center py-8">
                <p className="text-red-600">Failed to load sales data</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchSales()}
                  className="mt-2"
                >
                  Retry
                </Button>
              </div>
            ) : (
              <DataTable
                data={batchSales || []}
                columns={salesColumns}
                showFooter={true}
                footerContent={
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">
                      Total Sales
                    </span>
                    <span className="font-bold text-lg text-green-600">
                      ₹{salesTotal.toLocaleString()}
                    </span>
                  </div>
                }
                emptyMessage="No sales recorded yet"
              />
            )}
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
              data={customerBalances}
              columns={ledgerColumns}
              showFooter={true}
              footerContent={
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">
                    Total Receivable
                  </span>
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
            <CardDescription>Computed from Sales and Expenses</CardDescription>
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
                {analytics?.profitMargin && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Profit Margin</span>
                    <span className="font-medium">
                      {analytics.profitMargin.toFixed(2)}%
                    </span>
                  </div>
                )}
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
                {analytics?.totalMortality && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total Mortality
                    </span>
                    <span className="font-medium text-red-600">
                      {analytics.totalMortality} birds
                    </span>
                  </div>
                )}
                {analytics?.totalFeedConsumption && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total Feed Consumed
                    </span>
                    <span className="font-medium">
                      {analytics.totalFeedConsumption.toFixed(2)} kg
                    </span>
                  </div>
                )}
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
                      {inventoryItems
                        .filter((item: any) => item.itemType === "FEED")
                        .map((feed: any) => (
                          <option key={feed.id} value={feed.id}>
                            {feed.name} ({feed.quantity} {feed.unit} available)
                            - ₹{feed.rate}/unit
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
                      placeholder={
                        expenseForm.selectedFeedId
                          ? "Auto-filled from inventory"
                          : "Enter rate"
                      }
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
                      {inventoryItems
                        .filter((item: any) => item.itemType === "MEDICINE")
                        .map((medicine: any) => (
                          <option key={medicine.id} value={medicine.id}>
                            {medicine.name} ({medicine.quantity} {medicine.unit}{" "}
                            available) - ₹{medicine.rate}/unit
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
                      className={
                        expenseForm.selectedMedicineId ? "bg-gray-50" : ""
                      }
                      placeholder={
                        expenseForm.selectedMedicineId
                          ? "Auto-filled from inventory"
                          : "Enter rate"
                      }
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
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={
                createExpenseMutation.isPending ||
                updateExpenseMutation.isPending
              }
            >
              {createExpenseMutation.isPending ||
              updateExpenseMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingExpenseId ? "Updating..." : "Creating..."}
                </>
              ) : (
                "Save"
              )}
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
                <Label htmlFor="item">Item Description</Label>
                <Input
                  id="item"
                  name="item"
                  value={saleForm.item}
                  onChange={updateSaleField}
                  placeholder="e.g., Chicken, Eggs, etc."
                />
                {saleErrors.item && (
                  <p className="text-xs text-red-600 mt-1">{saleErrors.item}</p>
                )}
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="categoryId"
                  value={saleForm.categoryId}
                  onChange={updateSaleField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  {salesCategories.map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
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
                {saleErrors.date && (
                  <p className="text-xs text-red-600 mt-1">{saleErrors.date}</p>
                )}
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
                    <Label htmlFor="customerSearch">Search Customer</Label>
                    <div className="relative">
                      <Input
                        id="customerSearch"
                        name="customerSearch"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        placeholder="Search existing customers..."
                        className="pr-8"
                      />
                      {customerSearch && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                          {customers.length > 0 ? (
                            customers.map((customer: any) => (
                              <div
                                key={customer.id}
                                className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onClick={() => {
                                  setSaleForm(prev => ({
                                    ...prev,
                                    customerId: customer.id,
                                    customerName: customer.name,
                                    contact: customer.phone,
                                    customerCategory: customer.category || "Chicken"
                                  }));
                                  setCustomerSearch("");
                                }}
                              >
                                <div className="font-medium">{customer.name}</div>
                                <div className="text-sm text-gray-500">{customer.phone}</div>
                                {customer.category && (
                                  <div className="text-xs text-blue-600">{customer.category}</div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-gray-500 text-sm">
                              No customers found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                      id="customerName"
                      name="customerName"
                      value={saleForm.customerName}
                      onChange={updateSaleField}
                      placeholder="Enter new customer name"
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
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      name="customerCategory"
                      value={saleForm.customerCategory || "Chicken"}
                      onChange={updateSaleField}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    >
                      <option value="Chicken">Chicken</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="balance">Amount Paid (Optional)</Label>
                    <Input
                      id="balance"
                      name="balance"
                      type="number"
                      value={saleForm.balance}
                      onChange={updateSaleField}
                      placeholder="Enter amount paid now (leave 0 for full credit)"
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
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingSaleId ? "Updating..." : "Creating..."}
                </>
              ) : (
                "Save"
              )}
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

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedCustomer(null);
          setPaymentForm({
            amount: "",
            date: new Date().toISOString().split("T")[0],
            description: "",
            reference: "",
          });
        }}
        title={`Record Payment - ${selectedCustomer?.name || ""}`}
      >
        <form onSubmit={submitPayment}>
          <ModalContent>
            <div className="space-y-4">
              {selectedCustomer && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-orange-800">
                      Outstanding Balance:
                    </span>
                    <span className="text-lg font-bold text-orange-900">
                      ₹{selectedCustomer.balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="amount">Payment Amount</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  value={paymentForm.amount}
                  onChange={updatePaymentField}
                  placeholder="Enter payment amount"
                  required
                />
                {paymentErrors.amount && (
                  <p className="text-xs text-red-600 mt-1">
                    {paymentErrors.amount}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="date">Payment Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={paymentForm.date}
                  onChange={updatePaymentField}
                  required
                />
                {paymentErrors.date && (
                  <p className="text-xs text-red-600 mt-1">
                    {paymentErrors.date}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  value={paymentForm.description}
                  onChange={updatePaymentField}
                  placeholder="Payment description"
                />
              </div>

              <div>
                <Label htmlFor="reference">Reference/Receipt No.</Label>
                <Input
                  id="reference"
                  name="reference"
                  value={paymentForm.reference}
                  onChange={updatePaymentField}
                  placeholder="Receipt number or reference"
                />
              </div>
            </div>
          </ModalContent>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPaymentModalOpen(false);
                setSelectedCustomer(null);
                setPaymentForm({
                  amount: "",
                  date: new Date().toISOString().split("T")[0],
                  description: "",
                  reference: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={isAddingPayment}
            >
              {isAddingPayment ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Payment"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Transactions Modal */}
      <Modal
        isOpen={isTransactionsModalOpen}
        onClose={() => {
          setIsTransactionsModalOpen(false);
          setSelectedSale(null);
        }}
        title={`Payment History - ${selectedSale?.description || "Sale"}`}
      >
        <ModalContent>
          {selectedSale && (
            <div className="space-y-4">
              {/* Sale Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Sale Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <span className="ml-2 font-medium">
                      {formatDateYYYYMMDD(selectedSale.date)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Amount:</span>
                    <span className="ml-2 font-medium">
                      ₹{Number(selectedSale.amount).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Paid:</span>
                    <span className="ml-2 font-medium text-green-600">
                      ₹{Number(selectedSale.paidAmount).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Due:</span>
                    <span className="ml-2 font-medium text-orange-600">
                      ₹{Number(selectedSale.dueAmount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Payment History</h4>
                {selectedSale.payments && selectedSale.payments.length > 0 ? (
                  <div className="space-y-3">
                    {selectedSale.payments.map((payment: any, index: number) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-semibold text-sm">
                              {index + 1}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              ₹{Number(payment.amount).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">
                              {formatDateYYYYMMDD(payment.date)}
                            </div>
                            {payment.description && (
                              <div className="text-xs text-gray-500">
                                {payment.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">
                            {new Date(payment.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No payments recorded yet</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsTransactionsModalOpen(false);
              setSelectedSale(null);
            }}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Customer Transactions Modal */}
      <Modal
        isOpen={isCustomerTransactionsModalOpen}
        onClose={() => {
          setIsCustomerTransactionsModalOpen(false);
          setSelectedCustomerForTransactions(null);
        }}
        title={`All Transactions - ${selectedCustomerForTransactions?.name || "Customer"}`}
      >
        <ModalContent>
          {selectedCustomerForTransactions && (
            <div className="space-y-4">
              {/* Customer Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Customer Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">{selectedCustomerForTransactions.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 font-medium">{selectedCustomerForTransactions.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Sales:</span>
                    <span className="ml-2 font-medium">
                      ₹{Number(selectedCustomerForTransactions.sales).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Received:</span>
                    <span className="ml-2 font-medium text-green-600">
                      ₹{Number(selectedCustomerForTransactions.received).toLocaleString()}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Outstanding Balance:</span>
                    <span className={`ml-2 font-bold ${
                      Number(selectedCustomerForTransactions.balance) > 0 
                        ? "text-orange-600" 
                        : "text-green-600"
                    }`}>
                      ₹{Number(selectedCustomerForTransactions.balance).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* All Sales and Payments */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Sales & Payment History</h4>
                {(() => {
                  const customerSales = batchSales?.filter((sale: any) => 
                    sale.isCredit && sale.customerId === selectedCustomerForTransactions.id
                  ) || [];

                  if (customerSales.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <p>No sales found for this customer</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {customerSales.map((sale: any, saleIndex: number) => (
                        <div key={sale.id} className="border border-gray-200 rounded-lg p-4">
                          {/* Sale Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-semibold text-sm">
                                  {saleIndex + 1}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">
                                  {sale.description} - {formatDateYYYYMMDD(sale.date)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Total: ₹{Number(sale.amount).toLocaleString()} | 
                                  Paid: ₹{Number(sale.paidAmount).toLocaleString()} | 
                                  Due: ₹{Number(sale.dueAmount || 0).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Payments for this sale */}
                          {sale.payments && sale.payments.length > 0 ? (
                            <div className="ml-11 space-y-2">
                              <div className="text-sm font-medium text-gray-700 mb-2">Payments:</div>
                              {sale.payments.map((payment: any, paymentIndex: number) => (
                                <div
                                  key={payment.id}
                                  className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded"
                                >
                                  <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                      <span className="text-green-600 font-semibold text-xs">
                                        {paymentIndex + 1}
                                      </span>
                                    </div>
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        ₹{Number(payment.amount).toLocaleString()}
                                      </div>
                                      <div className="text-xs text-gray-600">
                                        {formatDateYYYYMMDD(payment.date)}
                                        {payment.description && ` - ${payment.description}`}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(payment.createdAt).toLocaleDateString()}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="ml-11 text-sm text-gray-500">
                              No payments recorded for this sale
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsCustomerTransactionsModalOpen(false);
              setSelectedCustomerForTransactions(null);
            }}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
