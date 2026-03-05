"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/common/components/ui/button";
import { Plus, ClipboardList, Wallet, Skull, Egg, Loader2 } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { getTodayLocalDate } from "@/common/lib/utils";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { DateInput } from "@/common/components/ui/date-input";
import { ExpenseModal } from "@/components/batches/modals/ExpenseModal";
import { MortalityModal } from "@/components/batches/modals/MortalityModal";
import { useGetUserFarms } from "@/fetchers/farms/farmQueries";
import { useGetAllBatches, useCreateEggProduction } from "@/fetchers/batches/batchQueries";
import { useGetEggTypes } from "@/fetchers/eggTypes/eggTypeQueries";
import {
  useGetExpenseCategories,
  useCreateExpense,
} from "@/fetchers/expenses/expenseQueries";
import {
  useGetInventoryForExpense,
  useGetInventoryTableData,
} from "@/fetchers/inventory/inventoryQueries";
import {
  useCreateMortality,
  useGetBatchMortalities,
} from "@/fetchers/mortality/mortalityQueries";

const SALES_LEDGER_OPEN_MODAL_PARAM = "openModal=sale";

type ExpenseCategory = "Feed" | "Medicine" | "Other" | "Add extra expenses";

const initialExpenseForm = {
  category: "Feed" as ExpenseCategory,
  date: "",
  notes: "",
  feedBrand: "",
  feedQuantity: "",
  feedRate: "",
  selectedFeedId: "",
  medicineName: "",
  medicineRate: "",
  medicineQuantity: "",
  selectedMedicineId: "",
  selectedOtherId: "",
  otherName: "",
  otherRate: "",
  otherQuantity: "",
  extraName: "",
  extraAmount: "",
  farmId: "",
  batchId: "",
};

const initialMortalityForm = {
  date: "",
  count: "",
  reason: "Natural Death",
  farmId: "",
  batchId: "",
};

const initialEggProductionForm = {
  farmId: "",
  batchId: "",
  date: "",
  countByType: {} as Record<string, string>,
};

/**
 * Quick action buttons for the farmer dashboard home page.
 * "Add sale" navigates to Sales Ledger with ?openModal=sale.
 * "Add Expense" opens ExpenseModal with farm/batch selectors (same backend API as batch page).
 * "Add Mortality" opens MortalityModal with farm/batch selectors (same backend API as batch page).
 * "Add Egg Production" opens modal to add daily egg production (LAYERS batches only, same backend API).
 */
