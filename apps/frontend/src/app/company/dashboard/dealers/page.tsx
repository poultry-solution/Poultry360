"use client";

import { useState } from "react";
import { Plus, Search, Users, Edit, Trash2, Phone, MapPin } from "lucide-react";
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
import { toast } from "sonner";
import axiosInstance from "@/common/lib/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Dealer {
  id: string;
  name: string;
  contact: string;
  address: string;
  balance: number;
  createdAt: Date;
}

export default function CompanyDealersPage() {
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    address: "",
  });

  // Get dealers
  const { data: dealersData, isLoading } = useQuery({
    queryKey: ["company-dealers", search],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/dealers", {
        params: search ? { search } : {},
      });
      return data;
    },
  });

  const queryClient = useQueryClient();

  // Create dealer mutation
  const createMutation = useMutation({
    mutationFn: async (input: typeof formData) => {
      const { data } = await axiosInstance.post("/dealers", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-dealers"] });
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
      queryClient.invalidateQueries({ queryKey: ["company-dealers"] });
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
      queryClient.invalidateQueries({ queryKey: ["company-dealers"] });
      toast.success("Dealer deleted successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete dealer");
    },
  });

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
      updateMutation.mutate({ ...formData, id: editingDealer.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    deleteMutation.mutate(id);
  };

  const dealers: Dealer[] = dealersData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dealer Management</h1>
          <p className="text-muted-foreground">
            Manage dealers you supply products to
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add Dealer
        </Button>
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
          <CardTitle>Dealers</CardTitle>
          <CardDescription>
            {dealers.length} {dealers.length === 1 ? "dealer" : "dealers"} registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading dealers...</div>
          ) : dealers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No dealers found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first dealer.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Dealer
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dealers.map((dealer) => (
                  <TableRow key={dealer.id}>
                    <TableCell className="font-medium">{dealer.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {dealer.contact}
                      </div>
                    </TableCell>
                    <TableCell>
                      {dealer.address ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="max-w-[200px] truncate">
                            {dealer.address}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          dealer.balance > 0
                            ? "text-green-600 font-semibold"
                            : dealer.balance < 0
                            ? "text-red-600 font-semibold"
                            : ""
                        }
                      >
                        {dealer.balance > 0
                          ? `रू ${Math.abs(dealer.balance).toFixed(2)} (Advance)`
                          : dealer.balance < 0
                          ? `रू ${Math.abs(dealer.balance).toFixed(2)} (Due)`
                          : "रू 0.00"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(dealer)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(dealer.id, dealer.name)}
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
    </div>
  );
}
