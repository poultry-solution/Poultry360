/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  Layers,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, Column, createColumn } from "@/components/ui/data-table";
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
import { useGetInventoryTableData } from "@/fetchers/inventory/inventoryQueries";
import {
  useBatchSalesManagement,
  useGetCustomersForSales,
} from "@/fetchers/sale/saleQueries";
import {
  useGetBatchMortalities,
  useCreateMortality,
  useUpdateMortality,
  useDeleteMortality,
} from "@/fetchers/mortality/mortalityQueries";
import { BatchSaleModel } from "@/components/ui/batchSaleModel";
import {
  useGetWeights,
  useGetGrowthChart,
  useAddWeight,
  useUpdateWeight,
  useDeleteWeight,
} from "@/fetchers/weight/weightQueries";
import WeightGrowthChart from "@/components/charts/WeightGrowthChart";

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

const TABS = [
  "Overview",
  "Expenses",
  "Sales",
  "Mortality",
  "Sales Balance",
  "Profit & Loss",
  "Growth",
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

  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Overview");
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
  } = useBatchSalesManagement(safeBatchId, { enabled: !!batchId });

  // Customer search for sales
  const [customerSearch, setCustomerSearch] = useState("");
  const { data: customers = [] } = useGetCustomersForSales(customerSearch);

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
  },
   [
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
      const inventoryItems: any[] = [];

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
    rate: "",
    quantity: "",
    weight: "",
    itemType: "Chicken_Meat",
    remaining: false,
    customerId: "",
    customerName: "",
    contact: "",
    customerCategory: "Chicken",
    balance: "",
    date: "",
    categoryId: "",
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
      rate: "",
      quantity: "",
      weight: "",
      itemType: "Chicken_Meat",
      remaining: false,
      customerId: "",
      customerName: "",
      contact: "",
      customerCategory: "Chicken",
      balance: "",
      date: new Date().toISOString().split("T")[0], // Set today's date in YYYY-MM-DD format
      categoryId: "",
    });
    setCustomerSearch("");
    setIsSaleModalOpen(true);
  }
  function openEditSale(row: SaleRow) {
    setEditingSaleId(row.id);
    setSaleForm({
      rate: String(row.rate),
      quantity: String(row.quantity),
      weight: String((row as any).weight || ""), // Get weight from sale data
      itemType: (row as any).itemType || "Chicken_Meat",
      remaining: row.remaining,
      customerId: "", // TODO: Get customer ID from sale data
      customerName: row.customer?.name || "",
      contact: row.customer?.phone || "",
      customerCategory: row.customer?.category || "Chicken",
      balance: String(row.customer?.balance ?? ""),
      date: row.date,
      categoryId: row.categoryId || "",
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
    if (!saleForm.rate) errs.rate = "Rate required";
    if (!saleForm.quantity) errs.quantity = "Quantity required";
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
      // Validate that paid amount doesn't exceed total amount
      const totalAmount =
        Number(saleForm.rate || 0) * Number(saleForm.weight || 0);
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
        amount:
          saleForm.itemType === "Chicken_Meat"
            ? Number(saleForm.rate || 0) * Number(saleForm.weight || 0)
            : Number(saleForm.rate || 0) * Number(saleForm.quantity || 0),
        quantity: Number(saleForm.quantity || 0),
        weight:
          saleForm.itemType === "Chicken_Meat"
            ? Number(saleForm.weight || 0)
            : null,
        unitPrice: Number(saleForm.rate || 0),
        description: undefined,
        isCredit: saleForm.remaining,
        paidAmount: saleForm.remaining
          ? Number(saleForm.balance || 0)
          : saleForm.itemType === "Chicken_Meat"
            ? Number(saleForm.rate || 0) * Number(saleForm.weight || 0)
            : Number(saleForm.rate || 0) * Number(saleForm.quantity || 0),
        farmId: batch?.farmId,
        batchId: batchId,
        itemType: saleForm.itemType,
        categoryId: saleForm.categoryId,
      };

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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
          {!isBatchClosed ? (
            <>
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
            </>
          ) : (
            <Badge
              variant="secondary"
              className="bg-gray-100 text-gray-500 text-xs"
            >
              Closed
            </Badge>
          )}
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
    createColumn("itemType", "Item Type", {
      type: "badge",
      width: "120px",
      render: (value) => {
        const itemTypeColors: Record<string, string> = {
          Chicken_Meat: "bg-green-100 text-green-800",
          EGGS: "bg-yellow-100 text-yellow-800",
          CHICKS: "bg-blue-100 text-blue-800",
          FEED: "bg-orange-100 text-orange-800",
          MEDICINE: "bg-red-100 text-red-800",
          EQUIPMENT: "bg-purple-100 text-purple-800",
          OTHER: "bg-gray-100 text-gray-800",
        };
        const colorClass =
          itemTypeColors[value as string] || "bg-gray-100 text-gray-800";

        return (
          <Badge variant="secondary" className={colorClass}>
            {value || "Sale"}
          </Badge>
        );
      },
    }),
    createColumn("quantity", "Quantity", {
      type: "number",
      align: "right",
      width: "100px",
    }),
    createColumn("weight", "Weight (kg)", {
      type: "number",
      align: "right",
      width: "100px",
      render: (value) => (value ? `${Number(value).toFixed(2)} kg` : "—"),
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
          {!isBatchClosed ? (
            <>
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
            </>
          ) : (
            <Badge
              variant="secondary"
              className="bg-gray-100 text-gray-500 text-xs"
            >
              Closed
            </Badge>
          )}
        </div>
      ),
    },
  ];

  const mortalityColumns: Column<any>[] = [
    createColumn("date", "Date", {
      type: "date",
      width: "120px",
      render: (value) => formatDateYYYYMMDD(value),
    }),
    createColumn("count", "Birds", {
      type: "number",
      align: "center",
      width: "100px",
      render: (value) => (
        <span className="font-medium text-red-600">{value}</span>
      ),
    }),
    createColumn("reason", "Reason", {
      width: "200px",
      render: (value) => (
        <Badge
          variant="secondary"
          className="bg-red-100 text-red-800 border-red-200"
        >
          {value || "Natural Death"}
        </Badge>
      ),
    }),
    {
      key: "actions",
      label: "Actions",
      type: "actions",
      align: "right",
      width: "120px",
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2">
          {!isBatchClosed ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300"
                onClick={() => openEditMortality(row)}
                disabled={updateMortalityMutation.isPending}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300"
                onClick={() => deleteMortality(row.id)}
                disabled={deleteMortalityMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Badge
              variant="secondary"
              className="bg-gray-100 text-gray-500 text-xs"
            >
              Closed
            </Badge>
          )}
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
        <span className="text-green-600">
          ₹{Number(value).toLocaleString()}
        </span>
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
              numValue > 0
                ? "text-orange-600 font-bold"
                : "text-green-600 font-bold"
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
        const customerTransactions =
          batchSales?.filter(
            (sale: any) => sale.isCredit && sale.customerId === row.id
          ) || [];

        const totalPayments = customerTransactions.reduce(
          (sum: number, sale: any) => sum + (sale.payments?.length || 0),
          0
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
          {!isBatchClosed ? (
            <>
              {row.balance > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs hover:bg-green-50 hover:border-green-300 hover:text-green-700"
                  onClick={() =>
                    openPaymentModal({
                      id:
                        typeof row.id === "string" ? row.id : row.id.toString(),
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
            </>
          ) : (
            <Badge
              variant="secondary"
              className="bg-gray-100 text-gray-500 text-xs"
            >
              Closed
            </Badge>
          )}
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
            href="/dashboard/batches"
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
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-orange-900">
                  Batch appears finished
                </div>
                <div className="text-sm text-orange-800">
                  Current birds are 0. You can close the batch to finalize
                  records and generate a summary.
                </div>
              </div>
              <div className="shrink-0">
                <Button
                  variant="outline"
                  className="text-orange-600 border-orange-200 hover:bg-orange-100"
                  onClick={openCloseBatchModal}
                  disabled={closeBatchMutation.isPending}
                >
                  {closeBatchMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Close Batch
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
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
        <div className="space-y-6">
          {/* Batch Status Banner */}
          {isBatchClosed && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-green-900">
                        Batch Completed
                      </h3>
                      <p className="text-sm text-green-700">
                        Closed on{" "}
                        {batch.endDate
                          ? formatDateYYYYMMDD(batch.endDate)
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-green-900">
                      {analytics?.daysActive || currentAge} days
                    </div>
                    <div className="text-sm text-green-700">Total Duration</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Metrics</CardTitle>
                <CardDescription>
                  {isBatchClosed
                    ? "Final performance summary"
                    : "Current performance snapshot"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Initial Birds:
                    </span>
                    <span className="font-medium">
                      {batch.initialChicks.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Current Weight:
                    </span>
                    <span className="font-medium">
                      {currentWeight
                        ? `${Number(currentWeight).toFixed(2)} kg`
                        : "—"}
                    </span>
                  </div>
                  {isBatchClosed ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Birds Sold:
                        </span>
                        <span className="font-medium text-green-600">
                          {analytics?.totalSalesQuantity?.toLocaleString() || 0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Natural Deaths:
                        </span>
                        <span className="font-medium text-red-600">
                          {mortalityStats?.totalMortality?.toLocaleString() ||
                            analytics?.totalMortality?.toLocaleString() ||
                            0}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Final Birds:
                        </span>
                        <span className="font-medium">0</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Current Birds:
                      </span>
                      <span className="font-medium">
                        {batch.currentChicks?.toLocaleString() ||
                          batch.initialChicks.toLocaleString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Mortality Rate:
                    </span>
                    <span
                      className={`font-medium ${Number(mortalityStats?.mortalityRate || analytics?.mortalityRate || 0) > 10 ? "text-red-600" : Number(mortalityStats?.mortalityRate || analytics?.mortalityRate || 0) > 5 ? "text-orange-600" : "text-green-600"}`}
                    >
                      {mortalityStats?.mortalityRate ||
                        analytics?.mortalityRate?.toFixed(2) ||
                        0}
                      %
                    </span>
                  </div>
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

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Financial Summary</CardTitle>
                <CardDescription>Revenue and cost breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total Revenue:
                    </span>
                    <span className="font-medium text-green-600">
                      ₹{salesTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total Expenses:
                    </span>
                    <span className="font-medium text-red-600">
                      ₹{expensesTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-medium">
                        Net Profit:
                      </span>
                      <span
                        className={`font-bold ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        ₹{profit.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Revenue per Bird:
                    </span>
                    <span className="font-medium">
                      ₹{perBirdRevenue.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Cost per Bird:
                    </span>
                    <span className="font-medium">
                      ₹{perBirdExpense.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-medium">
                        {perBroilerExpenseData.isProfit ? "Profit" : "Cost"} per
                        Broiler:
                      </span>
                      <span
                        className={`font-bold ${perBroilerExpenseData.isProfit ? "text-green-600" : "text-orange-600"}`}
                      >
                        ₹{perBroilerExpenseData.displayValue.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Based on {perBroilerExpenseData.remainingBroilers > 0
                        ? `${perBroilerExpenseData.remainingBroilers} remaining`
                        : "all"}{" "}
                      broilers
                    </div>
                  </div>
                  {/* {analytics?.profitMargin && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Profit Margin:
                      </span>
                      <span className="font-medium">
                        {analytics.profitMargin.toFixed(2)}%
                      </span>
                    </div>
                  )} */}
                </div>
              </CardContent>
            </Card>

            {/* Batch Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Batch Information</CardTitle>
                <CardDescription>Key details and timeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Farm Owner:</span>
                    <span className="font-medium">{batch.farm.owner.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="font-medium">
                      {formatDateYYYYMMDD(batch.startDate)}
                    </span>
                  </div>
                  {isBatchClosed && batch.endDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End Date:</span>
                      <span className="font-medium">
                        {formatDateYYYYMMDD(batch.endDate)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {isBatchClosed ? "Total Days:" : "Days Active:"}
                    </span>
                    <span className="font-medium">
                      {analytics?.daysActive || currentAge} days
                    </span>
                  </div>
                  {analytics?.currentAvgWeight && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {isBatchClosed
                          ? "Final Avg Weight:"
                          : "Current Avg Weight:"}
                      </span>
                      <span className="font-medium">
                        {analytics.currentAvgWeight.toFixed(2)}g
                      </span>
                    </div>
                  )}
                  {receivableTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Outstanding:
                      </span>
                      <span className="font-medium text-orange-600">
                        ₹{receivableTotal.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Closure Notes for Closed Batches */}
          {isBatchClosed && (batch as any).notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Batch Notes</CardTitle>
                <CardDescription>
                  Additional information and closure notes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {(batch as any).notes}
                </div>
              </CardContent>
            </Card>
          )}
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
            {!isBatchClosed && (
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={openNewExpense}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            )}
            {isBatchClosed && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                Batch Closed - No New Entries
              </Badge>
            )}
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
            {!isBatchClosed && (
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={openNewSale}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Sale
              </Button>
            )}
            {isBatchClosed && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                Batch Closed - No New Entries
              </Badge>
            )}
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

      {activeTab === "Mortality" && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Mortality Records</CardTitle>
              <CardDescription>
                Track natural deaths and disease-related losses
              </CardDescription>
            </div>
            {!isBatchClosed && (
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={openNewMortality}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Mortality
              </Button>
            )}
            {isBatchClosed && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                Batch Closed - No New Entries
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {mortalityLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading mortality records...</span>
              </div>
            ) : mortalityError ? (
              <div className="text-center py-8">
                <p className="text-red-600">
                  Failed to load mortality records. Please try again.
                </p>
              </div>
            ) : (
              <>
                {mortalityStats && (
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-gray-600">
                          Natural Deaths
                        </div>
                        <div className="text-lg font-semibold text-red-600">
                          {mortalityStats.totalMortality || 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          (Excluding sales)
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">
                          Current Birds
                        </div>
                        <div className="text-lg font-semibold text-green-600">
                          {mortalityStats.currentBirds || 0}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          (After all losses)
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">
                          Mortality Rate
                        </div>
                        <div
                          className={`text-lg font-semibold ${Number(mortalityStats.mortalityRate) > 10 ? "text-red-600" : Number(mortalityStats.mortalityRate) > 5 ? "text-orange-600" : "text-green-600"}`}
                        >
                          {mortalityStats.mortalityRate}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          (Natural only)
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">
                          Total Records
                        </div>
                        <div className="text-lg font-semibold text-gray-900">
                          {batchMortalities.length}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          (Disease/Natural)
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <DataTable
                  data={batchMortalities}
                  columns={mortalityColumns}
                  showFooter={mortalityStats ? true : false}
                  footerContent={
                    mortalityStats ? (
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">
                          Total Natural Deaths
                        </span>
                        <span className="font-bold text-lg text-red-600">
                          {mortalityStats.totalMortality || 0} birds
                        </span>
                      </div>
                    ) : undefined
                  }
                  emptyMessage="No mortality records yet"
                />
              </>
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
            {!isBatchClosed && (
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={openNewLedger}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Entry
              </Button>
            )}
            {isBatchClosed && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                Batch Closed - No New Entries
              </Badge>
            )}
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
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-900">
                    ₹{salesTotal.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-700">Total Revenue</div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-900">
                    ₹{expensesTotal.toLocaleString()}
                  </div>
                  <div className="text-sm text-red-700">Total Expenses</div>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`border-2 ${profit >= 0 ? "border-green-300 bg-green-100" : "border-red-300 bg-red-100"}`}
            >
              <CardContent className="pt-6">
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${profit >= 0 ? "text-green-900" : "text-red-900"}`}
                  >
                    ₹{profit.toLocaleString()}
                  </div>
                  <div
                    className={`text-sm ${profit >= 0 ? "text-green-700" : "text-red-700"}`}
                  >
                    Net Profit
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-900">
                    {analytics?.profitMargin
                      ? `${analytics.profitMargin.toFixed(1)}%`
                      : "0%"}
                  </div>
                  <div className="text-sm text-orange-700">Profit Margin</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per Broiler Expense Card */}
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Per Broiler Analysis</CardTitle>
              <CardDescription>
                Net expense/profit per remaining broiler
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground mb-2">
                      {perBroilerExpenseData.isProfit
                        ? "Profit per Broiler"
                        : "Cost per Broiler"}
                    </div>
                    <div
                      className={`text-3xl font-bold ${perBroilerExpenseData.isProfit ? "text-green-600" : "text-orange-600"}`}
                    >
                      ₹{perBroilerExpenseData.displayValue.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Initial Broilers:
                    </span>
                    <span className="font-medium">
                      {batch.initialChicks?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mortality:</span>
                    <span className="font-medium text-red-600">
                      -{perBroilerExpenseData.totalMortality?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sold:</span>
                    <span className="font-medium text-blue-600">
                      -{perBroilerExpenseData.totalSold?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground font-medium">
                      Remaining Broilers:
                    </span>
                    <span className="font-bold">
                      {perBroilerExpenseData.remainingBroilers?.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 border-t pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total Expenses:
                    </span>
                    <span className="font-medium text-red-600">
                      ₹{expensesTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Sales:</span>
                    <span className="font-medium text-green-600">
                      -₹{salesTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground font-medium">
                      Net Expenses:
                    </span>
                    <span
                      className={`font-bold ${perBroilerExpenseData.netExpenses >= 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      ₹{perBroilerExpenseData.netExpenses.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-xs text-blue-800">
                    <strong>Formula:</strong> Net Expenses ÷ Remaining Broilers
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    ({perBroilerExpenseData.netExpenses >= 0 ? "₹" : "-₹"}
                    {Math.abs(perBroilerExpenseData.netExpenses).toLocaleString()}{" "}
                    ÷ {perBroilerExpenseData.remainingBroilers || batch.initialChicks})
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Revenue Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue Analysis</CardTitle>
                <CardDescription>Breakdown of income sources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total Sales Amount:
                    </span>
                    <span className="font-medium text-green-600">
                      ₹{salesTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Amount Received:
                    </span>
                    <span className="font-medium text-green-600">
                      ₹{(salesTotal - receivableTotal).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Outstanding Amount:
                    </span>
                    <span className="font-medium text-orange-600">
                      ₹{receivableTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Revenue per Bird:
                      </span>
                      <span className="font-medium">
                        ₹{perBirdRevenue.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {analytics?.totalSalesQuantity && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Birds Sold:
                        </span>
                        <span className="font-medium">
                          {analytics.totalSalesQuantity.toLocaleString()}
                        </span>
                      </div>
                      {analytics?.totalSalesWeight && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Total Weight Sold:
                          </span>
                          <span className="font-medium">
                            {analytics.totalSalesWeight.toFixed(2)} kg
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {salesTotal > 0 && receivableTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Collection Rate:
                      </span>
                      <span className="font-medium">
                        {(
                          ((salesTotal - receivableTotal) / salesTotal) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost Analysis</CardTitle>
                <CardDescription>Breakdown of expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total Expenses:
                    </span>
                    <span className="font-medium text-red-600">
                      ₹{expensesTotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Cost per Bird:
                    </span>
                    <span className="font-medium">
                      ₹{perBirdExpense.toFixed(2)}
                    </span>
                  </div>
                  {batch.initialChicks > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Cost per Initial Bird:
                      </span>
                      <span className="font-medium">
                        ₹{(expensesTotal / batch.initialChicks).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {analytics?.totalSalesQuantity &&
                    analytics.totalSalesQuantity > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Cost per Bird Sold:
                        </span>
                        <span className="font-medium">
                          ₹
                          {(
                            expensesTotal / analytics.totalSalesQuantity
                          ).toFixed(2)}
                        </span>
                      </div>
                    )}

                  {analytics?.totalSalesWeight &&
                    analytics.totalSalesWeight > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Cost per Kg:
                        </span>
                        <span className="font-medium">
                          ₹
                          {(expensesTotal / analytics.totalSalesWeight).toFixed(
                            2
                          )}
                        </span>
                      </div>
                    )}
                  {/* {analytics?.totalFeedConsumption &&
                    analytics.totalFeedConsumption > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Total Feed Consumed:
                        </span>
                        <span className="font-medium">
                          {analytics.totalFeedConsumption.toFixed(2)} kg
                        </span>
                      </div>
                    )} */}
                  {analytics?.daysActive && analytics.daysActive > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Daily Average Cost:
                      </span>
                      <span className="font-medium">
                        ₹{(expensesTotal / analytics.daysActive).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Performance Indicators
                </CardTitle>
                <CardDescription>Key efficiency metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  {analytics?.mortalityRate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Mortality Rate:
                      </span>
                      <span
                        className={`font-medium ${analytics.mortalityRate > 10 ? "text-red-600" : analytics.mortalityRate > 5 ? "text-orange-600" : "text-green-600"}`}
                      >
                        {analytics.mortalityRate.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {analytics?.fcr && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        FCR (Feed Conversion):
                      </span>
                      <span
                        className={`font-medium ${analytics.fcr > 2.5 ? "text-red-600" : analytics.fcr > 2.0 ? "text-orange-600" : "text-green-600"}`}
                      >
                        {analytics.fcr.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {analytics?.currentAvgWeight && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {isBatchClosed
                          ? "Final Avg Weight:"
                          : "Current Avg Weight:"}
                      </span>
                      <span className="font-medium">
                        {analytics.currentAvgWeight.toFixed(2)}g
                      </span>
                    </div>
                  )}
                  {analytics?.daysActive && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {isBatchClosed ? "Total Days:" : "Days Active:"}
                      </span>
                      <span className="font-medium">
                        {analytics.daysActive} days
                      </span>
                    </div>
                  )}
                  {profit !== 0 && batch.initialChicks > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Profit per Bird:
                      </span>
                      <span
                        className={`font-medium ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        ₹{(profit / batch.initialChicks).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {analytics?.totalSalesWeight &&
                    analytics.totalSalesWeight > 0 &&
                    profit !== 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Profit per Kg:
                        </span>
                        <span
                          className={`font-medium ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          ₹{(profit / analytics.totalSalesWeight).toFixed(2)}
                        </span>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>

            {/* ROI & Efficiency */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Return on Investment
                </CardTitle>
                <CardDescription>
                  Investment efficiency analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  {expensesTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        ROI Percentage:
                      </span>
                      <span
                        className={`font-medium ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {((profit / expensesTotal) * 100).toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {analytics?.profitMargin && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Profit Margin:
                      </span>
                      <span
                        className={`font-medium ${analytics.profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {analytics.profitMargin.toFixed(2)}%
                      </span>
                    </div>
                  )}
                  {analytics?.daysActive && analytics.daysActive > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Daily Profit:
                      </span>
                      <span
                        className={`font-medium ${profit >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        ₹{(profit / analytics.daysActive).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {salesTotal > 0 && expensesTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Revenue Multiple:
                      </span>
                      <span className="font-medium">
                        {(salesTotal / expensesTotal).toFixed(2)}x
                      </span>
                    </div>
                  )}
                  {isBatchClosed && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">
                        Batch Status
                      </div>
                      <div className="font-medium text-green-700">
                        Completed Successfully
                      </div>
                      {batch.endDate && (
                        <div className="text-xs text-gray-600">
                          Closed: {formatDateYYYYMMDD(batch.endDate)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "Growth" && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Growth (Weights)</CardTitle>
              <CardDescription>
                Track average bird weight over time
              </CardDescription>
            </div>
            {!isBatchClosed && (
              <Button
                className="bg-primary hover:bg-primary/90"
                onClick={() => setIsWeightModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Record Weight
              </Button>
            )}
            {isBatchClosed && (
              <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                Batch Closed - No New Entries
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {/* Chart */}
            <div className="mb-6">
              <WeightGrowthChart data={growthChartData}   />
            </div>
            {weightsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading weights...</span>
              </div>
            ) : weightsError ? (
              <div className="text-center py-8">
                <p className="text-red-600">Failed to load weights.</p>
              </div>
            ) : weights.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No weight records yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {(() => {
                  const weightsAsc = [...weights].sort(
                    (a: any, b: any) =>
                      new Date(a.date).getTime() - new Date(b.date).getTime()
                  );
                  return (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-y">
                          <th className="text-left px-4 py-2">Date</th>
                          <th className="text-right px-4 py-2">
                            Avg Weight (kg)
                          </th>
                          <th className="text-right px-4 py-2">Sample Size</th>
                          <th className="text-left px-4 py-2">Source</th>
                          <th className="text-left px-4 py-2">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {weightsAsc.map((w: any) => (
                          <tr key={w.id} className="hover:bg-muted/30">
                            <td className="px-4 py-2">
                              {formatDateYYYYMMDD(w.date)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {Number(w.avgWeight).toFixed(2)}
                            </td>
                            <td className="px-4 py-2 text-right">
                              {w.sampleCount}
                            </td>
                            <td className="px-4 py-2">
                              <Badge
                                variant="secondary"
                                className={
                                  w.source === "SALE"
                                    ? "bg-green-100 text-green-800"
                                    : w.source === "MANUAL"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                }
                              >
                                {w.source}
                              </Badge>
                            </td>
                            <td className="px-4 py-2">{w.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Close Batch Modal */}
      <Modal
        isOpen={isCloseModalOpen}
        onClose={() => {
          setIsCloseModalOpen(false);
          setCloseBatchForm({
            endDate: "",
            finalNotes: "",
          });
          setCloseErrors({});
        }}
        title="Close Batch"
      >
        <form onSubmit={submitCloseBatch}>
          <ModalContent>
            <div className="space-y-4">
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-orange-800">
                  <strong>Closing this batch will:</strong>
                </p>
                <ul className="text-sm text-orange-700 mt-2 space-y-1 list-disc list-inside">
                  <li>Set the batch status to COMPLETED</li>
                  <li>Set the end date for the batch</li>
                  <li>Generate a final summary report</li>
                  <li>Create a notification with batch completion details</li>
                </ul>
              </div>

              <div>
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={closeBatchForm.endDate}
                  onChange={updateCloseBatchField}
                  required
                />
                {closeErrors.endDate && (
                  <p className="text-xs text-red-600 mt-1">
                    {closeErrors.endDate}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="finalNotes">Final Notes (Optional)</Label>
                <textarea
                  id="finalNotes"
                  name="finalNotes"
                  value={closeBatchForm.finalNotes}
                  onChange={updateCloseBatchField}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={3}
                  placeholder="Add any final notes about this batch..."
                />
              </div>

              {analytics && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">
                    Current Batch Status
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      Initial Birds: {batch?.initialChicks?.toLocaleString()}
                    </div>
                    <div>
                      Current Birds: {analytics.currentChicks?.toLocaleString()}
                    </div>
                    <div>
                      Total Mortality:{" "}
                      {(batch?.initialChicks || 0) -
                        (analytics.currentChicks || 0)}
                    </div>
                    <div>Days Active: {analytics.daysActive}</div>
                    <div>
                      Total Sales: ₹{analytics.totalSales?.toLocaleString()}
                    </div>
                    <div>
                      Total Expenses: ₹
                      {analytics.totalExpenses?.toLocaleString()}
                    </div>
                    <div
                      className={`col-span-2 font-medium ${analytics.profit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      Net Profit: ₹{analytics.profit?.toLocaleString()}
                    </div>
                  </div>
                  {analytics.currentChicks > 0 && (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                      <strong>Note:</strong> {analytics.currentChicks} remaining
                      birds will be recorded as mortality (batch closure) when
                      you close this batch.
                    </div>
                  )}
                </div>
              )}
            </div>
          </ModalContent>

          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCloseModalOpen(false);
                setCloseBatchForm({
                  endDate: "",
                  finalNotes: "",
                });
                setCloseErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-orange-600 hover:bg-orange-700"
              disabled={closeBatchMutation.isPending}
            >
              {closeBatchMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Closing Batch...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Close Batch
                </>
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Batch Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletePassword("");
        }}
        title="Delete Batch"
      >
        <ModalContent>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> This will attempt to roll back initial
                chick usage and permanently delete this batch. This action
                cannot be undone.
              </p>
            </div>
            <div>
              <Label htmlFor="delpass">Confirm with your password</Label>
              <Input
                id="delpass"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Enter your password"
                className="mt-1"
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsDeleteModalOpen(false);
              setDeletePassword("");
            }}
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={isBatchDeleting || !deletePassword}
            onClick={async () => {
              if (!batchId) return;
              setIsBatchDeleting(true);
              try {
                const v =
                  await verifyPasswordMutation.mutateAsync(deletePassword);
                if (!v?.success) {
                  throw new Error(v?.message || "Password verification failed");
                }
                await deleteBatchMutation.mutateAsync(batchId);
                setIsDeleteModalOpen(false);
                setDeletePassword("");
                window.location.href = "/dashboard/batches";
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
          >
            {isBatchDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
              </>
            ) : (
              "Confirm Delete"
            )}
          </Button>
        </ModalFooter>
      </Modal>

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
      <BatchSaleModel
        saleForm={saleForm}
        saleErrors={saleErrors}
        updateSaleField={updateSaleField}
        customerSearch={customerSearch}
        setCustomerSearch={setCustomerSearch}
        customers={customers}
        isCreating={isCreating}
        isUpdating={isUpdating}
        isSaleModalOpen={isSaleModalOpen}
        setIsSaleModalOpen={setIsSaleModalOpen}
        editingSaleId={editingSaleId}
        setEditingSaleId={setEditingSaleId}
        submitSale={submitSale}
        setSaleForm={setSaleForm}
        setSaleErrors={setSaleErrors}
        categoryId={saleForm.categoryId}
      />

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
                <h4 className="font-semibold text-gray-900 mb-2">
                  Sale Details
                </h4>
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
                <h4 className="font-semibold text-gray-900 mb-3">
                  Payment History
                </h4>
                {selectedSale.payments && selectedSale.payments.length > 0 ? (
                  <div className="space-y-3">
                    {selectedSale.payments.map(
                      (payment: any, index: number) => (
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
                      )
                    )}
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

      {/* Mortality Modal */}
      <Modal
        isOpen={isMortalityModalOpen}
        onClose={() => {
          setIsMortalityModalOpen(false);
          setEditingMortalityId(null);
          setMortalityErrors({});
        }}
        title={
          editingMortalityId ? "Edit Mortality Record" : "Add Mortality Record"
        }
      >
        <form onSubmit={submitMortality}>
          <ModalContent>
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-800">
                  <strong>Note:</strong> Record only natural deaths and
                  disease-related losses here. Birds sold are automatically
                  tracked in the Sales section.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mortalityDate">Date</Label>
                  <Input
                    id="mortalityDate"
                    name="date"
                    type="date"
                    value={mortalityForm.date}
                    onChange={updateMortalityField}
                    required
                  />
                  {mortalityErrors.date && (
                    <p className="text-xs text-red-600 mt-1">
                      {mortalityErrors.date}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="mortalityCount">Number of Birds</Label>
                  <Input
                    id="mortalityCount"
                    name="count"
                    type="number"
                    min="1"
                    value={mortalityForm.count}
                    onChange={updateMortalityField}
                    placeholder="Enter count"
                    required
                  />
                  {mortalityErrors.count && (
                    <p className="text-xs text-red-600 mt-1">
                      {mortalityErrors.count}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="mortalityReason">Reason (Optional)</Label>
                <textarea
                  id="mortalityReason"
                  name="reason"
                  value={mortalityForm.reason}
                  onChange={updateMortalityField}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={3}
                  placeholder="e.g., Disease, Heat stress, Predator attack, etc."
                />
              </div>

              {mortalityStats && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-sm mb-2">Current Status</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600">Current Birds:</span>
                      <span className="ml-2 font-medium text-green-600">
                        {mortalityStats.currentBirds}
                      </span>
                      <span className="ml-1 text-xs text-gray-500">
                        (after all losses)
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Natural Deaths:</span>
                      <span className="ml-2 font-medium text-red-600">
                        {mortalityStats.totalMortality}
                      </span>
                      <span className="ml-1 text-xs text-gray-500">
                        (excluding sales)
                      </span>
                    </div>
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
                setIsMortalityModalOpen(false);
                setEditingMortalityId(null);
                setMortalityErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={
                createMortalityMutation.isPending ||
                updateMortalityMutation.isPending
              }
            >
              {createMortalityMutation.isPending ||
              updateMortalityMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingMortalityId ? "Updating..." : "Creating..."}
                </>
              ) : (
                "Save"
              )}
            </Button>
          </ModalFooter>
        </form>
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
                <h4 className="font-semibold text-gray-900 mb-2">
                  Customer Summary
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">
                      {selectedCustomerForTransactions.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 font-medium">
                      {selectedCustomerForTransactions.phone}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Sales:</span>
                    <span className="ml-2 font-medium">
                      ₹
                      {Number(
                        selectedCustomerForTransactions.sales
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Received:</span>
                    <span className="ml-2 font-medium text-green-600">
                      ₹
                      {Number(
                        selectedCustomerForTransactions.received
                      ).toLocaleString()}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Outstanding Balance:</span>
                    <span
                      className={`ml-2 font-bold ${
                        Number(selectedCustomerForTransactions.balance) > 0
                          ? "text-orange-600"
                          : "text-green-600"
                      }`}
                    >
                      ₹
                      {Number(
                        selectedCustomerForTransactions.balance
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* All Sales and Payments */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  Sales & Payment History
                </h4>
                {(() => {
                  const customerSales =
                    batchSales?.filter(
                      (sale: any) =>
                        sale.isCredit &&
                        sale.customerId === selectedCustomerForTransactions.id
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
                        <div
                          key={sale.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
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
                                  {sale.description} -{" "}
                                  {formatDateYYYYMMDD(sale.date)}
                                </div>
                                <div className="text-sm text-gray-600">
                                  Total: ₹{Number(sale.amount).toLocaleString()}{" "}
                                  | Paid: ₹
                                  {Number(sale.paidAmount).toLocaleString()} |
                                  Due: ₹
                                  {Number(sale.dueAmount || 0).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Payments for this sale */}
                          {sale.payments && sale.payments.length > 0 ? (
                            <div className="ml-11 space-y-2">
                              <div className="text-sm font-medium text-gray-700 mb-2">
                                Payments:
                              </div>
                              {sale.payments.map(
                                (payment: any, paymentIndex: number) => (
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
                                          ₹
                                          {Number(
                                            payment.amount
                                          ).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-600">
                                          {formatDateYYYYMMDD(payment.date)}
                                          {payment.description &&
                                            ` - ${payment.description}`}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(
                                        payment.createdAt
                                      ).toLocaleDateString()}
                                    </div>
                                  </div>
                                )
                              )}
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

      {/* Weight Modal */}
      <Modal
        isOpen={isWeightModalOpen}
        onClose={() => {
          setIsWeightModalOpen(false);
          setWeightErrors({});
        }}
        title="Record Weight"
      >
        <form onSubmit={submitWeight}>
          <ModalContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weightDate">Date</Label>
                <Input
                  id="weightDate"
                  name="date"
                  type="date"
                  value={weightForm.date}
                  onChange={updateWeightField}
                  required
                />
                {weightErrors.date && (
                  <p className="text-xs text-red-600 mt-1">
                    {weightErrors.date}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="avgWeight">Average Weight (kg)</Label>
                <Input
                  id="avgWeight"
                  name="avgWeight"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={weightForm.avgWeight}
                  onChange={updateWeightField}
                  placeholder="e.g., 1.75"
                  required
                />
                {weightErrors.avgWeight && (
                  <p className="text-xs text-red-600 mt-1">
                    {weightErrors.avgWeight}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="sampleCount">Birds Weighed</Label>
                <Input
                  id="sampleCount"
                  name="sampleCount"
                  type="number"
                  min="1"
                  value={weightForm.sampleCount}
                  onChange={updateWeightField}
                  placeholder="e.g., 50"
                  required
                />
                {weightErrors.sampleCount && (
                  <p className="text-xs text-red-600 mt-1">
                    {weightErrors.sampleCount}
                  </p>
                )}
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={weightForm.notes}
                  onChange={updateWeightField}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={3}
                  placeholder="Feed change, disease, etc."
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsWeightModalOpen(false);
                setWeightErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={addWeightMutation.isPending}
            >
              {addWeightMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
