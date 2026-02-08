"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  XCircle,
  UserPlus,
  CreditCard,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { useSearchableCustomerSelect } from "@/hooks/useSearchableCustomerSelect";
import { useSearchableDealerProductSelect } from "@/hooks/useSearchableDealerProductSelect";
import {
  useCreateDealerSale,
  useCreateCustomer,
} from "@/fetchers/dealer/dealerSaleQueries";

interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export default function NewSalePage() {
  const router = useRouter();

  // Form state
  const [customerId, setCustomerId] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [notes, setNotes] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paidAmount, setPaidAmount] = useState(0);
  const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    phone: "",
    address: "",
    category: "",
  });

  // Searchable selects
  const customerSelect = useSearchableCustomerSelect();
  const productSelect = useSearchableDealerProductSelect();

  const createSaleMutation = useCreateDealerSale();
  const createCustomerMutation = useCreateCustomer();

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toFixed(2)}`;
  };

  const handleCustomerChange = (value: string, option?: any) => {
    setCustomerId(value);
    setSelectedCustomer(option?.data || null);
  };

  const handleAddProduct = (productId: string, option?: any) => {
    // Check if product already added
    if (items.some((item) => item.productId === productId)) {
      toast.error("Product already added");
      return;
    }

    // Get product data from the option
    const selectedProduct = option?.data;

    // Add new item with prefilled price
    const newItem: SaleItem = {
      productId,
      quantity: 1, // Default quantity
      unitPrice: Number(selectedProduct?.sellingPrice) || 0,
    };

    setItems([...items, newItem]);
    setSelectedProductId(""); // Clear selection
    toast.success("Product added");
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof SaleItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerData.name || !newCustomerData.phone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      const result = await createCustomerMutation.mutateAsync(newCustomerData);
      setCustomerId(result.data.id);
      setSelectedCustomer(result.data);
      setIsCreateCustomerOpen(false);
      setNewCustomerData({ name: "", phone: "", address: "", category: "" });
      toast.success("Customer created successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create customer");
    }
  };

  const handleSubmit = async () => {
    if (!customerId || items.length === 0) {
      toast.error("Please select customer and add items");
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.productId || item.quantity <= 0 || item.unitPrice <= 0) {
        toast.error("Please fill all product details with valid values");
        return;
      }
    }

    if (paidAmount < 0 || paidAmount > finalTotal) {
      toast.error("Paid amount must be between 0 and final total");
      return;
    }

    try {
      await createSaleMutation.mutateAsync({
        customerId,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        paidAmount,
        paymentMethod,
        notes: notes || undefined,
        date: new Date(),
        discount:
          discountValue > 0
            ? { type: discountType, value: discountValue }
            : undefined,
      });

      toast.success("Sale created successfully!");
      router.push("/dealer/dashboard/sales");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create sale");
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountAmount =
    discountValue > 0
      ? discountType === "PERCENT"
        ? Math.round((Math.min(100, discountValue) / 100) * subtotal * 100) / 100
        : Math.min(discountValue, subtotal)
      : 0;
  const finalTotal = Math.round((subtotal - discountAmount) * 100) / 100;
  const totalAmount = finalTotal;
  const dueAmount = totalAmount - paidAmount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Create New Sale
          </h1>
          <p className="text-muted-foreground">
            Create a sale transaction to a customer
          </p>
        </div>
      </div>

      {/* Main Form */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>Select the customer for this sale</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Customer *</Label>
                <SearchableSelect
                  value={customerId}
                  onValueChange={handleCustomerChange}
                  options={customerSelect.options}
                  placeholder="Search and select customer..."
                  searchPlaceholder="Search customers..."
                  emptyText="No customers found."
                  isLoading={customerSelect.isLoading}
                  onSearch={customerSelect.onSearch}
                />
              </div>

              {/* Customer Info Display */}
              {selectedCustomer && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{selectedCustomer.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedCustomer.phone}</p>
                    {selectedCustomer.address && (
                      <p className="text-sm text-muted-foreground">{selectedCustomer.address}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Create New Customer Button */}
              <Button
                variant="outline"
                onClick={() => setIsCreateCustomerOpen(true)}
                className="w-full"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create New Customer
              </Button>
            </CardContent>
          </Card>

          {/* Products Section */}
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>Search and add products to this sale</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Search & Add */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchableSelect
                    value={selectedProductId}
                    onValueChange={(value, option) => handleAddProduct(value, option)}
                    options={productSelect.options}
                    placeholder="Search and select product to add..."
                    searchPlaceholder="Search products..."
                    emptyText="No products found."
                    isLoading={productSelect.isLoading}
                    onSearch={productSelect.onSearch}
                  />
                </div>
              </div>

              {/* Added Products List */}
              {items.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Added Products ({items.length})</Label>
                  </div>

                  {items.map((item, index) => {
                    const product = productSelect.products.find((p: any) => p.id === item.productId);
                    return (
                      <div
                        key={index}
                        className="p-4 border rounded-lg space-y-3 bg-muted/30"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{product?.name || "Unknown Product"}</h4>
                            <p className="text-sm text-muted-foreground">
                              Stock: {product?.currentStock || 0} {product?.unit || ""}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            className="h-8 w-8"
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor={`quantity-${index}`} className="text-xs">Quantity</Label>
                            <Input
                              id={`quantity-${index}`}
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.quantity || ""}
                              onChange={(e) =>
                                updateItem(index, "quantity", parseFloat(e.target.value) || 0)
                              }
                              className="h-9"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`unitPrice-${index}`} className="text-xs">Unit Price</Label>
                            <Input
                              id={`unitPrice-${index}`}
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice || ""}
                              onChange={(e) =>
                                updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)
                              }
                              className="h-9"
                            />
                          </div>

                          <div>
                            <Label className="text-xs">Total</Label>
                            <div className="h-9 flex items-center font-semibold">
                              {formatCurrency(item.quantity * item.unitPrice)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                  <Package className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No products added yet. Search and select products above.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Discount Section */}
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Discount (Optional)</CardTitle>
                <CardDescription>Apply a global discount to this sale</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={discountType}
                      onValueChange={(v: "PERCENT" | "FLAT") => setDiscountType(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PERCENT">Percent (%)</SelectItem>
                        <SelectItem value="FLAT">Flat (रू)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Value</Label>
                    <Input
                      type="number"
                      min={0}
                      step={discountType === "PERCENT" ? 1 : 0.01}
                      max={discountType === "PERCENT" ? 100 : subtotal}
                      value={discountValue || ""}
                      onChange={(e) =>
                        setDiscountValue(parseFloat(e.target.value) || 0)
                      }
                      placeholder={discountType === "PERCENT" ? "e.g. 10" : "e.g. 100"}
                    />
                  </div>
                </div>
                {discountValue > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Discount: रू {discountAmount.toFixed(2)}
                    {discountType === "PERCENT" && ` (${Math.min(100, discountValue)}%)`}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Section */}
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Information</CardTitle>
                <CardDescription>Enter payment details for this sale</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method *</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paidAmount">Paid Amount *</Label>
                    <Input
                      id="paidAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      max={finalTotal}
                      value={paidAmount || ""}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="h-9"
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave 0 for full credit sale
                    </p>
                  </div>
                </div>

                {dueAmount > 0 && (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-orange-800">Due Amount:</span>
                      <span className="font-bold text-lg text-orange-600">
                        {formatCurrency(dueAmount)}
                      </span>
                    </div>
                    <p className="text-sm text-orange-700 mt-1">
                      This will be recorded as a credit sale
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>Add any notes or special instructions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes or special instructions..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Section */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Items</span>
                    <span className="font-medium">{items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Quantity</span>
                    <span className="font-medium">
                      {items.reduce((sum, item) => sum + item.quantity, 0).toFixed(2)}
                    </span>
                  </div>
                  {paidAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Paid Amount</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(paidAmount)}
                      </span>
                    </div>
                  )}
                  {dueAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Due Amount</span>
                      <span className="font-medium text-orange-600">
                        {formatCurrency(dueAmount)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  {discountValue > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-medium text-green-600">
                        - {formatCurrency(discountAmount)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-medium">Final Total</span>
                    <span className="text-2xl font-bold">
                      {formatCurrency(finalTotal)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={createSaleMutation.isPending || !customerId || items.length === 0}
                    className="w-full"
                  >
                    {createSaleMutation.isPending ? "Creating Sale..." : "Create Sale"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.back()}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Bill Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {items.map((item, index) => {
                      const product = productSelect.products.find((p: any) => p.id === item.productId);
                      const lineTotal = item.quantity * item.unitPrice;
                      return (
                        <div key={index} className="text-sm space-y-1">
                          <div className="font-medium">{product?.name || "Unknown"}</div>
                          <div className="text-xs text-muted-foreground flex justify-between">
                            <span>
                              {item.quantity} × रू {item.unitPrice.toFixed(2)}
                            </span>
                            <span className="font-semibold text-foreground">
                              रू {lineTotal.toFixed(2)}
                            </span>
                          </div>
                          {index < items.length - 1 && (
                            <div className="border-b pt-2" />
                          )}
                        </div>
                      );
                    })}

                    {/* Grand Total */}
                    <div className="border-t-2 pt-3 mt-3">
                      {discountValue > 0 && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatCurrency(subtotal)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Discount</span>
                            <span className="text-green-600">- {formatCurrency(discountAmount)}</span>
                          </div>
                        </>
                      )}
                      <div className="flex justify-between items-center pt-1">
                        <span className="font-semibold">Grand Total</span>
                        <span className="text-lg font-bold">
                          {formatCurrency(finalTotal)}
                        </span>
                      </div>
                      {paidAmount > 0 && (
                        <div className="flex justify-between items-center mt-2 text-xs">
                          <span className="text-muted-foreground">Paid</span>
                          <span className="text-green-600 font-semibold">
                            {formatCurrency(paidAmount)}
                          </span>
                        </div>
                      )}
                      {dueAmount > 0 && (
                        <div className="flex justify-between items-center mt-1 text-xs">
                          <span className="text-muted-foreground">Due</span>
                          <span className="text-orange-600 font-semibold">
                            {formatCurrency(dueAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create Customer Dialog */}
      <Dialog open={isCreateCustomerOpen} onOpenChange={setIsCreateCustomerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
            <DialogDescription>
              Add a new customer to your list
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-customer-name">Name *</Label>
              <Input
                id="new-customer-name"
                value={newCustomerData.name}
                onChange={(e) =>
                  setNewCustomerData({ ...newCustomerData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-customer-phone">Phone *</Label>
              <Input
                id="new-customer-phone"
                type="tel"
                value={newCustomerData.phone}
                onChange={(e) =>
                  setNewCustomerData({ ...newCustomerData, phone: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-customer-address">Address</Label>
              <Input
                id="new-customer-address"
                value={newCustomerData.address}
                onChange={(e) =>
                  setNewCustomerData({ ...newCustomerData, address: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-customer-category">Category</Label>
              <Input
                id="new-customer-category"
                value={newCustomerData.category}
                onChange={(e) =>
                  setNewCustomerData({ ...newCustomerData, category: e.target.value })
                }
                placeholder="e.g., Farmer, Retailer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateCustomerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCustomer}
              disabled={createCustomerMutation.isPending}
            >
              {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
