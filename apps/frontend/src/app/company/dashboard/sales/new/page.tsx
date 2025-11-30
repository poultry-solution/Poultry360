"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Search, ShoppingCart, Check } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { toast } from "sonner";
import { useCreateCompanySale } from "@/fetchers/company/companySaleQueries";
import { useGetCompanyProducts, type CompanyProduct } from "@/fetchers/company/companyProductQueries";
import { useSearchCompanyDealers } from "@/fetchers/company/companyDealerQueries";

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  availableStock: number;
}

export default function NewCompanySalePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [dealerId, setDealerId] = useState<string>("");
  const [dealerSearch, setDealerSearch] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productQuantity, setProductQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState("");

  // Queries
  const { data: productsData } = useGetCompanyProducts({ limit: 100 });
  const { data: dealersData } = useSearchCompanyDealers(dealerSearch);
  const createSaleMutation = useCreateCompanySale();

  const products = productsData?.data || [];
  const dealers = dealersData?.data || [];

  // Calculate totals
  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const dueAmount = totalAmount - paidAmount;

  // Step 1: Select Dealer
  const handleDealerSelect = (id: string) => {
    setDealerId(id);
    setStep(2);
  };

  // Step 2: Add Products
  const handleAddProduct = () => {
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }

    const product = products.find((p: CompanyProduct) => p.id === selectedProductId);
    if (!product) return;

    if (productQuantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    if (productQuantity > Number(product.currentStock)) {
      toast.error(`Insufficient stock. Available: ${product.currentStock}`);
      return;
    }

    const existingItemIndex = items.findIndex(
      (item) => item.productId === selectedProductId
    );

    if (existingItemIndex >= 0) {
      const updatedItems = [...items];
      const newQuantity = updatedItems[existingItemIndex].quantity + productQuantity;
      if (newQuantity > Number(product.currentStock)) {
        toast.error(`Insufficient stock. Available: ${product.currentStock}`);
        return;
      }
      updatedItems[existingItemIndex].quantity = newQuantity;
      updatedItems[existingItemIndex].totalAmount =
        newQuantity * updatedItems[existingItemIndex].unitPrice;
      setItems(updatedItems);
    } else {
      setItems([
        ...items,
        {
          productId: selectedProductId,
          productName: product.name,
          quantity: productQuantity,
          unitPrice: Number(product.price),
          totalAmount: productQuantity * Number(product.price),
          availableStock: Number(product.currentStock),
        },
      ]);
    }

    setSelectedProductId("");
    setProductQuantity(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) return;
    const item = items[index];
    if (newQuantity > item.availableStock) {
      toast.error(`Insufficient stock. Available: ${item.availableStock}`);
      return;
    }
    const updatedItems = [...items];
    updatedItems[index].quantity = newQuantity;
    updatedItems[index].totalAmount = newQuantity * item.unitPrice;
    setItems(updatedItems);
  };

  // Step 3: Payment & Review
  const handleSubmit = async () => {
    if (items.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    if (!dealerId) {
      toast.error("Please select a dealer");
      return;
    }

    if (paidAmount < 0 || paidAmount > totalAmount) {
      toast.error("Paid amount must be between 0 and total amount");
      return;
    }

    try {
      await createSaleMutation.mutateAsync({
        dealerId,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        paidAmount,
        paymentMethod,
        notes: notes || undefined,
        date: new Date(),
      });

      toast.success("Sale created successfully!");
      router.push("/company/dashboard/sales");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create sale");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Sale</h1>
          <p className="text-muted-foreground">Create a new sale transaction</p>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {step > 1 ? <Check className="h-4 w-4" /> : "1"}
              </div>
              <span className={step >= 1 ? "font-medium" : "text-muted-foreground"}>
                Dealer
              </span>
            </div>
            <div className="flex-1 h-1 bg-muted mx-4" />
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                {step > 2 ? <Check className="h-4 w-4" /> : "2"}
              </div>
              <span className={step >= 2 ? "font-medium" : "text-muted-foreground"}>
                Products
              </span>
            </div>
            <div className="flex-1 h-1 bg-muted mx-4" />
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step >= 3 ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                3
              </div>
              <span className={step >= 3 ? "font-medium" : "text-muted-foreground"}>
                Payment
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Dealer Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Dealer</CardTitle>
            <CardDescription>
              Search for an existing dealer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or contact..."
                value={dealerSearch}
                onChange={(e) => setDealerSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {dealerSearch.length >= 2 && dealers.length > 0 && (
              <div className="space-y-2">
                {dealers.map((dealer: any) => (
                  <div
                    key={dealer.id}
                    className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => handleDealerSelect(dealer.id)}
                  >
                    <div className="font-medium">{dealer.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {dealer.contact}
                      {dealer.address && ` • ${dealer.address}`}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {dealerSearch.length >= 2 && dealers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No dealers found
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Add Products */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Add Products</CardTitle>
            <CardDescription>
              Select products and quantities for this sale
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products
                    .filter((p: CompanyProduct) => Number(p.currentStock) > 0)
                    .map((product: CompanyProduct) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - Stock: {Number(product.currentStock).toFixed(2)}{" "}
                        {product.unit} - रू {Number(product.price).toFixed(2)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={productQuantity}
                onChange={(e) => setProductQuantity(parseFloat(e.target.value) || 1)}
                placeholder="Qty"
                className="w-24"
              />
              <Button onClick={handleAddProduct}>
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </div>

            {/* Items Table */}
            {items.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>रू {item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateQuantity(index, parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        रू {item.totalAmount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} disabled={items.length === 0}>
                Continue to Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Payment & Review */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment & Review</CardTitle>
            <CardDescription>
              Review sale details and enter payment information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sale Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-bold text-lg">रू {totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
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

            {/* Paid Amount */}
            <div className="space-y-2">
              <Label>Paid Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                max={totalAmount}
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter paid amount"
              />
              <p className="text-sm text-muted-foreground">
                Leave 0 for full credit sale
              </p>
            </div>

            {/* Due Amount Display */}
            {dueAmount > 0 && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Due Amount:</span>
                  <span className="font-bold text-lg text-orange-600">
                    रू {dueAmount.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  This will be recorded as a credit sale
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
              />
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createSaleMutation.isPending}
                className="bg-primary"
              >
                {createSaleMutation.isPending ? (
                  "Creating Sale..."
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create Sale
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

