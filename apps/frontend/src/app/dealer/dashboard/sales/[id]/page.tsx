"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  CreditCard,
  Package,
  FileText,
  Plus,
  Check,
  X,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Badge } from "@/common/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { toast } from "sonner";
import { useGetDealerSaleById, useAddSalePayment } from "@/fetchers/dealer/dealerSaleQueries";

export default function SaleDetailPage() {
  const router = useRouter();
  const params = useParams();
  const saleId = params?.id as string;

  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");

  const { data: saleData, isLoading } = useGetDealerSaleById(saleId);
  const addPaymentMutation = useAddSalePayment();

  const sale = saleData?.data;

  const handleAddPayment = async () => {
    if (!sale) return;

    if (paymentAmount <= 0) {
      toast.error("Payment amount must be greater than 0");
      return;
    }

    const dueAmount = Number(sale.dueAmount) || 0;
    if (paymentAmount > dueAmount) {
      toast.error(`Payment amount cannot exceed due amount (रू ${dueAmount.toFixed(2)})`);
      return;
    }

    try {
      await addPaymentMutation.mutateAsync({
        id: saleId,
        amount: paymentAmount,
        paymentMethod,
        description: paymentNotes || undefined,
      });

      toast.success("Payment added successfully");
      setIsAddPaymentOpen(false);
      setPaymentAmount(0);
      setPaymentMethod("CASH");
      setPaymentNotes("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add payment");
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return `रू ${amount.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        Loading sale details...
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h3 className="text-lg font-semibold mb-2">Sale not found</h3>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const totalAmount = Number(sale.totalAmount);
  const paidAmount = Number(sale.paidAmount);
  const dueAmount = Number(sale.dueAmount) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Invoice #{sale.invoiceNumber || sale.id.slice(0, 8)}
            </h1>
            <p className="text-muted-foreground">
              Sale created on {formatDate(sale.date)}
            </p>
          </div>
        </div>
        {dueAmount > 0 && (
          <Button onClick={() => setIsAddPaymentOpen(true)} className="bg-primary">
            <Plus className="mr-2 h-4 w-4" />
            Add Payment
          </Button>
        )}
      </div>

      {/* Sale Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
            <Check className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(paidAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Amount</CardTitle>
            <X className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(dueAmount)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Sale Details */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {sale.customer
                    ? sale.customer.name
                    : sale.farmer
                    ? sale.farmer.name
                    : "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>
                  {sale.customer
                    ? sale.customer.phone
                    : sale.farmer
                    ? sale.farmer.phone
                    : "N/A"}
                </span>
              </div>
              {sale.customer?.address && (
                <div className="flex items-start gap-2">
                  <Package className="h-4 w-4 text-muted-foreground mt-1" />
                  <span className="text-sm">{sale.customer.address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Payment Type</span>
                  <Badge variant={sale.isCredit ? "destructive" : "default"}>
                    {sale.isCredit ? "Credit" : "Cash"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Payment Method</span>
                  <span className="font-medium text-sm">{sale.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={dueAmount > 0 ? "destructive" : "secondary"}>
                    {dueAmount > 0 ? "Pending" : "Fully Paid"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {sale.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-1" />
                  <p className="text-sm text-muted-foreground">{sale.notes}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Payment History */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>
                    {sale.payments && sale.payments.length > 0
                      ? `${sale.payments.length} payment${sale.payments.length > 1 ? "s" : ""} recorded`
                      : "No payments recorded yet"}
                  </CardDescription>
                </div>
                {dueAmount > 0 && (
                  <Button
                    size="sm"
                    onClick={() => setIsAddPaymentOpen(true)}
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!sale.payments || sale.payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No payments recorded yet</p>
                  {dueAmount > 0 && (
                    <Button
                      onClick={() => setIsAddPaymentOpen(true)}
                      className="mt-4"
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Payment
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {sale.payments.map((payment: any) => (
                    <div
                      key={payment.id}
                      className="p-3 border rounded-lg space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">
                            {formatCurrency(Number(payment.amount))}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(payment.paymentDate)}
                          </div>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {payment.method}
                        </Badge>
                      </div>
                      {payment.notes && (
                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          {payment.notes}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Payment Summary */}
                  <div className="p-3 bg-muted rounded-lg space-y-2 mt-4">
                    <div className="flex justify-between text-sm">
                      <span>Total Amount:</span>
                      <span className="font-semibold">{formatCurrency(totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Total Paid:</span>
                      <span className="font-semibold">{formatCurrency(paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-red-600 pt-2 border-t border-border">
                      <span className="font-semibold">Remaining:</span>
                      <span className="font-bold">{formatCurrency(dueAmount)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Items Table - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle>Items Purchased</CardTitle>
          <CardDescription>
            {sale.items?.length || 0} item{sale.items?.length !== 1 ? "s" : ""} in this sale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.dealerProduct?.name || "Product"}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(item.unitPrice))}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(item.quantity).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(item.totalAmount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-between items-center pt-4 border-t mt-4">
            <span className="font-semibold">Total Amount</span>
            <span className="text-xl font-bold">{formatCurrency(totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Record a payment received for this sale
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Due Amount:</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(dueAmount)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-amount">Payment Amount *</Label>
              <Input
                id="payment-amount"
                type="number"
                min="0"
                max={dueAmount}
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes (Optional)</Label>
              <Input
                id="payment-notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Add payment notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddPaymentOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPayment}
              disabled={addPaymentMutation.isPending}
            >
              {addPaymentMutation.isPending ? "Adding..." : "Add Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
