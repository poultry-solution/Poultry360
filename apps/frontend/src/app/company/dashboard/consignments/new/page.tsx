"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  XCircle,
  Package,
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
import { toast } from "sonner";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { useSearchableDealerSelect } from "@/hooks/useSearchableDealerSelect";
import { useSearchableProductSelect } from "@/hooks/useSearchableProductSelect";
import { useCreateCompanyConsignment } from "@/fetchers/company/consignmentQueries";

interface ConsignmentItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export default function NewConsignmentPage() {
  const router = useRouter();

  // Form state
  const [dealerId, setDealerId] = useState("");
  const [items, setItems] = useState<ConsignmentItem[]>([]);
  const [notes, setNotes] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");

  // Searchable selects
  const dealerSelect = useSearchableDealerSelect();
  const productSelect = useSearchableProductSelect();
  
  const createMutation = useCreateCompanyConsignment();

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toFixed(2)}`;
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
    const newItem: ConsignmentItem = {
      productId,
      quantity: 1, // Default quantity
      unitPrice: Number(selectedProduct?.price) || 0,
    };

    setItems([...items, newItem]);
    setSelectedProductId(""); // Clear selection
    toast.success("Product added");
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ConsignmentItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleCreateConsignment = async () => {
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

    try {
      await createMutation.mutateAsync({
        dealerId,
        items,
        notes: notes || undefined,
      });
      toast.success("Consignment created successfully");
      router.push("/company/dashboard/consignments");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create consignment");
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

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
            Create New Consignment
          </h1>
          <p className="text-muted-foreground">
            Send products to a dealer on consignment
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
              <CardDescription>Select the dealer to send products to</CardDescription>
            </CardHeader>
            <CardContent>
              <Label>Select Dealer *</Label>
              <SearchableSelect
                value={dealerId}
                onValueChange={setDealerId}
                options={dealerSelect.options}
                placeholder="Select dealer..."
                searchPlaceholder="Search dealers..."
                emptyText="No dealers found."
                isLoading={dealerSelect.isLoading}
                onSearch={dealerSelect.onSearch}
              />
            </CardContent>
          </Card>

          {/* Products Section */}
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
              <CardDescription>Search and add products to this consignment</CardDescription>
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
                              Stock: {product?.currentStock || 0}
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
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Amount</span>
                    <span className="text-2xl font-bold">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <Button
                    onClick={handleCreateConsignment}
                    disabled={createMutation.isPending || !dealerId || items.length === 0}
                    className="w-full"
                  >
                    {createMutation.isPending ? "Creating..." : "Create Consignment"}
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
    </div>
  );
}
