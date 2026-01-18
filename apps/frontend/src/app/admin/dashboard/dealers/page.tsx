"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Building2,
  Eye,
  Users,
  Package,
  ShoppingCart,
  FileText,
  Store,
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
import { Label } from "@/common/components/ui/label";
import { Badge } from "@/common/components/ui/badge";
import { toast } from "sonner";
import {
  useGetAdminDealers,
  useCreateAdminDealer,
  useUpdateAdminDealer,
  useDeleteAdminDealer,
  useGetAdminDealerById,
  type CreateDealerInput,
  type UpdateDealerInput,
  type AdminDealer,
} from "@/fetchers/admin/dealerQueries";
import { AdminCompanySearchSelect } from "@/common/components/forms/AdminCompanySearchSelect";

export default function AdminDealerPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<AdminDealer | null>(
    null
  );

  // Form state
  const [formData, setFormData] = useState<
    CreateDealerInput | (UpdateDealerInput & { id?: string })
  >({
    ownerName: "",
    ownerPassword: "",
    dealerName: "",
    dealerContact: "",
    dealerAddress: "",
    companyId: null,
    ownerStatus: "ACTIVE",
  });

  // Queries
  const { data: dealersData, isLoading } = useGetAdminDealers({
    page,
    limit: 10,
    search: search || undefined,
    status:
      (statusFilter as "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION") ||
      undefined,
  });

  const { data: dealerDetails } = useGetAdminDealerById(
    editingDealer?.id || ""
  );


  const createMutation = useCreateAdminDealer();
  const updateMutation = useUpdateAdminDealer();
  const deleteMutation = useDeleteAdminDealer();

  const handleOpenDialog = (dealer?: AdminDealer) => {
    if (dealer) {
      setEditingDealer(dealer);
      // Extract local 10 digits from dealer contact (remove +977 prefix if present)
      // Use dealer contact for both owner phone and dealer contact
      const dealerContactValue = dealer.contact || dealer.owner.phone || "";
      const displayPhone = dealerContactValue.startsWith("+977")
        ? dealerContactValue.slice(4)
        : dealerContactValue.replace(/\D/g, "").slice(-10);

      setFormData({
        id: dealer.id,
        ownerName: dealer.owner.name,
        dealerName: dealer.name,
        dealerContact: displayPhone,
        dealerAddress: dealer.address || "",
        // Use first company ID if available (for editing, admin can manually manage multiple via backend)
        companyId: dealer.companies && dealer.companies.length > 0 ? dealer.companies[0].id : null,
        ownerStatus: dealer.owner.status as
          | "ACTIVE"
          | "INACTIVE"
          | "PENDING_VERIFICATION",
        ownerPassword: "",
      });
    } else {
      setEditingDealer(null);
      setFormData({
        ownerName: "",
        ownerPassword: "",
        dealerName: "",
        dealerContact: "",
        dealerAddress: "",
        companyId: null,
        ownerStatus: "ACTIVE",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingDealer(null);
  };

  const handleViewDealer = (dealer: AdminDealer) => {
    setEditingDealer(dealer);
    setIsViewDialogOpen(true);
  };

  const handleCloseViewDialog = () => {
    setIsViewDialogOpen(false);
    setEditingDealer(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "dealerContact") {
      // Only allow digits, max 10 characters
      const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
      setFormData((prev) => ({ ...prev, [name]: digitsOnly }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Client-side validation for phone number (used for both owner and dealer)
      const phoneDigits = (formData.dealerContact || "").replace(/\D/g, "");
      if (phoneDigits.length !== 10) {
        toast.error("Phone number must be exactly 10 digits.");
        return;
      }
      const prefixedPhone = `+977${phoneDigits}`;

      if (editingDealer) {
        const updateData: UpdateDealerInput = {
          ownerName: formData.ownerName,
          ownerPhone: prefixedPhone, // Use same phone for owner
          dealerName: formData.dealerName,
          dealerContact: prefixedPhone, // Use same phone for dealer contact
          dealerAddress: formData.dealerAddress,
          companyId: formData.companyId || null,
          ownerStatus: formData.ownerStatus,
        };

        // Only include password if it's provided
        if (formData.ownerPassword && formData.ownerPassword.length > 0) {
          updateData.ownerPassword = formData.ownerPassword;
        }

        await updateMutation.mutateAsync({
          id: editingDealer.id,
          ...updateData,
        });
        toast.success("Dealer updated successfully");
      } else {
        if (!formData.ownerPassword || formData.ownerPassword.length < 6) {
          toast.error("Password must be at least 6 characters long.");
          return;
        }

        const createData: CreateDealerInput = {
          ownerName: formData.ownerName!,
          ownerPhone: prefixedPhone, // Use same phone for owner
          ownerPassword: formData.ownerPassword!,
          dealerName: formData.dealerName!,
          dealerContact: prefixedPhone, // Use same phone for dealer contact
          dealerAddress: formData.dealerAddress,
          companyId: formData.companyId || null,
          ownerStatus: formData.ownerStatus,
        };

        await createMutation.mutateAsync(createData);
        toast.success("Dealer created successfully");
      }
      handleCloseDialog();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "An error occurred"
      );
    }
  };

  const handleDelete = async (dealer: AdminDealer) => {
    if (
      !confirm(
        `Are you sure you want to delete "${dealer.name}"? This will also delete the owner account.`
      )
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(dealer.id);
      toast.success("Dealer deleted successfully");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete dealer"
      );
    }
  };

  const dealers = dealersData?.data || [];
  const pagination = dealersData?.pagination;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-800 hover:bg-green-100",
      INACTIVE: "bg-gray-100 text-gray-800 hover:bg-gray-100",
      PENDING_VERIFICATION: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
    };

    return (
      <Badge className={variants[status] || "bg-gray-100 text-gray-800"}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dealer Management</h1>
          <p className="text-muted-foreground">
            Create and manage dealer accounts
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add Dealer
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dealers</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                dealers.filter((d) => d.owner.status === "ACTIVE").length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dealers.reduce((sum, d) => sum + d._count.products, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dealers.reduce((sum, d) => sum + d._count.sales, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search dealers by name, owner name, phone, or contact..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={statusFilter || "ALL"}
              onValueChange={(value) => {
                setStatusFilter(value === "ALL" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="PENDING_VERIFICATION">
                  Pending Verification
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Dealers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dealers</CardTitle>
          <CardDescription>
            {pagination?.total || 0} total dealers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading dealers...</div>
          ) : dealers.length === 0 ? (
            <div className="text-center py-8">
              <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealer Name</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Owner Phone</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dealers.map((dealer) => (
                    <TableRow key={dealer.id}>
                      <TableCell className="font-medium">
                        {dealer.name}
                        {dealer.address && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {dealer.address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{dealer.owner.name}</TableCell>
                      <TableCell>{dealer.owner.phone}</TableCell>
                      <TableCell>{dealer.contact}</TableCell>
                      <TableCell>
                        {dealer.companies && dealer.companies.length > 0 ? (
                          dealer.companies.length === 1 ? (
                            <span className="text-sm">{dealer.companies[0].name}</span>
                          ) : (
                            <span className="text-sm">
                              {dealer.companies[0].name}
                              <span className="text-muted-foreground ml-1">
                                +{dealer.companies.length - 1} more
                              </span>
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(dealer.owner.status)}</TableCell>
                      <TableCell>{dealer._count.products}</TableCell>
                      <TableCell>{dealer._count.sales}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDealer(dealer)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(dealer)}
                            title="Edit Dealer"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(dealer)}
                            title="Delete Dealer"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingDealer ? "Edit Dealer" : "Add New Dealer"}
              </DialogTitle>
              <DialogDescription>
                {editingDealer
                  ? "Update dealer details and information"
                  : "Create a new dealer account"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Owner Name *</Label>
                  <Input
                    id="ownerName"
                    name="ownerName"
                    value={formData.ownerName || ""}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dealerContact">Phone Number *</Label>
                  <div className="flex items-stretch gap-0">
                    <div className="flex items-center gap-2 rounded-l-md border border-r-0 bg-muted px-3 text-foreground">
                      <span aria-hidden>🇳🇵</span>
                      <span className="text-sm font-medium">+977</span>
                    </div>
                    <Input
                      id="dealerContact"
                      name="dealerContact"
                      value={formData.dealerContact || ""}
                      onChange={handleInputChange}
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      placeholder="98XXXXXXXX"
                      className="rounded-l-none"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This number will be used for both owner and dealer contact.
                  </p>
                </div>
              </div>

              {!editingDealer && (
                <div className="space-y-2">
                  <Label htmlFor="ownerPassword">Owner Password *</Label>
                  <Input
                    id="ownerPassword"
                    name="ownerPassword"
                    type="password"
                    value={formData.ownerPassword || ""}
                    onChange={handleInputChange}
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Password must be at least 6 characters long.
                  </p>
                </div>
              )}

              {editingDealer && (
                <div className="space-y-2">
                  <Label htmlFor="ownerPassword">Owner Password (Optional)</Label>
                  <Input
                    id="ownerPassword"
                    name="ownerPassword"
                    type="password"
                    value={formData.ownerPassword || ""}
                    onChange={handleInputChange}
                    placeholder="Leave blank to keep current password"
                  />
                  <p className="text-xs text-muted-foreground">
                    Only enter if you want to change the password.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="dealerName">Dealer Name *</Label>
                <Input
                  id="dealerName"
                  name="dealerName"
                  value={formData.dealerName || ""}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dealerAddress">Dealer Address</Label>
                <Input
                  id="dealerAddress"
                  name="dealerAddress"
                  value={formData.dealerAddress || ""}
                  onChange={handleInputChange}
                  placeholder="Optional address"
                />
              </div>

              <div className="space-y-2">
                <AdminCompanySearchSelect
                  value={formData.companyId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, companyId: value })
                  }
                  placeholder="Search and select company (optional)..."
                  label="Company (Optional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ownerStatus">Owner Status *</Label>
                  <Select
                    value={formData.ownerStatus || "ACTIVE"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        ownerStatus: value as
                          | "ACTIVE"
                          | "INACTIVE"
                          | "PENDING_VERIFICATION",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="PENDING_VERIFICATION">
                        Pending Verification
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                  : "Create Dealer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>Dealer Details</DialogTitle>
            <DialogDescription>View detailed information about this dealer</DialogDescription>
          </DialogHeader>

          {dealerDetails?.data && (
            <div className="space-y-6 py-4">
              <div className="grid gap-4">
                <div>
                  <h3 className="font-semibold mb-3">Dealer Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dealer Name:</span>
                      <span className="font-medium">{dealerDetails.data.name}</span>
                    </div>
                    {dealerDetails.data.address && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Address:</span>
                        <span className="font-medium">{dealerDetails.data.address}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contact:</span>
                      <span className="font-medium">{dealerDetails.data.contact}</span>
                    </div>
                    {dealerDetails.data.companies && dealerDetails.data.companies.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Companies:</span>
                        <div className="text-right">
                          {dealerDetails.data.companies.map((company: any) => (
                            <span key={company.id} className="font-medium block">
                              {company.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Owner Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Owner Name:</span>
                      <span className="font-medium">{dealerDetails.data.owner.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{dealerDetails.data.owner.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge(dealerDetails.data.owner.status)}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Products</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {dealerDetails.data._count.products}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Sales</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {dealerDetails.data._count.sales}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Consignments From</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {dealerDetails.data._count.consignmentsFrom}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Consignments To</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {dealerDetails.data._count.consignmentsTo}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Ledger Entries</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {dealerDetails.data._count.ledgerEntries}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Payment Requests</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {dealerDetails.data._count.paymentRequests}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseViewDialog}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
