"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { Package, Users, Receipt, TrendingUp, Loader2, X, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import {
  useGetDealerVerificationRequests,
  useAcknowledgeVerificationRequest,
} from "@/fetchers/dealer/dealerVerificationQueries";
import { type DealerVerificationRequest } from "@/fetchers/dealer/dealerVerificationQueries";

export default function DealerHomePage() {
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());

  // Get verification requests to check for unacknowledged messages
  const { data: requestsData } = useGetDealerVerificationRequests();
  const acknowledgeMutation = useAcknowledgeVerificationRequest();

  const requests = requestsData?.data || [];

  // Find unacknowledged requests with status changes
  const unacknowledgedRequests = requests.filter(
    (request: DealerVerificationRequest) =>
      !request.acknowledgedAt &&
      !dismissedBanners.has(request.id) &&
      request.status !== "PENDING" // Only show approved/rejected status changes
  );

  // Get the most recent unacknowledged request
  const latestRequest = unacknowledgedRequests.length > 0
    ? unacknowledgedRequests.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )[0]
    : null;

  const handleDismiss = async (requestId: string) => {
    // Add to dismissed set immediately for UI responsiveness
    setDismissedBanners((prev) => new Set(prev).add(requestId));

    try {
      // Acknowledge on backend
      await acknowledgeMutation.mutateAsync(requestId);
    } catch (error) {
      // If acknowledgment fails, remove from dismissed set
      setDismissedBanners((prev) => {
        const next = new Set(prev);
        next.delete(requestId);
        return next;
      });
    }
  };

  const getStatusBanner = (request: DealerVerificationRequest) => {
    const companyName = request.company?.name || "Company";

    switch (request.status) {
      case "APPROVED":
        return {
          variant: "default" as const,
          title: "Connection Approved!",
          description: `Congratulations! You are now connected with ${companyName}. You can now interact with them through your Companies page.`,
          icon: CheckCircle,
          className: "bg-green-50 border-green-200 text-green-900",
          iconClassName: "text-green-600",
        };
      case "REJECTED":
        return {
          variant: "destructive" as const,
          title: "Request Rejected",
          description: `Your request to join ${companyName} was rejected. ${
            request.rejectedCount >= 3
              ? "You have reached the maximum rejection limit (3) and cannot apply again."
              : request.rejectedCount === 2
              ? "This is your 2nd rejection. One more rejection and you won't be able to apply again."
              : "You can retry after 1 hour from the Companies page."
          }`,
          icon: XCircle,
          className: "bg-red-50 border-red-200 text-red-900",
          iconClassName: "text-red-600",
        };
      case "PENDING":
        return {
          variant: "default" as const,
          title: "Request Pending",
          description: `Your request to join ${companyName} is pending approval. We'll notify you once the company responds.`,
          icon: Clock,
          className: "bg-yellow-50 border-yellow-200 text-yellow-900",
          iconClassName: "text-yellow-600",
        };
      default:
        return null;
    }
  };
  // TODO: Fetch dealer statistics and data
  const isLoading = false;
  const stats = {
    totalInventory: 0,
    totalCustomers: 0,
    totalSales: 0,
    monthlyRevenue: 0,
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {latestRequest && (() => {
        const bannerConfig = getStatusBanner(latestRequest);
        if (!bannerConfig) return null;

        const Icon = bannerConfig.icon;

        return (
          <Alert className={bannerConfig.className}>
            <Icon className={`h-4 w-4 ${bannerConfig.iconClassName}`} />
            <AlertTitle>{bannerConfig.title}</AlertTitle>
            <AlertDescription className="flex items-start justify-between">
              <span className="flex-1">{bannerConfig.description}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-4 h-auto p-1 hover:bg-transparent"
                onClick={() => handleDismiss(latestRequest.id)}
                disabled={acknowledgeMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        );
      })()}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dealer Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your inventory, customers, and sales.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalInventory}</div>
            )}
            <p className="text-xs text-muted-foreground">Items in stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            )}
            <p className="text-xs text-muted-foreground">Active customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalSales}</div>
            )}
            <p className="text-xs text-muted-foreground">Transactions this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold">₹{stats.monthlyRevenue.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground">Revenue this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Sales</CardTitle>
            <CardDescription>Latest sales transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sales data will appear here once connected.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
            <CardDescription>Items that need restocking</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Inventory alerts will appear here once inventory is set up.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

