"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit, Trash2, Phone, MapPin, DollarSign } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { DataTable, Column } from "@/common/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { ImageUpload } from "@/common/components/ui/image-upload";
import { toast } from "sonner";
import axiosInstance from "@/common/lib/axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  companyDealerAccountKeys,
  useGetAllDealerAccounts,
  useRecordDealerPayment,
} from "@/fetchers/company/companyDealerAccountQueries";
import { DateInput } from "@/common/components/ui/date-input";
import { getNowLocalDateTime } from "@/common/lib/utils";

interface Dealer {
  id: string;
  dealerId: string;
  name: string;
  contact: string;
  address: string;
  balance: number;
  createdAt?: Date;
  connectionType?: "CONNECTED" | "MANUAL";
  isOwnedDealer?: boolean;
}

export default function CompanyDealersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);

  // Confirmation Dialog State
  const [confirmationAction, setConfirmationAction] = useState<{
    type: "DELETE";
    id: string;
    name: string;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    address: "",
  });

  const { data: accountDealers = [], isLoading } = useGetAllDealerAccounts();

  const queryClient = useQueryClient();

  // Create dealer mutation
  const createMutation = useMutation({
    mutationFn: async (input: typeof formData) => {
      const { data } = await axiosInstance.post("/dealers", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyDealerAccountKeys.lists() });
      toast.success("Dealer created successfully");
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create dealer");
    },
  });

  // Update dealer mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: typeof formData & { id: string }) => {
      const { data } = await axiosInstance.put(`/dealers/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyDealerAccountKeys.lists() });
      toast.success("Dealer updated successfully");
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update dealer");
    },
  });

  // Delete dealer mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete(`/dealers/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: companyDealerAccountKeys.lists() });
      toast.success("Dealer deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete dealer");
    },
  });

  // Record payment mutation
  const recordPaymentMutation = useRecordDealerPayment();

  // Payment Dialog State
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    dealerId: "",
    amount: 0,
    paymentMethod: "CASH",
    paymentDate: getNowLocalDateTime(),
    notes: "",
    reference: "",
    receiptImageUrl: "",
  });

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!paymentData.dealerId) {
      toast.error("Please select a dealer");
      return;
    }

    if (paymentData.amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      await recordPaymentMutation.mutateAsync({
        dealerId: paymentData.dealerId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        paymentDate: new Date(paymentData.paymentDate),
        notes: paymentData.notes,
        reference: paymentData.reference,
        receiptImageUrl: paymentData.receiptImageUrl || undefined,
      });

      toast.success("Payment recorded successfully");
      setIsPaymentDialogOpen(false);
      setPaymentData({
        dealerId: "",
        amount: 0,
        paymentMethod: "CASH",
        paymentDate: getNowLocalDateTime(),
        notes: "",
        reference: "",
        receiptImageUrl: "",
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to record payment");
    }
  };

  const handleOpenDialog = (dealer?: Dealer) => {
    if (dealer) {
      setEditingDealer(dealer);
      setFormData({
        name: dealer.name,
        contact: dealer.contact,
        address: dealer.address || "",
      });
    } else {
      setEditingDealer(null);
      setFormData({
        name: "",
        contact: "",
        address: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDealer(null);
    setFormData({
      name: "",
      contact: "",
      address: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.contact) {
      toast.error("Name and contact are required");
      return;
    }

    if (editingDealer) {
      updateMutation.mutate({ ...formData, id: editingDealer.dealerId });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmationAction({ type: "DELETE", id, name });
  };

  const executeConfirmationAction = async () => {
    if (!confirmationAction) return;

    try {
      deleteMutation.mutate(confirmationAction.id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete dealer");
    } finally {
      setConfirmationAction(null);
    }
  };

  const dealers: Dealer[] = accountDealers
    .filter((dealer) => dealer.isManualDealer || dealer.connectionType === "MANUAL")
    .map((dealer) => ({
      id: dealer.id,
      dealerId: dealer.dealerId,
      name: dealer.dealerName,
      contact: dealer.dealerContact,
      address: dealer.dealerAddress || "",
      balance: dealer.balance,
      createdAt: undefined,
      connectionType: dealer.connectionType,
      isOwnedDealer: dealer.isManualDealer,
    }))
    .filter((dealer) => {
      if (!search.trim()) return true;
      const query = search.toLowerCase();
      return (
        dealer.name.toLowerCase().includes(query) ||
        dealer.contact.toLowerCase().includes(query) ||
        dealer.address.toLowerCase().includes(query)
      );
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dealer Management</h1>
          <p className="text-muted-foreground">
            Manage dealers you supply manually
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => handleOpenDialog()} className="bg-primary">
            <Plus className="mr-2 h-4 w-4" />
            Add Dealer
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search dealers by name or contact..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Dealers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dealers</CardTitle>
              <CardDescription>
                Manage manual dealer accounts and payments
              </CardDescription>
            </div>
            <Button onClick={() => setIsPaymentDialogOpen(true)} variant="secondary" size="sm">
              <DollarSign className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
              <DataTable
                data={dealers}
                loading={isLoading}
                emptyMessage="No manual dealers found. Add your first dealer."
                columns={[
                  {
                    key: 'name',
                    label: 'Name',
                    width: '120px',
                    render: (val) => <span className="font-medium">{val}</span>
                  },
                  {
                    key: 'contact',
                    label: 'Contact',
                    width: '120px',
                    render: (val) => (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {val}
                      </div>
                    )
                  },
                  {
                    key: 'address',
                    label: 'Address',
                    width: '150px',
                    render: (val) => val ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[150px]">{val}</span>
                      </div>
                    ) : <span className="text-muted-foreground">-</span>
                  },
                  {
                    key: 'balance',
                    label: 'Account Balance',
                    align: 'right',
                    width: '120px',
                    render: (val) => (
                      <span className={val > 0 ? "text-red-600 font-semibold" : val < 0 ? "text-green-600 font-semibold" : ""}>
                        {val > 0 ? `रू ${Math.abs(val).toFixed(2)} (Due)` : val < 0 ? `रू ${Math.abs(val).toFixed(2)} (Advance)` : "रू 0.00"}
                      </span>
                    )
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    align: 'right',
                    width: '150px',
                    render: (_, dealer) => (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/company/dashboard/dealers/${dealer.dealerId}/account`)}
                        >
                          View Account
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(dealer)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(dealer.dealerId, dealer.name)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    )
                  }
                ] as Column[]}
              />
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingDealer ? "Edit Dealer" : "Add New Dealer"}
              </DialogTitle>
              <DialogDescription>
                {editingDealer
                  ? "Update dealer information"
                  : "Add a new dealer to your list"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Dealer Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter dealer name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">Contact Number *</Label>
                <Input
                  id="contact"
                  type="tel"
                  value={formData.contact}
                  onChange={(e) =>
                    setFormData({ ...formData, contact: e.target.value })
                  }
                  placeholder="Enter contact number"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Enter address (optional)"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingDealer
                    ? "Update Dealer"
                    : "Add Dealer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmationAction}
        onOpenChange={(open) => !open && setConfirmationAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmationAction?.type === "DELETE" && "Delete Dealer"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationAction?.type === "DELETE" && `Are you sure you want to delete "${confirmationAction.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeConfirmationAction}
              className={confirmationAction?.type === "DELETE" ? "bg-red-600 hover:bg-red-700 focus:ring-red-600" : ""}
            >
              {confirmationAction?.type === "DELETE" && "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleRecordPayment}>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a payment received from a dealer
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dealerId">Select Dealer *</Label>
                <Select
                  value={paymentData.dealerId}
                  onValueChange={(value) =>
                    setPaymentData({ ...paymentData, dealerId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dealer" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {dealers.map((dealer) => (
                      <SelectItem key={dealer.dealerId} value={dealer.dealerId}>
                        {dealer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={paymentData.amount || ""}
                  onChange={(e) =>
                    setPaymentData({
                      ...paymentData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2 ">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select
                  value={paymentData.paymentMethod}
                  onValueChange={(value) =>
                    setPaymentData({ ...paymentData, paymentMethod: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date *</Label>
                <DateInput
                  label="Payment Date"
                  value={paymentData.paymentDate}
                  onChange={(val) =>
                    setPaymentData({ ...paymentData, paymentDate: val })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reference">Reference Number</Label>
                <Input
                  id="reference"
                  value={paymentData.reference}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, reference: e.target.value })
                  }
                  placeholder="Transaction ID, Receipt #, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={paymentData.notes}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, notes: e.target.value })
                  }
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Receipt (Optional)</Label>
                <ImageUpload
                  value={paymentData.receiptImageUrl}
                  onChange={(url) =>
                    setPaymentData({ ...paymentData, receiptImageUrl: url })
                  }
                  folder="payment-receipts"
                  placeholder="Upload payment receipt image"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
                disabled={recordPaymentMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={recordPaymentMutation.isPending}>
                {recordPaymentMutation.isPending
                  ? "Recording..."
                  : "Record Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
