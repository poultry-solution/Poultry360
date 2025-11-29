"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Plus, Package, AlertTriangle, TrendingUp, Layers } from "lucide-react";
import {
  useGetInventorySummary,
  useGetDealerProducts,
} from "@/fetchers/dealer/dealerProductQueries";

export default function DealerInventoryPage() {
  const router = useRouter();
  const { data: summaryData, isLoading: summaryLoading } = useGetInventorySummary();
  const { data: productsData, isLoading: productsLoading } = useGetDealerProducts({
    limit: 5,
  });

  const summary = summaryData?.data;
  const recentProducts = productsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Inventory Overview
          </h1>
          <p className="text-muted-foreground">
            Monitor your product inventory and stock levels
          </p>
        </div>
        <Button
          onClick={() => router.push("/dealer/dashboard/products")}
          className="bg-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Manage Products
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? "..." : summary?.totalProducts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active products in inventory
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summaryLoading ? "..." : summary?.lowStockProducts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Products below minimum stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summaryLoading ? "..." : summary?.outOfStockProducts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Products with zero stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Inventory Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading
                ? "..."
                : `रू ${(summary?.totalInventoryValue || 0).toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Total inventory value (cost)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Products by Type */}
      <Card>
        <CardHeader>
          <CardTitle>Products by Type</CardTitle>
          <CardDescription>Distribution of products across categories</CardDescription>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="space-y-4">
              {summary?.productsByType?.map((item: any) => (
                <div key={item.type} className="flex items-center">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.type}</span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {item._count} products
                  </div>
                </div>
              ))}
              {(!summary?.productsByType || summary.productsByType.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  No products yet
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Products */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Products</CardTitle>
              <CardDescription>
                Latest products added to inventory
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dealer/dashboard/products")}
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {productsLoading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : recentProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No products yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first product.
              </p>
              <Button onClick={() => router.push("/dealer/dashboard/products")}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentProducts.map((product: any) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => router.push("/dealer/dashboard/products")}
                >
                  <div className="flex-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {product.type} • {product.unit}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      Stock: {Number(product.currentStock).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      रू {Number(product.sellingPrice).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

