"use client";

import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Loader2 } from "lucide-react";
import { DateInput } from "@/common/components/ui/date-input";

type ExpenseCategory = "Feed" | "Medicine" | "Hatchery" | "Other";

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingExpenseId ? "Edit Expense" : "Add Expense"}
    >
      <form onSubmit={onSubmit}>
        <ModalContent>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Farm Selector - only show if no prefilled farm */}
            {showFarmSelector && (
              <div>
                <Label htmlFor="farmId">Farm</Label>
                <select
                  id="farmId"
                  name="farmId"
                  value={expenseForm.farmId || ""}
                  onChange={onFieldUpdate}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="">Select farm</option>
                  {farms?.map((farm: any) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
                {expenseErrors.farmId && (
                  <p className="text-xs text-red-600 mt-1">
                    {expenseErrors.farmId}
                  </p>
                )}
              </div>
            )}

            {/* Batch Selector - only show if no prefilled batch */}
            {showBatchSelector && (
              <div>
                <Label htmlFor="batchId">Batch</Label>
                <select
                  id="batchId"
                  name="batchId"
                  value={expenseForm.batchId || ""}
                  onChange={onFieldUpdate}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="">Select batch</option>
                  {activeBatches?.map((batch: any) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.number} - {batch.farm?.name}
                    </option>
                  ))}
                </select>
                {expenseErrors.batchId && (
                  <p className="text-xs text-red-600 mt-1">
                    {expenseErrors.batchId}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                name="category"
                value={expenseForm.category}
                onChange={onFieldUpdate}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                <option value="Feed">Feed</option>
                <option value="Medicine">Medicine</option>
                <option value="Hatchery">Hatchery</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <DateInput
                label="Date"
                value={expenseForm.date}
                onChange={(value) => onFieldUpdate({ target: { name: 'date', value } } as React.ChangeEvent<HTMLInputElement>)}
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
                    onChange={(e) => onFeedSelection(e.target.value)}
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
                    onChange={onFieldUpdate}
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
                    onChange={onFieldUpdate}
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
                    onChange={onFieldUpdate}
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
                    onChange={onFieldUpdate}
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
                    onChange={onFieldUpdate}
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
                    onChange={(e) => onMedicineSelection(e.target.value)}
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
                    onChange={onFieldUpdate}
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
                    onChange={onFieldUpdate}
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
                    onChange={onFieldUpdate}
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
                    onChange={onFieldUpdate}
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
                    onChange={onFieldUpdate}
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
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-primary hover:bg-primary/90"
            disabled={isPending}
          >
            {isPending ? (
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
  );
}
