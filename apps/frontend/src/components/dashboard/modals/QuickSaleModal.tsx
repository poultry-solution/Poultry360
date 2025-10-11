"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { DateInput } from "@/components/ui/date-input";
import { useCreateSale, useGetCustomersForSales } from "@/fetchers/sale/saleQueries";

interface QuickSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  farms: any[];
  activeBatches: any[];
  onSuccess?: () => void;
}

interface QuickSaleForm {
  farmId: string;
  batchId: string;
  itemType: string;
  rate: string;
  quantity: string;
  weight: string;
  date: string;
  remaining: boolean;
  customerId: string;
  customerName: string;
  contact: string;
  customerCategory: string;
  balance: string;
}

interface FormErrors {
  [key: string]: string;
}

export function QuickSaleModal({
  isOpen,
  onClose,
  farms,
  activeBatches,
  onSuccess,
}: QuickSaleModalProps) {
  const [quickSaleForm, setQuickSaleForm] = useState<QuickSaleForm>({
    farmId: "",
    batchId: "",
    itemType: "Chicken_Meat",
    rate: "",
    quantity: "",
    weight: "",
    date: "",
    remaining: false,
    customerId: "",
    customerName: "",
    contact: "",
    customerCategory: "Chicken",
    balance: "",
  });

  const [quickFormErrors, setQuickFormErrors] = useState<FormErrors>({});
  const [customerSearch, setCustomerSearch] = useState("");

  // Fetch customers for sales
  const { data: customersResponse } = useGetCustomersForSales();
  const customers = customersResponse || [];

  // Create sale mutation
  const createSaleMutation = useCreateSale();

  // Computed totals
  const { computedSaleAmount, paidAmount, dueAmount } = useMemo(() => {
    const rate = parseFloat(quickSaleForm.rate || "0");
    const quantity = parseFloat(quickSaleForm.quantity || "0");
    const weight =
      quickSaleForm.itemType === "Chicken_Meat"
        ? parseFloat(quickSaleForm.weight || "0")
        : 0;
    const total = Number.isFinite(rate)
      ? rate *
        (quickSaleForm.itemType === "Chicken_Meat"
          ? Number.isFinite(weight)
            ? weight
            : 0
          : Number.isFinite(quantity)
            ? quantity
            : 0)
      : 0;
    const paid = quickSaleForm.remaining
      ? parseFloat(quickSaleForm.balance || "0") || 0
      : total;
    const due = Math.max(0, total - paid);
    return {
      computedSaleAmount: isNaN(total) ? 0 : total,
      paidAmount: isNaN(paid) ? 0 : paid,
      dueAmount: isNaN(due) ? 0 : due,
    };
  }, [quickSaleForm]);

  // Ensure default date when modal opens
  useEffect(() => {
    if (isOpen) {
      if (!quickSaleForm.date) {
        const today = new Date().toISOString().split("T")[0];
        setQuickSaleForm((p) => ({ ...p, date: today }));
      }
    }
  }, [isOpen, quickSaleForm.date]);

  // Form field update handler
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

    // Clear errors when user starts typing
    if (quickFormErrors[name]) {
      setQuickFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Form submission handler
  const submitQuickSale = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("🚀 Sales form submitted", quickSaleForm);

    // Validation
    const errors: FormErrors = {};
    if (!quickSaleForm.farmId) errors.farmId = "Please select a farm";
    if (!quickSaleForm.batchId) errors.batchId = "Please select a batch";
    if (!quickSaleForm.rate) errors.rate = "Please enter rate";
    if (!quickSaleForm.quantity) errors.quantity = "Please enter quantity";
    if (quickSaleForm.itemType === "Chicken_Meat") {
      if (!quickSaleForm.weight)
        errors.weight = "Weight required for Chicken_Meat";
    }
    if (!quickSaleForm.date) errors.date = "Please select a date";

    // Sanity check for Chicken_Meat
    if (quickSaleForm.itemType === "Chicken_Meat") {
      const quantityNum = Number(quickSaleForm.quantity || 0);
      const weightNum = Number(quickSaleForm.weight || 0);
      if (quantityNum > 0 && weightNum > 0) {
        const avgWeightPerBird = weightNum / quantityNum;
        if (avgWeightPerBird < 0.5 || avgWeightPerBird > 5) {
          errors.weight = "Average weight per bird seems unrealistic (0.5-5kg range)";
        }
      }
    }

    // Customer validation for credit sales
    if (quickSaleForm.remaining) {
      if (!quickSaleForm.customerId && !quickSaleForm.customerName) {
        errors.customerName =
          "Please select existing customer or enter new customer name";
      }
      if (!quickSaleForm.customerId && !quickSaleForm.contact) {
        errors.contact = "Contact number required for new customer";
      }
      // Validate that paid amount doesn't exceed total amount
      const totalAmount =
        quickSaleForm.itemType === "Chicken_Meat"
          ? Number(quickSaleForm.rate || 0) * Number(quickSaleForm.weight || 0)
          : Number(quickSaleForm.rate || 0) *
            Number(quickSaleForm.quantity || 0);
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
      // Calculate amount based on itemType
      const quantity = parseFloat(quickSaleForm.quantity);
      const weight =
        quickSaleForm.itemType === "Chicken_Meat"
          ? parseFloat(quickSaleForm.weight)
          : null;
      const unitPrice = parseFloat(quickSaleForm.rate);
      const amount =
        quickSaleForm.itemType === "Chicken_Meat"
          ? unitPrice * (weight || 0)
          : unitPrice * quantity;

      const paidAmount = quickSaleForm.remaining
        ? quickSaleForm.balance
          ? parseFloat(quickSaleForm.balance)
          : 0
        : amount;

      const isCredit = quickSaleForm.remaining;

      // Create sale data
      const saleData: any = {
        date: quickSaleForm.date
          ? `${quickSaleForm.date}T00:00:00.000Z`
          : new Date().toISOString(),
        amount,
        quantity,
        unitPrice,
        description: undefined,
        isCredit,
        paidAmount,
        farmId: quickSaleForm.farmId,
        batchId: quickSaleForm.batchId,
        itemType: quickSaleForm.itemType,
      };

      // Add weight for Chicken_Meat sales
      if (quickSaleForm.itemType === "Chicken_Meat" && quickSaleForm.weight) {
        saleData.weight = parseFloat(quickSaleForm.weight);
      }

      // Handle customer data
      if (quickSaleForm.customerId) {
        saleData.customerId = quickSaleForm.customerId;
      } else if (
        quickSaleForm.remaining &&
        quickSaleForm.customerName &&
        quickSaleForm.contact
      ) {
        saleData.customerData = {
          name: quickSaleForm.customerName,
          phone: quickSaleForm.contact,
          category: quickSaleForm.customerCategory,
          address: "",
        };
      }

      // birdsCount: only for Chicken_Meat
      if (saleData.batchId && quickSaleForm.itemType === "Chicken_Meat") {
        const birdsCount = Number(quickSaleForm.quantity || 0);
        if (Number.isFinite(birdsCount) && birdsCount > 0) {
          saleData.birdsCount = birdsCount;
        }
      }

      await createSaleMutation.mutateAsync(saleData);

      // Reset form and close modal
      setQuickSaleForm({
        farmId: "",
        batchId: "",
        itemType: "Chicken_Meat",
        rate: "",
        quantity: "",
        weight: "",
        date: "",
        remaining: false,
        customerId: "",
        customerName: "",
        contact: "",
        customerCategory: "Chicken",
        balance: "",
      });
      setQuickFormErrors({});
      setCustomerSearch("");
      onClose();
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating sale:", error);
      setQuickFormErrors({
        general: error?.response?.data?.message || "Failed to create sale",
      });
    }
  };

  const handleClose = () => {
    setQuickFormErrors({});
    setCustomerSearch("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Quick Add Sale">
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
                <Label htmlFor="itemType">Item Type</Label>
                <select
                  id="itemType"
                  name="itemType"
                  value={quickSaleForm.itemType}
                  onChange={updateQuickSaleField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="Chicken_Meat">Chicken_Meat</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>
              <div>
                <DateInput
                  label="Date *"
                  value={quickSaleForm.date}
                  onChange={(value) => setQuickSaleForm(prev => ({ ...prev, date: value }))}
                />
                {quickFormErrors.date && (
                  <p className="text-xs text-red-600 mt-1">{quickFormErrors.date}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rate">Rate *</Label>
                <Input
                  id="rate"
                  name="rate"
                  type="number"
                  value={quickSaleForm.rate}
                  onChange={updateQuickSaleField}
                  placeholder="Rate per unit"
                  required
                />
                {quickFormErrors.rate && (
                  <p className="text-xs text-red-600 mt-1">
                    {quickFormErrors.rate}
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="quantity">
                  {quickSaleForm.itemType === "Chicken_Meat"
                    ? "Quantity (Birds) *"
                    : "Quantity (Units) *"}
                </Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  value={quickSaleForm.quantity}
                  onChange={updateQuickSaleField}
                  placeholder={
                    quickSaleForm.itemType === "Chicken_Meat"
                      ? "Number of birds"
                      : "Number of units"
                  }
                  required
                />
                {quickFormErrors.quantity && (
                  <p className="text-xs text-red-600 mt-1">
                    {quickFormErrors.quantity}
                  </p>
                )}
              </div>
            </div>

            {["Chicken_Meat", "FEED", "MEDICINE"].includes(
              quickSaleForm.itemType
            ) && (
              <div>
                <Label htmlFor="weight">Weight (kg) *</Label>
                <Input
                  id="weight"
                  name="weight"
                  type="number"
                  step="0.01"
                  value={quickSaleForm.weight}
                  onChange={updateQuickSaleField}
                  placeholder="Total weight in kg"
                  required={quickSaleForm.itemType === "Chicken_Meat"}
                />
                {quickFormErrors.weight && (
                  <p className="text-xs text-red-600 mt-1">
                    {quickFormErrors.weight}
                  </p>
                )}
                {quickSaleForm.itemType === "Chicken_Meat" &&
                  quickSaleForm.quantity &&
                  quickSaleForm.weight && (
                    <p className="text-xs text-green-600 mt-1">
                      Avg weight per bird:{" "}
                      {(
                        Number(quickSaleForm.weight) /
                        Number(quickSaleForm.quantity)
                      ).toFixed(2)}{" "}
                      kg
                    </p>
                  )}
              </div>
            )}

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
                                setQuickSaleForm((prev) => ({
                                  ...prev,
                                  customerId: customer.id,
                                  customerName: customer.name,
                                  contact: customer.phone,
                                  customerCategory:
                                    customer.category || "Chicken",
                                }));
                                setCustomerSearch("");
                              }}
                            >
                              <div className="font-medium">
                                {customer.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {customer.phone}
                              </div>
                              {customer.category && (
                                <div className="text-xs text-blue-600">
                                  {customer.category}
                                </div>
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

            {/* Computed totals summary */}
            <div className="border rounded-md p-3 bg-gray-50">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Total Amount</span>
                <span className="font-semibold">
                  ₹{Number(computedSaleAmount).toLocaleString()}
                </span>
              </div>
              {quickSaleForm.remaining && (
                <div className="mt-1 text-xs text-gray-600 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Paid</span>
                    <span>₹{Number(paidAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Due</span>
                    <span className="text-red-600 font-medium">
                      ₹{Number(dueAmount).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
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
  );
}
