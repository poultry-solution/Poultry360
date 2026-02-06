"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Users, Edit, Trash2, Phone, MapPin, Link2, CheckCircle2, DollarSign } from "lucide-react";
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
import { Label } from "@/common/components/ui/label";
import { Badge } from "@/common/components/ui/badge";
import { toast } from "sonner";
import axiosInstance from "@/common/lib/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetDealerFarmerRequests, useGetConnectedFarmers } from "@/fetchers/dealer/dealerFarmerQueries";
import { DealerAddPaymentDialog } from "@/components/dealer/DealerAddPaymentDialog";

interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  category?: string;
  balance: number;
  source?: string; // "MANUAL" | "CONNECTED"
  farmerId?: string; // Link to farmer for connected customers
  createdAt: Date;
  partyType?: "CUSTOMER" | "FARMER"; // For farmers from ledger parties
}

export default function DealerCustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Add Payment dialog
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    category: "",
  });

  // Get customers
  const { data: customersData, isLoading: customersLoading } = useQuery({
    queryKey: ["dealer-customers", search],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/dealer/sales/customers", {
        params: search ? { search } : {},
      });
      return data;
    },
  });

  // Get connected farmers (to show farmers who might not have Customer records yet)
  const { data: connectedFarmersData, isLoading: farmersLoading } = useGetConnectedFarmers();

  // Get ledger parties (includes both customers and farmers with transactions)
  const { data: ledgerPartiesData, isLoading: ledgerLoading } = useQuery({
    queryKey: ["dealer-ledger-parties", search],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/dealer/ledger/parties", {
        params: search ? { search } : {},
      });
      return data;
    },
  });

  // Get pending verification requests count
  const { data: verificationData } = useGetDealerFarmerRequests({
    status: "PENDING",
    limit: 1,
  });
  const pendingVerificationCount = verificationData?.pagination?.total || 0;

  const isLoading = customersLoading || farmersLoading || ledgerLoading;

  // Combine customers and farmers
  const manualCustomers: Customer[] = customersData?.data || [];
  const ledgerParties: any[] = ledgerPartiesData?.data || [];
  const connectedFarmers = connectedFarmersData?.data || [];

  // Create a map of existing customers by ID
  const customerMap = new Map<string, Customer>();
  manualCustomers.forEach((c) => customerMap.set(c.id, c));

  // Add farmers from ledger parties who aren't already customers
  ledgerParties.forEach((party) => {
    if (party.partyType === "FARMER" && !customerMap.has(party.id)) {
      // Check if this farmer is connected
      const isConnected = connectedFarmers.some((f) => f.id === party.id);
      if (isConnected) {
        customerMap.set(party.id, {
          id: party.id,
          name: party.name,
          phone: party.contact || "",
          address: party.address,
          balance: party.balance || 0,
          source: "CONNECTED",
          farmerId: party.id,
          partyType: "FARMER",
          createdAt: new Date(),
        });
      }
    }
  });

  // Convert map to array and sort
  const allCustomers = Array.from(customerMap.values()).sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const queryClient = useQueryClient();

  // Create customer mutation
  const createMutation = useMutation({
    mutationFn: async (input: typeof formData) => {
      const { data } = await axiosInstance.post("/dealer/sales/customers", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dealer-customers"] });
      toast.success("Customer created successfully");
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create customer");
    },
  });

  // Delete customer mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await axiosInstance.delete(`/sales/customers/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dealer-customers"] });
      toast.success("Customer deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete customer");
    },
  });

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name,
        phone: customer.phone,
        address: customer.address || "",
        category: customer.category || "",
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: "",
        phone: "",
        address: "",
        category: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
    setFormData({
      name: "",
      phone: "",
      address: "",
      category: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast.error("Name and phone are required");
      return;
    }

    if (editingCustomer) {
      // Update customer (if endpoint exists)
      toast.info("Update functionality coming soon");
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    deleteMutation.mutate(id);
  };

  const customers = allCustomers;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage your customers and farmers
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/dealer/dashboard/payment-requests")}
            className="flex-1 sm:flex-none hover:bg-green-50 hover:text-green-700 border-green-200"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Payment Request</span>
            <span className="sm:hidden">Payments</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dealer/dashboard/customers/verification")}
            className="flex-1 sm:flex-none relative hover:bg-green-50 hover:text-green-700 border-green-200"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Verification</span>
            <span className="sm:hidden">Verify</span>
            {pendingVerificationCount > 0 && (
              <Badge className="ml-2 bg-yellow-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                {pendingVerificationCount}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenDialog()}
            className="flex-1 sm:flex-none hover:bg-green-50 hover:text-green-700 border-green-200"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Add Customer</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table - Unified DataTable */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base md:text-lg">Customers</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {customers.length} {customers.length === 1 ? "customer" : "customers"} registered
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddPaymentOpen(true)}
              className="w-full sm:w-auto hover:bg-green-50 hover:text-green-700 border-green-200"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Add Payment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={customers}
            loading={isLoading}
            emptyMessage="No customers found. Add your first customer to get started."
            columns={[
              {
                key: 'name',
                label: 'Name',
                width: '160px',
                render: (val, row) => (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{val}</span>
                    {(row.source === "CONNECTED" || row.partyType === "FARMER") && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-[10px] px-1"
                      >
                        <Link2 className="h-2.5 w-2.5 mr-0.5" />
                        <span className="hidden sm:inline">Connected</span>
                      </Badge>
                    )}
                  </div>
                )
              },
              {
                key: 'phone',
                label: 'Phone',
                width: '120px',
                render: (val) => (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{val}</span>
                  </div>
                )
              },
              {
                key: 'address',
                label: 'Address',
                width: '150px',
                render: (val) => val ? (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="truncate max-w-[120px]">{val}</span>
                  </div>
                ) : '-'
              },
              {
                key: 'category',
                label: 'Category',
                width: '100px',
                render: (val) => val ? (
                  <span className="px-2 py-0.5 bg-muted rounded-md text-xs">{val}</span>
                ) : '-'
              },
              {
                key: 'balance',
                label: 'Balance',
                align: 'right',
                width: '130px',
                render: (val) => (
                  <span className={
                    val > 0 ? "text-red-600 font-semibold" :
                      val < 0 ? "text-green-600 font-semibold" : ""
                  }>
                    {val > 0
                      ? `रू ${Math.abs(val).toFixed(2)} (Due)`
                      : val < 0
                        ? `रू ${Math.abs(val).toFixed(2)} (Adv)`
                        : "रू 0.00"}
                  </span>
                )
              },
              {
                key: 'actions',
                label: 'Actions',
                align: 'right',
                width: '140px',
                render: (_, row) => (
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs px-2"
                      onClick={() => router.push(`/dealer/dashboard/customers/${row.id}/account`)}
                    >
                      <span className="hidden sm:inline">View</span>
                      <span className="sm:hidden">Acct</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleOpenDialog(row)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleDelete(row.id, row.name)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
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
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer
                  ? "Update customer information"
                  : "Add a new customer to your list"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter customer name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Enter phone number"
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

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  placeholder="e.g., Farmer, Retailer (optional)"
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
                disabled={createMutation.isPending}
              >
                {createMutation.isPending
                  ? "Saving..."
                  : editingCustomer
                    ? "Update Customer"
                    : "Add Customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DealerAddPaymentDialog
        open={isAddPaymentOpen}
        onOpenChange={setIsAddPaymentOpen}
        mode="select"
        customers={customers.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          balance: c.balance,
        }))}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["dealer-customers"] });
          queryClient.invalidateQueries({ queryKey: ["dealer-ledger-parties"] });
        }}
      />
    </div>
  );
}
