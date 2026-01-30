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
import { Label } from "@/common/components/ui/label";
import { Badge } from "@/common/components/ui/badge";
import { toast } from "sonner";
import axiosInstance from "@/common/lib/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useGetDealerFarmerRequests, useGetConnectedFarmers } from "@/fetchers/dealer/dealerFarmerQueries";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Management</h1>
          <p className="text-muted-foreground">
            Manage your customers and farmers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/dealer/dashboard/payment-requests")}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Customer Payment Request
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/dealer/dashboard/customers/verification")}
            className="relative"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Verification Requests
            {pendingVerificationCount > 0 && (
              <Badge className="ml-2 bg-yellow-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                {pendingVerificationCount}
              </Badge>
            )}
          </Button>
          <Button onClick={() => handleOpenDialog()} className="bg-primary">
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customers by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
          <CardDescription>
            {customers.length} {customers.length === 1 ? "customer" : "customers"} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading customers...</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No customers found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first customer.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {customer.name}
                        {(customer.source === "CONNECTED" || customer.partyType === "FARMER") && (
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs"
                          >
                            <Link2 className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {customer.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.address ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="max-w-[200px] truncate">
                            {customer.address}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {customer.category ? (
                        <span className="px-2 py-1 bg-muted rounded-md text-sm">
                          {customer.category}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          customer.balance > 0
                            ? "text-red-600 font-semibold"
                            : customer.balance < 0
                            ? "text-green-600 font-semibold"
                            : ""
                        }
                      >
                        {customer.balance > 0
                          ? `रू ${Math.abs(customer.balance).toFixed(2)} (Due)`
                          : customer.balance < 0
                          ? `रू ${Math.abs(customer.balance).toFixed(2)} (Advance)`
                          : "रू 0.00"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dealer/dashboard/customers/${customer.id}/account`)}
                        >
                          View Account
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(customer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(customer.id, customer.name)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
    </div>
  );
}
