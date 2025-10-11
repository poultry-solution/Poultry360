"use client";

import { useState, useEffect } from "react";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  farms: any[];
  activeBatches: any[];
  expenseCategories: any[];
  feedInventory: any[];
  medicineInventory: any[];
  isLoading: boolean;
}

export function QuickExpenseModal({
  isOpen,
  onClose,
  onSubmit,
  farms,
  activeBatches,
  expenseCategories,
  feedInventory,
  medicineInventory,
  isLoading,
}: QuickExpenseModalProps) {
  const [form, setForm] = useState({
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Ensure default date when modal opens
  useEffect(() => {
    if (isOpen && !form.date) {
      const today = new Date().toISOString().split("T")[0];
      setForm((p) => ({ ...p, date: today }));
    }
  }, [isOpen, form.date]);

  const updateField = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));

    // If farm is changed, reset batch selection
    if (name === "farmId") {
      setForm((p) => ({ ...p, batchId: "" }));
    }
  };

  const handleFeedSelection = (feedId: string) => {
    const selectedFeed = feedInventory.find((feed: any) => feed.id === feedId);
    if (selectedFeed) {
      setForm((prev) => ({
        ...prev,
        selectedFeedId: feedId,
        feedBrand: selectedFeed.name,
        feedRate: selectedFeed.rate?.toString() || "0",
      }));
    }
  };

  const handleMedicineSelection = (medicineId: string) => {
    const selectedMedicine = medicineInventory.find(
      (medicine: any) => medicine.id === medicineId
    );
    if (selectedMedicine) {
      setForm((prev) => ({
        ...prev,
        selectedMedicineId: medicineId,
        medicineName: selectedMedicine.name,
        medicineRate: selectedMedicine.rate?.toString() || "0",
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const validationErrors: Record<string, string> = {};
    if (!form.farmId) validationErrors.farmId = "Please select a farm";
    if (!form.batchId) validationErrors.batchId = "Please select a batch";
    if (!form.category) validationErrors.category = "Please select a category";
    if (!form.date) validationErrors.date = "Please select a date";

    // Category-specific validation
    if (form.category === "Feed") {
      if (!form.selectedFeedId)
        validationErrors.feedBrand = "Please select a feed from inventory";
      if (!form.feedQuantity)
        validationErrors.feedQuantity = "Please enter quantity";
      if (!form.feedRate) validationErrors.feedRate = "Please enter rate";

      // Check if quantity exceeds available inventory
      if (form.selectedFeedId && form.feedQuantity) {
        const selectedFeed = feedInventory.find(
          (feed: any) => feed.id === form.selectedFeedId
        );
        const requestedQty = Number(form.feedQuantity);
        if (selectedFeed && requestedQty > selectedFeed.quantity) {
          validationErrors.feedQuantity = `Only ${selectedFeed.quantity} ${selectedFeed.unit} available`;
        }
      }
    } else if (form.category === "Medicine") {
      if (!form.selectedMedicineId)
        validationErrors.medicineName = "Please select a medicine from inventory";
      if (!form.medicineQuantity)
        validationErrors.medicineQuantity = "Please enter quantity";
      if (!form.medicineRate) validationErrors.medicineRate = "Please enter rate";

      // Check if quantity exceeds available inventory
      if (form.selectedMedicineId && form.medicineQuantity) {
        const selectedMedicine = medicineInventory.find(
          (medicine: any) => medicine.id === form.selectedMedicineId
        );
        const requestedQty = Number(form.medicineQuantity);
        if (selectedMedicine && requestedQty > selectedMedicine.quantity) {
          validationErrors.medicineQuantity = `Only ${selectedMedicine.quantity} ${selectedMedicine.unit} available`;
        }
      }
    } else if (form.category === "Hatchery") {
      if (!form.hatcheryQuantity)
        validationErrors.hatcheryQuantity = "Please enter quantity";
      if (!form.hatcheryRate)
        validationErrors.hatcheryRate = "Please enter rate";
    } else if (form.category === "Other") {
      if (!form.otherQuantity)
        validationErrors.otherQuantity = "Please enter quantity";
      if (!form.otherRate) validationErrors.otherRate = "Please enter rate";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      // Find the category ID
      const selectedCategory = expenseCategories.find(
        (cat: any) =>
          cat.name.toLowerCase() === form.category.toLowerCase()
      );

      if (!selectedCategory) {
        setErrors({ category: "Category not found" });
        return;
      }

      // Calculate amount based on category
      let amount = 0;
      let description = "";
      let quantity = 0;
      let unitPrice = 0;

      if (form.category === "Feed") {
        quantity = parseFloat(form.feedQuantity);
        unitPrice = parseFloat(form.feedRate);
        amount = quantity * unitPrice;
        description = `Feed: ${form.feedBrand || "Unknown"} - Qty: ${quantity} • Rate: ₹${unitPrice}`;
      } else if (form.category === "Medicine") {
        quantity = parseFloat(form.medicineQuantity);
        unitPrice = parseFloat(form.medicineRate);
        amount = quantity * unitPrice;
        description = `Medicine: ${form.medicineName || "Unknown"} - Qty: ${quantity} • Rate: ₹${unitPrice}`;
      } else if (form.category === "Hatchery") {
        quantity = parseFloat(form.hatcheryQuantity);
        unitPrice = parseFloat(form.hatcheryRate);
        amount = quantity * unitPrice;
        description = `Hatchery: ${form.hatcheryName || "Unknown"} - Qty: ${quantity} • Rate: ₹${unitPrice}`;
      } else if (form.category === "Other") {
        quantity = parseFloat(form.otherQuantity);
        unitPrice = parseFloat(form.otherRate);
        amount = quantity * unitPrice;
        description = `Other: ${form.otherName || "Unknown"} - Qty: ${quantity} • Rate: ₹${unitPrice}`;
      }

      // Create expense data
      const expenseData = {
        date: new Date(form.date).toISOString(),
        amount,
        description:
          description +
          (form.notes ? ` • Notes: ${form.notes}` : ""),
        quantity,
        unitPrice,
        farmId: form.farmId,
        batchId: form.batchId,
        categoryId: selectedCategory.id,
        inventoryItems: form.selectedFeedId
          ? [
              {
                itemId: form.selectedFeedId,
                quantity,
                notes: form.notes,
              },
            ]
          : form.selectedMedicineId
            ? [
                {
                  itemId: form.selectedMedicineId,
                  quantity,
                  notes: form.notes,
                },
              ]
            : undefined,
      };

      await onSubmit(expenseData);

      // Reset form
      setForm({
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
      setErrors({});
      onClose();
    } catch (error) {
      console.error("Failed to create expense:", error);
      setErrors({
        general: "Failed to create expense. Please try again.",
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setErrors({});
      }}
      title="Quick Add Expense"
    >
      <form onSubmit={handleSubmit}>
        <ModalContent>
          <div className="space-y-4">
            {errors.general && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.general}</p>
              </div>
            )}

            {/* Farm Selection */}
            <div>
              <Label htmlFor="farmId">Select Farm *</Label>
              <select
                id="farmId"
                name="farmId"
                value={form.farmId}
                onChange={updateField}
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
              {errors.farmId && (
                <p className="text-xs text-red-600 mt-1">{errors.farmId}</p>
              )}
            </div>

            {/* Batch Selection */}
            <div>
              <Label htmlFor="batchId">Select Batch *</Label>
              <select
                id="batchId"
                name="batchId"
                value={form.batchId}
                onChange={updateField}
                disabled={!form.farmId}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                required
              >
                <option value="">Choose a batch</option>
                {activeBatches
                  .filter(
                    (batch) =>
                      batch.status === "ACTIVE" &&
                      (!form.farmId || batch.farmId === form.farmId)
                  )
                  .map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchNumber} - {batch.farm.name}
                    </option>
                  ))}
              </select>
              {errors.batchId && (
                <p className="text-xs text-red-600 mt-1">{errors.batchId}</p>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  value={form.category}
                  onChange={updateField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="">Select category</option>
                  {expenseCategories
                    .filter((category: any) => {
                      return (
                        category.name !== "Hatchery" &&
                        category.name !== "Equipment"
                      );
                    })
                    .map((category: any) => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                </select>
                {errors.category && (
                  <p className="text-xs text-red-600 mt-1">{errors.category}</p>
                )}
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={updateField}
                />
              </div>
            </div>

            {/* Category-specific fields would go here - keeping it concise for now */}
            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                name="notes"
                value={form.notes}
                onChange={updateField}
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
              onClose();
              setErrors({});
            }}
            className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="cursor-pointer bg-primary hover:bg-primary/90 hover:shadow-md transition-all duration-200"
            disabled={isLoading}
          >
            {isLoading ? (
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
  );
}
