"use client";

import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Loader2 } from "lucide-react";
import { DateInput } from "@/common/components/ui/date-input";

type ExpenseCategory = "Feed" | "Medicine" | "Hatchery" | "Other" | "Add extra expenses";

interface ExpenseFormState {
  category: ExpenseCategory;
  date: string;
  notes: string;
  feedBrand: string;
  feedQuantity: string;
  feedRate: string;
  selectedFeedId: string;
  hatcheryName: string;
  hatcheryRate: string;
  hatcheryQuantity: string;
  medicineName: string;
  medicineRate: string;
  medicineQuantity: string;
  selectedMedicineId: string;
  otherName: string;
  otherRate: string;
  otherQuantity: string;
  extraName?: string;
  extraAmount?: string;
  farmId?: string;
  batchId?: string;
}

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  // Context props (optional)
  prefilledBatchId?: string;
  prefilledFarmId?: string;
  
  // Selection data (required only if no prefilled context)
  farms?: any[];
  activeBatches?: any[];
  
  // Form state
  editingExpenseId: number | null;
  expenseForm: ExpenseFormState;
  expenseErrors: Record<string, string>;
  
  // Data
  expenseCategories: any[];
  feedInventory: any[];
  medicineInventory: any[];
  inventoryItems: any[];
  
  // Handlers
  onSubmit: (e: React.FormEvent) => Promise<void>;
  onFieldUpdate: (e: React.ChangeEvent<any>) => void;
  onFeedSelection: (id: string) => void;
  onMedicineSelection: (id: string) => void;
  
  // Loading
  isPending: boolean;
}

