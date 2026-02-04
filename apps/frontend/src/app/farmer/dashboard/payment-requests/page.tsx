"use client";

import { useState } from "react";
import { DollarSign, Clock, CheckCircle, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  useGetFarmerPaymentRequests,
  useGetFarmerPaymentRequestStatistics,
} from "@/fetchers/payment/paymentRequestQueries";

export default function FarmerPaymentRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Queries
  const { data: requestsData, isLoading } = useGetFarmerPaymentRequests({
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  });

  const { data: statsData } = useGetFarmerPaymentRequestStatistics();

  const formatCurrency = (amount: number | string) => {
    return `रू ${Number(amount).toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          Pending Review
        </Badge>
      ),
      APPROVED: (
        <Badge variant="outline" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      ),
      REJECTED: (
        <Badge variant="outline" className="bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      ),
    };
    return variants[status as keyof typeof variants] || status;
  };

  const stats = statsData?.data || {
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
    pendingAmount: 0,
  };

  const requests = requestsData?.data || [];

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-xl md:text-3xl font-bold">Payment Requests</h1>
        <p className="text-xs md:text-sm text-muted-foreground">
          View your payment request history
        </p>
        <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
          To make a payment, go to Feed Ledger and click "Pay"
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{stats.pending}</div>
            <p className="text-[9px] md:text-xs text-muted-foreground mt-0.5">
              <span className="hidden md:inline">{formatCurrency(stats.pendingAmount)}</span>
              <span className="md:hidden">रू{Math.round(stats.pendingAmount).toLocaleString()}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <CardTitle className="text-sm md:text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card>
            <CardContent className="text-center py-6 text-sm">Loading...</CardContent>
          </Card>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="text-center py-6 text-muted-foreground text-sm">
              <p>No payment requests found</p>
              <p className="text-xs mt-1">
                Go to Feed Ledger to make payments
              </p>
            </CardContent>
          </Card>
        ) : (
          requests.map((request: any) => (
            <Card key={request.id}>
              <CardHeader className="p-3 md:p-6 pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm md:text-lg">
                      {request.requestNumber}
                    </CardTitle>
                    <CardDescription className="text-[10px] md:text-sm">
                      Invoice: {request.dealerSale?.invoiceNumber}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                  <div>
                    <div className="text-[10px] md:text-sm text-muted-foreground">Dealer</div>
                    <div className="font-medium text-xs md:text-sm truncate">{request.dealer?.name}</div>
                    <div className="text-[9px] md:text-xs text-muted-foreground hidden sm:block">
                      {request.dealer?.contact}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] md:text-sm text-muted-foreground">Amount</div>
                    <div className="text-lg md:text-2xl font-bold">
                      <span className="hidden md:inline">{formatCurrency(request.amount)}</span>
                      <span className="md:hidden">रू{Math.round(request.amount).toLocaleString()}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] md:text-sm text-muted-foreground">Date</div>
                    <div className="text-xs md:text-sm">{formatDate(request.createdAt)}</div>
                  </div>
                  {request.paymentReference && (
                    <div>
                      <div className="text-[10px] md:text-sm text-muted-foreground">
                        Ref
                      </div>
                      <div className="text-xs md:text-sm truncate">{request.paymentReference}</div>
                    </div>
                  )}
                  {request.description && (
                    <div className="col-span-2 md:col-span-4">
                      <div className="text-[10px] md:text-sm text-muted-foreground">
                        Description
                      </div>
                      <div className="text-xs md:text-sm">{request.description}</div>
                    </div>
                  )}
                  {request.status === "REJECTED" && request.rejectionReason && (
                    <div className="col-span-2 md:col-span-4">
                      <div className="text-[10px] md:text-sm text-red-600 font-medium">
                        Rejection Reason
                      </div>
                      <div className="text-xs md:text-sm text-red-600">
                        {request.rejectionReason}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
