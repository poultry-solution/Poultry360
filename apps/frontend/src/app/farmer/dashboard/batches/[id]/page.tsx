/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, notFound } from "next/navigation";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import {
  Layers,
  ArrowLeft,
  Trash2,
  Loader2,
  CheckCircle,
} from "lucide-react";
import {
  useGetBatchById,
  useGetBatchAnalytics,
  useDeleteBatch,
  useCloseBatch,
  useVerifyPasswordForBatchDelete,
} from "@/fetchers/batches/batchQueries";
import {
  useGetBatchExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useGetExpenseCategories,
} from "@/fetchers/expenses/expenseQueries";
import { useGetInventoryTableData, useGetInventoryForExpense } from "@/fetchers/inventory/inventoryQueries";
import {
  useBatchSalesManagement,
  useGetCustomersForSales,
  useGetEggInventory,
} from "@/fetchers/sale/saleQueries";
import { useGetEggTypes } from "@/fetchers/eggTypes/eggTypeQueries";
import {
  useGetBatchMortalities,
  useCreateMortality,
  useUpdateMortality,
  useDeleteMortality,
} from "@/fetchers/mortality/mortalityQueries";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Label } from "@/common/components/ui/label";
import { Input } from "@/common/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { DateInput } from "@/common/components/ui/date-input";
import {
  useGetWeights,
  useGetGrowthChart,
  useAddWeight,
  useUpdateWeight,
  useDeleteWeight,
} from "@/fetchers/weight/weightQueries";
import { DateDisplay } from "@/common/components/ui/date-display";
import { ExpenseModal } from "@/components/batches/modals/ExpenseModal";
import { MortalityModal } from "@/components/batches/modals/MortalityModal";
import { WeightModal } from "@/components/batches/modals/WeightModal";
import { PaymentModal } from "@/components/batches/modals/PaymentModal";
import { CloseBatchModal } from "@/components/batches/modals/CloseBatchModal";
import { DeleteBatchModal } from "@/components/batches/modals/DeleteBatchModal";
import { TransactionsModal } from "@/components/batches/modals/TransactionsModal";
import { CustomerTransactionsModal } from "@/components/batches/modals/CustomerTransactionsModal";
import { LedgerModal } from "@/components/batches/modals/LedgerModal";
import { OverviewTab } from "@/components/batches/tabs/OverviewTab";
import { ExpensesTab } from "@/components/batches/tabs/ExpensesTab";
import { SalesTab } from "@/components/batches/tabs/SalesTab";
import { MortalityTab } from "@/components/batches/tabs/MortalityTab";
import { SalesBalanceTab } from "@/components/batches/tabs/SalesBalanceTab";
import { ProfitLossTab } from "@/components/batches/tabs/ProfitLossTab";
import { GrowthTab } from "@/components/batches/tabs/GrowthTab";
import { EggProductionTab } from "@/components/batches/tabs/EggProductionTab";
import { createExpenseColumns } from "@/components/batches/configs/expenseColumns";
import { createSalesColumns } from "@/components/batches/configs/salesColumns";
import { createMortalityColumns } from "@/components/batches/configs/mortalityColumns";
import { createLedgerColumns } from "@/components/batches/configs/ledgerColumns";
import { Banner } from "@/components/batches/sections/Banner";

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
  categoryId: string;
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

const BASE_TABS = [
  "Overview",
  "Expenses",
  "Sales",
  "Mortality",
  "Sales Balance",
  "Profit & Loss",
] as const;
// Growth for Broiler, Egg Production for Layers
type TabName = (typeof BASE_TABS)[number] | "Growth" | "Egg Production";


// helper banner