export function ExpenseModal({
  isOpen,
  onClose,
  prefilledBatchId,
  prefilledFarmId,
  farms,
  activeBatches,
  editingExpenseId,
  expenseForm,
  expenseErrors,
  expenseCategories,
  feedInventory,
  medicineInventory,
  inventoryItems,
  onSubmit,
  onFieldUpdate,
  onFeedSelection,
  onMedicineSelection,
  isPending,
}: ExpenseModalProps) {
  const showBatchSelector = !prefilledBatchId;
  const showFarmSelector = !prefilledFarmId;

  const selectClass =
    "w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer transition-shadow";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingExpenseId ? "Edit Expense" : "Add Expense"}
    >
      <form onSubmit={onSubmit}>
        <ModalContent className="space-y-6">
          {/* Context: Farm & Batch */}
          {(showFarmSelector || showBatchSelector) && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-muted-foreground">Context</p>
              <div className="grid md:grid-cols-2 gap-4">
                {showFarmSelector && (
                  <div className="space-y-2">
                    <Label htmlFor="farmId" className="text-sm font-medium text-foreground">
                      Farm
                    </Label>
                    <select
                      id="farmId"
                      name="farmId"
                      value={expenseForm.farmId || ""}
                      onChange={onFieldUpdate}
                      className={selectClass}
                    >
                      <option value="">Select farm</option>
                      {farms?.map((farm: any) => (
                        <option key={farm.id} value={farm.id}>
                          {farm.name}
                        </option>
                      ))}
                    </select>
                    {expenseErrors.farmId && (
                      <p className="text-xs text-destructive mt-1.5">{expenseErrors.farmId}</p>
                    )}
                  </div>
                )}
                {showBatchSelector && (
                  <div className="space-y-2">
                    <Label htmlFor="batchId" className="text-sm font-medium text-foreground">
                      Batch
                    </Label>
                    <select
                      id="batchId"
                      name="batchId"
                      value={expenseForm.batchId || ""}
                      onChange={onFieldUpdate}
                      className={selectClass}
                    >
                      <option value="">Select batch</option>
                      {activeBatches?.map((batch: any) => (
                        <option key={batch.id} value={batch.id}>
                          {batch.number} - {batch.farm?.name}
                        </option>
                      ))}
                    </select>
                    {expenseErrors.batchId && (
                      <p className="text-xs text-destructive mt-1.5">{expenseErrors.batchId}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Category & Date */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Category & date</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium text-foreground">
                  Category
                </Label>
                <select
                  id="category"
                  name="category"
                  value={expenseForm.category}
                  onChange={onFieldUpdate}
                  className={selectClass}
                >
                  <option value="Feed">Feed (from inventory)</option>
                  <option value="Medicine">Medicine (from inventory)</option>
                  <option value="Hatchery">Hatchery</option>
                  <option value="Other">Other</option>
                  <option value="Add extra expenses">Add extra expenses</option>
                </select>
              </div>
              <div className="space-y-2">
                <DateInput
                  label="Date"
                  value={expenseForm.date}
                  onChange={(value) => onFieldUpdate({ target: { name: "date", value } } as React.ChangeEvent<HTMLInputElement>)}
                />
                {expenseErrors.date && (
                  <p className="text-xs text-destructive mt-1.5">{expenseErrors.date}</p>
                )}
              </div>
            </div>
          </div>

          {/* Category-specific details */}
          {expenseForm.category === "Add extra expenses" && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-5 space-y-4">
              <p className="text-sm font-medium text-foreground">Details</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="extraName" className="text-sm font-medium text-foreground">
                    Name
                  </Label>
                  <Input
                    id="extraName"
                    name="extraName"
                    value={expenseForm.extraName ?? ""}
                    onChange={onFieldUpdate}
                    placeholder="e.g. Staff salary"
                    className="rounded-lg"
                  />
                  {expenseErrors.extraName && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.extraName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extraAmount" className="text-sm font-medium text-foreground">
                    Amount (₹)
                  </Label>
                  <Input
                    id="extraAmount"
                    name="extraAmount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={expenseForm.extraAmount ?? ""}
                    onChange={onFieldUpdate}
                    placeholder="0"
                    className="rounded-lg"
                  />
                  {expenseErrors.extraAmount && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.extraAmount}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {expenseForm.category === "Feed" && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-5 space-y-4">
              <p className="text-sm font-medium text-foreground">Feed details</p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="selectedFeedId" className="text-sm font-medium text-foreground">
                    Feed (from inventory)
                  </Label>
                  <select
                    id="selectedFeedId"
                    name="selectedFeedId"
                    value={expenseForm.selectedFeedId}
                    onChange={(e) => onFeedSelection(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select feed from inventory</option>
                    {(feedInventory ?? []).map((feed: any) => (
                      <option key={feed.id} value={feed.id}>
                        {feed.name} ({(feed.quantity ?? feed.currentStock ?? 0)} {feed.unit} available)
                        {feed.rate != null ? ` - ₹${feed.rate}/unit` : ""}
                      </option>
                    ))}
                  </select>
                  {expenseErrors.feedBrand && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.feedBrand}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedQuantity" className="text-sm font-medium text-foreground">
                    Quantity
                  </Label>
                  <Input
                    id="feedQuantity"
                    name="feedQuantity"
                    type="number"
                    value={expenseForm.feedQuantity}
                    onChange={onFieldUpdate}
                    className="rounded-lg"
                  />
                  {expenseErrors.feedQuantity && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.feedQuantity}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="feedRate" className="text-sm font-medium text-foreground">
                    Rate per unit (₹)
                  </Label>
                  <Input
                    id="feedRate"
                    name="feedRate"
                    type="number"
                    value={expenseForm.feedRate}
                    onChange={onFieldUpdate}
                    readOnly={!!expenseForm.selectedFeedId}
                    className={`rounded-lg ${expenseForm.selectedFeedId ? "bg-muted/50 cursor-default" : ""}`}
                    placeholder={
                      expenseForm.selectedFeedId ? "Auto-filled from inventory" : "Enter rate"
                    }
                  />
                  {expenseErrors.feedRate && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.feedRate}</p>
                  )}
                  {expenseForm.selectedFeedId && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">
                      Rate auto-filled from inventory
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {expenseForm.category === "Hatchery" && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-5 space-y-4">
              <p className="text-sm font-medium text-foreground">Hatchery details</p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hatcheryName" className="text-sm font-medium text-foreground">
                    Hatchery name
                  </Label>
                  <Input
                    id="hatcheryName"
                    name="hatcheryName"
                    value={expenseForm.hatcheryName}
                    onChange={onFieldUpdate}
                    className="rounded-lg"
                  />
                  {expenseErrors.hatcheryName && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.hatcheryName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hatcheryQuantity" className="text-sm font-medium text-foreground">
                    Quantity
                  </Label>
                  <Input
                    id="hatcheryQuantity"
                    name="hatcheryQuantity"
                    type="number"
                    value={expenseForm.hatcheryQuantity}
                    onChange={onFieldUpdate}
                    className="rounded-lg"
                  />
                  {expenseErrors.hatcheryQuantity && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.hatcheryQuantity}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hatcheryRate" className="text-sm font-medium text-foreground">
                    Rate (₹)
                  </Label>
                  <Input
                    id="hatcheryRate"
                    name="hatcheryRate"
                    type="number"
                    value={expenseForm.hatcheryRate}
                    onChange={onFieldUpdate}
                    className="rounded-lg"
                  />
                  {expenseErrors.hatcheryRate && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.hatcheryRate}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          {expenseForm.category === "Medicine" && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-5 space-y-4">
              <p className="text-sm font-medium text-foreground">Medicine details</p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="selectedMedicineId" className="text-sm font-medium text-foreground">
                    Medicine (from inventory)
                  </Label>
                  <select
                    id="selectedMedicineId"
                    name="selectedMedicineId"
                    value={expenseForm.selectedMedicineId}
                    onChange={(e) => onMedicineSelection(e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select medicine from inventory</option>
                    {(medicineInventory ?? []).map((medicine: any) => (
                      <option key={medicine.id} value={medicine.id}>
                        {medicine.name} ({(medicine.quantity ?? medicine.currentStock ?? 0)} {medicine.unit} available)
                        {medicine.rate != null ? ` - ₹${medicine.rate}/unit` : ""}
                      </option>
                    ))}
                  </select>
                  {expenseErrors.medicineName && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.medicineName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicineQuantity" className="text-sm font-medium text-foreground">
                    Quantity
                  </Label>
                  <Input
                    id="medicineQuantity"
                    name="medicineQuantity"
                    type="number"
                    value={expenseForm.medicineQuantity}
                    onChange={onFieldUpdate}
                    className="rounded-lg"
                  />
                  {expenseErrors.medicineQuantity && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.medicineQuantity}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medicineRate" className="text-sm font-medium text-foreground">
                    Rate per unit (₹)
                  </Label>
                  <Input
                    id="medicineRate"
                    name="medicineRate"
                    type="number"
                    value={expenseForm.medicineRate}
                    onChange={onFieldUpdate}
                    readOnly={!!expenseForm.selectedMedicineId}
                    className={`rounded-lg ${expenseForm.selectedMedicineId ? "bg-muted/50 cursor-default" : ""}`}
                    placeholder={
                      expenseForm.selectedMedicineId ? "Auto-filled from inventory" : "Enter rate"
                    }
                  />
                  {expenseErrors.medicineRate && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.medicineRate}</p>
                  )}
                  {expenseForm.selectedMedicineId && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5">
                      Rate auto-filled from inventory
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {expenseForm.category === "Other" && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-5 space-y-4">
              <p className="text-sm font-medium text-foreground">Other expense details</p>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="otherName" className="text-sm font-medium text-foreground">
                    Expense name
                  </Label>
                  <Input
                    id="otherName"
                    name="otherName"
                    value={expenseForm.otherName}
                    onChange={onFieldUpdate}
                    className="rounded-lg"
                  />
                  {expenseErrors.otherName && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.otherName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherQuantity" className="text-sm font-medium text-foreground">
                    Quantity
                  </Label>
                  <Input
                    id="otherQuantity"
                    name="otherQuantity"
                    type="number"
                    value={expenseForm.otherQuantity}
                    onChange={onFieldUpdate}
                    className="rounded-lg"
                  />
                  {expenseErrors.otherQuantity && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.otherQuantity}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherRate" className="text-sm font-medium text-foreground">
                    Rate (₹)
                  </Label>
                  <Input
                    id="otherRate"
                    name="otherRate"
                    type="number"
                    value={expenseForm.otherRate}
                    onChange={onFieldUpdate}
                    className="rounded-lg"
                  />
                  {expenseErrors.otherRate && (
                    <p className="text-xs text-destructive mt-1.5">{expenseErrors.otherRate}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </ModalContent>
        <ModalFooter className="flex flex-row justify-end gap-3 pt-2 border-t border-border/60">
          <Button type="button" variant="outline" onClick={onClose} className="min-w-[84px]">
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90 min-w-[84px]"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {editingExpenseId ? "Updating..." : "Creating..."}
              </>
            ) : (
              editingExpenseId ? "Update" : "Save"
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
