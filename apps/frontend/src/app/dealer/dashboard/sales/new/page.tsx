"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Search, UserPlus, ShoppingCart, CreditCard, Check } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useCreateDealerSale,
  useSearchCustomers,
  useCreateCustomer,
} from "@/fetchers/dealer/dealerSaleQueries";
import { useGetDealerProducts as useGetProducts } from "@/fetchers/dealer/dealerProductQueries";

interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  availableStock: number;
}

export default function NewSalePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [customerType, setCustomerType] = useState<"customer" | "farmer" | null>(null);
  const [customerId, setCustomerId] = useState<string>("");
  const [farmerId, setFarmerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [items, setItems] = useState<SaleItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productQuantity, setProductQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    phone: "",
    address: "",
    category: "",
  });

  // Queries
  const { data: productsData } = useGetProducts();
  const { data: searchResults } = useSearchCustomers(
    customerSearch,
    customerType || "all"
  );
  const createSaleMutation = useCreateDealerSale();
  const createCustomerMutation = useCreateCustomer();

  const products = productsData?.data || [];
  const customers = searchResults?.data?.customers || [];
  const farmers = searchResults?.data?.farmers || [];

  // Calculate totals
  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const dueAmount = totalAmount - paidAmount;

  // Step 1: Select Customer/Farmer
  const handleCustomerSelect = (id: string, type: "customer" | "farmer") => {
    if (type === "customer") {
      setCustomerId(id);
      setFarmerId("");
    } else {
      setFarmerId(id);
      setCustomerId("");
    }
    setStep(2);
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerData.name || !newCustomerData.phone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      const result = await createCustomerMutation.mutateAsync(newCustomerData);
      setCustomerId(result.data.id);
      setFarmerId("");
      setIsCreateCustomerOpen(false);
      setNewCustomerData({ name: "", phone: "", address: "", category: "" });
      setStep(2);
      toast.success("Customer created successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create customer");
    }
  };

  // Step 2: Add Products
  const handleAddProduct = () => {
    if (!selectedProductId) {
      toast.error("Please select a product");
      return;
    }

    const product = products.find((p: any) => p.id === selectedProductId);
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
          unitPrice: Number(product.sellingPrice),
          totalAmount: productQuantity * Number(product.sellingPrice),
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

    if (!customerId && !farmerId) {
      toast.error("Please select a customer or farmer");
      return;
    }

    if (paidAmount < 0 || paidAmount > totalAmount) {
      toast.error("Paid amount must be between 0 and total amount");
      return;
    }

    try {
      await createSaleMutation.mutateAsync({
        customerId: customerId || undefined,
        farmerId: farmerId || undefined,
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
      router.push("/dealer/dashboard/sales");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create sale");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Sale</h1>
          <p className="text-muted-foreground">
            Create a new sale transaction
          </p>
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
                Customer
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

      {/* Step 1: Customer Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Customer or Farmer</CardTitle>
            <CardDescription>
              Search for an existing customer or farmer, or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={customerType || "ALL"}
                onValueChange={(value) =>
                  setCustomerType(value === "ALL" ? null : (value as "customer" | "farmer"))
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                  <SelectItem value="farmer">Farmers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Customer Results */}
            {customerSearch.length >= 2 && (
              <div className="space-y-4">
                {customers.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Customers</h3>
                    <div className="space-y-2">
                      {customers.map((customer: any) => (
                        <div
                          key={customer.id}
                          className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                          onClick={() => handleCustomerSelect(customer.id, "customer")}
                        >
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {customer.phone}
                            {customer.address && ` • ${customer.address}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Farmer Results */}
                {farmers.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Farmers</h3>
                    <div className="space-y-2">
                      {farmers.map((farmer: any) => (
                        <div
                          key={farmer.id}
                          className="p-3 border rounded-lg hover:bg-accent cursor-pointer"
                          onClick={() => handleCustomerSelect(farmer.id, "farmer")}
                        >
                          <div className="font-medium">{farmer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {farmer.phone}
                            {farmer.companyName && ` • ${farmer.companyName}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {customers.length === 0 && farmers.length === 0 && customerSearch.length >= 2 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No results found
                  </div>
                )}
              </div>
            )}

            {/* Create New Customer */}
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setIsCreateCustomerOpen(true)}
                className="w-full"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Create New Customer
              </Button>
            </div>
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
                    .filter((p: any) => Number(p.currentStock) > 0)
                    .map((product: any) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - Stock: {Number(product.currentStock).toFixed(2)}{" "}
                        {product.unit} - रू {Number(product.sellingPrice).toFixed(2)}
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
              <Button
                onClick={() => setStep(3)}
                disabled={items.length === 0}
              >
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

