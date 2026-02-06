"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ImageUpload } from "@/common/components/ui/image-upload";
import { toast } from "sonner";
import { useAddDealerPayment } from "@/fetchers/dealer/dealerLedgerQueries";
import {
  useRecordFarmerPayment,
  RecordFarmerPaymentInput,
} from "@/fetchers/dealer/dealerFarmerQueries";

export interface DealerAddPaymentCustomer {
  id: string;
  name: string;
  phone?: string;
  balance?: number;
}

export interface DealerAddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "select" = show customer dropdown (e.g. customers list page). "single" = one customer (e.g. account page) */
  mode: "select" | "single";
  /** For mode "select": list of customers to choose from */
  customers?: DealerAddPaymentCustomer[];
  /** For mode "single": the customer to show (payment will be recorded for this customer) */
  customer?: DealerAddPaymentCustomer;
  /** For mode "single": when true, use farmer account API instead of dealer ledger */
  isFarmer?: boolean;
  /** For mode "single" + isFarmer: farmer user id for recordFarmerPayment */
  farmerId?: string;
  /** Called after successful payment (e.g. to invalidate queries) */
  onSuccess?: () => void;
  /** Optional: format currency for display */
  formatCurrency?: (amount: number) => string;
}

const defaultFormatCurrency = (amount: number) => `रू ${amount.toFixed(2)}`;

export function DealerAddPaymentDialog({
  open,
  onOpenChange,
  mode,
  customers = [],
  customer,
  isFarmer = false,
  farmerId,
  onSuccess,
  formatCurrency = defaultFormatCurrency,
}: DealerAddPaymentDialogProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [reference, setReference] = useState("");
  const [receiptImageUrl, setReceiptImageUrl] = useState("");

  const addDealerPayment = useAddDealerPayment();
  const recordFarmerPayment = useRecordFarmerPayment();

  const effectiveCustomerId =
    mode === "single" && customer ? customer.id : selectedCustomerId;
  const effectiveCustomer =
    mode === "single" && customer
      ? customer
      : customers.find((c) => c.id === selectedCustomerId);
  const isPending =
    addDealerPayment.isPending || recordFarmerPayment.isPending;

  const resetForm = () => {
    setSelectedCustomerId("");
    setAmount(0);
    setPaymentMethod("CASH");
    setDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setReference("");
    setReceiptImageUrl("");
  };

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!effectiveCustomerId && mode === "select") {
      toast.error("Please select a customer");
      return;
    }
    if (mode === "single" && isFarmer && farmerId) {
      try {
        await recordFarmerPayment.mutateAsync({
          farmerId,
          amount,
          paymentMethod,
          paymentDate: date,
          notes: notes || undefined,
          reference: reference || undefined,
          receiptImageUrl: receiptImageUrl || undefined,
        } as RecordFarmerPaymentInput);
        toast.success("Payment recorded successfully");
        onOpenChange(false);
        onSuccess?.();
      } catch (error: any) {
        toast.error(
          error.response?.data?.message || "Failed to record payment"
        );
      }
      return;
    }
    try {
      await addDealerPayment.mutateAsync({
        customerId: effectiveCustomerId,
        amount,
        paymentMethod,
        date,
        notes: notes || undefined,
        receiptImageUrl: receiptImageUrl || undefined,
        reference: reference || undefined,
      });
      toast.success("Payment recorded successfully");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add payment");
    }
  };

  const title = mode === "single" ? "Record Payment" : "Add Payment";
  const description =
    mode === "single" && customer
      ? `Record a payment received from ${customer.name}`
      : "Record an account-level payment. Select a customer; for connected farmers, payment is applied to their farmer account.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {mode === "select" && (
              <div className="space-y-2">
                <Label htmlFor="payment-customer">Customer *</Label>
                <Select
                  value={selectedCustomerId}
                  onValueChange={setSelectedCustomerId}
                >
                  <SelectTrigger id="payment-customer">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {effectiveCustomer && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{effectiveCustomer.name}</p>
                    {effectiveCustomer.phone && (
                      <p className="text-muted-foreground">
                        {effectiveCustomer.phone}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-muted-foreground">Balance</p>
                    <p
                      className={`font-bold ${
                        Number(effectiveCustomer.balance ?? 0) > 0
                          ? "text-red-600"
                          : Number(effectiveCustomer.balance ?? 0) < 0
                            ? "text-green-600"
                            : ""
                      }`}
                    >
                      {formatCurrency(
                        Number(effectiveCustomer.balance ?? 0)
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-amount">Amount *</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount || ""}
                  onChange={(e) =>
                    setAmount(parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-method">Method *</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                >
                  <SelectTrigger id="payment-method">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="payment-date">Date *</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment-reference">Reference</Label>
                <Input
                  id="payment-reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ref #"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-notes">Notes (Optional)</Label>
              <Input
                id="payment-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add payment notes..."
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Receipt (Optional)</Label>
              <ImageUpload
                value={receiptImageUrl}
                onChange={setReceiptImageUrl}
                folder="payment-receipts"
                placeholder="Upload receipt"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Recording..."
                : mode === "single"
                  ? "Record Payment"
                  : "Add Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