export function QuickActionBtnsFarmer() {
  const { t } = useI18n();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState(initialExpenseForm);
  const [expenseErrors, setExpenseErrors] = useState<Record<string, string>>({});
  const [isMortalityModalOpen, setIsMortalityModalOpen] = useState(false);
  const [mortalityForm, setMortalityForm] = useState(initialMortalityForm);
  const [mortalityErrors, setMortalityErrors] = useState<Record<string, string>>({});
  const [isEggProductionModalOpen, setIsEggProductionModalOpen] = useState(false);
  const [eggProductionForm, setEggProductionForm] = useState(initialEggProductionForm);
  const [eggProductionError, setEggProductionError] = useState("");
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const { data: farmsResponse } = useGetUserFarms("all");
  const { data: batchesResponse } = useGetAllBatches();
  const { data: categoriesResponse } = useGetExpenseCategories("EXPENSE");
  const { data: inventoryResponse } = useGetInventoryTableData();
  const { data: feedForExpenseRes } = useGetInventoryForExpense("FEED");
  const { data: medicineForExpenseRes } = useGetInventoryForExpense("MEDICINE");
  const { data: otherForExpenseRes } = useGetInventoryForExpense("OTHER");

  const farms = farmsResponse?.data || [];
  const activeBatches = (batchesResponse?.data || []).filter(
    (b: { status: string }) => b.status === "ACTIVE"
  );
  const expenseCategories = categoriesResponse?.data || [];
  const inventoryItems = inventoryResponse?.data || [];
  const feedInventoryForExpense = feedForExpenseRes?.data ?? [];
  const medicineInventoryForExpense = medicineForExpenseRes?.data ?? [];
  const otherInventoryForExpense = otherForExpenseRes?.data ?? [];

  const createExpenseMutation = useCreateExpense();
  const createMortalityMutation = useCreateMortality();
  const { data: batchMortalitiesResponse } = useGetBatchMortalities(
    mortalityForm.batchId,
    { enabled: !!mortalityForm.batchId }
  );
  const mortalityStats = batchMortalitiesResponse?.statistics;

  const { data: eggTypesData } = useGetEggTypes({ enabled: true });
  const eggTypes = eggTypesData?.data ?? [];
  const createEggProductionMutation = useCreateEggProduction(
    eggProductionForm.batchId || "_"
  );

  // LAYERS batches only for egg production; filter by farm when farm selected
  const layersBatches = activeBatches.filter(
    (b: { batchType?: string }) => (b as { batchType?: string }).batchType === "LAYERS"
  );
  const batchesForEggProduction = eggProductionForm.farmId
    ? layersBatches.filter(
        (b: { farmId?: string; farm?: { id: string } }) =>
          (b.farmId || b.farm?.id) === eggProductionForm.farmId
      )
    : layersBatches;

  // When a farm is selected, show only its batches; when no farm selected, show all active batches
  const batchesForSelectedFarm = expenseForm.farmId
    ? activeBatches.filter(
        (b: { farmId?: string; farm?: { id: string } }) =>
          (b.farmId || b.farm?.id) === expenseForm.farmId
      )
    : activeBatches;
  const batchesForMortality = mortalityForm.farmId
    ? activeBatches.filter(
        (b: { farmId?: string; farm?: { id: string } }) =>
          (b.farmId || b.farm?.id) === mortalityForm.farmId
      )
    : activeBatches;

  function flash(type: "success" | "error", message: string) {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 2500);
  }

  function updateExpenseField(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: string } }
  ) {
    const { name, value } = e.target;
    if (name === "farmId") {
      setExpenseForm((p) => ({ ...p, farmId: value, batchId: "" }));
      return;
    }
    if (name === "batchId") {
      const batch = activeBatches.find((b: { id: string }) => b.id === value);
      const farmId = batch ? (batch.farmId ?? (batch as { farm?: { id: string } }).farm?.id) : "";
      setExpenseForm((p) => ({ ...p, batchId: value, ...(farmId ? { farmId } : {}) }));
      return;
    }
    setExpenseForm((p) => ({ ...p, [name]: value }));
  }

  function handleFeedSelection(feedId: string) {
    const selectedFeed = feedInventoryForExpense.find((f: { id: string }) => f.id === feedId);
    if (selectedFeed) {
      setExpenseForm((prev) => ({
        ...prev,
        selectedFeedId: feedId,
        feedBrand: selectedFeed.name,
        feedRate: String(selectedFeed.rate ?? 0),
      }));
    }
  }

  function handleMedicineSelection(medicineId: string) {
    const selectedMedicine = medicineInventoryForExpense.find((m: { id: string }) => m.id === medicineId);
    if (selectedMedicine) {
      setExpenseForm((prev) => ({
        ...prev,
        selectedMedicineId: medicineId,
        medicineName: selectedMedicine.name,
        medicineRate: String(selectedMedicine.rate ?? 0),
      }));
    }
  }

  function handleOtherSelection(otherId: string) {
    if (!otherId) {
      setExpenseForm((prev) => ({
        ...prev,
        selectedOtherId: "",
        otherRate: "",
        otherQuantity: "",
      }));
      return;
    }
    const selectedOther = otherInventoryForExpense.find((o: { id: string }) => o.id === otherId);
    if (selectedOther) {
      setExpenseForm((prev) => ({
        ...prev,
        selectedOtherId: otherId,
        otherName: selectedOther.name,
        otherRate: String(selectedOther.rate ?? 0),
      }));
    }
  }

  function openNewExpense() {
    setExpenseForm(initialExpenseForm);
    setExpenseErrors({});
    setIsExpenseModalOpen(true);
  }

  function validateExpense(): boolean {
    const errs: Record<string, string> = {};
    if (!expenseForm.farmId) errs.farmId = "Farm is required";
    if (!expenseForm.batchId) errs.batchId = "Batch is required";
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
          (f: { id: string }) => f.id === expenseForm.selectedFeedId
        );
        const requestedQty = Number(expenseForm.feedQuantity);
        const available = selectedFeed?.quantity ?? selectedFeed?.currentStock ?? 0;
        if (selectedFeed && requestedQty > available) {
          errs.feedQuantity = `Only ${available} ${selectedFeed.unit} available`;
        }
      }
    } else if (expenseForm.category === "Medicine") {
      if (!expenseForm.selectedMedicineId)
        errs.medicineName = "Please select a medicine from inventory";
      if (!expenseForm.medicineQuantity) errs.medicineQuantity = "Quantity required";
      if (!expenseForm.medicineRate) errs.medicineRate = "Rate required";
      if (expenseForm.selectedMedicineId && expenseForm.medicineQuantity) {
        const selectedMedicine = medicineInventoryForExpense.find(
          (m: { id: string }) => m.id === expenseForm.selectedMedicineId
        );
        const requestedQty = Number(expenseForm.medicineQuantity);
        const available = selectedMedicine?.quantity ?? selectedMedicine?.currentStock ?? 0;
        if (selectedMedicine && requestedQty > available) {
          errs.medicineQuantity = `Only ${available} ${selectedMedicine.unit} available`;
        }
      }
    } else if (expenseForm.category === "Other") {
      if (expenseForm.selectedOtherId) {
        if (!expenseForm.otherQuantity) errs.otherQuantity = "Quantity required";
        if (!expenseForm.otherRate) errs.otherRate = "Rate required";
        const selectedOther = otherInventoryForExpense.find(
          (o: { id: string }) => o.id === expenseForm.selectedOtherId
        );
        const requestedQty = Number(expenseForm.otherQuantity);
        const available = selectedOther?.quantity ?? selectedOther?.currentStock ?? 0;
        if (selectedOther && requestedQty > available) {
          errs.otherQuantity = `Only ${available} ${selectedOther.unit} available`;
        }
      } else {
        if (!expenseForm.otherName) errs.otherName = "Expense name required";
        if (!expenseForm.otherQuantity) errs.otherQuantity = "Quantity required";
        if (!expenseForm.otherRate) errs.otherRate = "Rate required";
      }
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
      const inventoryItemsPayload: { itemId: string; quantity: number; notes: string }[] = [];
      const ec = expenseForm.category;

      const category = expenseCategories.find((cat: { name: string }) =>
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
          inventoryItemsPayload.push({
            itemId: expenseForm.selectedFeedId,
            quantity: q,
            notes: `Feed: ${expenseForm.feedBrand || "Feed"}`,
          });
        }
      } else if (ec === "Medicine") {
        const q = Number(expenseForm.medicineQuantity || 0);
        const r = Number(expenseForm.medicineRate || 0);
        amount = q * r;
        quantity = q;
        unitPrice = r;
        description = `${expenseForm.medicineName} - ${description}`;
        if (expenseForm.selectedMedicineId && q > 0) {
          inventoryItemsPayload.push({
            itemId: expenseForm.selectedMedicineId,
            quantity: q,
            notes: `Medicine: ${expenseForm.medicineName}`,
          });
        }
      } else if (ec === "Other") {
        const q = Number(expenseForm.otherQuantity || 0);
        const r = Number(expenseForm.otherRate || 0);
        amount = q * r;
        quantity = q;
        unitPrice = r;
        description = `${expenseForm.otherName || "Other"} - ${description}`;
        if (expenseForm.selectedOtherId && q > 0) {
          inventoryItemsPayload.push({
            itemId: expenseForm.selectedOtherId,
            quantity: q,
            notes: `Other: ${expenseForm.otherName || "Other"}`,
          });
        }
      }

      const expenseData = {
        date: expenseForm.date
          ? new Date(expenseForm.date).toISOString()
          : new Date().toISOString(),
        amount,
        description,
        quantity,
        unitPrice,
        farmId: expenseForm.farmId,
        batchId: expenseForm.batchId,
        categoryId: category.id,
        inventoryItems: inventoryItemsPayload.length > 0 ? inventoryItemsPayload : undefined,
      };

      await createExpenseMutation.mutateAsync(expenseData);
      flash("success", "Expense added successfully");
      setIsExpenseModalOpen(false);
      setExpenseForm(initialExpenseForm);
      setExpenseErrors({});
    } catch (error) {
      console.error("Failed to save expense:", error);
      flash("error", "Failed to save expense. Please try again.");
    }
  }

  function closeExpenseModal() {
    setIsExpenseModalOpen(false);
    setExpenseErrors({});
  }

  function updateMortalityField(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | { target: { name: string; value: string } }
  ) {
    const { name, value } = e.target;
    if (name === "farmId") {
      setMortalityForm((p) => ({ ...p, farmId: value, batchId: "" }));
      return;
    }
    if (name === "batchId") {
      const batch = activeBatches.find((b: { id: string }) => b.id === value);
      const farmId = batch ? (batch.farmId ?? (batch as { farm?: { id: string } }).farm?.id) : "";
      setMortalityForm((p) => ({ ...p, batchId: value, ...(farmId ? { farmId } : {}) }));
      return;
    }
    setMortalityForm((p) => ({ ...p, [name]: value }));
  }

  function openNewMortality() {
    setMortalityForm({
      ...initialMortalityForm,
      date: getTodayLocalDate(),
      reason: "Natural Death",
    });
    setMortalityErrors({});
    setIsMortalityModalOpen(true);
  }

  function validateMortality(): boolean {
    const errs: Record<string, string> = {};
    if (!mortalityForm.farmId) errs.farmId = "Farm is required";
    if (!mortalityForm.batchId) errs.batchId = "Batch is required";
    if (!mortalityForm.date) errs.date = "Date is required";
    if (!mortalityForm.count) errs.count = "Count is required";
    const count = Number(mortalityForm.count || 0);
    if (count <= 0) errs.count = "Count must be greater than 0";
    if (mortalityStats && count > mortalityStats.currentBirds) {
      errs.count = `Cannot record ${count} deaths. Only ${mortalityStats.currentBirds} birds available in batch`;
    }
    setMortalityErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submitMortality(e: React.FormEvent) {
    e.preventDefault();
    if (!validateMortality()) {
      flash("error", "Please fill all required fields");
      return;
    }
    try {
      await createMortalityMutation.mutateAsync({
        date: mortalityForm.date ? new Date(mortalityForm.date) : new Date(),
        count: Number(mortalityForm.count),
        reason: mortalityForm.reason || "Natural Death",
        batchId: mortalityForm.batchId,
      });
      flash("success", "Mortality record added successfully");
      setIsMortalityModalOpen(false);
      setMortalityForm(initialMortalityForm);
      setMortalityErrors({});
    } catch (error: unknown) {
      console.error("Failed to save mortality:", error);
      flash(
        "error",
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to save mortality record"
      );
    }
  }

  function closeMortalityModal() {
    setIsMortalityModalOpen(false);
    setMortalityErrors({});
  }

  function updateEggProductionField(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: string } }
  ) {
    const { name, value } = e.target;
    if (name === "farmId") {
      setEggProductionForm((p) => ({ ...p, farmId: value, batchId: "" }));
      return;
    }
    if (name === "batchId") {
      const batch = layersBatches.find((b: { id: string }) => b.id === value);
      const farmId = batch ? (batch.farmId ?? (batch as { farm?: { id: string } }).farm?.id) : "";
      setEggProductionForm((p) => ({ ...p, batchId: value, ...(farmId ? { farmId } : {}) }));
      return;
    }
    if (name === "date") {
      setEggProductionForm((p) => ({ ...p, date: value }));
      return;
    }
    setEggProductionForm((p) => ({ ...p, [name]: value }));
  }

  function setEggProductionCount(eggTypeId: string, value: string) {
    setEggProductionForm((p) => ({
      ...p,
      countByType: { ...p.countByType, [eggTypeId]: value },
    }));
  }

  function openNewEggProduction() {
    setEggProductionForm({
      ...initialEggProductionForm,
      date: getTodayLocalDate(),
      countByType: {},
    });
    setEggProductionError("");
    setIsEggProductionModalOpen(true);
  }

  function validateEggProduction(): boolean {
    if (!eggProductionForm.farmId) {
      setEggProductionError("Farm is required.");
      return false;
    }
    if (!eggProductionForm.batchId) {
      setEggProductionError("Batch is required.");
      return false;
    }
    if (!eggProductionForm.date) {
      setEggProductionError("Date is required.");
      return false;
    }
    let total = 0;
    for (const t of eggTypes) {
      total += parseInt(eggProductionForm.countByType[t.id] ?? "0", 10) || 0;
    }
    if (total <= 0) {
      setEggProductionError("Enter at least one count.");
      return false;
    }
    setEggProductionError("");
    return true;
  }

  async function submitEggProduction(e: React.FormEvent) {
    e.preventDefault();
    if (!validateEggProduction() || !eggProductionForm.batchId) return;
    try {
      const counts: Record<string, number> = {};
      for (const t of eggTypes) {
        counts[t.id] = parseInt(eggProductionForm.countByType[t.id] ?? "0", 10) || 0;
      }
      const dateOnly = eggProductionForm.date.includes("T")
        ? eggProductionForm.date.split("T")[0]
        : eggProductionForm.date;
      await createEggProductionMutation.mutateAsync({
        date: `${dateOnly}T00:00:00.000Z`,
        countByType: counts,
      });
      flash("success", "Egg production record added successfully");
      setIsEggProductionModalOpen(false);
      setEggProductionForm(initialEggProductionForm);
      setEggProductionError("");
    } catch (err: unknown) {
      console.error("Failed to save egg production:", err);
      setEggProductionError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          "Failed to save egg production record."
      );
    }
  }

  function closeEggProductionModal() {
    setIsEggProductionModalOpen(false);
    setEggProductionError("");
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/farmer/dashboard/sales-ledger?${SALES_LEDGER_OPEN_MODAL_PARAM}`}
          className="inline-flex"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 hover:bg-green-50 hover:text-green-700 border-green-200"
          >
            <Plus className="h-4 w-4" />
            {t("farmer.dashboard.quickActions.addSale")}
          </Button>
        </Link>
        <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 hover:bg-green-50 hover:text-green-700 border-green-200"
            onClick={openNewExpense}
        >
          <Wallet className="h-4 w-4" />
          {t("farmer.dashboard.quickActions.addExpense")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 hover:bg-green-50 hover:text-green-700 border-green-200"
          onClick={openNewMortality}
        >
          <Skull className="h-4 w-4" />
          {t("farmer.dashboard.quickActions.addMortality")}
        </Button>
        {layersBatches.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 hover:bg-green-50 hover:text-green-700 border-green-200"
            onClick={openNewEggProduction}
          >
            <Egg className="h-4 w-4" />
            {t("farmer.dashboard.quickActions.addEggProduction")}
          </Button>
        )}
        <Link href="/farmer/dashboard/order-requests" className="inline-flex">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 hover:bg-green-50 hover:text-green-700 border-green-200"
          >
            <ClipboardList className="h-4 w-4" />
            {t("farmer.dashboard.quickActions.orderRequests")}
          </Button>
        </Link>
      </div>

      {banner && (
        <div
          className={`fixed bottom-4 right-4 z-50 rounded-lg px-4 py-2 text-sm font-medium shadow-lg ${
            banner.type === "success" ? "bg-green-600 text-white" : "bg-destructive text-destructive-foreground"
          }`}
        >
          {banner.message}
        </div>
      )}

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={closeExpenseModal}
        editingExpenseId={null}
        expenseForm={expenseForm}
        expenseErrors={expenseErrors}
        expenseCategories={expenseCategories}
        feedInventory={feedInventoryForExpense}
        medicineInventory={medicineInventoryForExpense}
        otherInventory={otherInventoryForExpense}
        inventoryItems={inventoryItems}
        farms={farms}
        activeBatches={batchesForSelectedFarm}
        onSubmit={submitExpense}
        onFieldUpdate={updateExpenseField}
        onFeedSelection={handleFeedSelection}
        onMedicineSelection={handleMedicineSelection}
        onOtherSelection={handleOtherSelection}
        isPending={createExpenseMutation.isPending}
      />

      <MortalityModal
        isOpen={isMortalityModalOpen}
        onClose={closeMortalityModal}
        editingMortalityId={null}
        mortalityForm={mortalityForm}
        mortalityErrors={mortalityErrors}
        farms={farms}
        activeBatches={batchesForMortality}
        stats={mortalityStats}
        onSubmit={submitMortality}
        onFieldUpdate={updateMortalityField}
        isPending={createMortalityMutation.isPending}
      />

      <Modal
        isOpen={isEggProductionModalOpen}
        onClose={closeEggProductionModal}
        title="Add daily production"
      >
        <form onSubmit={submitEggProduction}>
          <ModalContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select farm and batch (LAYERS only), then enter egg counts by type. Records increase your egg inventory.
              </p>
              <div>
                <Label htmlFor="ep-farmId">Farm</Label>
                <select
                  id="ep-farmId"
                  name="farmId"
                  value={eggProductionForm.farmId}
                  onChange={updateEggProductionField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer mt-1"
                >
                  <option value="">Select farm</option>
                  {farms.map((farm: { id: string; name: string }) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="ep-batchId">Batch</Label>
                <select
                  id="ep-batchId"
                  name="batchId"
                  value={eggProductionForm.batchId}
                  onChange={updateEggProductionField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer mt-1"
                >
                  <option value="">Select batch</option>
                  {batchesForEggProduction.map((batch: { id: string; batchNumber?: string; number?: string; farm?: { name: string } }) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchNumber ?? batch.number} - {batch.farm?.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <DateInput
                  label="Date"
                  value={eggProductionForm.date}
                  onChange={(value) => {
                    const v = value ?? "";
                    const dateOnly = v.includes("T") ? v.split("T")[0] : v;
                    updateEggProductionField({ target: { name: "date", value: dateOnly } } as React.ChangeEvent<HTMLInputElement>);
                  }}
                />
              </div>
              {eggTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No egg types yet. Add at least one type from a batch&apos;s Egg Production tab to record production.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {eggTypes.map((t: { id: string; name: string }) => (
                    <div key={t.id}>
                      <Label htmlFor={`ep-count-${t.id}`}>{t.name}</Label>
                      <Input
                        id={`ep-count-${t.id}`}
                        type="number"
                        min={0}
                        value={eggProductionForm.countByType[t.id] ?? ""}
                        onChange={(e) => setEggProductionCount(t.id, e.target.value)}
                        placeholder="0"
                        className="mt-1"
                      />
                    </div>
                  ))}
                </div>
              )}
              {eggProductionError && (
                <p className="text-sm text-red-600">{eggProductionError}</p>
              )}
            </div>
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={closeEggProductionModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createEggProductionMutation.isPending || eggTypes.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {createEggProductionMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add record
                </>
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
