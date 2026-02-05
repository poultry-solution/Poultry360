"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Users, Edit, Trash2, Archive, ArchiveRestore, Phone, MapPin, CheckCircle2 } from "lucide-react";
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
import { toast } from "sonner";
import axiosInstance from "@/common/lib/axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useArchiveCompanyDealer,
  useUnarchiveCompanyDealer,
  useGetArchivedCompanyDealers,
} from "@/fetchers/company/companyDealerQueries";
import { useGetCompanyVerificationRequests } from "@/fetchers/company/companyVerificationQueries";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs";
import { Badge } from "@/common/components/ui/badge";

interface Dealer {
  id: string;
  name: string;
  contact: string;
  address: string;
  balance: number;
  createdAt: Date;
  connectionType?: "CONNECTED" | "MANUAL";
  connectionId?: string;
  isOwnedDealer?: boolean;
}

export default function CompanyDealersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null);

  // Confirmation Dialog State
  const [confirmationAction, setConfirmationAction] = useState<{
    type: "DELETE" | "ARCHIVE" | "UNARCHIVE";
    id: string;
    name: string;
  } | null>(null);

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

  // Archive dealer connection mutation
  const archiveMutation = useArchiveCompanyDealer();

  // Unarchive dealer connection mutation
  const unarchiveMutation = useUnarchiveCompanyDealer();

  // Get archived dealers
  const { data: archivedDealersData, isLoading: archivedLoading } = useGetArchivedCompanyDealers();

  // Get pending verification requests count
  const { data: verificationData } = useGetCompanyVerificationRequests({ status: "PENDING", limit: 1 });
  const pendingVerificationCount = verificationData?.pagination?.total || 0;

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

  const handleDelete = (id: string, name: string) => {
    setConfirmationAction({ type: "DELETE", id, name });
  };

  const handleArchive = (connectionId: string, name: string) => {
    setConfirmationAction({ type: "ARCHIVE", id: connectionId, name });
  };

  const handleUnarchive = (connectionId: string, name: string) => {
    setConfirmationAction({ type: "UNARCHIVE", id: connectionId, name });
  };

  const executeConfirmationAction = async () => {
    if (!confirmationAction) return;

    try {
      if (confirmationAction.type === "DELETE") {
        deleteMutation.mutate(confirmationAction.id);
      } else if (confirmationAction.type === "ARCHIVE") {
        await archiveMutation.mutateAsync(confirmationAction.id);
        toast.success("Dealer connection archived successfully");
      } else if (confirmationAction.type === "UNARCHIVE") {
        await unarchiveMutation.mutateAsync(confirmationAction.id);
        toast.success("Dealer connection unarchived successfully");
      }
    } catch (error: any) {
      const action = confirmationAction.type.toLowerCase();
      toast.error(error.response?.data?.message || `Failed to ${action} dealer connection`);
    } finally {
      setConfirmationAction(null);
    }
  };

  const dealers: Dealer[] = dealersData?.data || [];
  const archivedDealers: Dealer[] = archivedDealersData?.data || [];

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
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/company/dashboard/verification")}
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

      {/* Dealers Table with Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Dealers</CardTitle>
          <CardDescription>
            Manage your active and archived dealer connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">
                Active ({dealers.length})
              </TabsTrigger>
              <TabsTrigger value="archived">
                Archived ({archivedDealers.length})
              </TabsTrigger>
            </TabsList>

            {/* Active Dealers Tab */}
            <TabsContent value="active" className="mt-4">
              <DataTable
                data={dealers}
                loading={isLoading}
                emptyMessage="No dealers found. Add your first dealer."
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
                    width: '180px',
                    render: (_, dealer) => (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/company/dashboard/dealers/${dealer.id}/account`)}
                        >
                          View Account
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(dealer)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {dealer.connectionType === "CONNECTED" && dealer.connectionId ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(dealer.connectionId!, dealer.name)}
                            disabled={archiveMutation.isPending}
                          >
                            <Archive className="h-4 w-4 text-orange-600" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(dealer.id, dealer.name)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    )
                  }
                ] as Column[]}
              />
            </TabsContent>

            {/* Archived Dealers Tab */}
            <TabsContent value="archived" className="mt-4">
              <DataTable
                data={archivedDealers}
                loading={archivedLoading}
                emptyMessage="No archived dealers. Archived connections will appear here."
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
                          onClick={() => router.push(`/company/dashboard/dealers/${dealer.id}/account`)}
                        >
                          View Account
                        </Button>
                        {dealer.connectionId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnarchive(dealer.connectionId!, dealer.name)}
                            disabled={unarchiveMutation.isPending}
                          >
                            <ArchiveRestore className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    )
                  }
                ] as Column[]}
              />
            </TabsContent>
          </Tabs>
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
              {confirmationAction?.type === "ARCHIVE" && "Archive Connection"}
              {confirmationAction?.type === "UNARCHIVE" && "Unarchive Connection"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationAction?.type === "DELETE" && `Are you sure you want to delete "${confirmationAction.name}"? This action cannot be undone.`}
              {confirmationAction?.type === "ARCHIVE" && `Are you sure you want to archive the connection with "${confirmationAction.name}"?`}
              {confirmationAction?.type === "UNARCHIVE" && `Are you sure you want to unarchive the connection with "${confirmationAction.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeConfirmationAction}
              className={confirmationAction?.type === "DELETE" ? "bg-red-600 hover:bg-red-700 focus:ring-red-600" : ""}
            >
              {confirmationAction?.type === "DELETE" && "Delete"}
              {confirmationAction?.type === "ARCHIVE" && "Archive"}
              {confirmationAction?.type === "UNARCHIVE" && "Unarchive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
