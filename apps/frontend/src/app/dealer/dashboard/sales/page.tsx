"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Plus, Receipt, Loader2 } from "lucide-react";

export default function DealerSalesPage() {
  const isLoading = false;
  const sales: any[] = [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Management</h1>
          <p className="text-muted-foreground">
            Track and manage sales to your customers (farmers).
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          New Sale
        </Button>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Records</CardTitle>
          <CardDescription>
            {sales.length} sales transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading sales...</span>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No sales found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by recording your first sale.
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Sale
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sales table will be implemented here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

