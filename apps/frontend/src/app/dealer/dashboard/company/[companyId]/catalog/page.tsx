"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShoppingCart,
  Search,
  Filter,
  Plus,
  Minus,
  Trash2,
  Package,
  ArrowLeft,
  CheckCircle,
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
import { Badge } from "@/common/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
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
import { toast } from "sonner";
import { useGetCompanyProducts } from "@/fetchers/dealer/dealerCompanyQueries";
import {
  useGetDealerCart,
  useAddToCart,
  useUpdateCartItem,
  useRemoveCartItem,
  useClearCart,
  useCheckoutCart,
} from "@/fetchers/dealer/dealerCartQueries";

export default function CompanyCatalogPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.companyId as string;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [addingToCart, setAddingToCart] = useState<{ [key: string]: number }>({});

  // Queries
  const { data: productsData, isLoading: productsLoading } = useGetCompanyProducts(
    companyId,
    {
      page,
      limit: 12,
      search,
      type: typeFilter || undefined,
    }
  );

  const { data: cart, isLoading: cartLoading } = useGetDealerCart(companyId);

  // Mutations
  const addToCartMutation = useAddToCart();
  const updateCartItemMutation = useUpdateCartItem();
  const removeCartItemMutation = useRemoveCartItem();
  const clearCartMutation = useClearCart();
  const checkoutMutation = useCheckoutCart();

  const products = productsData?.data || [];
  const company = productsData?.company;
  const pagination = productsData?.pagination;

  const handleAddToCart = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }

    try {
      await addToCartMutation.mutateAsync({
        companyId,
        productId,
        quantity,
      });
      toast.success("Product added to cart");
      // Reset quantity selector
      setAddingToCart((prev) => ({ ...prev, [productId]: 0 }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add to cart");
    }
  };

  const handleUpdateCartItem = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      return;
    }

    try {
      await updateCartItemMutation.mutateAsync({
        itemId,
        quantity: newQuantity,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update cart");
    }
  };

  const handleRemoveCartItem = async (itemId: string) => {
    try {
      await removeCartItemMutation.mutateAsync(itemId);
      toast.success("Item removed from cart");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to remove item");
    }
  };

  const handleClearCart = () => {
    setIsClearCartDialogOpen(true);
  };

  const confirmClearCart = async () => {
    try {
      await clearCartMutation.mutateAsync(companyId);
      toast.success("Cart cleared");
      setIsClearCartDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to clear cart");
    }
  };

  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    try {
      await checkoutMutation.mutateAsync({
        companyId,
        notes: checkoutNotes,
      });
      toast.success("Order placed successfully!");
      setIsCheckoutDialogOpen(false);
      setCheckoutNotes("");
      router.push("/dealer/dashboard/consignments");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to checkout");
    }
  };

  const getProductTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      FEED: "bg-green-100 text-green-800",
      CHICKS: "bg-yellow-100 text-yellow-800",
      MEDICINE: "bg-blue-100 text-blue-800",
      EQUIPMENT: "bg-purple-100 text-purple-800",
      OTHER: "bg-gray-100 text-gray-800",
    };
    return colors[type] || colors.OTHER;
  };

  const getCartItemQuantity = (productId: string) => {
    const item = cart?.items.find((item) => item.productId === productId);
    return item ? Number(item.quantity) : 0;
  };

  const getCartItemId = (productId: string) => {
    const item = cart?.items.find((item) => item.productId === productId);
    return item?.id;
  };

  if (productsLoading || cartLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">Loading catalog...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dealer/dashboard/company")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Companies
            </Button>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {company?.name || "Company"} - Product Catalog
          </h1>
          <p className="text-muted-foreground">
            {company?.address || "Browse and order products"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
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
            <Select
              value={typeFilter || "ALL"}
              onValueChange={(value) => setTypeFilter(value === "ALL" ? "" : value)}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="FEED">Feed</SelectItem>
                <SelectItem value="CHICKS">Chicks</SelectItem>
                <SelectItem value="MEDICINE">Medicine</SelectItem>
                <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Products Grid */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Products</CardTitle>
              <CardDescription>
                {pagination?.total || 0} product(s) available
              </CardDescription>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No products found</h3>
                  <p className="text-muted-foreground">
                    {search || typeFilter
                      ? "Try adjusting your search or filters."
                      : "This company has no products available at the moment."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {products.map((product) => {
                      const inCartQty = getCartItemQuantity(product.id);
                      const addQty = addingToCart[product.id] || 1;

                      return (
                        <Card key={product.id} className="overflow-hidden flex flex-col">
                          <div className="aspect-video bg-muted relative overflow-hidden">
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    "https://via.placeholder.com/400x300?text=No+Image";
                                }}
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Package className="h-16 w-16 text-muted-foreground" />
                              </div>
                            )}
                            <Badge
                              className={`absolute top-2 right-2 z-10 ${getProductTypeColor(
                                product.type
                              )}`}
                            >
                              {product.type}
                            </Badge>
                          </div>
                          <CardHeader>
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                            {product.description && (
                              <CardDescription className="line-clamp-2">
                                {product.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">
                                  Price per {product.unit}
                                </span>
                                <span className="text-lg font-bold">
                                  रू {Number(product.unitSellingPrice).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">
                                  Available Stock
                                </span>
                                <span className="font-medium">
                                  {Number(product.currentStock).toFixed(2)} {product.unit}
                                </span>
                              </div>

                              {inCartQty > 0 && (
                                <div className="p-2 bg-green-50 rounded border border-green-200">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-green-800 font-medium">
                                      In cart: {inCartQty} {product.unit}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <div className="flex items-center border rounded-md">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 px-2"
                                    onClick={() =>
                                      setAddingToCart((prev) => ({
                                        ...prev,
                                        [product.id]: Math.max(1, addQty - 1),
                                      }))
                                    }
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={addQty}
                                    onChange={(e) =>
                                      setAddingToCart((prev) => ({
                                        ...prev,
                                        [product.id]: Math.max(
                                          1,
                                          parseInt(e.target.value) || 1
                                        ),
                                      }))
                                    }
                                    className="w-16 h-9 border-0 text-center"
                                    min="1"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-9 px-2"
                                    onClick={() =>
                                      setAddingToCart((prev) => ({
                                        ...prev,
                                        [product.id]: addQty + 1,
                                      }))
                                    }
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                                <Button
                                  className="flex-1"
                                  onClick={() => handleAddToCart(product.id, addQty)}
                                  disabled={addToCartMutation.isPending}
                                >
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  Add to Cart
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6">
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
        </div>

        {/* Cart Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Shopping Cart
              </CardTitle>
              <CardDescription>
                {cart?.items.length || 0} item(s) in cart
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!cart || cart.items.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {cart.items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 border rounded-lg space-y-2"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              रू {Number(item.unitPrice).toFixed(2)} / {item.product.unit}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveCartItem(item.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center border rounded">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() =>
                                handleUpdateCartItem(
                                  item.id,
                                  Number(item.quantity) - 1
                                )
                              }
                              disabled={Number(item.quantity) <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="px-3 text-sm">
                              {Number(item.quantity)}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() =>
                                handleUpdateCartItem(
                                  item.id,
                                  Number(item.quantity) + 1
                                )
                              }
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-sm font-medium ml-auto">
                            रू{" "}
                            {(
                              Number(item.quantity) * Number(item.unitPrice)
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold">Total</span>
                      <span className="text-2xl font-bold">
                        रू {cart.total.toFixed(2)}
                      </span>
                    </div>

                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => setIsCheckoutDialogOpen(true)}
                      disabled={checkoutMutation.isPending}
                    >
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Checkout
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleClearCart}
                      disabled={clearCartMutation.isPending}
                    >
                      Clear Cart
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutDialogOpen} onOpenChange={setIsCheckoutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Order</DialogTitle>
            <DialogDescription>
              Review your order and add any delivery notes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Order Summary</Label>
              <div className="p-3 bg-muted rounded-lg space-y-2">
                {cart?.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.product.name} x {Number(item.quantity)}
                    </span>
                    <span className="font-medium">
                      रू {(Number(item.quantity) * Number(item.unitPrice)).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>रू {cart?.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Delivery Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                placeholder="Any special instructions for delivery..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCheckoutDialogOpen(false)}
              disabled={checkoutMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={checkoutMutation.isPending}
            >
              {checkoutMutation.isPending ? "Processing..." : "Place Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isClearCartDialogOpen}
        onOpenChange={setIsClearCartDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Cart</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear your cart? This will remove all items and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearCart}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Clear Cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
