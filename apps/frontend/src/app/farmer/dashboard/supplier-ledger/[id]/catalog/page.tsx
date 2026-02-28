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
import {
  useGetDealerCatalogProducts,
  useGetFarmerCart,
  useAddToFarmerCart,
  useUpdateFarmerCartItem,
  useRemoveFarmerCartItem,
  useClearFarmerCart,
  useCheckoutFarmerCart,
} from "@/fetchers/farmer/farmerCartQueries";

export default function DealerCatalogPage() {
  const params = useParams();
  const router = useRouter();
  const dealerId = params.id as string;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const [isClearCartDialogOpen, setIsClearCartDialogOpen] = useState(false);
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [addingToCart, setAddingToCart] = useState<{ [key: string]: number }>(
    {}
  );
  const [selectedUnits, setSelectedUnits] = useState<{ [key: string]: string }>(
    {}
  );

  const { data: productsData, isLoading: productsLoading } =
    useGetDealerCatalogProducts(dealerId, {
      page,
      limit: 12,
      search: search || undefined,
      type: typeFilter || undefined,
    });

  const { data: cart, isLoading: cartLoading } = useGetFarmerCart(dealerId);

  const addToCeartMutation = useAddToFarmerCart();
  const updateCartItemMutation = useUpdateFarmerCartItem();
  const removeCartItemMutation = useRemoveFarmerCartItem();
  const clearCartMutation = useClearFarmerCart();
  const checkoutMutation = useCheckoutFarmerCart();

  const products = productsData?.data || [];
  const dealer = productsData?.dealer;
  const pagination = productsData?.pagination;

  const handleAddToCart = async (productId: string, quantity: number) => {
    if (quantity <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    try {
      const unit = selectedUnits[productId] || undefined;
      await addToCeartMutation.mutateAsync({ dealerId, productId, quantity, unit });
      toast.success("Product added to cart");
      setAddingToCart((prev) => ({ ...prev, [productId]: 0 }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to add to cart");
    }
  };

  const handleUpdateCartItem = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) return;
    try {
      await updateCartItemMutation.mutateAsync({ itemId, quantity: newQuantity });
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

  const confirmClearCart = async () => {
    try {
      await clearCartMutation.mutateAsync(dealerId);
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
      await checkoutMutation.mutateAsync({ dealerId, notes: checkoutNotes });
      toast.success("Purchase request sent to dealer!");
      setIsCheckoutDialogOpen(false);
      setCheckoutNotes("");
      router.push("/farmer/dashboard/purchase-requests");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to place order"
      );
    }
  };

  const getProductConversions = (product: any) => {
    const conversions = [
      ...(product.unitConversions || []),
      ...(product.companyProduct?.unitConversions || []),
    ];
    return conversions;
  };

  const getSelectedUnit = (product: any) => {
    return selectedUnits[product.id] || product.unit;
  };

  const getDisplayPrice = (product: any) => {
    const unit = getSelectedUnit(product);
    if (unit === product.unit) return Number(product.sellingPrice);
    const conversions = getProductConversions(product);
    const conv = conversions.find((c: any) => c.unitName === unit);
    if (conv) return Number(product.sellingPrice) * Number(conv.conversionFactor);
    return Number(product.sellingPrice);
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
    const item = cart?.items.find((i: any) => i.productId === productId);
    return item ? Number(item.quantity) : 0;
  };

  const getCartItemId = (productId: string) => {
    const item = cart?.items.find((i: any) => i.productId === productId);
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
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              router.push(`/farmer/dashboard/supplier-ledger/${dealerId}`)
            }
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Supplier
          </Button>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {dealer?.name || "Dealer"} - Product Catalog
        </h1>
        <p className="text-muted-foreground">
          {dealer?.address || "Browse and order products"}
        </p>
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
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={typeFilter || "ALL"}
              onValueChange={(value) => {
                setTypeFilter(value === "ALL" ? "" : value);
                setPage(1);
              }}
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
                  <h3 className="text-lg font-semibold mb-2">
                    No products found
                  </h3>
                  <p className="text-muted-foreground">
                    {search || typeFilter
                      ? "Try adjusting your search or filters."
                      : "This dealer has no products available."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {products.map((product: any) => {
                      const inCartQty = getCartItemQuantity(product.id);
                      const addQty = addingToCart[product.id] || 1;
                      const conversions = getProductConversions(product);
                      const hasAlternateUnits = conversions.length > 0;
                      const currentUnit = getSelectedUnit(product);
                      const displayPrice = getDisplayPrice(product);

                      return (
                        <Card
                          key={product.id}
                          className="overflow-hidden flex flex-col"
                        >
                          <div className="aspect-video bg-muted relative overflow-hidden">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <Package className="h-16 w-16 text-muted-foreground" />
                            </div>
                            <Badge
                              className={`absolute top-2 right-2 z-10 ${getProductTypeColor(product.type)}`}
                            >
                              {product.type}
                            </Badge>
                          </div>
                          <CardHeader>
                            <CardTitle className="text-lg">
                              {product.name}
                            </CardTitle>
                            {product.description && (
                              <CardDescription className="line-clamp-2">
                                {product.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {hasAlternateUnits && (
                                <div>
                                  <span className="text-xs text-muted-foreground">Buy in</span>
                                  <Select
                                    value={currentUnit}
                                    onValueChange={(value) =>
                                      setSelectedUnits((prev) => ({ ...prev, [product.id]: value }))
                                    }
                                  >
                                    <SelectTrigger className="mt-1 h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value={product.unit}>{product.unit} (base)</SelectItem>
                                      {conversions.map((c: any) => (
                                        <SelectItem key={c.unitName} value={c.unitName}>
                                          {c.unitName} (1 = {Number(c.conversionFactor)} {product.unit})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">
                                  Price per {currentUnit}
                                </span>
                                <span className="text-lg font-bold">
                                  रू {displayPrice.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">
                                  Available Stock
                                </span>
                                <span className="font-medium">
                                  {Number(product.currentStock).toFixed(2)}{" "}
                                  {product.unit}
                                </span>
                              </div>

                              {inCartQty > 0 && (
                                <div className="p-2 bg-green-50 rounded border border-green-200">
                                  <span className="text-green-800 font-medium text-sm">
                                    In cart: {inCartQty} {product.unit}
                                  </span>
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
                                  onClick={() =>
                                    handleAddToCart(product.id, addQty)
                                  }
                                  disabled={addToCeartMutation.isPending}
                                >
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  Add
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

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
                Cart
              </CardTitle>
              <CardDescription>
                {cart?.items?.length || 0} item(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!cart || cart.items.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Your cart is empty
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {cart.items.map((item: any) => (
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
                              रू {Number(item.unitPrice).toFixed(2)} /{" "}
                              {item.product.unit}
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
                      Send Purchase Request
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setIsClearCartDialogOpen(true)}
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
            <DialogTitle>Confirm Purchase Request</DialogTitle>
            <DialogDescription>
              This will send a purchase request to {dealer?.name}. They can
              approve it with an optional discount.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Order Summary</Label>
              <div className="p-3 bg-muted rounded-lg space-y-2">
                {cart?.items.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.product.name} x {Number(item.quantity)}
                    </span>
                    <span className="font-medium">
                      रू{" "}
                      {(
                        Number(item.quantity) * Number(item.unitPrice)
                      ).toFixed(2)}
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
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                placeholder="Any notes for the dealer..."
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
              {checkoutMutation.isPending ? "Sending..." : "Send Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Cart Dialog */}
      <AlertDialog
        open={isClearCartDialogOpen}
        onOpenChange={setIsClearCartDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Cart</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear your cart? This will remove all
              items.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearCart}
              className="bg-red-600 hover:bg-red-700"
            >
              Clear Cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
