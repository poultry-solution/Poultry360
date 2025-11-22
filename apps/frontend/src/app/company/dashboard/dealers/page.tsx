"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Plus, Users, Loader2 } from "lucide-react";

export default function CompanyDealersPage() {
  const isLoading = false;
  const dealers: any[] = [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dealer Management</h1>
          <p className="text-muted-foreground">
            Manage your dealer network. Phase 2A: Independent operation - no dealer connections yet.
            <br />
            <span className="text-xs text-muted-foreground">
              Future: Company can connect directly with dealers or farms. Distribution flow: Company → Dealer → Farmer.
            </span>
          </p>
        </div>
        <Button className="bg-primary hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Dealer
        </Button>
      </div>

      {/* Dealers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Dealers</CardTitle>
          <CardDescription>
            {dealers.length} dealers registered
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading dealers...</span>
            </div>
          ) : dealers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No dealers found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by adding your first dealer to the network.
              </p>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Dealer
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Dealer table will be implemented here. In Phase 3, this will connect to dealer accounts and enable distribution workflows.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

