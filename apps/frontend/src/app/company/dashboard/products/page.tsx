"use client";

import { useState } from "react";
import { Plus, Search, Filter, Edit, Trash2, Package, PackagePlus, AlertTriangle } from "lucide-react";
import { ImageUpload } from "@/common/components/ui/image-upload";
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
import { DataTable, Column } from "@/common/components/ui/data-table";
import { Badge } from "@/common/components/ui/badge";
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
import {
  useGetCompanyProducts,
  useCreateCompanyProduct,
  useUpdateCompanyProduct,
  useDeleteCompanyProduct,
  useAdjustCompanyProductStock,
  type CreateCompanyProductInput,
} from "@/fetchers/company/companyProductQueries";

export default function CompanyProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isInventoryDialogOpen, setIsInventoryDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [inventoryQuantity, setInventoryQuantity] = useState<number>(0);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateCompanyProductInput>({
    name: "",
    description: "",
    type: "FEED",
    unit: "kg",
    unitSellingPrice: 0,
    unitCostPrice: 0,
    quantity: 0,
    imageUrl: "",
  });

  // Queries
  const { data: productsData, isLoading } = useGetCompanyProducts({
    page,
    limit: 10,
    search,
    type: typeFilter || undefined,
  });

  const createMutation = useCreateCompanyProduct();
  const updateMutation = useUpdateCompanyProduct();
  const deleteMutation = useDeleteCompanyProduct();
  const adjustStockMutation = useAdjustCompanyProductStock();

  const handleOpenDialog = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        type: product.type,
        unit: product.unit,
        unitSellingPrice: Number(product.unitSellingPrice),
        unitCostPrice: Number(product.unitCostPrice || 0),
        quantity: Number(product.quantity),
        imageUrl: product.imageUrl || "",
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        type: "FEED",
        unit: "kg",
        unitSellingPrice: 0,
        unitCostPrice: 0,
        quantity: 0,
        imageUrl: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingProduct) {
        await updateMutation.mutateAsync({
          id: editingProduct.id,
          ...formData,
        });
        toast.success("Product updated successfully");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Product created successfully");
      }
      handleCloseDialog();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "An error occurred");
    }
  };

  const handleOpenDeleteDialog = (id: string, name: string) => {
    setProductToDelete({ id, name });
    setIsDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;

    try {
      await deleteMutation.mutateAsync(productToDelete.id);
      toast.success("Product deleted successfully");
      handleCloseDeleteDialog();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete product");
    }
  };

  const handleOpenInventoryDialog = (product: any) => {
    setSelectedProduct(product);
    setInventoryQuantity(0);
    setIsInventoryDialogOpen(true);
  };

  const handleCloseInventoryDialog = () => {
    setIsInventoryDialogOpen(false);
    setSelectedProduct(null);
    setInventoryQuantity(0);
  };

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct || inventoryQuantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    try {
      await adjustStockMutation.mutateAsync({
        id: selectedProduct.id,
        quantity: inventoryQuantity,
      });
      toast.success(`Added ${inventoryQuantity} ${selectedProduct.unit} to inventory`);
      handleCloseInventoryDialog();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add inventory");
    }
  };

  const products = productsData?.data || [];
  const pagination = productsData?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Product Catalog</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage your products available for dealers
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-primary">
          <Plus className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Add Product</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter || "ALL"} onValueChange={(value) => setTypeFilter(value === "ALL" ? "" : value)}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="FEED">Feed</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-base md:text-lg">Products</CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {pagination?.total || 0} total products in catalog
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            data={products}
            loading={isLoading}
            emptyMessage="No products found. Add your first product to get started."
            columns={[
              {
                key: 'name',
                label: 'Name',
                width: '140px',
                render: (val) => <span className="font-medium">{val}</span>
              },
              {
                key: 'type',
                label: 'Type',
                width: '80px',
                render: (val) => (
                  <Badge variant="secondary" className="text-xs">{val}</Badge>
                )
              },
              {
                key: 'unit',
                label: 'Unit',
                width: '60px'
              },
              {
                key: 'unitCostPrice',
                label: 'Cost Price',
                align: 'right',
                width: '100px',
                render: (val) => `रू ${Number(val || 0).toFixed(2)}`
              },
              {
                key: 'unitSellingPrice',
                label: 'Selling Price',
                align: 'right',
                width: '100px',
                render: (val) => `रू ${Number(val).toFixed(2)}`
              },
              {
                key: 'quantity',
                label: 'Qty',
                align: 'right',
                width: '80px',
                render: (val) => Number(val).toFixed(2)
              },
              {
                key: 'totalPrice',
                label: 'Value',
                align: 'right',
                width: '100px',
                render: (val) => `रू ${Number(val).toFixed(2)}`
              },
              {
                key: 'actions',
                label: 'Actions',
                align: 'right',
                width: '110px',
                render: (_, row) => (
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleOpenInventoryDialog(row)}
                      title="Add Inventory"
                    >
                      <PackagePlus className="h-3.5 w-3.5 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleOpenDialog(row)}
                      title="Edit"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => handleOpenDeleteDialog(row.id, row.name)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>
                )
              }
            ] as Column[]}
          />

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 md:p-4 border-t">
              <span className="text-xs md:text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit} >
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? "Update product details in your catalog"
                  : "Add a new product to your catalog"}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 ">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Product Image</Label>
                <ImageUpload
                  value={formData.imageUrl}
                  onChange={(url) =>
                    setFormData({ ...formData, imageUrl: url })
                  }
                  folder="products"
                  placeholder="Click or drag image to upload"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FEED">Feed</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    placeholder="e.g., kg, pcs, liters"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitCostPrice">Unit Cost Price</Label>
                  <Input
                    id="unitCostPrice"
                    type="number"
                    step="0.01"
                    value={formData.unitCostPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unitCostPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitSellingPrice">Unit Selling Price *</Label>
                  <Input
                    id="unitSellingPrice"
                    type="number"
                    step="0.01"
                    value={formData.unitSellingPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unitSellingPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>
              </div>

              {(formData.unitSellingPrice > 0 || formData.unitCostPrice > 0) && formData.quantity > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm font-medium">Total Cost Value</div>
                    <div className="text-2xl font-bold">
                      रू {(formData.unitCostPrice * formData.quantity).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 text-blue-900 rounded-lg">
                    <div className="text-sm font-medium">Total Selling Value</div>
                    <div className="text-2xl font-bold">
                      रू {(formData.unitSellingPrice * formData.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
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
                  : editingProduct
                    ? "Update Product"
                    : "Add Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Inventory Dialog */}
      <Dialog open={isInventoryDialogOpen} onOpenChange={setIsInventoryDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleAddInventory}>
            <DialogHeader>
              <DialogTitle>Add Inventory</DialogTitle>
              <DialogDescription>
                Add more inventory to "{selectedProduct?.name}"
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="currentQuantity">Current Quantity</Label>
                <Input
                  id="currentQuantity"
                  value={
                    selectedProduct
                      ? `${Number(selectedProduct.quantity).toFixed(2)} ${selectedProduct.unit}`
                      : ""
                  }
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventoryQuantity">
                  Quantity to Add ({selectedProduct?.unit}) *
                </Label>
                <Input
                  id="inventoryQuantity"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={inventoryQuantity || ""}
                  onChange={(e) =>
                    setInventoryQuantity(parseFloat(e.target.value) || 0)
                  }
                  placeholder="Enter quantity"
                  required
                  autoFocus
                />
              </div>

              {selectedProduct && inventoryQuantity > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm font-medium mb-1">New Total Quantity</div>
                  <div className="text-2xl font-bold">
                    {(Number(selectedProduct.quantity) + inventoryQuantity).toFixed(2)}{" "}
                    {selectedProduct.unit}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    New Total Value: रू{" "}
                    {(
                      (Number(selectedProduct.quantity) + inventoryQuantity) *
                      Number(selectedProduct.unitSellingPrice)
                    ).toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseInventoryDialog}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={adjustStockMutation.isPending || inventoryQuantity <= 0}
              >
                {adjustStockMutation.isPending ? "Adding..." : "Add Inventory"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Product
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                "{productToDelete?.name}"
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
            <p className="text-sm text-red-800">
              Deleting this product will remove it from your catalog permanently.
              Any existing sales records will be preserved but the product will no longer be available.
            </p>
          </div>

          <DialogFooter className="gap-3 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseDeleteDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-red-600 mx-2 hover:bg-red-700 text-white"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
