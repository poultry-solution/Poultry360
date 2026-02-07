"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  XCircle,
  Truck,
  Receipt,
  AlertCircle,
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
import { Badge } from "@/common/components/ui/badge";
import { toast } from "sonner";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { useSearchableDealerSelect } from "@/hooks/useSearchableDealerSelect";
import { useSearchableProductSelect } from "@/hooks/useSearchableProductSelect";
import { useCreateCompanyConsignment } from "@/fetchers/company/consignmentQueries";
import { useCreateCompanySale } from "@/fetchers/company/companySaleQueries";
import { useCheckDealerBalanceLimit } from "@/fetchers/company/companyDealerAccountQueries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";

interface SaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export default function NewCompanySalePage() {
  const router = useRouter();

  // Form state
  const [dealerId, setDealerId] = useState("");
  const [selectedDealer, setSelectedDealer] = useState<any>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [notes, setNotes] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [balanceLimitCheck, setBalanceLimitCheck] = useState<any | null>(null);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [overrideConfirmed, setOverrideConfirmed] = useState(false);

  // Searchable selects
  const dealerSelect = useSearchableDealerSelect();
  const productSelect = useSearchableProductSelect();

  const createConsignmentMutation = useCreateCompanyConsignment();
  const createSaleMutation = useCreateCompanySale();
  const checkBalanceLimitMutation = useCheckDealerBalanceLimit();

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toFixed(2)}`;
  };

  const handleDealerChange = (value: string, option?: any) => {
    setDealerId(value);
    // Store the dealer data from the option
    setSelectedDealer(option?.data || null);
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
      unitPrice: Number(selectedProduct?.unitSellingPrice) || 0,
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

  // Determine sale type based on dealer
  const isSelfCreatedDealer =
    selectedDealer?.connectionType === "MANUAL" && selectedDealer?.isOwnedDealer;
  const isConnectedDealer = selectedDealer?.connectionType === "CONNECTED";

  const handleSubmit = async () => {
    if (!dealerId || items.length === 0) {
      toast.error("Please select dealer and add items");
      return;
    }

    // Validate items
    for (const item of items) {
      if (!item.productId || item.quantity <= 0 || item.unitPrice <= 0) {
        toast.error("Please fill all product details with valid values");
        return;
      }
    }

    // Run balance limit check before submitting for both direct sales and consignments (unless user already confirmed override)
    if ((isSelfCreatedDealer || isConnectedDealer) && !overrideConfirmed) {
      try {
        const result = await checkBalanceLimitMutation.mutateAsync({
          dealerId,
          saleAmount: totalAmount,
        });
        setBalanceLimitCheck(result);
        if (!result.allowed) {
          setShowOverrideDialog(true);
          return; // Block submission until user confirms override or cancels
        }
      } catch (err) {
        toast.error("Failed to check balance limit");
        return;
      }
    }

    try {
      if (isSelfCreatedDealer) {
        // Direct sale flow for self-created dealers (no approval needed)
        await createSaleMutation.mutateAsync({
          dealerId,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          paymentMethod: "CREDIT",
          notes: notes || undefined,
          date: new Date(),
          overrideBalanceLimit: overrideConfirmed,
        });

        toast.success("Sale created successfully!");
        router.push("/company/dashboard/sales");
      } else if (isConnectedDealer) {
        // Consignment flow for connected dealers (requires approval)
        await createConsignmentMutation.mutateAsync({
          dealerId,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
          notes: notes || undefined,
          overrideBalanceLimit: overrideConfirmed,
        });

        toast.success("Consignment request created successfully!");
        router.push("/company/dashboard/consignments");
      } else {
        toast.error("Please select a valid dealer");
      }
    } catch (error: any) {
      const errorMessage = isSelfCreatedDealer
        ? error.response?.data?.message || "Failed to create sale"
        : error.response?.data?.message || "Failed to create consignment request";
      toast.error(errorMessage);
    }
  };

  const isSubmitting = createConsignmentMutation.isPending || createSaleMutation.isPending;

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
            Create a sale or consignment request to a dealer
          </p>
        </div>
      </div>

      {/* Main Form */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dealer Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Dealer Information</CardTitle>
              <CardDescription>Select the dealer for this sale</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Dealer *</Label>
                <SearchableSelect
                  value={dealerId}
                  onValueChange={handleDealerChange}
                  options={dealerSelect.options}
                  placeholder="Search and select dealer..."
                  searchPlaceholder="Search dealers..."
                  emptyText="No dealers found."
                  isLoading={dealerSelect.isLoading}
                  onSearch={dealerSelect.onSearch}
                />
              </div>

              {/* Dealer Type Badge */}
              {selectedDealer && (
                <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedDealer.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedDealer.contact}</p>
                  </div>
                  {isConnectedDealer ? (
                    <Badge variant="default" className="bg-blue-600">
                      <Truck className="h-3 w-3 mr-1" />
                      Connected Dealer
                    </Badge>
                  ) : isSelfCreatedDealer ? (
                    <Badge variant="secondary">
                      <Receipt className="h-3 w-3 mr-1" />
                      Manual Dealer
                    </Badge>
                  ) : null}
                </div>
              )}

              {/* Sale Type Info */}
              {selectedDealer && (
                <div className={`p-3 rounded-lg text-sm ${isConnectedDealer
                    ? "bg-blue-50 border border-blue-200 text-blue-800"
                    : "bg-green-50 border border-green-200 text-green-800"
                  }`}>
                  {isConnectedDealer ? (
                    <>
                      <strong>Consignment Flow:</strong> This will create a consignment request.
                      The dealer will need to accept it before you can dispatch the products.
                    </>
                  ) : isSelfCreatedDealer ? (
                    <>
                      <strong>Direct Sale:</strong> This will create an instant sale.
                      Inventory will be updated immediately and balance will be added to the dealer's account.
                    </>
                  ) : null}
                </div>
              )}
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
                  {selectedDealer && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sale Type</span>
                      <span className="font-medium">
                        {isConnectedDealer ? "Consignment" : "Direct Sale"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Amount</span>
                    <span className="text-2xl font-bold">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>

                {balanceLimitCheck && !balanceLimitCheck.allowed && !overrideConfirmed && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="text-xs">
                        <p className="font-semibold text-amber-800">Balance Limit Warning</p>
                        <p className="text-amber-700">
                          This sale exceeds the dealer&apos;s balance limit by रू{" "}
                          {balanceLimitCheck.exceedsBy?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 space-y-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !dealerId || items.length === 0}
                    className="w-full"
                  >
                    {isSubmitting
                      ? isConnectedDealer
                        ? "Creating Consignment..."
                        : "Creating Sale..."
                      : isConnectedDealer
                        ? "Create Consignment Request"
                        : "Create Sale"}
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
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Grand Total</span>
                        <span className="text-lg font-bold">
                          {formatCurrency(totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Balance limit override confirmation dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="h-5 w-5" />
              Balance Limit Exceeded
            </DialogTitle>
            <DialogDescription>
              This sale will exceed the dealer&apos;s balance limit.
            </DialogDescription>
          </DialogHeader>

          {balanceLimitCheck && (
            <div className="space-y-3 py-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Balance:</span>
                  <span className="font-semibold">
                    रू {balanceLimitCheck.currentBalance.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">New Balance (after sale):</span>
                  <span className="font-semibold text-amber-700">
                    रू {balanceLimitCheck.newBalance.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance Limit:</span>
                  <span className="font-semibold">
                    रू {balanceLimitCheck.limit?.toFixed(2)}
                  </span>
                </div>
                {balanceLimitCheck.exceedsBy != null && (
                  <div className="flex justify-between text-sm pt-2 border-t border-amber-300">
                    <span className="text-muted-foreground">Exceeds By:</span>
                    <span className="font-bold text-red-600">
                      रू {balanceLimitCheck.exceedsBy.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Do you want to proceed with this sale anyway? You can also update the
                balance limit from the dealer&apos;s account page.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setOverrideConfirmed(true);
                setShowOverrideDialog(false);
                handleSubmit();
              }}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Override & Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
