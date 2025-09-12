"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  Layers,
  TrendingUp,
  DollarSign,
  CreditCard,
  Receipt,
  Plus,
  Clock,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/store/store";
import { useState } from "react";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import { useGetUserFarms } from "@/fetchers/farms/farmQueries";
import { useInventory } from "@/contexts/InventoryContext";
import {
  useCreateExpense,
  useGetExpenseCategories,
} from "@/fetchers/expenses/expenseQueries";
import { useGetInventoryTableData } from "@/fetchers/inventory/inventoryQueries";
import {
  useCreateSale,
  useGetSalesCategories,
  useGetCustomersForSales,
} from "@/fetchers/sale/saleQueries";
import { 
  useDashboardStats,
  useGetMoneyToReceiveDetails,
  useGetMoneyToPayDetails,
} from "@/fetchers/dashboard/dashboardQueries";

import {
  useGetReminderDashboard,
  useCreateReminder,
  useMarkReminderCompleted,
  useDeleteReminder,
  getReminderTypeDisplayName,
  getReminderStatusDisplayName,
  getReminderTypeColor,
  getReminderStatusColor,
  formatReminderDueDate,
  isReminderDueSoon,
  isReminderOverdue,
} from "@/fetchers/remainder/remainderQueries";

export default function DashboardPage() {
  const { user } = useAuth();

  // Fetch real data from APIs
  const { data: batchesResponse } = useGetAllBatches();
  const { data: farmsResponse } = useGetUserFarms("all");

  const activeBatches = batchesResponse?.data || [];
  const farms = farmsResponse?.data || [];

  // Fetch categories and customers for quick forms
  const { data: expenseCategoriesResponse } =
    useGetExpenseCategories("EXPENSE");
  const { data: salesCategoriesResponse } = useGetSalesCategories();
  const { data: customersResponse } = useGetCustomersForSales();

  const expenseCategories = expenseCategoriesResponse?.data || [];
  const salesCategories = salesCategoriesResponse?.data || [];
  const customers = customersResponse || [];

  // Farm selection state for filtering batches
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");

  // Filter batches based on selected farm
  const filteredBatches = selectedFarmId
    ? activeBatches.filter((batch) => batch.farmId === selectedFarmId)
    : activeBatches;

  // Inventory integration - using table data for better structure (same as batch detail page)
  const { data: inventoryResponse } = useGetInventoryTableData();
  const inventoryItems = inventoryResponse?.data || [];
  
  // Filter inventory items by type (same as batch detail page)
  const feedInventory = inventoryItems.filter(
    (item: any) => item.itemType === "FEED"
  );
  const medicineInventory = inventoryItems.filter(
    (item: any) => item.itemType === "MEDICINE"
  );

  // Keep the old inventory context for other uses if needed
  const { inventory, updateInventoryItem, getInventoryByCategory } =
    useInventory();

  const [isFarmsOpen, setIsFarmsOpen] = useState(false);
  const [isBatchesOpen, setIsBatchesOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [isMoneyToReceiveOpen, setIsMoneyToReceiveOpen] = useState(false);
  const [isMoneyToPayOpen, setIsMoneyToPayOpen] = useState(false);

  // Shortcut modals
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false);

  // Reminder form state
  const [reminderForm, setReminderForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    type: "GENERAL" as const,
    farmId: "",
    batchId: "",
  });

  // Reminder API integration
  const {
    upcoming,
    overdue,
    statistics,
    isLoading: remindersLoading,
    error: remindersError,
  } = useGetReminderDashboard();

  const createReminderMutation = useCreateReminder();

  const markCompletedMutation = useMarkReminderCompleted();

  const deleteReminderMutation = useDeleteReminder();

  // Quick form mutations
  const createExpenseMutation = useCreateExpense();
  const createSaleMutation = useCreateSale();

  // Dashboard statistics
  const {
    lifetimeProfit,
    monthlyRevenue,
    monthlyRevenueGrowth,
    moneyToReceive,
    moneyToGive,
    totalExpenses,
    recentActivity,
    isLoading: statsLoading,
    error: statsError,
  } = useDashboardStats();

  // Money details queries
  const { data: moneyToReceiveData, isLoading: moneyToReceiveLoading } = useGetMoneyToReceiveDetails();
  const { data: moneyToPayData, isLoading: moneyToPayLoading } = useGetMoneyToPayDetails();

  // Quick form states
  const [quickExpenseForm, setQuickExpenseForm] = useState({
    farmId: "",
    batchId: "",
    category: "Feed",
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

  const [quickSaleForm, setQuickSaleForm] = useState({
    farmId: "",
    batchId: "",
    item: "Chicken",
    rate: "",
    quantity: "",
    remaining: false,
    customerId: "",
    customerName: "",
    contact: "",
    category: "Chicken",
    customerCategory: "Chicken",
    balance: "",
    date: "",
  });

  // Customer search for sales (same as batch detail page)
  const [customerSearch, setCustomerSearch] = useState("");

  const [quickFormErrors, setQuickFormErrors] = useState<
    Record<string, string>
  >({});

  const handleAddReminder = async () => {
    if (!reminderForm.title.trim() || !reminderForm.date || !reminderForm.time)
      return;

    try {
      // Combine date and time into ISO datetime string
      const dueDate = new Date(
        `${reminderForm.date}T${reminderForm.time}:00.000Z`
      ).toISOString();

      await createReminderMutation.mutateAsync({
        title: reminderForm.title,
        description: reminderForm.description || undefined,
        type: reminderForm.type,
        dueDate,
        isRecurring: false,
        recurrencePattern: "NONE",
        farmId: reminderForm.farmId || undefined,
        batchId: reminderForm.batchId || undefined,
      });

      // Reset form and close modal
      setReminderForm({
        title: "",
        description: "",
        date: "",
        time: "",
        type: "GENERAL",
        farmId: "",
        batchId: "",
      });
      setIsReminderModalOpen(false);
    } catch (error) {
      console.error("Failed to create reminder:", error);
    }
  };

  const handleMarkCompleted = async (reminderId: string) => {
    try {
      await markCompletedMutation.mutateAsync(reminderId);
    } catch (error) {
      console.error("Failed to mark reminder as completed:", error);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    try {
      await deleteReminderMutation.mutateAsync(reminderId);
    } catch (error) {
      console.error("Failed to delete reminder:", error);
    }
  };

  // Quick form handlers
  const updateQuickExpenseField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setQuickExpenseForm((p) => ({ ...p, [name]: value }));

    // If farm is changed, reset batch selection
    if (name === "farmId") {
      setQuickExpenseForm((p) => ({ ...p, batchId: "" }));
    }
  };

  const updateQuickSaleField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setQuickSaleForm((p) => ({
      ...p,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));

    // If farm is changed, reset batch selection
    if (name === "farmId") {
      setQuickSaleForm((p) => ({ ...p, batchId: "" }));
    }
  };

  // Handle feed selection from inventory (updated to match batch detail page structure)
  const handleQuickFeedSelection = (feedId: string) => {
    const selectedFeed = feedInventory.find((feed: any) => feed.id === feedId);
    if (selectedFeed) {
      setQuickExpenseForm((prev) => ({
        ...prev,
        selectedFeedId: feedId,
        feedBrand: selectedFeed.name,
        feedRate: selectedFeed.rate?.toString() || "0",
      }));
    }
  };

  // Handle medicine selection from inventory (updated to match batch detail page structure)
  const handleQuickMedicineSelection = (medicineId: string) => {
    const selectedMedicine = medicineInventory.find(
      (medicine: any) => medicine.id === medicineId
    );
    if (selectedMedicine) {
      setQuickExpenseForm((prev) => ({
        ...prev,
        selectedMedicineId: medicineId,
        medicineName: selectedMedicine.name,
        medicineRate: selectedMedicine.rate?.toString() || "0",
      }));
    }
  };

  // Quick form submissions (for now just show success message - no backend integration)
  const submitQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const errors: Record<string, string> = {};
    if (!quickExpenseForm.farmId) errors.farmId = "Please select a farm";
    if (!quickExpenseForm.batchId) errors.batchId = "Please select a batch";
    if (!quickExpenseForm.category)
      errors.category = "Please select a category";
    if (!quickExpenseForm.date) errors.date = "Please select a date";

    // Category-specific validation
    if (quickExpenseForm.category === "Feed") {
      if (!quickExpenseForm.selectedFeedId)
        errors.feedBrand = "Please select a feed from inventory";
      if (!quickExpenseForm.feedQuantity)
        errors.feedQuantity = "Please enter quantity";
      if (!quickExpenseForm.feedRate) errors.feedRate = "Please enter rate";

      // Check if quantity exceeds available inventory
      if (quickExpenseForm.selectedFeedId && quickExpenseForm.feedQuantity) {
        const selectedFeed = feedInventory.find(
          (feed: any) => feed.id === quickExpenseForm.selectedFeedId
        );
        const requestedQty = Number(quickExpenseForm.feedQuantity);
        if (selectedFeed && requestedQty > selectedFeed.quantity) {
          errors.feedQuantity = `Only ${selectedFeed.quantity} ${selectedFeed.unit} available`;
        }
      }
    } else if (quickExpenseForm.category === "Medicine") {
      if (!quickExpenseForm.selectedMedicineId)
        errors.medicineName = "Please select a medicine from inventory";
      if (!quickExpenseForm.medicineQuantity)
        errors.medicineQuantity = "Please enter quantity";
      if (!quickExpenseForm.medicineRate)
        errors.medicineRate = "Please enter rate";

      // Check if quantity exceeds available inventory
      if (quickExpenseForm.selectedMedicineId && quickExpenseForm.medicineQuantity) {
        const selectedMedicine = medicineInventory.find(
          (medicine: any) => medicine.id === quickExpenseForm.selectedMedicineId
        );
        const requestedQty = Number(quickExpenseForm.medicineQuantity);
        if (selectedMedicine && requestedQty > selectedMedicine.quantity) {
          errors.medicineQuantity = `Only ${selectedMedicine.quantity} ${selectedMedicine.unit} available`;
        }
      }
    } else if (quickExpenseForm.category === "Hatchery") {
      if (!quickExpenseForm.hatcheryQuantity)
        errors.hatcheryQuantity = "Please enter quantity";
      if (!quickExpenseForm.hatcheryRate)
        errors.hatcheryRate = "Please enter rate";
    } else if (quickExpenseForm.category === "Other") {
      if (!quickExpenseForm.otherQuantity)
        errors.otherQuantity = "Please enter quantity";
      if (!quickExpenseForm.otherRate) errors.otherRate = "Please enter rate";
    }

    if (Object.keys(errors).length > 0) {
      setQuickFormErrors(errors);
      return;
    }

    try {
      // Find the category ID
      const selectedCategory = expenseCategories.find(
        (cat: any) =>
          cat.name.toLowerCase() === quickExpenseForm.category.toLowerCase()
      );

      if (!selectedCategory) {
        setQuickFormErrors({ category: "Category not found" });
        return;
      }

      // Calculate amount based on category
      let amount = 0;
      let description = "";
      let quantity = 0;
      let unitPrice = 0;

      if (quickExpenseForm.category === "Feed") {
        quantity = parseFloat(quickExpenseForm.feedQuantity);
        unitPrice = parseFloat(quickExpenseForm.feedRate);
        amount = quantity * unitPrice;
        description = `Feed: ${quickExpenseForm.feedBrand || "Unknown"} - Qty: ${quantity} • Rate: ₹${unitPrice}`;
      } else if (quickExpenseForm.category === "Medicine") {
        quantity = parseFloat(quickExpenseForm.medicineQuantity);
        unitPrice = parseFloat(quickExpenseForm.medicineRate);
        amount = quantity * unitPrice;
        description = `Medicine: ${quickExpenseForm.medicineName || "Unknown"} - Qty: ${quantity} • Rate: ₹${unitPrice}`;
      } else if (quickExpenseForm.category === "Hatchery") {
        quantity = parseFloat(quickExpenseForm.hatcheryQuantity);
        unitPrice = parseFloat(quickExpenseForm.hatcheryRate);
        amount = quantity * unitPrice;
        description = `Hatchery: ${quickExpenseForm.hatcheryName || "Unknown"} - Qty: ${quantity} • Rate: ₹${unitPrice}`;
      } else if (quickExpenseForm.category === "Other") {
        quantity = parseFloat(quickExpenseForm.otherQuantity);
        unitPrice = parseFloat(quickExpenseForm.otherRate);
        amount = quantity * unitPrice;
        description = `Other: ${quickExpenseForm.otherName || "Unknown"} - Qty: ${quantity} • Rate: ₹${unitPrice}`;
      }

      // Create expense data
      const expenseData = {
        date: new Date(quickExpenseForm.date).toISOString(),
        amount,
        description:
          description +
          (quickExpenseForm.notes ? ` • Notes: ${quickExpenseForm.notes}` : ""),
        quantity,
        unitPrice,
        farmId: quickExpenseForm.farmId,
        batchId: quickExpenseForm.batchId,
        categoryId: selectedCategory.id,
        inventoryItems: quickExpenseForm.selectedFeedId
          ? [
              {
                itemId: quickExpenseForm.selectedFeedId,
                quantity,
                notes: quickExpenseForm.notes,
              },
            ]
          : quickExpenseForm.selectedMedicineId
            ? [
                {
                  itemId: quickExpenseForm.selectedMedicineId,
                  quantity,
                  notes: quickExpenseForm.notes,
                },
              ]
            : undefined,
      };

      await createExpenseMutation.mutateAsync(expenseData);

      // Reset form
      setQuickExpenseForm({
        farmId: "",
        batchId: "",
        category: "Feed",
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
      setQuickFormErrors({});
      setIsQuickExpenseOpen(false);
    } catch (error) {
      console.error("Failed to create expense:", error);
      setQuickFormErrors({
        general: "Failed to create expense. Please try again.",
      });
    }
  };

  const submitQuickSale = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 Sales form submitted", quickSaleForm);

    // Validation
    const errors: Record<string, string> = {};
    if (!quickSaleForm.farmId) errors.farmId = "Please select a farm";
    if (!quickSaleForm.batchId) errors.batchId = "Please select a batch";
    if (!quickSaleForm.item) errors.item = "Please enter item";
    if (!quickSaleForm.rate) errors.rate = "Please enter rate";
    if (!quickSaleForm.quantity) errors.quantity = "Please enter quantity";
    if (!quickSaleForm.date) errors.date = "Please select a date";
    
    // Customer validation for credit sales (same as batch detail page)
    if (quickSaleForm.remaining) {
      if (!quickSaleForm.customerId && !quickSaleForm.customerName) {
        errors.customerName = "Please select existing customer or enter new customer name";
      }
      if (!quickSaleForm.customerId && !quickSaleForm.contact) {
        errors.contact = "Contact number required for new customer";
      }
      // Validate that paid amount doesn't exceed total amount
      const totalAmount = Number(quickSaleForm.rate || 0) * Number(quickSaleForm.quantity || 0);
      const paidAmount = Number(quickSaleForm.balance || 0);
      if (paidAmount > totalAmount) {
        errors.balance = `Paid amount cannot exceed total amount of ₹${totalAmount.toLocaleString()}`;
      }
    }

    if (Object.keys(errors).length > 0) {
      setQuickFormErrors(errors);
      return;
    }

    try {
      // Find the category ID (look for item, not category)
      const selectedCategory = salesCategories.find(
        (cat: any) =>
          cat.name.toLowerCase() === quickSaleForm.item.toLowerCase()
      );

      if (!selectedCategory) {
        console.error("❌ Category not found for item:", quickSaleForm.item);
        console.log("📋 Available categories:", salesCategories);
        setQuickFormErrors({ item: "Category not found for selected item" });
        return;
      }

      console.log("✅ Found category:", selectedCategory);

      // Calculate amount
      const quantity = parseFloat(quickSaleForm.quantity);
      const unitPrice = parseFloat(quickSaleForm.rate);
      const amount = quantity * unitPrice;
      const paidAmount = quickSaleForm.balance
        ? parseFloat(quickSaleForm.balance)
        : 0;
      const isCredit = paidAmount < amount;

      // Create sale data (same structure as batch detail page)
      const saleData: any = {
        date: quickSaleForm.date
          ? `${quickSaleForm.date}T00:00:00.000Z`
          : new Date().toISOString(),
        amount,
        quantity,
        unitPrice,
        description: quickSaleForm.item,
        isCredit,
        paidAmount,
        farmId: quickSaleForm.farmId,
        batchId: quickSaleForm.batchId,
        categoryId: selectedCategory.id,
      };

      // Handle customer data (same as batch detail page)
      if (quickSaleForm.customerId) {
        // Use existing customer
        saleData.customerId = quickSaleForm.customerId;
      } else if (quickSaleForm.remaining && quickSaleForm.customerName && quickSaleForm.contact) {
        // Create new customer
        saleData.customerData = {
          name: quickSaleForm.customerName,
          phone: quickSaleForm.contact,
          category: quickSaleForm.customerCategory,
          address: "", // Could add address field later
        };
      }

      console.log("🚀 Sending sale data to API:", saleData);
      await createSaleMutation.mutateAsync(saleData);
      console.log("✅ Sale created successfully!");

      // Reset form
      setQuickSaleForm({
        farmId: "",
        batchId: "",
        item: "Chicken",
        rate: "",
        quantity: "",
        remaining: false,
        customerId: "",
        customerName: "",
        contact: "",
        category: "Chicken",
        customerCategory: "Chicken",
        balance: "",
        date: "",
      });
      setCustomerSearch("");
      setQuickFormErrors({});
      setIsQuickSaleOpen(false);
    } catch (error) {
      console.error("Failed to create sale:", error);
      setQuickFormErrors({
        general: "Failed to create sale. Please try again.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Welcome , {user?.name}!
          </h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 sm:flex-wrap sm:justify-end">
          <Button
            onClick={() => setIsQuickExpenseOpen(true)}
            className="cursor-pointer bg-red-500 hover:bg-red-600 hover:shadow-md transition-all duration-200 text-white px-2 sm:px-3 py-2 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center min-w-0"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
            <span className="truncate">Add Expense</span>
          </Button>
          <Button
            onClick={() => setIsQuickSaleOpen(true)}
            className="cursor-pointer bg-primary hover:bg-primary/90 hover:shadow-md transition-all duration-200 text-primary-foreground px-2 sm:px-3 py-2 rounded-lg font-medium text-xs sm:text-sm flex items-center justify-center min-w-0"
          >
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
            <span className="truncate">Add Sales</span>
          </Button>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={isFarmsOpen}
        onClose={() => setIsFarmsOpen(false)}
        title="All Farms"
      >
        <ModalContent>
          <div className="space-y-3">
            {farms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No farms found</p>
              </div>
            ) : (
              farms.map((farm) => (
                <div
                  key={farm.id}
                  className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60"
                >
                  <div>
                    <div className="font-medium">{farm.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Capacity {farm.capacity.toLocaleString()} birds
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    Batches: {farm._count?.batches || 0}
                  </div>
                </div>
              ))
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsFarmsOpen(false)}
            className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={isBatchesOpen}
        onClose={() => setIsBatchesOpen(false)}
        title="All Batches"
      >
        <ModalContent>
          <div className="space-y-3">
            {activeBatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No batches found</p>
              </div>
            ) : (
              activeBatches.map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60"
                >
                  <div>
                    <div className="font-medium">{batch.batchNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {batch.farm.name} • Birds{" "}
                      {batch.initialChicks.toLocaleString()} • Age{" "}
                      {Math.floor(
                        (new Date().getTime() -
                          new Date(batch.startDate).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )}{" "}
                      days
                    </div>
                  </div>
                  <div
                    className={
                      batch.status === "ACTIVE"
                        ? "text-green-600 text-sm font-medium"
                        : "text-muted-foreground text-sm font-medium"
                    }
                  >
                    {batch.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsBatchesOpen(false)}
            className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>


      <Modal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        title="Add New Reminder"
      >
        <ModalContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reminderTitle">Reminder Title *</Label>
              <Input
                id="reminderTitle"
                value={reminderForm.title}
                onChange={(e) =>
                  setReminderForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                placeholder="e.g. Collect payment from Ram"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="reminderDescription">
                Description (Optional)
              </Label>
              <Input
                id="reminderDescription"
                value={reminderForm.description}
                onChange={(e) =>
                  setReminderForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Additional details..."
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reminderDate">Select Date *</Label>
                <Input
                  id="reminderDate"
                  type="date"
                  value={reminderForm.date}
                  onChange={(e) =>
                    setReminderForm((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="reminderTime">Select Time *</Label>
                <Input
                  id="reminderTime"
                  type="time"
                  value={reminderForm.time}
                  onChange={(e) =>
                    setReminderForm((prev) => ({
                      ...prev,
                      time: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="reminderType">Reminder Type</Label>
              <select
                id="reminderType"
                value={reminderForm.type}
                onChange={(e) =>
                  setReminderForm((prev) => ({
                    ...prev,
                    type: e.target.value as any,
                  }))
                }
                className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="GENERAL">General</option>
                <option value="VACCINATION">Vaccination</option>
                <option value="FEEDING">Feeding</option>
                <option value="MEDICATION">Medication</option>
                <option value="CLEANING">Cleaning</option>
                <option value="WEIGHING">Weighing</option>
                <option value="SUPPLIER_PAYMENT">Supplier Payment</option>
                <option value="CUSTOMER_PAYMENT">Customer Payment</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="reminderFarm">Farm (Optional)</Label>
                <select
                  id="reminderFarm"
                  value={reminderForm.farmId}
                  onChange={(e) =>
                    setReminderForm((prev) => ({
                      ...prev,
                      farmId: e.target.value,
                    }))
                  }
                  className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="">Select farm</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="reminderBatch">Batch (Optional)</Label>
                <select
                  id="reminderBatch"
                  value={reminderForm.batchId}
                  onChange={(e) =>
                    setReminderForm((prev) => ({
                      ...prev,
                      batchId: e.target.value,
                    }))
                  }
                  className="mt-1 w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="">Select batch</option>
                  {activeBatches.map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchNumber} - {batch.farm.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsReminderModalOpen(false)}
            className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddReminder}
            disabled={createReminderMutation.isPending}
            className="cursor-pointer bg-primary hover:bg-primary/90 hover:shadow-md transition-all duration-200"
          >
            {createReminderMutation.isPending ? "Adding..." : "Add Reminder"}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Quick Expense Modal */}
      <Modal
        isOpen={isQuickExpenseOpen}
        onClose={() => {
          setIsQuickExpenseOpen(false);
          setQuickFormErrors({});
        }}
        title="Quick Add Expense"
      >
        <form onSubmit={submitQuickExpense}>
          <ModalContent>
            <div className="space-y-4">
              {quickFormErrors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">
                    {quickFormErrors.general}
                  </p>
                </div>
              )}
              {/* Farm Selection */}
              <div>
                <Label htmlFor="farmId">Select Farm *</Label>
                <select
                  id="farmId"
                  name="farmId"
                  value={quickExpenseForm.farmId}
                  onChange={updateQuickExpenseField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  required
                >
                  <option value="">Choose a farm</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
                {quickFormErrors.farmId && (
                  <p className="text-xs text-red-600 mt-1">
                    {quickFormErrors.farmId}
                  </p>
                )}
              </div>

              {/* Batch Selection */}
              <div>
                <Label htmlFor="batchId">Select Batch *</Label>
                <select
                  id="batchId"
                  name="batchId"
                  value={quickExpenseForm.batchId}
                  onChange={updateQuickExpenseField}
                  disabled={!quickExpenseForm.farmId}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">Choose a batch</option>
                  {activeBatches
                    .filter(
                      (batch) =>
                        batch.status === "ACTIVE" &&
                        (!quickExpenseForm.farmId ||
                          batch.farmId === quickExpenseForm.farmId)
                    )
                    .map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchNumber} - {batch.farm.name}
                      </option>
                    ))}
                </select>
                {quickFormErrors.batchId && (
                  <p className="text-xs text-red-600 mt-1">
                    {quickFormErrors.batchId}
                  </p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    name="category"
                    value={quickExpenseForm.category}
                    onChange={updateQuickExpenseField}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="">Select category</option>
                    {expenseCategories.map((category: any) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {quickFormErrors.category && (
                    <p className="text-xs text-red-600 mt-1">
                      {quickFormErrors.category}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={quickExpenseForm.date}
                    onChange={updateQuickExpenseField}
                  />
                </div>
              </div>

              {quickExpenseForm.category === "Feed" && (
                <div className="grid md:grid-cols-3 gap-4 border rounded-md p-4">
                  <div>
                    <Label htmlFor="selectedFeedId">Feed Brand</Label>
                    <select
                      id="selectedFeedId"
                      name="selectedFeedId"
                      value={quickExpenseForm.selectedFeedId}
                      onChange={(e) => handleQuickFeedSelection(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    >
                      <option value="">Select feed from inventory</option>
                      {feedInventory.map((feed: any) => (
                        <option key={feed.id} value={feed.id}>
                          {feed.name} ({feed.quantity} {feed.unit} available)
                          - ₹{feed.rate}/unit
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="feedQuantity">Quantity</Label>
                    <Input
                      id="feedQuantity"
                      name="feedQuantity"
                      type="number"
                      value={quickExpenseForm.feedQuantity}
                      onChange={updateQuickExpenseField}
                    />
                  </div>
                  <div>
                    <Label htmlFor="feedRate">Rate per piece</Label>
                    <Input
                      id="feedRate"
                      name="feedRate"
                      type="number"
                      value={quickExpenseForm.feedRate}
                      onChange={updateQuickExpenseField}
                      readOnly={!!quickExpenseForm.selectedFeedId}
                      className={quickExpenseForm.selectedFeedId ? "bg-gray-50" : ""}
                      placeholder={
                        quickExpenseForm.selectedFeedId
                          ? "Auto-filled from inventory"
                          : "Enter rate"
                      }
                    />
                    {quickExpenseForm.selectedFeedId && (
                      <p className="text-xs text-green-600 mt-1">
                        Rate auto-filled from inventory
                      </p>
                    )}
                  </div>
                </div>
              )}

              {quickExpenseForm.category === "Medicine" && (
                <div className="grid md:grid-cols-3 gap-4 border rounded-md p-4">
                  <div>
                    <Label htmlFor="selectedMedicineId">Medicine Name</Label>
                    <select
                      id="selectedMedicineId"
                      name="selectedMedicineId"
                      value={quickExpenseForm.selectedMedicineId}
                      onChange={(e) =>
                        handleQuickMedicineSelection(e.target.value)
                      }
                      className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                    >
                      <option value="">Select medicine from inventory</option>
                      {medicineInventory.map((medicine: any) => (
                        <option key={medicine.id} value={medicine.id}>
                          {medicine.name} ({medicine.quantity} {medicine.unit}{" "}
                          available) - ₹{medicine.rate}/unit
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="medicineQuantity">Quantity</Label>
                    <Input
                      id="medicineQuantity"
                      name="medicineQuantity"
                      type="number"
                      value={quickExpenseForm.medicineQuantity}
                      onChange={updateQuickExpenseField}
                    />
                  </div>
                  <div>
                    <Label htmlFor="medicineRate">Rate</Label>
                    <Input
                      id="medicineRate"
                      name="medicineRate"
                      type="number"
                      value={quickExpenseForm.medicineRate}
                      onChange={updateQuickExpenseField}
                      readOnly={!!quickExpenseForm.selectedMedicineId}
                      className={
                        quickExpenseForm.selectedMedicineId ? "bg-gray-50" : ""
                      }
                      placeholder={
                        quickExpenseForm.selectedMedicineId
                          ? "Auto-filled from inventory"
                          : "Enter rate"
                      }
                    />
                    {quickExpenseForm.selectedMedicineId && (
                      <p className="text-xs text-green-600 mt-1">
                        Rate auto-filled from inventory
                      </p>
                    )}
                  </div>
                </div>
              )}

              {quickExpenseForm.category === "Hatchery" && (
                <div className="grid md:grid-cols-3 gap-4 border rounded-md p-4">
                  <div>
                    <Label htmlFor="hatcheryName">Hatchery Name</Label>
                    <Input
                      id="hatcheryName"
                      name="hatcheryName"
                      value={quickExpenseForm.hatcheryName}
                      onChange={updateQuickExpenseField}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hatcheryQuantity">Quantity</Label>
                    <Input
                      id="hatcheryQuantity"
                      name="hatcheryQuantity"
                      type="number"
                      value={quickExpenseForm.hatcheryQuantity}
                      onChange={updateQuickExpenseField}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hatcheryRate">Rate</Label>
                    <Input
                      id="hatcheryRate"
                      name="hatcheryRate"
                      type="number"
                      value={quickExpenseForm.hatcheryRate}
                      onChange={updateQuickExpenseField}
                    />
                  </div>
                </div>
              )}

              {quickExpenseForm.category === "Other" && (
                <div className="grid md:grid-cols-3 gap-4 border rounded-md p-4">
                  <div>
                    <Label htmlFor="otherName">Expense Name</Label>
                    <Input
                      id="otherName"
                      name="otherName"
                      value={quickExpenseForm.otherName}
                      onChange={updateQuickExpenseField}
                    />
                  </div>
                  <div>
                    <Label htmlFor="otherQuantity">Quantity</Label>
                    <Input
                      id="otherQuantity"
                      name="otherQuantity"
                      type="number"
                      value={quickExpenseForm.otherQuantity}
                      onChange={updateQuickExpenseField}
                    />
                  </div>
                  <div>
                    <Label htmlFor="otherRate">Rate</Label>
                    <Input
                      id="otherRate"
                      name="otherRate"
                      type="number"
                      value={quickExpenseForm.otherRate}
                      onChange={updateQuickExpenseField}
                    />
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  name="notes"
                  value={quickExpenseForm.notes}
                  onChange={updateQuickExpenseField}
                  placeholder="Any additional notes..."
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsQuickExpenseOpen(false);
                setQuickFormErrors({});
              }}
              className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="cursor-pointer bg-primary hover:bg-primary/90 hover:shadow-md transition-all duration-200"
              disabled={createExpenseMutation.isPending}
            >
              {createExpenseMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Expense"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Quick Sale Modal */}
      <Modal
        isOpen={isQuickSaleOpen}
        onClose={() => {
          setIsQuickSaleOpen(false);
          setQuickFormErrors({});
        }}
        title="Quick Add Sale"
      >
        <form onSubmit={submitQuickSale}>
          <ModalContent>
            <div className="space-y-4">
              {quickFormErrors.general && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">
                    {quickFormErrors.general}
                  </p>
                </div>
              )}
              {/* Farm Selection */}
              <div>
                <Label htmlFor="saleFarmId">Select Farm *</Label>
                <select
                  id="saleFarmId"
                  name="farmId"
                  value={quickSaleForm.farmId}
                  onChange={updateQuickSaleField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  required
                >
                  <option value="">Choose a farm</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
                {quickFormErrors.farmId && (
                  <p className="text-xs text-red-600 mt-1">
                    {quickFormErrors.farmId}
                  </p>
                )}
              </div>

              {/* Batch Selection */}
              <div>
                <Label htmlFor="saleBatchId">Select Batch *</Label>
                <select
                  id="saleBatchId"
                  name="batchId"
                  value={quickSaleForm.batchId}
                  onChange={updateQuickSaleField}
                  disabled={!quickSaleForm.farmId}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                >
                  <option value="">Choose a batch</option>
                  {activeBatches
                    .filter(
                      (batch) =>
                        batch.status === "ACTIVE" &&
                        (!quickSaleForm.farmId ||
                          batch.farmId === quickSaleForm.farmId)
                    )
                    .map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batchNumber} - {batch.farm.name}
                      </option>
                    ))}
                </select>
                {quickFormErrors.batchId && (
                  <p className="text-xs text-red-600 mt-1">
                    {quickFormErrors.batchId}
                  </p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="item">Item</Label>
                  <select
                    id="item"
                    name="item"
                    value={quickSaleForm.item}
                    onChange={updateQuickSaleField}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  >
                    <option value="">Select item</option>
                    {salesCategories.map((category: any) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {quickFormErrors.item && (
                    <p className="text-xs text-red-600 mt-1">
                      {quickFormErrors.item}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="saleDate">Date</Label>
                  <Input
                    id="saleDate"
                    name="date"
                    type="date"
                    value={quickSaleForm.date}
                    onChange={updateQuickSaleField}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rate">Rate</Label>
                  <Input
                    id="rate"
                    name="rate"
                    type="number"
                    value={quickSaleForm.rate}
                    onChange={updateQuickSaleField}
                    placeholder="Rate per unit"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    value={quickSaleForm.quantity}
                    onChange={updateQuickSaleField}
                    placeholder="Quantity sold"
                  />
                </div>
              </div>

              <div className="col-span-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="remaining"
                    checked={quickSaleForm.remaining}
                    onChange={updateQuickSaleField}
                    className="h-4 w-4"
                  />
                  Remaining balance?
                </label>
              </div>

              {quickSaleForm.remaining && (
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
                        {customers.length > 0 ? (
                          customers.map((customer: any) => (
                            <div
                              key={customer.id}
                              className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              onClick={() => {
                                setQuickSaleForm(prev => ({
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
                  <Label htmlFor="customerName">Customer Name *</Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    value={quickSaleForm.customerName}
                    onChange={updateQuickSaleField}
                    placeholder="Enter new customer name"
                  />
                  {quickFormErrors.customerName && (
                    <p className="text-xs text-red-600 mt-1">
                      {quickFormErrors.customerName}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="contact">Contact *</Label>
                  <Input
                    id="contact"
                    name="contact"
                    value={quickSaleForm.contact}
                    onChange={updateQuickSaleField}
                    placeholder="Phone number"
                    required
                  />
                  {quickFormErrors.contact && (
                    <p className="text-xs text-red-600 mt-1">
                      {quickFormErrors.contact}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="customerCategory">Customer Category</Label>
                  <select
                    id="customerCategory"
                    name="customerCategory"
                    value={quickSaleForm.customerCategory || "Chicken"}
                    onChange={updateQuickSaleField}
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
                    value={quickSaleForm.balance}
                    onChange={updateQuickSaleField}
                    placeholder="Amount paid (leave empty for full credit)"
                  />
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
                setIsQuickSaleOpen(false);
                setQuickFormErrors({});
              }}
              className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="cursor-pointer bg-primary hover:bg-primary/90 hover:shadow-md transition-all duration-200"
              disabled={createSaleMutation.isPending}
            >
              {createSaleMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Sale"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          onClick={() => setIsFarmsOpen(true)}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Farms</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{farms.length}</div>
            <p className="text-xs text-muted-foreground">
              Total farm locations
            </p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setIsBatchesOpen(true)}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Batches
            </CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBatches.length}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Lifetime Profit
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `₹${Number(lifetimeProfit).toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">All-time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `₹${Number(monthlyRevenue).toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {monthlyRevenueGrowth > 0 ? "+" : ""}
              {monthlyRevenueGrowth.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Money Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          onClick={() => setIsMoneyToReceiveOpen(true)}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Money to Receive
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `₹${Number(moneyToReceive).toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">From credit sales</p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setIsMoneyToPayOpen(true)}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Money to Give</CardTitle>
            <CreditCard className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statsLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `₹${Number(moneyToGive).toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              To suppliers & dealers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <Receipt className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statsLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `₹${Number(totalExpenses).toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Reminders */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates from your farms and batches.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-gray-200 rounded-full animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : statsError ? (
              <div className="text-center py-8 text-red-600">
                <p>Failed to load recent activity</p>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center space-x-4"
                  >
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.description} - {activity.farmName} -{" "}
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Reminders</CardTitle>
                <CardDescription>
                  Your upcoming tasks and reminders.
                  {statistics.totalReminders > 0 && (
                    <span className="ml-2 text-xs">
                      ({statistics.pendingReminders} pending,{" "}
                      {statistics.overdueReminders} overdue)
                    </span>
                  )}
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setIsReminderModalOpen(true)}
                className="cursor-pointer bg-primary hover:bg-primary/90 hover:shadow-md transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {remindersLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
                <p>Loading reminders...</p>
              </div>
            ) : remindersError ? (
              <div className="text-center py-8 text-red-600">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Failed to load reminders</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Overdue Reminders */}
                {overdue.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-red-600 mb-2">
                      Overdue ({overdue.length})
                    </h4>
                    {overdue.slice(0, 3).map((reminder) => (
                      <div
                        key={reminder.id}
                        className="flex items-center space-x-4 p-3 border border-red-200 rounded-lg bg-red-50/50 mb-2"
                      >
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <Clock className="h-4 w-4 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {reminder.title}
                          </p>
                          <p className="text-xs text-red-600">
                            {formatReminderDueDate(reminder.dueDate)} •{" "}
                            {getReminderTypeDisplayName(reminder.type)}
                          </p>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkCompleted(reminder.id)}
                            disabled={markCompletedMutation.isPending}
                            className="h-8 px-2 text-xs"
                          >
                            ✓
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteReminder(reminder.id)}
                            disabled={deleteReminderMutation.isPending}
                            className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upcoming Reminders */}
                {upcoming.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-primary mb-2">
                      Upcoming ({upcoming.length})
                    </h4>
                    {upcoming.slice(0, 5).map((reminder) => (
                      <div
                        key={reminder.id}
                        className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-muted/50 mb-2"
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isReminderDueSoon(reminder.dueDate)
                              ? "bg-yellow-100"
                              : "bg-primary/10"
                          }`}
                        >
                          <Clock
                            className={`h-4 w-4 ${
                              isReminderDueSoon(reminder.dueDate)
                                ? "text-yellow-600"
                                : "text-primary"
                            }`}
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {reminder.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatReminderDueDate(reminder.dueDate)} •{" "}
                            {getReminderTypeDisplayName(reminder.type)}
                            {reminder.farm && ` • ${reminder.farm.name}`}
                            {reminder.batch &&
                              ` • ${reminder.batch.batchNumber}`}
                          </p>
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkCompleted(reminder.id)}
                            disabled={markCompletedMutation.isPending}
                            className="h-8 px-2 text-xs"
                          >
                            ✓
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteReminder(reminder.id)}
                            disabled={deleteReminderMutation.isPending}
                            className="h-8 px-2 text-xs text-red-600 hover:text-red-700"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {upcoming.length === 0 && overdue.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No reminders yet</p>
                    <Button
                      size="sm"
                      onClick={() => setIsReminderModalOpen(true)}
                      className="cursor-pointer mt-4 bg-primary hover:bg-primary/90 hover:shadow-md transition-all duration-200"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add First Reminder
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Money to Receive Details Modal - Enhanced */}
      <Modal
        isOpen={isMoneyToReceiveOpen}
        onClose={() => setIsMoneyToReceiveOpen(false)}
        title="💰 Money to Receive"
        className="max-w-4xl"
      >
        <ModalContent className="max-h-[80vh] overflow-hidden flex flex-col">
          {moneyToReceiveLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading customer details...</p>
            </div>
          ) : moneyToReceiveData?.data && moneyToReceiveData.data.customers.length > 0 ? (
            <>
              {/* Table Container with Fixed Header */}
              <div className="flex-1 overflow-auto">
                <div className="min-w-full">
                  <table className="w-full border-collapse border border-gray-300">
                    {/* Sticky Header */}
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">Customer Name</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">Phone</th>
                        <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-sm">Due Amount</th>
                        <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm">Sales</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">Recent Sales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moneyToReceiveData.data.customers.map((customer, index) => (
                        <tr key={customer.customerId} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="border border-gray-300 px-3 py-2 font-medium text-sm">{customer.customerName}</td>
                          <td className="border border-gray-300 px-3 py-2 text-gray-600 text-sm">{customer.customerPhone}</td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-bold text-green-600 text-sm">
                            ₹{Number(customer.totalDueAmount).toLocaleString()}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center text-sm">{customer.salesCount}</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            <div className="space-y-1 max-w-xs">
                              {customer.sales.slice(0, 2).map((sale) => (
                                <div key={sale.saleId} className="text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium truncate">{sale.categoryName}</span>
                                    <span className="font-semibold text-green-600">₹{Number(sale.dueAmount).toLocaleString()}</span>
                                  </div>
                                  <div className="text-gray-500 truncate">{sale.farmName} • {new Date(sale.date).toLocaleDateString('en-IN')}</div>
                                </div>
                              ))}
                              {customer.sales.length > 2 && (
                                <div className="text-xs text-gray-500 text-center py-1 bg-gray-100 rounded">
                                  +{customer.sales.length - 2} more
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Footer with Total Count */}
              <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 text-sm text-gray-600">
                Showing {moneyToReceiveData.data.customers.length} customers with outstanding payments
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No outstanding amounts to receive</p>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsMoneyToReceiveOpen(false)}
            className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Money to Pay Details Modal - Enhanced */}
      <Modal
        isOpen={isMoneyToPayOpen}
        onClose={() => setIsMoneyToPayOpen(false)}
        title="💳 Money to Pay"
        className="max-w-4xl"
      >
        <ModalContent className="max-h-[80vh] overflow-hidden flex flex-col">
          {moneyToPayLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading dealer details...</p>
            </div>
          ) : moneyToPayData?.data && moneyToPayData.data.dealers.length > 0 ? (
            <>
              {/* Table Container with Fixed Header */}
              <div className="flex-1 overflow-auto">
                <div className="min-w-full">
                  <table className="w-full border-collapse border border-gray-300">
                    {/* Sticky Header */}
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">Dealer Name</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">Contact</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">Address</th>
                        <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-sm">Outstanding</th>
                        <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-sm">Trans.</th>
                        <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-sm">Recent Transactions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moneyToPayData.data.dealers.map((dealer, index) => (
                        <tr key={dealer.dealerId} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                          <td className="border border-gray-300 px-3 py-2 font-medium text-sm">{dealer.dealerName}</td>
                          <td className="border border-gray-300 px-3 py-2 text-gray-600 text-sm">{dealer.dealerContact}</td>
                          <td className="border border-gray-300 px-3 py-2 text-gray-600 text-xs max-w-32 truncate">
                            {dealer.dealerAddress || "-"}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-right font-bold text-red-600 text-sm">
                            ₹{Number(dealer.outstandingAmount).toLocaleString()}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-center text-sm">{dealer.totalTransactions}</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            <div className="space-y-1 max-w-xs">
                              {dealer.recentTransactions.slice(0, 2).map((transaction) => (
                                <div key={transaction.transactionId} className="text-xs">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium truncate">
                                      {transaction.type}
                                      {transaction.itemName && <span className="text-gray-500"> - {transaction.itemName}</span>}
                                    </span>
                                    <span className="font-semibold text-red-600">₹{Number(transaction.amount).toLocaleString()}</span>
                                  </div>
                                  <div className="text-gray-500 truncate">
                                    {new Date(transaction.date).toLocaleDateString('en-IN')}
                                  </div>
                                </div>
                              ))}
                              {dealer.recentTransactions.length > 2 && (
                                <div className="text-xs text-gray-500 text-center py-1 bg-gray-100 rounded">
                                  +{dealer.recentTransactions.length - 2} more
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Footer with Total Count */}
              <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 text-sm text-gray-600">
                Showing {moneyToPayData.data.dealers.length} dealers with outstanding payments
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No outstanding amounts to pay</p>
            </div>
          )}
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsMoneyToPayOpen(false)}
            className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