export default function BatchDetailPage() {
  const params = useParams<{ id: string }>();
  const batchId = params?.id;

  // Always call hooks with consistent parameters to avoid "hooks called conditionally" error
  // Even if batchId is empty, hooks will be disabled via `enabled: false` option
  const safeBatchId = batchId || "";

  // Fetch batch data
  const {
    data: batchResponse,
    isLoading: batchLoading,
    error: batchError,
  } = useGetBatchById(safeBatchId, { enabled: !!batchId });

  // Fetch batch analytics
  const {
    data: analyticsResponse,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useGetBatchAnalytics(safeBatchId, { enabled: !!batchId });

  const batch = batchResponse?.data;
  const analytics = analyticsResponse?.data;

  const tabs: TabName[] = batch
    ? [...BASE_TABS, (batch as any).batchType === "LAYERS" ? "Egg Production" : "Growth"]
    : [...BASE_TABS, "Growth"];

  const [activeTab, setActiveTab] = useState<TabName>("Overview");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // Close batch state
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closeBatchForm, setCloseBatchForm] = useState({
    endDate: "",
    finalNotes: "",
  });
  const [closeErrors, setCloseErrors] = useState<Record<string, string>>({});

  const deleteBatchMutation = useDeleteBatch();
  const closeBatchMutation = useCloseBatch();
  const verifyPasswordMutation = useVerifyPasswordForBatchDelete();

  // --- State (with localStorage persistence) ---
  const storageKey = useCallback(
    (suffix: string) => `p360:batch:${batchId}:${suffix}`,
    [batchId]
  );

  // Fetch real expense data
  const {
    data: expensesResponse,
    isLoading: expensesLoading,
    error: expensesError,
  } = useGetBatchExpenses(safeBatchId, { enabled: !!batchId });

  const expenses = expensesResponse?.data || [];

  // Fetch expense categories
  const { data: categoriesResponse } = useGetExpenseCategories("EXPENSE");
  const expenseCategories = categoriesResponse?.data || [];

  // Fetch inventory items (table data for other uses)
  const { data: inventoryResponse } = useGetInventoryTableData();
  const inventoryItems = inventoryResponse?.data || [];

  // Inventory for expense dropdowns: real InventoryItem id + currentStock (so deduction works)
  const { data: feedForExpenseRes } = useGetInventoryForExpense("FEED");
  const { data: medicineForExpenseRes } = useGetInventoryForExpense("MEDICINE");
  const feedInventoryForExpense = feedForExpenseRes?.data ?? [];
  const medicineInventoryForExpense = medicineForExpenseRes?.data ?? [];

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
  } = useBatchSalesManagement(safeBatchId, { enabled: !!batchId });

  // Customer search for sales
  const [customerSearch, setCustomerSearch] = useState("");
  const { data: customers = [] } = useGetCustomersForSales(customerSearch, {
    enabled: true,
  });

  // Fetch mortality data for this batch
  const {
    data: mortalityResponse,
    isLoading: mortalityLoading,
    error: mortalityError,
  } = useGetBatchMortalities(safeBatchId, { enabled: !!batchId });

  const batchMortalities = mortalityResponse?.data || [];
  const mortalityStats = mortalityResponse?.statistics;

  // Mortality mutations
  const createMortalityMutation = useCreateMortality();
  const updateMortalityMutation = useUpdateMortality();
  const deleteMortalityMutation = useDeleteMortality();

  // Per Broiler Expense Calculation (place before any early returns to keep hooks order stable)
  const perBroilerExpenseData = useMemo(() => {
    const expensesList: any[] = (expensesResponse?.data as any[]) || [];
    const totalExpenses = expensesList.reduce(
      (sum: number, ex: any) => sum + Number(ex.amount || 0),
      0
    );

    const totalSales = (batchSales || []).reduce(
      (sum: number, sale: any) => sum + Number(sale.amount || 0),
      0
    );

    const netExpenses = totalExpenses - totalSales;

    const initialBroilers = Number(batch?.initialChicks || 0);
    const totalMortality = Number(mortalityStats?.totalMortality || 0);
    const totalSold = Number(analytics?.totalSalesQuantity || 0);
    const remainingBroilers = Math.max(
      0,
      initialBroilers - (totalMortality + totalSold)
    );

    let perBroilerExpense = 0;
    let displayValue = 0;
    let isProfit = false;

    if (remainingBroilers > 0) {
      perBroilerExpense = netExpenses / remainingBroilers;
      if (perBroilerExpense < 0) {
        isProfit = true;
        displayValue = Math.abs(perBroilerExpense);
      } else {
        displayValue = perBroilerExpense;
      }
    } else if (initialBroilers > 0) {
      perBroilerExpense = netExpenses / initialBroilers;
      if (perBroilerExpense < 0) {
        isProfit = true;
        displayValue = Math.abs(perBroilerExpense);
      } else {
        displayValue = perBroilerExpense;
      }
    } else {
      displayValue = 0;
    }

    return {
      netExpenses,
      remainingBroilers,
      totalMortality,
      totalSold,
      perBroilerExpense,
      displayValue,
      isProfit,
    };
  }, [
    expensesResponse?.data,
    batchSales,
    batch?.initialChicks,
    mortalityStats?.totalMortality,
    analytics?.totalSalesQuantity,
  ]);

  console.log("perBroilerExpenseData", perBroilerExpenseData);

  // ==================== WEIGHTS (Growth) ====================
  const {
    data: weightsResponse,
    isLoading: weightsLoading,
    error: weightsError,
  } = useGetWeights(safeBatchId, undefined, { enabled: !!batchId });
  const addWeightMutation = useAddWeight(safeBatchId);
  const { data: growthChartResp } = useGetGrowthChart(safeBatchId, {
    enabled: !!batchId,
  });
  const currentWeight = weightsResponse?.data?.currentWeight ?? null;
  const weights = weightsResponse?.data?.weights || [];
  const growthChartData = growthChartResp?.data || [];

  // Manual weight form state
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [weightForm, setWeightForm] = useState({
    date: new Date().toISOString().split("T")[0],
    avgWeight: "",
    sampleCount: "",
    notes: "",
  });
  const [weightErrors, setWeightErrors] = useState<Record<string, string>>({});
  function updateWeightField(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setWeightForm((p) => ({ ...p, [name]: value }));
  }
  function validateWeight(): boolean {
    const errs: Record<string, string> = {};
    if (!weightForm.date) errs.date = "Date is required";
    if (!weightForm.avgWeight || Number(weightForm.avgWeight) <= 0)
      errs.avgWeight = "Avg weight (kg) is required";
    if (!weightForm.sampleCount || Number(weightForm.sampleCount) <= 0)
      errs.sampleCount = "Sample count is required";
    setWeightErrors(errs);
    return Object.keys(errs).length === 0;
  }
  async function submitWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!validateWeight()) return;
    try {
      await addWeightMutation.mutateAsync({
        date: `${weightForm.date}T00:00:00.000Z`,
        avgWeight: Number(weightForm.avgWeight),
        sampleCount: Number(weightForm.sampleCount),
        notes: weightForm.notes || undefined,
      });
      flash("success", "Weight recorded successfully");
      setIsWeightModalOpen(false);
      setWeightForm({
        date: new Date().toISOString().split("T")[0],
        avgWeight: "",
        sampleCount: "",
        notes: "",
      });
      setWeightErrors({});
    } catch (error) {
      console.error("Failed to save weight:", error);
      flash("error", "Failed to save weight. Please try again.");
    }
  }

  // ==================== CLOSE BATCH FUNCTIONS ====================

  function openCloseBatchModal() {
    setCloseBatchForm({
      endDate: new Date().toISOString().split("T")[0], // Today's date
      finalNotes: "",
    });
    setCloseErrors({});
    setIsCloseModalOpen(true);
  }

  function validateCloseBatch(): boolean {
    const errors: Record<string, string> = {};

    if (!closeBatchForm.endDate) {
      errors.endDate = "End date is required";
    } else {
      const endDate = new Date(closeBatchForm.endDate);
      const startDate = new Date(batch?.startDate || "");
      if (endDate < startDate) {
        errors.endDate = "End date cannot be before start date";
      }
    }

    setCloseErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submitCloseBatch(e: React.FormEvent) {
    e.preventDefault();

    if (!validateCloseBatch()) return;

    try {
      const result = await closeBatchMutation.mutateAsync({
        id: batchId,
        data: {
          endDate: closeBatchForm.endDate
            ? `${closeBatchForm.endDate}T23:59:59.999Z`
            : undefined,
          finalNotes: closeBatchForm.finalNotes || undefined,
        },
      });

      // Show success message with summary
      const summary = result.summary;
      flash(
        "success",
        `Batch closed successfully! Sold: ${summary.soldChicks}, Natural Deaths: ${summary.naturalMortality}, Remaining at Closure: ${summary.remainingAtClosure}, Total profit: ₹${summary.profit.toLocaleString()}`
      );

      setIsCloseModalOpen(false);
      setCloseBatchForm({
        endDate: "",
        finalNotes: "",
      });
      setCloseErrors({});
    } catch (error: any) {
      console.error("Close batch error:", error);
      flash("error", error?.response?.data?.message || "Failed to close batch");
    }
  }

  function updateCloseBatchField(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setCloseBatchForm((prev) => ({ ...prev, [name]: value }));
  }

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
          category:
            (sale.customer?.category as "Chicken" | "Other") || "Chicken",
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
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchId]);

  // Save ledger data to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey("ledger"), JSON.stringify(ledger));
    } catch { }
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
    extraName: "",
    extraAmount: "",
  });
  function updateExpenseField(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setExpenseForm((p) => ({ ...p, [name]: value }));
  }

  // Handle feed selection (from for-expense list – id is InventoryItem.id)
  function handleFeedSelection(feedId: string) {
    const selectedFeed = feedInventoryForExpense.find((f: any) => f.id === feedId);
    if (selectedFeed) {
      setExpenseForm((prev) => ({
        ...prev,
        selectedFeedId: feedId,
        feedBrand: selectedFeed.name,
        feedRate: String(selectedFeed.rate ?? 0),
      }));
    }
  }

  // Handle medicine selection (from for-expense list – id is InventoryItem.id)
  function handleMedicineSelection(medicineId: string) {
    const selectedMedicine = medicineInventoryForExpense.find((m: any) => m.id === medicineId);
    if (selectedMedicine) {
      setExpenseForm((prev) => ({
        ...prev,
        selectedMedicineId: medicineId,
        medicineName: selectedMedicine.name,
        medicineRate: String(selectedMedicine.rate ?? 0),
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
      extraName: "",
      extraAmount: "",
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
      extraName: "",
      extraAmount: "",
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
    const isExtra = expenseForm.category === "Add extra expenses";
    if (isExtra) {
      if (!expenseForm.extraName?.trim()) errs.extraName = "Name is required";
      const amt = Number(expenseForm.extraAmount);
      if (!expenseForm.extraAmount || isNaN(amt) || amt <= 0)
        errs.extraAmount = "Amount must be greater than 0";
    } else if (expenseForm.category === "Feed") {
      if (!expenseForm.selectedFeedId)
        errs.feedBrand = "Please select a feed from inventory";
      if (!expenseForm.feedQuantity) errs.feedQuantity = "Quantity required";
      if (!expenseForm.feedRate) errs.feedRate = "Rate required";
      if (expenseForm.selectedFeedId && expenseForm.feedQuantity) {
        const selectedFeed = feedInventoryForExpense.find(
          (f: any) => f.id === expenseForm.selectedFeedId
        );
        const requestedQty = Number(expenseForm.feedQuantity);
        const available = selectedFeed?.quantity ?? selectedFeed?.currentStock ?? 0;
        if (selectedFeed && requestedQty > available) {
          errs.feedQuantity = `Only ${available} ${selectedFeed.unit} available`;
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
      if (expenseForm.selectedMedicineId && expenseForm.medicineQuantity) {
        const selectedMedicine = medicineInventoryForExpense.find(
          (m: any) => m.id === expenseForm.selectedMedicineId
        );
        const requestedQty = Number(expenseForm.medicineQuantity);
        const available = selectedMedicine?.quantity ?? selectedMedicine?.currentStock ?? 0;
        if (selectedMedicine && requestedQty > available) {
          errs.medicineQuantity = `Only ${available} ${selectedMedicine.unit} available`;
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
      const inventoryItems: any[] = [];

      const ec = expenseForm.category;

      const category = expenseCategories.find((cat: any) =>
        cat.name.toLowerCase().includes(ec.toLowerCase())
      );

      if (!category) {
        flash("error", "Category not found. Please create the category first.");
        return;
      }

      if (ec === "Add extra expenses") {
        amount = Number(expenseForm.extraAmount);
        quantity = 1;
        unitPrice = amount;
        description = expenseForm.extraName.trim();
        if (expenseForm.notes?.trim()) description += ` - ${expenseForm.notes.trim()}`;
      } else if (ec === "Feed") {
        const q = Number(expenseForm.feedQuantity || 0);
        const r = Number(expenseForm.feedRate || 0);
        amount = q * r;
        quantity = q;
        unitPrice = r;
        description = `${expenseForm.feedBrand || "Feed"} - ${description}`;
        if (expenseForm.selectedFeedId && q > 0) {
          inventoryItems.push({
            itemId: expenseForm.selectedFeedId,
            quantity: q,
            notes: `Feed: ${expenseForm.feedBrand || "Feed"}`,
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
  type EggLineRow = { eggTypeId: string; quantity: string; unitPrice: string };
  const [saleForm, setSaleForm] = useState<{
    farmId: string;
    batchId: string;
    rate: string;
    quantity: string;
    weight: string;
    itemType: string;
    eggTypeId: string;
    eggLineItems: EggLineRow[];
    remaining: boolean;
    customerId: string;
    customerName: string;
    contact: string;
    customerCategory: string;
    balance: string;
    date: string;
  }>({
    farmId: "",
    batchId: "",
    rate: "",
    quantity: "",
    weight: "",
    itemType: "Chicken_Meat",
    eggTypeId: "",
    eggLineItems: [{ eggTypeId: "", quantity: "", unitPrice: "" }],
    remaining: false,
    customerId: "",
    customerName: "",
    contact: "",
    customerCategory: "Chicken",
    balance: "",
    date: new Date().toISOString().split("T")[0],
  });
  const { data: eggTypesData } = useGetEggTypes({ enabled: true });
  const eggTypes = eggTypesData?.data ?? [];
  const { data: eggInventoryResponse } = useGetEggInventory({
    enabled: isSaleModalOpen && saleForm.itemType === "EGGS",
  });
  const eggInventory = eggInventoryResponse?.data;
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
      farmId: batch?.farmId ?? "",
      batchId: batchId ?? "",
      rate: "",
      quantity: "",
      weight: "",
      itemType: "Chicken_Meat",
      eggTypeId: "",
      eggLineItems: [{ eggTypeId: "", quantity: "", unitPrice: "" }],
      remaining: false,
      customerId: "",
      customerName: "",
      contact: "",
      customerCategory: "Chicken",
      balance: "",
      date: new Date().toISOString().split("T")[0],
    });
    setCustomerSearch("");
    setIsSaleModalOpen(true);
  }
  function openEditSale(row: SaleRow) {
    setEditingSaleId(row.id);
    const r = row as any;
    const eggLines = r.eggLines as { eggTypeId: string; quantity: number; unitPrice: number }[] | undefined;
    const eggLineItems: EggLineRow[] =
      eggLines && eggLines.length > 0
        ? eggLines.map((l: { eggTypeId: string; quantity: number; unitPrice: number }) => ({
            eggTypeId: l.eggTypeId,
            quantity: String(l.quantity),
            unitPrice: String(l.unitPrice),
          }))
        : r.eggTypeId
          ? [{ eggTypeId: r.eggTypeId, quantity: String(row.quantity), unitPrice: String(row.rate) }]
          : [{ eggTypeId: "", quantity: "", unitPrice: "" }];
    setSaleForm({
      farmId: batch?.farmId ?? "",
      batchId: batchId ?? "",
      rate: String(row.rate),
      quantity: String(row.quantity),
      weight: String(r.weight || ""),
      itemType: r.itemType || "Chicken_Meat",
      eggTypeId: r.eggTypeId || "",
      eggLineItems,
      remaining: row.remaining,
      customerId: "",
      customerName: row.customer?.name || "",
      contact: row.customer?.phone || "",
      customerCategory: row.customer?.category || "Chicken",
      balance: String(row.customer?.balance ?? ""),
      date: row.date?.includes("T") ? row.date.split("T")[0] : row.date || new Date().toISOString().split("T")[0],
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
    if (saleForm.itemType === "EGGS") {
      const validLines = saleForm.eggLineItems.filter(
        (l) => l.eggTypeId && Number(l.quantity) > 0 && Number(l.unitPrice) > 0
      );
      if (validLines.length === 0) {
        errs.eggLineItems = "Add at least one egg line (type, quantity, rate)";
      }
    } else {
      if (!saleForm.rate) errs.rate = "Rate required";
      if (!saleForm.quantity) errs.quantity = "Quantity required";
    }
    if (saleForm.itemType === "Chicken_Meat") {
      if (!saleForm.weight) errs.weight = "Weight required for Chicken_Meat";
    }
    if (!saleForm.date) errs.date = "Date required";

    // Validate that weight makes sense for the quantity (basic sanity check)
    if (saleForm.itemType === "Chicken_Meat") {
      const quantity = Number(saleForm.quantity || 0);
      const weight = Number(saleForm.weight || 0);
      if (quantity > 0 && weight > 0) {
        const avgWeightPerBird = weight / quantity;
        if (avgWeightPerBird < 0.5 || avgWeightPerBird > 5) {
          errs.weight = `Average weight per bird (${avgWeightPerBird.toFixed(2)}kg) seems unrealistic. Please check your values.`;
        }
      }
    }

    if (saleForm.remaining) {
      if (!saleForm.customerId && !saleForm.customerName) {
        errs.customerName =
          "Please select existing customer or enter new customer name";
      }
      if (!saleForm.customerId && !saleForm.contact) {
        errs.contact = "Contact number required for new customer";
      }
      let totalAmount: number;
      if (saleForm.itemType === "EGGS" && saleForm.eggLineItems.length > 0) {
        totalAmount = saleForm.eggLineItems.reduce(
          (sum, l) => sum + Number(l.quantity || 0) * Number(l.unitPrice || 0),
          0
        );
      } else {
        totalAmount =
          saleForm.itemType === "Chicken_Meat"
            ? Number(saleForm.rate || 0) * Number(saleForm.weight || 0)
            : Number(saleForm.rate || 0) * Number(saleForm.quantity || 0);
      }
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
      let amount: number;
      let quantity: number;
      let unitPrice: number;
      let weight: number | null = null;

      if (saleForm.itemType === "EGGS") {
        const validLines = saleForm.eggLineItems.filter(
          (l) => l.eggTypeId && Number(l.quantity) > 0 && Number(l.unitPrice) > 0
        );
        quantity = validLines.reduce((s, l) => s + Number(l.quantity), 0);
        amount = validLines.reduce(
          (s, l) => s + Number(l.quantity) * Number(l.unitPrice),
          0
        );
        unitPrice = validLines.length > 0 ? Number(validLines[0].unitPrice) : 0;
      } else {
        quantity = parseFloat(saleForm.quantity);
        weight =
          saleForm.itemType === "Chicken_Meat"
            ? parseFloat(saleForm.weight)
            : null;
        unitPrice = parseFloat(saleForm.rate);
        amount =
          saleForm.itemType === "Chicken_Meat"
            ? unitPrice * (weight || 0)
            : unitPrice * quantity;
      }

      const paidAmount = saleForm.remaining
        ? saleForm.balance
          ? parseFloat(saleForm.balance)
          : 0
        : amount;
      const saleData: any = {
        date: saleForm.date
          ? `${saleForm.date}T00:00:00.000Z`
          : new Date().toISOString(),
        amount,
        quantity,
        weight: weight ?? undefined,
        unitPrice,
        description: undefined,
        isCredit: saleForm.remaining,
        paidAmount,
        farmId: saleForm.farmId || batch?.farmId,
        batchId: saleForm.batchId || batchId,
        itemType: saleForm.itemType,
      };
      if (saleForm.itemType === "EGGS") {
        const validLines = saleForm.eggLineItems.filter(
          (l) => l.eggTypeId && Number(l.quantity) > 0 && Number(l.unitPrice) > 0
        );
        if (validLines.length > 0) {
          saleData.eggLineItems = validLines.map((l) => ({
            eggTypeId: l.eggTypeId,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
          }));
        } else if (saleForm.eggTypeId) {
          saleData.eggTypeId = saleForm.eggTypeId;
        }
      }

      // Handle customer data
      if (saleForm.customerId) {
        // Use existing customer
        saleData.customerId = saleForm.customerId;
      } else if (
        saleForm.remaining &&
        saleForm.customerName &&
        saleForm.contact
      ) {
        // Create new customer
        saleData.customerData = {
          name: saleForm.customerName,
          phone: saleForm.contact,
          category: saleForm.customerCategory,
          address: "", // Could add address field later
        };
      }

      // birdsCount: subtract birds sold from batch current birds via mortality
      if (saleData.batchId && saleForm.itemType === "Chicken_Meat") {
        const birdsCount = Number(saleForm.quantity || 0);
        if (Number.isFinite(birdsCount) && birdsCount > 0) {
          saleData.birdsCount = birdsCount;
        }
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
  const [isCustomerTransactionsModalOpen, setIsCustomerTransactionsModalOpen] =
    useState(false);
  const [selectedCustomerForTransactions, setSelectedCustomerForTransactions] =
    useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    reference: "",
  });
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>(
    {}
  );

  // --- Mortality Modal ---
  const [isMortalityModalOpen, setIsMortalityModalOpen] = useState(false);
  const [editingMortalityId, setEditingMortalityId] = useState<string | null>(
    null
  );
  const [mortalityForm, setMortalityForm] = useState({
    date: "",
    count: "",
    reason: "Natural Death",
  });
  const [mortalityErrors, setMortalityErrors] = useState<
    Record<string, string>
  >({});

  function updateMortalityField(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setMortalityForm((p) => ({ ...p, [name]: value }));
  }

  function openNewMortality() {
    setEditingMortalityId(null);
    setMortalityForm({
      date: new Date().toISOString().split("T")[0],
      count: "",
      reason: "Natural Death",
    });
    setMortalityErrors({});
    setIsMortalityModalOpen(true);
  }

  function openEditMortality(row: any) {
    setEditingMortalityId(row.id);
    setMortalityForm({
      date: row.date ? new Date(row.date).toISOString().slice(0, 10) : "",
      count: String(row.count),
      reason: row.reason || "Natural Death",
    });
    setMortalityErrors({});
    setIsMortalityModalOpen(true);
  }

  async function deleteMortality(id: string) {
    try {
      await deleteMortalityMutation.mutateAsync(id);
      flash("success", "Mortality record deleted successfully");
    } catch (error) {
      console.error("Failed to delete mortality:", error);
      flash("error", "Failed to delete mortality record");
    }
  }

  function validateMortality(): boolean {
    const errs: Record<string, string> = {};
    if (!mortalityForm.date) errs.date = "Date is required";
    if (!mortalityForm.count) errs.count = "Count is required";
    const count = Number(mortalityForm.count || 0);
    if (count <= 0) errs.count = "Count must be greater than 0";

    // Check if count exceeds current available birds
    if (mortalityStats && count > mortalityStats.currentBirds) {
      errs.count = `Cannot record ${count} deaths. Only ${mortalityStats.currentBirds} birds available in batch`;
    }

    setMortalityErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submitMortality(e: React.FormEvent) {
    e.preventDefault();
    if (!validateMortality()) return;

    try {
      const mortalityData = {
        date: mortalityForm.date ? new Date(mortalityForm.date) : new Date(),
        count: Number(mortalityForm.count),
        reason: mortalityForm.reason || "Natural Death",
        batchId: batch?.id!,
      };

      if (editingMortalityId) {
        await updateMortalityMutation.mutateAsync({
          id: editingMortalityId,
          data: {
            date: mortalityData.date,
            count: mortalityData.count,
            reason: mortalityData.reason,
          },
        });
        flash("success", "Mortality record updated successfully");
      } else {
        await createMortalityMutation.mutateAsync(mortalityData);
        flash("success", "Mortality record added successfully");
      }

      setIsMortalityModalOpen(false);
      setEditingMortalityId(null);
      setMortalityErrors({});
    } catch (error: any) {
      console.error("Failed to save mortality:", error);
      flash(
        "error",
        error?.response?.data?.message || "Failed to save mortality record"
      );
    }
  }

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

  // Early return if no batchId to prevent hooks execution differences
  if (!batchId) {
    return notFound();
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

  // Check if batch is closed
  const isBatchClosed = batch.status === "COMPLETED";

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
  const expenseColumns = createExpenseColumns({
    isBatchClosed,
    openEditExpense,
    deleteExpense,
  });

  const salesColumns = createSalesColumns({
    isBatchClosed,
    isUpdating,
    isDeleting,
    openEditSale,
    handleDeleteSale,
    openTransactionsModal,
  });

  const mortalityColumns = createMortalityColumns({
    isBatchClosed,
    updateMortalityMutation,
    deleteMortalityMutation,
    openEditMortality,
    deleteMortality,
  });

  const ledgerColumns = createLedgerColumns({
    isBatchClosed,
    batchSales,
    openCustomerTransactionsModal,
    openPaymentModal,
    openEditLedger,
    deleteLedger,
  });

  return (
    <div className="space-y-6">
      {banner && <Banner type={banner.type} message={banner.message} />}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/farmer/dashboard/batches"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Link>
          <span className="text-muted-foreground">/</span>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" /> {batch.batchNumber}
          </h1>
          <Badge variant="secondary" className="font-normal">
            {(batch as any).batchType === "LAYERS" ? "Layers" : "Broiler"}
          </Badge>
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

      <div className="flex items-center justify-between">
        <div></div>
        <div className="flex items-center gap-2">
          {batch.status === "ACTIVE" && (
            <Button
              variant="outline"
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
              onClick={openCloseBatchModal}
              disabled={closeBatchMutation.isPending}
            >
              {closeBatchMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Closing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Close Batch
                </>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete Batch
          </Button>
        </div>
      </div>

      {/* Prompt to close when batch is active but birds are 0 */}
      {batch.status === "ACTIVE" && batch.currentChicks === 0 && (
        <Banner type="error" message="Batch appears finished. You can close the batch to finalize records and generate a summary." />
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Start Date</CardTitle>
            <CardDescription>
              <DateDisplay date={batch.startDate} format="short" />
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Current Chicks</CardTitle>
            <CardDescription>
              {batch.currentChicks.toLocaleString()}
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
        {tabs.map((tab) => (
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
        <OverviewTab
          batch={batch}
          analytics={analytics}
          isBatchClosed={isBatchClosed}
          currentAge={currentAge}
          perBroilerExpenseData={perBroilerExpenseData}
          salesTotal={salesTotal}
          expensesTotal={expensesTotal}
          mortalityStats={mortalityStats}
          recentExpenses={expenses.slice(0, 3)}
          recentSales={batchSales?.slice(0, 3) || []}
          recentMortalities={batchMortalities.slice(0, 3)}
        />
      )}

      {activeTab === "Expenses" && (
        <ExpensesTab
          isBatchClosed={isBatchClosed}
          expenses={expenses}
          expensesLoading={expensesLoading}
          expensesError={expensesError}
          expensesTotal={expensesTotal}
          expenseColumns={expenseColumns}
          openNewExpense={openNewExpense}
        />
      )}

      {activeTab === "Sales" && (
        <SalesTab
          isBatchClosed={isBatchClosed}
          batchSales={batchSales}
          salesLoading={salesLoading}
          salesError={salesError}
          salesTotal={salesTotal}
          salesColumns={salesColumns}
          openNewSale={openNewSale}
          refetchSales={refetchSales}
        />
      )}

      {activeTab === "Mortality" && (
        <MortalityTab
          isBatchClosed={isBatchClosed}
          batchMortalities={batchMortalities}
          mortalityLoading={mortalityLoading}
          mortalityError={mortalityError}
          mortalityStats={mortalityStats}
          mortalityColumns={mortalityColumns}
          openNewMortality={openNewMortality}
        />
      )}

      {activeTab === "Sales Balance" && (
        <SalesBalanceTab
          isBatchClosed={isBatchClosed}
          customerBalances={customerBalances}
          receivableTotal={receivableTotal}
          ledgerColumns={ledgerColumns}
          openNewLedger={openNewLedger}
        />
      )}

      {activeTab === "Profit & Loss" && (
        <ProfitLossTab
          batch={batch}
          analytics={analytics}
          salesTotal={salesTotal}
          expensesTotal={expensesTotal}
          profit={profit}
          perBroilerExpenseData={perBroilerExpenseData}
          receivableTotal={receivableTotal}
          perBirdRevenue={perBirdRevenue}
          expenseBreakdown={[]}
          salesBreakdown={[]}
        />
      )}

      {activeTab === "Growth" && batch && (batch as any).batchType !== "LAYERS" && (
        <GrowthTab
          isBatchClosed={isBatchClosed}
          weights={weights}
          weightsLoading={weightsLoading}
          weightsError={weightsError}
          growthChartData={growthChartData}
          setIsWeightModalOpen={setIsWeightModalOpen}
        />
      )}

      {activeTab === "Egg Production" && batchId && (
        <EggProductionTab
          batchId={batchId}
          isBatchClosed={isBatchClosed}
        />
      )}

      {/* Close Batch Modal */}
      <CloseBatchModal
        isOpen={isCloseModalOpen}
        onClose={() => {
          setIsCloseModalOpen(false);
          setCloseBatchForm({
            endDate: "",
            finalNotes: "",
          });
          setCloseErrors({});
        }}
        closeBatchForm={closeBatchForm}
        closeErrors={closeErrors}
        batch={batch}
        analytics={analytics}
        onSubmit={submitCloseBatch}
        onFieldUpdate={updateCloseBatchField}
        isPending={closeBatchMutation.isPending}
      />

      {/* Delete Batch Modal */}
      <DeleteBatchModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletePassword("");
        }}
        deletePassword={deletePassword}
        setDeletePassword={setDeletePassword}
        onDelete={async () => {
          if (!batchId) return;
          setIsBatchDeleting(true);
          try {
            const v = await verifyPasswordMutation.mutateAsync(deletePassword);
            if (!v?.success) {
              throw new Error(v?.message || "Password verification failed");
            }
            await deleteBatchMutation.mutateAsync(batchId);
            setIsDeleteModalOpen(false);
            setDeletePassword("");
            window.location.href = "/farmer/dashboard/batches";
          } catch (e: any) {
            alert(
              e?.response?.data?.message ||
              e?.message ||
              "Failed to delete batch"
            );
          } finally {
            setIsBatchDeleting(false);
          }
        }}
        isDeleting={isBatchDeleting}
      />

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpenseId(null);
          setExpenseErrors({});
        }}
        prefilledBatchId={batchId}
        prefilledFarmId={batch?.farmId}
        editingExpenseId={editingExpenseId}
        expenseForm={expenseForm}
        expenseErrors={expenseErrors}
        expenseCategories={expenseCategories}
        feedInventory={feedInventoryForExpense}
        medicineInventory={medicineInventoryForExpense}
        inventoryItems={inventoryItems}
        onSubmit={submitExpense}
        onFieldUpdate={updateExpenseField}
        onFeedSelection={handleFeedSelection}
        onMedicineSelection={handleMedicineSelection}
        isPending={createExpenseMutation.isPending || updateExpenseMutation.isPending}
      />

      {/* Sale Modal — same as sales-ledger New Sale, with farm/batch fixed from current batch */}
      <Modal
        isOpen={isSaleModalOpen}
        onClose={() => {
          setIsSaleModalOpen(false);
          setEditingSaleId(null);
          setSaleErrors({});
          setCustomerSearch("");
        }}
        title={editingSaleId ? "Edit Sale" : "Add Sale"}
      >
        <form onSubmit={submitSale}>
          <ModalContent>
            <div className="space-y-4">
              {/* Read-only: current farm & batch */}
              {batch && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                  <p className="text-sm text-gray-700">
                    <strong>Farm:</strong> {(batch as any).farm?.name ?? "—"} · <strong>Batch:</strong> {(batch as any).batchNumber ?? batchId}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="itemType">Item Type</Label>
                <Select
                  value={saleForm.itemType}
                  onValueChange={(value) => {
                    updateSaleField({ target: { name: "itemType", value } } as any);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select item type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="EGGS">Eggs</SelectItem>
                    <SelectItem value="Chicken_Meat">Layers (Meat)</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {saleForm.itemType === "EGGS" && (
                <div className="space-y-3">
                  <Label>Egg lines (type, quantity, rate per unit)</Label>
                  {eggInventory?.types && eggInventory.types.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Available: {eggInventory.types.map((t: { name: string; quantity: number }) => `${t.name} ${t.quantity}`).join(" · ")}
                    </p>
                  )}
                  {saleForm.eggLineItems.map((line, idx) => (
                    <div key={idx} className="flex flex-wrap items-end gap-2 p-2 border rounded-md bg-gray-50/50">
                      <div className="flex-1 min-w-[120px]">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={line.eggTypeId}
                          onValueChange={(value) => {
                            setSaleForm((p) => ({
                              ...p,
                              eggLineItems: p.eggLineItems.map((l, i) =>
                                i === idx ? { ...l, eggTypeId: value } : l
                              ),
                            }));
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Egg type" />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            {eggTypes.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-24">
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(e) => {
                            setSaleForm((p) => ({
                              ...p,
                              eggLineItems: p.eggLineItems.map((l, i) =>
                                i === idx ? { ...l, quantity: e.target.value } : l
                              ),
                            }));
                          }}
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                      <div className="w-28">
                        <Label className="text-xs">Rate (₹)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => {
                            setSaleForm((p) => ({
                              ...p,
                              eggLineItems: p.eggLineItems.map((l, i) =>
                                i === idx ? { ...l, unitPrice: e.target.value } : l
                              ),
                            }));
                          }}
                          placeholder="0"
                          className="h-9"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={() => {
                          setSaleForm((p) => ({
                            ...p,
                            eggLineItems: p.eggLineItems.filter((_, i) => i !== idx),
                          }));
                        }}
                        disabled={saleForm.eggLineItems.length <= 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSaleForm((p) => ({
                        ...p,
                        eggLineItems: [...p.eggLineItems, { eggTypeId: "", quantity: "", unitPrice: "" }],
                      }));
                    }}
                  >
                    Add line
                  </Button>
                  {saleErrors.eggLineItems && (
                    <p className="text-xs text-red-600">{saleErrors.eggLineItems}</p>
                  )}
                </div>
              )}

              {saleForm.itemType !== "EGGS" && (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rate">Rate (₹)</Label>
                    <Input
                      id="rate"
                      name="rate"
                      type="number"
                      value={saleForm.rate}
                      onChange={updateSaleField}
                      placeholder="Rate per unit"
                    />
                    {saleErrors.rate && (
                      <p className="text-xs text-red-600 mt-1">{saleErrors.rate}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="quantity">
                      {saleForm.itemType === "Chicken_Meat"
                        ? "Quantity (Birds)"
                        : "Quantity (Units)"}
                    </Label>
                    <Input
                      id="quantity"
                      name="quantity"
                      type="number"
                      value={saleForm.quantity}
                      onChange={updateSaleField}
                      placeholder={
                        saleForm.itemType === "Chicken_Meat"
                          ? "Number of birds"
                          : "Number of units"
                      }
                    />
                    {saleErrors.quantity && (
                      <p className="text-xs text-red-600 mt-1">{saleErrors.quantity}</p>
                    )}
                  </div>
                </div>
              )}

              {saleForm.itemType === "Chicken_Meat" && (
                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    name="weight"
                    type="number"
                    step="0.01"
                    value={saleForm.weight}
                    onChange={updateSaleField}
                    placeholder="Total weight in kg"
                  />
                  {saleErrors.weight && (
                    <p className="text-xs text-red-600 mt-1">{saleErrors.weight}</p>
                  )}
                  {saleForm.quantity && saleForm.weight && (
                    <p className="text-xs text-green-600 mt-1">
                      Avg weight per bird:{" "}
                      {(Number(saleForm.weight) / Number(saleForm.quantity)).toFixed(2)} kg
                    </p>
                  )}
                </div>
              )}

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Total Amount</span>
                  <span className="text-lg font-bold text-green-700">
                    ₹
                    {saleForm.itemType === "EGGS"
                      ? saleForm.eggLineItems
                          .reduce(
                            (s, l) => s + Number(l.quantity || 0) * Number(l.unitPrice || 0),
                            0
                          )
                          .toLocaleString()
                      : saleForm.itemType === "Chicken_Meat" && Number(saleForm.weight)
                        ? (Number(saleForm.rate || 0) * Number(saleForm.weight)).toLocaleString()
                        : (Number(saleForm.rate || 0) * Number(saleForm.quantity || 0)).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {saleForm.itemType === "EGGS"
                    ? "Sum of (quantity × rate) per line"
                    : saleForm.itemType === "Chicken_Meat"
                      ? "Calculated as rate × weight"
                      : "Calculated as rate × quantity"}
                </p>
              </div>

              <div>
                <DateInput
                  label="Date"
                  value={saleForm.date}
                  onChange={(v) =>
                    setSaleForm((p) => ({ ...p, date: v.includes("T") ? v.split("T")[0] : v }))
                  }
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
                <div className="grid md:grid-cols-2 gap-4 border rounded-md p-4">
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
                          {customers?.length > 0 ? (
                            customers.map((customer: any) => (
                              <div
                                key={customer.id}
                                className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                onClick={() => {
                                  setSaleForm((prev) => ({
                                    ...prev,
                                    customerId: customer.id,
                                    customerName: customer.name,
                                    contact: customer.phone,
                                    customerCategory: customer.category || "Chicken",
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
                            <div className="px-3 py-2 text-gray-500 text-sm">No customers found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customerName">Customer Name *</Label>
                    <Input
                      id="customerName"
                      name="customerName"
                      value={saleForm.customerName}
                      onChange={updateSaleField}
                      placeholder="Enter new customer name"
                    />
                    {saleErrors.customerName && (
                      <p className="text-xs text-red-600 mt-1">{saleErrors.customerName}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="contact">Contact *</Label>
                    <Input
                      id="contact"
                      name="contact"
                      value={saleForm.contact}
                      onChange={updateSaleField}
                      placeholder="Phone number"
                    />
                    {saleErrors.contact && (
                      <p className="text-xs text-red-600 mt-1">{saleErrors.contact}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="customerCategory">Customer Category</Label>
                    <Select
                      value={saleForm.customerCategory || "Chicken"}
                      onValueChange={(value) => {
                        updateSaleField({ target: { name: "customerCategory", value } } as any);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Chicken">Chicken</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="balance">Amount Paid (Optional)</Label>
                    <Input
                      id="balance"
                      name="balance"
                      type="number"
                      value={saleForm.balance}
                      onChange={updateSaleField}
                      placeholder="Amount paid (leave empty for full credit)"
                    />
                    {saleErrors.balance && (
                      <p className="text-xs text-red-600 mt-1">{saleErrors.balance}</p>
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
                setCustomerSearch("");
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
              ) : editingSaleId ? (
                "Update Sale"
              ) : (
                "Save"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Ledger Modal with errors */}
      <LedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => {
          setIsLedgerModalOpen(false);
          setEditingLedgerId(null);
          setLedgerErrors({});
        }}
        ledgerForm={ledgerForm}
        ledgerErrors={ledgerErrors}

        editingLedgerId={editingLedgerId}
        onSubmit={async (e) => {
          e.preventDefault();
          await submitLedger(e);
        }}
        onFieldUpdate={updateLedgerField}
      />

      {/* Payment Modal */}
      <PaymentModal
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
        selectedCustomer={selectedCustomer}
        paymentForm={paymentForm}
        paymentErrors={paymentErrors}
        onSubmit={submitPayment}
        onFieldUpdate={updatePaymentField}
        isPending={isAddingPayment}
      />

      {/* Transactions Modal */}
      <TransactionsModal
        isOpen={isTransactionsModalOpen}
        onClose={() => {
          setIsTransactionsModalOpen(false);
          setSelectedSale(null);
        }}
        selectedSale={selectedSale}
      />

      {/* Mortality Modal */}
      <MortalityModal
        isOpen={isMortalityModalOpen}
        onClose={() => {
          setIsMortalityModalOpen(false);
          setEditingMortalityId(null);
          setMortalityErrors({});
        }}
        prefilledBatchId={batchId}
        prefilledFarmId={batch?.farmId}
        editingMortalityId={editingMortalityId}
        mortalityForm={mortalityForm}
        mortalityErrors={mortalityErrors}
        stats={mortalityStats}
        onSubmit={submitMortality}
        onFieldUpdate={updateMortalityField}
        isPending={createMortalityMutation.isPending || updateMortalityMutation.isPending}
      />

      {/* Customer Transactions Modal */}
      <CustomerTransactionsModal
        isOpen={isCustomerTransactionsModalOpen}
        onClose={() => {
          setIsCustomerTransactionsModalOpen(false);
          setSelectedCustomerForTransactions(null);
        }}
        selectedCustomerForTransactions={selectedCustomerForTransactions}
        batchSales={batchSales}
      />

      {/* Weight Modal */}
      <WeightModal
        isOpen={isWeightModalOpen}
        onClose={() => {
          setIsWeightModalOpen(false);
          setWeightErrors({});
        }}
        prefilledBatchId={batchId}
        prefilledFarmId={batch?.farmId}
        weightForm={weightForm}
        weightErrors={weightErrors}
        onSubmit={submitWeight}
        onFieldUpdate={updateWeightField}
        isPending={addWeightMutation.isPending}
      />
    </div>
  );
}
