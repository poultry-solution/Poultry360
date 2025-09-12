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

  // Farm selection state for filtering batches
  const [selectedFarmId, setSelectedFarmId] = useState<string>("");

  // Filter batches based on selected farm
  const filteredBatches = selectedFarmId
    ? activeBatches.filter((batch) => batch.farmId === selectedFarmId)
    : activeBatches;

  // Inventory integration
  const { inventory, updateInventoryItem, getInventoryByCategory } =
    useInventory();
  const feedInventory = getInventoryByCategory("feed");
  const medicineInventory = getInventoryByCategory("medicine");

  const [isFarmsOpen, setIsFarmsOpen] = useState(false);
  const [isBatchesOpen, setIsBatchesOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isGiveOpen, setIsGiveOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

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
    customerName: "",
    contact: "",
    category: "Chicken",
    balance: "",
    date: "",
  });

  const [quickFormErrors, setQuickFormErrors] = useState<
    Record<string, string>
  >({});

  const receivables = [
    {
      id: 1,
      party: "Dealer A",
      reference: "Batch B-2024-001",
      amount: 450000,
      dueDate: "2025-09-10",
    },
    {
      id: 2,
      party: "Dealer B",
      reference: "Batch B-2024-002",
      amount: 275000,
      dueDate: "2025-09-12",
    },
  ];

  const payables = [
    {
      id: 1,
      party: "Medico Pharma",
      reference: "Invoice MP-1021",
      amount: 35000,
      dueDate: "2025-09-08",
    },
    {
      id: 2,
      party: "VetCare",
      reference: "Invoice VC-332",
      amount: 18000,
      dueDate: "2025-09-15",
    },
  ];

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

  // Handle feed selection from inventory
  const handleQuickFeedSelection = (feedId: string) => {
    const selectedFeed = feedInventory.find((feed) => feed.id === feedId);
    if (selectedFeed) {
      setQuickExpenseForm((prev) => ({
        ...prev,
        selectedFeedId: feedId,
        feedBrand: selectedFeed.name,
        feedRate: selectedFeed.rate.toString(),
      }));
    }
  };

  // Handle medicine selection from inventory
  const handleQuickMedicineSelection = (medicineId: string) => {
    const selectedMedicine = medicineInventory.find(
      (medicine) => medicine.id === medicineId
    );
    if (selectedMedicine) {
      setQuickExpenseForm((prev) => ({
        ...prev,
        selectedMedicineId: medicineId,
        medicineName: selectedMedicine.name,
        medicineRate: selectedMedicine.rate.toString(),
      }));
    }
  };

  // Quick form submissions (for now just show success message - no backend integration)
  const submitQuickExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickExpenseForm.batchId) {
      setQuickFormErrors({ batchId: "Please select a batch" });
      return;
    }
    // Simulate success
    alert(`Expense added to batch ${quickExpenseForm.batchId} successfully!`);
    setIsQuickExpenseOpen(false);
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
  };

  const submitQuickSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSaleForm.batchId) {
      setQuickFormErrors({ batchId: "Please select a batch" });
      return;
    }
    // Simulate success
    alert(`Sale added to batch ${quickSaleForm.batchId} successfully!`);
    setIsQuickSaleOpen(false);
    setQuickSaleForm({
      farmId: "",
      batchId: "",
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
    setQuickFormErrors({});
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
                      {batch.farm.name} • Birds {batch.initialChicks.toLocaleString()} • Age{" "}
                      {Math.floor((new Date().getTime() - new Date(batch.startDate).getTime()) / (1000 * 60 * 60 * 24))} days
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
        isOpen={isReceiveOpen}
        onClose={() => setIsReceiveOpen(false)}
        title="Money to Receive"
      >
        <ModalContent>
          <div className="space-y-3">
            {receivables.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60"
              >
                <div>
                  <div className="font-medium">{r.party}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.reference} • Due {r.dueDate}
                  </div>
                </div>
                <div className="text-right font-medium">
                  ₹{r.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsReceiveOpen(false)}
            className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={isGiveOpen}
        onClose={() => setIsGiveOpen(false)}
        title="Money to Give"
      >
        <ModalContent>
          <div className="space-y-3">
            {payables.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60"
              >
                <div>
                  <div className="font-medium">{p.party}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.reference} • Due {p.dueDate}
                  </div>
                </div>
                <div className="text-right font-medium">
                  ₹{p.amount.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsGiveOpen(false)}
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
                    .filter((batch) => 
                      batch.status === "ACTIVE" && 
                      (!quickExpenseForm.farmId || batch.farmId === quickExpenseForm.farmId)
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
                      {feedInventory.map((feed) => (
                        <option key={feed.id} value={feed.id}>
                          {feed.name} ({feed.quantity} {feed.unit} available)
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
                      className={
                        quickExpenseForm.selectedFeedId ? "bg-gray-50" : ""
                      }
                    />
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
                      {medicineInventory.map((medicine) => (
                        <option key={medicine.id} value={medicine.id}>
                          {medicine.name} ({medicine.quantity} {medicine.unit}{" "}
                          available)
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
                    />
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
            >
              Add Expense
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
                    .filter((batch) => 
                      batch.status === "ACTIVE" && 
                      (!quickSaleForm.farmId || batch.farmId === quickSaleForm.farmId)
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
                    <option value="Chicken">Chicken</option>
                    <option value="Other">Other</option>
                  </select>
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
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                      id="customerName"
                      name="customerName"
                      value={quickSaleForm.customerName}
                      onChange={updateQuickSaleField}
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contact">Contact</Label>
                    <Input
                      id="contact"
                      name="contact"
                      value={quickSaleForm.contact}
                      onChange={updateQuickSaleField}
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="saleCategory">Category</Label>
                    <select
                      id="saleCategory"
                      name="category"
                      value={quickSaleForm.category}
                      onChange={updateQuickSaleField}
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
                      value={quickSaleForm.balance}
                      onChange={updateQuickSaleField}
                      placeholder="Remaining balance"
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
            >
              Add Income
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
            <p className="text-xs text-muted-foreground">Total farm locations</p>
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
            <p className="text-xs text-muted-foreground">
              Currently running
            </p>
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
            <div className="text-2xl font-bold">₹3.2M</div>
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
            <div className="text-2xl font-bold">₹2.4M</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Money Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          onClick={() => setIsReceiveOpen(true)}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Money to Receive
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹1.8M</div>
            <p className="text-xs text-muted-foreground">
              From completed batches
            </p>
          </CardContent>
        </Card>

        <Card
          onClick={() => setIsGiveOpen(true)}
          className="cursor-pointer transition-colors hover:bg-[#10841E] hover:text-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Money to Give</CardTitle>
            <CreditCard className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹235,000</div>
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
            <div className="text-2xl font-bold text-orange-600">₹450,000</div>
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
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Batch #B-2024-001 completed
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Farm A - 2 hours ago
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New expense recorded</p>
                  <p className="text-xs text-muted-foreground">
                    Feed purchase - ₹45,000 - 4 hours ago
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Low inventory alert</p>
                  <p className="text-xs text-muted-foreground">
                    Medicine stock below threshold - 6 hours ago
                  </p>
                </div>
              </div>
            </div>
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
    </div>
  );
}
