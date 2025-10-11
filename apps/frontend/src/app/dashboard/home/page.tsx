"use client";

import { Building2, Layers } from "lucide-react";
import { useAuth } from "@/common/store/store";
import { useState, useEffect } from "react";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Button } from "@/common/components/ui/button";
import Link from "next/link";
import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import { useGetUserFarms } from "@/fetchers/farms/farmQueries";
import { useInventory } from "@/common/contexts/InventoryContext";
import {
  useCreateExpense,
  useGetExpenseCategories,
} from "@/fetchers/expenses/expenseQueries";
import { useGetInventoryTableData } from "@/fetchers/inventory/inventoryQueries";
import { useGetSalesCategories } from "@/fetchers/sale/saleQueries";
import { useCreateMortality } from "@/fetchers/mortality/mortalityQueries";
import {
  useDashboardStats,
  useGetMoneyToReceiveDetails,
  useGetMoneyToPayDetails,
} from "@/fetchers/dashboard/dashboardQueries";
import { TodayExpenses } from "@/components/today-expenses";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RemindersSection } from "@/components/dashboard/RemindersSection";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickExpenseModal } from "@/components/dashboard/modals/QuickExpenseModal";
import { QuickSaleModal } from "@/components/dashboard/modals/QuickSaleModal";
import { MoneyDetailsModal } from "@/components/dashboard/modals/MoneyDetailsModal";
import { QuickMortalityModal } from "@/components/dashboard/modals/QuickMortalityModal";
import { QuickWeightModal } from "@/components/dashboard/modals/QuickWeightModal";
import { BatchPerformanceTable } from "@/components/dashboard/BatchPerformanceTable";

import {
  useGetReminderDashboard,
  useCreateReminder,
  useMarkReminderCompleted,
  useDeleteReminder,
} from "@/fetchers/remainder/remainderQueries";
import { useAddWeight } from "@/fetchers/weight/weightQueries";

