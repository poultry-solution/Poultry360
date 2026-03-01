import { Modal, ModalContent } from "./modal";
import { Label } from "./label";
import { Input } from "./input";
import { Loader2 } from "lucide-react";
import { Button } from "./button";
import { ModalFooter } from "./modal";
import { useState } from "react";
import { DateInput } from "./date-input";

export const BatchSaleModel = ({
  isSaleModalOpen,
  setIsSaleModalOpen,
  editingSaleId,
  setEditingSaleId,
  submitSale,
  saleForm,
  saleErrors,
  updateSaleField,
  customerSearch,
  setCustomerSearch,
  customers,
  isCreating,
  isUpdating,
  setSaleForm,
  setSaleErrors,
}: {
  isSaleModalOpen: boolean;
  setIsSaleModalOpen: (isOpen: boolean) => void;
  editingSaleId: number | null;
  setEditingSaleId: (id: number | null) => void;
  submitSale: (e: React.FormEvent) => void;
  saleForm: {
    itemType: string;
    eggCategory?: string;
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
    categoryId?: string;
  };
  saleErrors: Record<string, string>;
  categoryId?: string;
  updateSaleField: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  customerSearch: string;
  setCustomerSearch: (s: string) => void;
  customers: any[];
  isCreating: boolean;
  isUpdating: boolean;
  setSaleForm: React.Dispatch<React.SetStateAction<any>>;
  setSaleErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}) => {

  const numericRate = Number(saleForm.rate || 0);
  const numericQty = Number(saleForm.quantity || 0);
  const numericWeight = Number(saleForm.weight || 0);
  const showWeight = ["Chicken_Meat", "FEED", "MEDICINE"].includes(
    saleForm.itemType
  );
  const showEggCategory = saleForm.itemType === "EGGS";
  const computedTotal = showWeight
    ? Number.isFinite(numericRate) && Number.isFinite(numericWeight)
      ? numericRate * numericWeight
      : 0
    : Number.isFinite(numericRate) && Number.isFinite(numericQty)
      ? numericRate * numericQty
      : 0;

  // updateSaleField is controlled from parent

  return (
    <Modal
      isOpen={isSaleModalOpen}
      onClose={() => {
        setIsSaleModalOpen(false);
        setEditingSaleId(null);
      }}
      title={editingSaleId ? "Edit Sale" : "Add Sale"}
    >
      <form onSubmit={submitSale}>
        <ModalContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="itemType">Item Type</Label>
              <select
                id="itemType"
                name="itemType"
                value={saleForm.itemType}
                onChange={updateSaleField}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
              >
                <option value="EGGS">Eggs</option>
                <option value="Chicken_Meat">Layers (Meat)</option>
                <option value="FEED">Feed</option>
                <option value="MEDICINE">Medicine</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            {showEggCategory && (
              <div>
                <Label htmlFor="eggCategory">Egg Category</Label>
                <select
                  id="eggCategory"
                  name="eggCategory"
                  value={saleForm.eggCategory ?? ""}
                  onChange={updateSaleField}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                >
                  <option value="">Select category</option>
                  <option value="LARGE">Large</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="SMALL">Small</option>
                </select>
                {saleErrors.eggCategory && (
                  <p className="text-xs text-red-600 mt-1">{saleErrors.eggCategory}</p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="rate">Rate</Label>
              <Input
                id="rate"
                name="rate"
                type="number"
                value={saleForm.rate}
                onChange={updateSaleField}
              />
              {saleErrors.rate && (
                <p className="text-xs text-red-600 mt-1">{saleErrors.rate}</p>
              )}
            </div>
            <div>
              <Label htmlFor="quantity">
                {saleForm.itemType === "Chicken_Meat"
                  ? "Quantity (Birds)"
                  : saleForm.itemType === "EGGS"
                    ? "Quantity (Eggs)"
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
                <p className="text-xs text-red-600 mt-1">
                  {saleErrors.quantity}
                </p>
              )}
            </div>
            {showWeight && (
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
                  <p className="text-xs text-red-600 mt-1">
                    {saleErrors.weight}
                  </p>
                )}
                {saleForm.itemType === "Chicken_Meat" &&
                  saleForm.quantity &&
                  saleForm.weight && (
                    <p className="text-xs text-green-600 mt-1">
                      Avg weight per bird:{" "}
                      {(
                        Number(saleForm.weight) / Number(saleForm.quantity)
                      ).toFixed(2)}{" "}
                      kg
                    </p>
                  )}
              </div>
            )}
            <div>
              <DateInput
                label="Date"
                value={saleForm.date}
                onChange={(value) => setSaleForm((prev: typeof saleForm) => ({ ...prev, date: value }))}
              />
              {saleErrors.date && (
                <p className="text-xs text-red-600 mt-1">{saleErrors.date}</p>
              )}
            </div>
            {/* Total preview */}
            <div className="md:col-span-2">
              <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-lg font-semibold text-green-700">
                  ₹{computedTotal.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {showWeight
                  ? "Calculated as rate × weight"
                  : "Calculated as rate × quantity"}
              </p>
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
              <div className="col-span-2 grid md:grid-cols-2 gap-4 border rounded-md p-4">
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
                                setSaleForm((prev: typeof saleForm) => ({
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
                              <div className="font-medium">{customer.name}</div>
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
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    value={saleForm.customerName}
                    onChange={updateSaleField}
                    placeholder="Enter new customer name"
                  />
                  {saleErrors.customerName && (
                    <p className="text-xs text-red-600 mt-1">
                      {saleErrors.customerName}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="contact">Contact</Label>
                  <Input
                    id="contact"
                    name="contact"
                    value={saleForm.contact}
                    onChange={updateSaleField}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    name="customerCategory"
                    value={saleForm.customerCategory || "Chicken"}
                    onChange={updateSaleField}
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
                    value={saleForm.balance}
                    onChange={updateSaleField}
                    placeholder="Enter amount paid now (leave 0 for full credit)"
                  />
                  {saleErrors.balance && (
                    <p className="text-xs text-red-600 mt-1">
                      {saleErrors.balance}
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
              setIsSaleModalOpen(false);
              setEditingSaleId(null);
              setSaleErrors({
                
              });
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
            ) : (
              "Save"
            )}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
};
