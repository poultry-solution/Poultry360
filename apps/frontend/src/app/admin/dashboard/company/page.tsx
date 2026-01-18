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
  useGetAdminCompanies,
  useCreateAdminCompany,
  useUpdateAdminCompany,
  useDeleteAdminCompany,
  useGetAdminCompanyById,
  type CreateCompanyInput,
  type UpdateCompanyInput,
  type AdminCompany,
} from "@/fetchers/admin/companyQueries";

export default function AdminCompanyPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<AdminCompany | null>(
    null
  );

  // Form state
  const [formData, setFormData] = useState<
    CreateCompanyInput | (UpdateCompanyInput & { id?: string })
  >({
    ownerName: "",
    ownerPhone: "",
    ownerPassword: "",
    companyName: "",
    companyAddress: "",
    ownerStatus: "ACTIVE",
  });

  // Queries
  const { data: companiesData, isLoading } = useGetAdminCompanies({
    page,
    limit: 10,
    search: search || undefined,
    status:
      (statusFilter as "ACTIVE" | "INACTIVE" | "PENDING_VERIFICATION") ||
      undefined,
  });

  const { data: companyDetails } = useGetAdminCompanyById(
    editingCompany?.id || ""
  );

  const createMutation = useCreateAdminCompany();
  const updateMutation = useUpdateAdminCompany();
  const deleteMutation = useDeleteAdminCompany();

  const handleOpenDialog = (company?: AdminCompany) => {
    if (company) {
      setEditingCompany(company);
      // Extract local 10 digits from phone (remove +977 prefix if present)
      const phoneValue = company.owner.phone || "";
      const displayPhone = phoneValue.startsWith("+977")
        ? phoneValue.slice(4)
        : phoneValue.replace(/\D/g, "").slice(-10);

      setFormData({
        id: company.id,
        ownerName: company.owner.name,
        ownerPhone: displayPhone,
        companyName: company.name,
        companyAddress: company.address || "",
        ownerStatus: company.owner.status as
          | "ACTIVE"
          | "INACTIVE"
          | "PENDING_VERIFICATION",
        ownerPassword: "",
      });
    } else {
      setEditingCompany(null);
      setFormData({
        ownerName: "",
        ownerPhone: "",
        ownerPassword: "",
        companyName: "",
        companyAddress: "",
        ownerStatus: "ACTIVE",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCompany(null);
  };

  const handleViewCompany = (company: AdminCompany) => {
    setEditingCompany(company);
    setIsViewDialogOpen(true);
  };

  const handleCloseViewDialog = () => {
    setIsViewDialogOpen(false);
    setEditingCompany(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCompany) {
        const updateData: UpdateCompanyInput = {
          ownerName: formData.ownerName,
          ownerPhone: formData.ownerPhone,
          companyName: formData.companyName,
          companyAddress: formData.companyAddress,
          ownerStatus: formData.ownerStatus,
        };

        // Only include password if it's provided
        if (formData.ownerPassword && formData.ownerPassword.length > 0) {
          updateData.ownerPassword = formData.ownerPassword;
        }

        // Normalize Nepal phone number: always prefix with +977 and require 10 digits
        const localDigits = (updateData.ownerPhone || "").replace(/\D/g, "");
        if (localDigits.length !== 10) {
          toast.error("Phone number must be exactly 10 digits");
          return;
        }
        updateData.ownerPhone = `+977${localDigits}`;

        await updateMutation.mutateAsync({
          id: editingCompany.id,
          ...updateData,
        });
        toast.success("Company updated successfully");
      } else {
        // Normalize Nepal phone number: always prefix with +977 and require 10 digits
        const localDigits = (formData.ownerPhone || "").replace(/\D/g, "");
        if (localDigits.length !== 10) {
          toast.error("Phone number must be exactly 10 digits");
          return;
        }
        const normalizedPhone = `+977${localDigits}`;

        const createData: CreateCompanyInput = {
          ownerName: formData.ownerName!,
          ownerPhone: normalizedPhone,
          ownerPassword: formData.ownerPassword!,
          companyName: formData.companyName!,
          companyAddress: formData.companyAddress,
          ownerStatus: formData.ownerStatus,
        };

        await createMutation.mutateAsync(createData);
        toast.success("Company created successfully");
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

  const handleDelete = async (company: AdminCompany) => {
    if (
      !confirm(
        `Are you sure you want to delete "${company.name}"? This will also delete the owner account.`
      )
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(company.id);
      toast.success("Company deleted successfully");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete company"
      );
    }
  };

  const companies = companiesData?.data || [];
  const pagination = companiesData?.pagination;

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
          <h1 className="text-3xl font-bold tracking-tight">Company Management</h1>
          <p className="text-muted-foreground">
            Create and manage company accounts
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-primary">
          <Plus className="mr-2 h-4 w-4" />
          Add Company
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
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
                companies.filter((c) => c.owner.status === "ACTIVE").length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Dealers</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.reduce((sum, c) => sum + c._count.dealerCompanies, 0)}
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
              {/* This would require additional query to get accurate count */}
              -
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
                  placeholder="Search companies by name, owner name, or phone..."
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

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Companies</CardTitle>
          <CardDescription>
            {pagination?.total || 0} total companies
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading companies...</div>
          ) : companies.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No companies found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first company.
              </p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Company
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dealers</TableHead>
                    <TableHead>Sales</TableHead>
                    <TableHead>Consignments</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-medium">
                        {company.name}
                        {company.address && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {company.address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{company.owner.name}</TableCell>
                      <TableCell>{company.owner.phone}</TableCell>
                      <TableCell>{getStatusBadge(company.owner.status)}</TableCell>
                      <TableCell>{company._count.dealerCompanies}</TableCell>
                      <TableCell>{company._count.companySales}</TableCell>
                      <TableCell>{company._count.consignments}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewCompany(company)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(company)}
                            title="Edit Company"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(company)}
                            title="Delete Company"
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
                {editingCompany ? "Edit Company" : "Add New Company"}
              </DialogTitle>
              <DialogDescription>
                {editingCompany
                  ? "Update company and owner information"
                  : "Create a new company account with owner user"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Owner Name *</Label>
                  <Input
                    id="ownerName"
                    value={formData.ownerName || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, ownerName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerPhone">Owner Phone *</Label>
                  <div className="flex items-stretch gap-0">
                    <div className="flex items-center gap-2 rounded-l-md border border-r-0 bg-muted px-3 text-foreground">
                      <span aria-hidden>🇳🇵</span>
                      <span className="text-sm font-medium">+977</span>
                    </div>
                    <Input
                      id="ownerPhone"
                      value={formData.ownerPhone || ""}
                      onChange={(e) => {
                        // Sanitize phone to digits only and cap at 10 when editing the phone field
                        const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setFormData({ ...formData, ownerPhone: digitsOnly });
                      }}
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      placeholder="98XXXXXXXX"
                      className="rounded-l-none"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter the 10-digit Nepal number (without country code).
                  </p>
                </div>
              </div>

              {!editingCompany && (
                <div className="space-y-2">
                  <Label htmlFor="ownerPassword">Owner Password *</Label>
                  <Input
                    id="ownerPassword"
                    type="password"
                    value={formData.ownerPassword || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, ownerPassword: e.target.value })
                    }
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                  />
                </div>
              )}

              {editingCompany && (
                <div className="space-y-2">
                  <Label htmlFor="ownerPassword">New Password (leave blank to keep current)</Label>
                  <Input
                    id="ownerPassword"
                    type="password"
                    value={formData.ownerPassword || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, ownerPassword: e.target.value })
                    }
                    minLength={6}
                    placeholder="Minimum 6 characters"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  value={formData.companyName || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyAddress">Company Address</Label>
                <Input
                  id="companyAddress"
                  value={formData.companyAddress || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, companyAddress: e.target.value })
                  }
                />
              </div>

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
                  : editingCompany
                  ? "Update Company"
                  : "Create Company"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background">
          <DialogHeader>
            <DialogTitle>Company Details</DialogTitle>
            <DialogDescription>
              View complete information about this company
            </DialogDescription>
          </DialogHeader>

          {companyDetails?.data && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Company Name</Label>
                <p className="font-medium">{companyDetails.data.name}</p>
              </div>

              {companyDetails.data.address && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Address</Label>
                  <p>{companyDetails.data.address}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-muted-foreground">Owner Information</Label>
                <div className="space-y-1">
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {companyDetails.data.owner.name}
                  </p>
                  <p>
                    <span className="font-medium">Phone:</span>{" "}
                    {companyDetails.data.owner.phone}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>{" "}
                    {getStatusBadge(companyDetails.data.owner.status)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-muted-foreground">Total Sales</Label>
                  </div>
                  <p className="text-2xl font-bold">
                    {companyDetails.data._count.companySales}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-muted-foreground">Dealers</Label>
                  </div>
                  <p className="text-2xl font-bold">
                    {companyDetails.data._count.dealerCompanies}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-muted-foreground">Consignments</Label>
                  </div>
                  <p className="text-2xl font-bold">
                    {companyDetails.data._count.consignments}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-muted-foreground">Ledger Entries</Label>
                  </div>
                  <p className="text-2xl font-bold">
                    {companyDetails.data._count.ledgerEntries}
                  </p>
                </div>
              </div>

              {companyDetails.data.managedBy &&
                companyDetails.data.managedBy.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    <Label className="text-muted-foreground">Managers</Label>
                    <div className="space-y-2">
                      {companyDetails.data.managedBy.map((manager) => (
                        <div
                          key={manager.id}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div>
                            <p className="font-medium">{manager.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {manager.phone}
                            </p>
                          </div>
                          {getStatusBadge(manager.status)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div className="space-y-2 pt-4 border-t">
                <Label className="text-muted-foreground">Created At</Label>
                <p>{new Date(companyDetails.data.createdAt).toLocaleString()}</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseViewDialog}
            >
              Close
            </Button>
            {editingCompany && (
              <Button
                onClick={() => {
                  handleCloseViewDialog();
                  handleOpenDialog(editingCompany);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Company
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