export default function DashboardPage() {
  const { user } = useAuth();

  // Fetch real data from APIs
  const { data: batchesResponse } = useGetAllBatches();
  const { data: farmsResponse } = useGetUserFarms("all");

  // Only keep ACTIVE batches globally so completed ones are never selectable
  const activeBatches = (batchesResponse?.data || []).filter(
    (batch: any) => batch.status === "ACTIVE"
  );
  const farms = farmsResponse?.data || [];

  // Fetch categories and customers for quick forms
  const { data: expenseCategoriesResponse } =
    useGetExpenseCategories("EXPENSE");
  const { data: salesCategoriesResponse } = useGetSalesCategories();
  const expenseCategories = expenseCategoriesResponse?.data || [];
  const salesCategories = salesCategoriesResponse?.data || [];

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
  const [isQuickMortalityOpen, setIsQuickMortalityOpen] = useState(false);

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
  const createMortalityMutation = useCreateMortality();

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
  const { data: moneyToReceiveData, isLoading: moneyToReceiveLoading } =
    useGetMoneyToReceiveDetails();
  const { data: moneyToPayData, isLoading: moneyToPayLoading } =
    useGetMoneyToPayDetails();

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

  const [quickMortalityForm, setQuickMortalityForm] = useState({
    farmId: "",
    batchId: "",
    date: new Date().toISOString().split("T")[0],
    count: "",
    reason: "Natural Death",
  });

  const [quickFormErrors, setQuickFormErrors] = useState<
    Record<string, string>
  >({});

  // Ensure default date when quick expense modal opens
  useEffect(() => {
    if (isQuickExpenseOpen) {
      if (!quickExpenseForm.date) {
        const today = new Date().toISOString().split("T")[0];
        setQuickExpenseForm((p) => ({ ...p, date: today }));
      }
    }
  }, [isQuickExpenseOpen, quickExpenseForm.date]);

  // Ensure default date when mortality modal opens
  useEffect(() => {
    if (isQuickMortalityOpen) {
      if (!quickMortalityForm.date) {
        const today = new Date().toISOString().split("T")[0];
        setQuickMortalityForm((p) => ({ ...p, date: today }));
      }
    }
  }, [isQuickMortalityOpen, quickMortalityForm.date]);

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

  // Quick form submissions

  // ==================== QUICK ADD WEIGHT ====================
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [weightErrors, setWeightErrors] = useState<Record<string, string>>({});
  const addWeightMutation = useAddWeight(""); // We'll pass the batchId from the modal

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Welcome , {user?.name}!
          </h1>
        </div>
        <QuickActions
          onAddExpense={() => setIsQuickExpenseOpen(true)}
          onAddSale={() => setIsQuickSaleOpen(true)}
          onAddMortality={() => setIsQuickMortalityOpen(true)}
          onRecordWeight={() => setIsWeightModalOpen(true)}
        />
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
                <Link
                  key={farm.id}
                  href={`/dashboard/farms/${farm.id}`}
                  className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60 hover:bg-muted cursor-pointer"
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
                </Link>
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
                <Link
                  key={batch.id}
                  href={`/dashboard/batches/${batch.id}`}
                  className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60 hover:bg-muted cursor-pointer"
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
                </Link>
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

      {/* Quick Expense Modal */}
      <QuickExpenseModal
        isOpen={isQuickExpenseOpen}
        onClose={() => {
          setIsQuickExpenseOpen(false);
          setQuickFormErrors({});
        }}
        onSubmit={async (expenseData) => {
          await createExpenseMutation.mutateAsync(expenseData);
        }}
        farms={farms}
        activeBatches={activeBatches}
        expenseCategories={expenseCategories}
        feedInventory={feedInventory}
        medicineInventory={medicineInventory}
        isLoading={createExpenseMutation.isPending}
      />

      {/* Quick Sale Modal */}
      <QuickSaleModal
        isOpen={isQuickSaleOpen}
        onClose={() => setIsQuickSaleOpen(false)}
        farms={farms}
        activeBatches={activeBatches}
        onSuccess={() => {
          // Refresh data after successful sale creation
          // The mutations will automatically refetch data
        }}
      />

      {/* Stats Cards */}
      <StatsCards
        farms={farms}
        activeBatches={activeBatches}
        lifetimeProfit={lifetimeProfit}
        monthlyRevenue={monthlyRevenue}
        monthlyRevenueGrowth={monthlyRevenueGrowth}
        moneyToReceive={moneyToReceive}
        moneyToGive={moneyToGive}
        totalExpenses={totalExpenses}
        statsLoading={statsLoading}
        onFarmsClick={() => setIsFarmsOpen(true)}
        onBatchesClick={() => setIsBatchesOpen(true)}
        onMoneyToReceiveClick={() => setIsMoneyToReceiveOpen(true)}
        onMoneyToPayClick={() => setIsMoneyToPayOpen(true)}
      />

      {/* Batch Performance Table */}
      <BatchPerformanceTable />

      {/* Recent Activity and Reminders */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity
          recentActivity={recentActivity}
          statsLoading={statsLoading}
          statsError={statsError}
        />

        <RemindersSection
          upcoming={upcoming}
          overdue={overdue}
          statistics={statistics}
          remindersLoading={remindersLoading}
          remindersError={remindersError}
          markCompletedMutation={markCompletedMutation}
          deleteReminderMutation={deleteReminderMutation}
          onMarkCompleted={handleMarkCompleted}
          onDeleteReminder={handleDeleteReminder}
          onAddReminder={() => setIsReminderModalOpen(true)}
                          />
                        </div>

      {/* Money to Receive Details Modal */}
      <MoneyDetailsModal
        isOpen={isMoneyToReceiveOpen}
        onClose={() => setIsMoneyToReceiveOpen(false)}
        title="Money to Receive"
        icon="💰"
        isLoading={moneyToReceiveLoading}
        data={moneyToReceiveData?.data}
        type="receive"
      />

      {/* Money to Pay Details Modal */}
      <MoneyDetailsModal
        isOpen={isMoneyToPayOpen}
        onClose={() => setIsMoneyToPayOpen(false)}
        title="Money to Pay"
        icon="💳"
        isLoading={moneyToPayLoading}
        data={moneyToPayData?.data}
        type="pay"
      />

      {/* Quick Mortality Modal */}
      <QuickMortalityModal
        isOpen={isQuickMortalityOpen}
        onClose={() => {
          setIsQuickMortalityOpen(false);
          setQuickFormErrors({});
        }}
        onSubmit={async (mortalityData) => {
          await createMortalityMutation.mutateAsync(mortalityData);
        }}
        farms={farms}
        activeBatches={activeBatches}
        isLoading={createMortalityMutation.isPending}
      />

      {/* Quick Add Weight Modal */}
      <QuickWeightModal
        isOpen={isWeightModalOpen}
        onClose={() => {
          setIsWeightModalOpen(false);
          setWeightErrors({});
        }}
        onSubmit={async (weightData) => {
          await addWeightMutation.mutateAsync(weightData);
        }}
        farms={farms}
        activeBatches={activeBatches}
        isLoading={addWeightMutation.isPending}
      />
      <TodayExpenses />
    </div>
  );
}
