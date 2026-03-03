"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ShoppingBag,
  FileCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
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
} from "@/components/ui/dialog";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/common/components/ui/tabs";
import {
  useGetFarmerPurchaseRequests,
  useGetFarmerPurchaseRequestStats,
} from "@/fetchers/farmer/farmerPurchaseRequestQueries";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";

// ==================== TYPES ====================

interface SaleRequest {
  id: string;
  requestNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  totalAmount: number;
  subtotalAmount?: number | null;
  discountType?: string | null;
  discountValue?: number | null;
  paidAmount: number;
  date: string;
  reviewedAt?: string;
  rejectionReason?: string;
  notes?: string;
  dealer: {
    id: string;
    name: string;
    contact: string;
    address?: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    product: {
      id: string;
      name: string;
      type: string;
      unit: string;
    };
  }>;
  dealerSale?: {
    id: string;
    invoiceNumber: string;
  };
}

// ==================== MAIN PAGE ====================

export default function FarmerOrderRequestsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("sent");

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/farmer/dashboard/supplier-ledger")}
          className="h-7 w-7 md:h-8 md:w-8 shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {t("farmer.orderRequests.title")}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("farmer.orderRequests.subtitle")}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            {t("farmer.orderRequests.tabSent")}
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            {t("farmer.orderRequests.tabReceived")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sent" className="space-y-4 mt-4">
          <SentRequestsTab />
        </TabsContent>

        <TabsContent value="received" className="space-y-4 mt-4">
          <ReceivedRequestsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== SENT REQUESTS TAB (Purchase Requests) ====================

function SentRequestsTab() {
  const router = useRouter();
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: statsData } = useGetFarmerPurchaseRequestStats();
  const { data: requestsData, isLoading } = useGetFarmerPurchaseRequests({
    page,
    limit: 10,
    status: statusFilter || undefined,
  });

  const stats = statsData?.data;
  const requests = requestsData?.data || [];
  const pagination = requestsData?.pagination;

  const formatCurrency = (amount: number) => `रू ${amount.toFixed(2)}`;
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            {t("farmer.orderRequests.stats.pending")}
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("farmer.orderRequests.stats.approved")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            {t("farmer.orderRequests.stats.rejected")}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      {/* Statistics */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              {t("farmer.orderRequests.stats.pending")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{stats?.pending ?? 0}</div>
            <p className="text-[9px] md:text-xs text-muted-foreground">
              <span className="hidden md:inline">{formatCurrency(stats?.pendingAmount ?? 0)}</span>
              <span className="md:hidden">रू{Math.round(stats?.pendingAmount ?? 0).toLocaleString()}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              {t("farmer.orderRequests.stats.approved")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-green-600">{stats?.approved ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              {t("farmer.orderRequests.stats.rejected")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-red-600">{stats?.rejected ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              {t("farmer.orderRequests.stats.total")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{stats?.total ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Requests List */}
      <Card>
        <CardContent className="p-0">
          <div className="p-3 md:p-4 border-b">
            <Select
              value={statusFilter || "ALL"}
              onValueChange={(v) => {
                setStatusFilter(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs w-full sm:w-[120px]">
                <SelectValue placeholder={t("farmer.orderRequests.filterPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("farmer.orderRequests.filterPlaceholder")}</SelectItem>
                <SelectItem value="PENDING">{t("farmer.orderRequests.stats.pending")}</SelectItem>
                <SelectItem value="APPROVED">{t("farmer.orderRequests.stats.approved")}</SelectItem>
                <SelectItem value="REJECTED">{t("farmer.orderRequests.stats.rejected")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t("farmer.orderRequests.loadingRequests")}</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {t("farmer.orderRequests.noRequestsYet")}
              </h3>
              <p className="text-muted-foreground mb-4">
                {t("farmer.orderRequests.emptyHelp")}
              </p>
              <Button
                variant="outline"
                onClick={() => router.push("/farmer/dashboard/supplier-ledger")}
              >
                {t("farmer.orderRequests.goToSupplierLedger")}
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {requests.map((req: any) => {
                const isExpanded = expandedId === req.id;
                const hasDiscount = req.subtotalAmount != null;

                return (
                  <div key={req.id} className="p-3 md:p-4">
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : req.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{req.requestNumber}</p>
                          {getStatusBadge(req.status)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          To: {req.dealer?.name} - {formatDate(req.date)}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-3">
                        <div>
                          {hasDiscount && (
                            <p className="text-xs text-muted-foreground line-through">
                              {formatCurrency(Number(req.subtotalAmount))}
                            </p>
                          )}
                          <p className="text-sm md:text-lg font-bold">
                            {formatCurrency(Number(req.totalAmount))}
                          </p>
                          {hasDiscount && (
                            <p className="text-xs text-green-600">
                              {req.discountType === "PERCENT"
                                ? `${Number(req.discountValue)}% off`
                                : `रू ${Number(req.discountValue)} off`}
                            </p>
                          )}
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-2">
                        <div className="space-y-1">
                          {req.items?.map((item: any) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span>
                                {item.product?.name} x {Number(item.quantity)}{" "}
                                {item.product?.unit}
                              </span>
                              <span className="font-medium">
                                {formatCurrency(Number(item.totalAmount))}
                              </span>
                            </div>
                          ))}
                        </div>
                        {req.rejectionReason && (
                          <div className="p-2 bg-red-50 rounded text-sm text-red-700">
                            Reason: {req.rejectionReason}
                          </div>
                        )}
                        {req.dealerSale && (
                          <p className="text-xs text-muted-foreground">
                            Invoice: {req.dealerSale.invoiceNumber}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t">
              <span className="text-xs text-muted-foreground">
                {page}/{pagination.totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
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
    </>
  );
}

// ==================== RECEIVED REQUESTS TAB (Sale Requests) ====================

function ReceivedRequestsTab() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [selectedRequest, setSelectedRequest] = useState<SaleRequest | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [purchaseCategory, setPurchaseCategory] = useState("");

  // Get sale requests
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["farmer-sale-requests"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/farmer/sale-requests");
      return data;
    },
  });

  // Get statistics
  const { data: statsData } = useQuery({
    queryKey: ["farmer-sale-request-stats"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/farmer/sale-requests/statistics");
      return data;
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ requestId, purchaseCategory }: { requestId: string; purchaseCategory?: string }) => {
      const { data } = await axiosInstance.post(
        `/farmer/sale-requests/${requestId}/approve`,
        { purchaseCategory: purchaseCategory || undefined }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-sale-requests"] });
      queryClient.invalidateQueries({ queryKey: ["farmer-sale-request-stats"] });
      toast.success(t("farmer.saleRequests.toast.approved"));
      setIsApproveDialogOpen(false);
      setSelectedRequest(null);
      setPurchaseCategory("");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("farmer.saleRequests.toast.approveFailed"));
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { data } = await axiosInstance.post(
        `/farmer/sale-requests/${requestId}/reject`,
        { rejectionReason: reason }
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-sale-requests"] });
      queryClient.invalidateQueries({ queryKey: ["farmer-sale-request-stats"] });
      toast.success(t("farmer.saleRequests.toast.rejected"));
      setIsRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || t("farmer.saleRequests.toast.rejectFailed"));
    },
  });

  const requests: SaleRequest[] = requestsData?.data || [];
  const stats = statsData?.data || { pending: 0, approved: 0, rejected: 0, pendingAmount: 0 };

  const formatCurrency = (amount: number | string) => `रू ${Number(amount).toFixed(2)}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="mr-1 h-3 w-3" />
            {t("farmer.saleRequests.status.pending")}
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            {t("farmer.saleRequests.status.approved")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            {t("farmer.saleRequests.status.rejected")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleApprove = (request: SaleRequest) => {
    setSelectedRequest(request);
    setPurchaseCategory("");
    setIsApproveDialogOpen(true);
  };

  const handleReject = (request: SaleRequest) => {
    setSelectedRequest(request);
    setIsRejectDialogOpen(true);
  };

  const confirmApprove = () => {
    if (selectedRequest) {
      approveMutation.mutate({
        requestId: selectedRequest.id,
        purchaseCategory: purchaseCategory || undefined,
      });
    }
  };

  const confirmReject = () => {
    if (selectedRequest) {
      rejectMutation.mutate({
        requestId: selectedRequest.id,
        reason: rejectionReason,
      });
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <>
      {/* Statistics */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{stats.pending}</div>
            <p className="text-[9px] md:text-xs text-muted-foreground">
              <span className="hidden md:inline">{formatCurrency(stats.pendingAmount)}</span>
              <span className="md:hidden">रू{Math.round(stats.pendingAmount).toLocaleString()}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{stats.total || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{t("farmer.saleRequests.emptyTitle")}</h3>
              <p className="text-muted-foreground">{t("farmer.saleRequests.emptyHelp")}</p>
            </div>
          ) : (
            <div className="divide-y">
              {requests.map((request) => (
                <div key={request.id} className="p-3 md:p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{request.requestNumber}</p>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        From: {request.dealer.name} - {formatDate(request.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm md:text-lg font-bold">
                        {formatCurrency(request.totalAmount)}
                      </p>
                      {request.paidAmount > 0 && (
                        <p className="text-[9px] md:text-xs text-muted-foreground">
                          Paid: {formatCurrency(request.paidAmount)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Discount breakdown */}
                  {request.subtotalAmount != null &&
                    request.discountType &&
                    Number(request.subtotalAmount) > Number(request.totalAmount) && (
                      <div className="mt-2 p-2 rounded-lg bg-muted/60 border border-border/60 text-xs">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Original</span>
                            <span>{formatCurrency(Number(request.subtotalAmount))}</span>
                          </div>
                          <div className="flex justify-between text-green-600">
                            <span>
                              Discount
                              {request.discountType === "PERCENT"
                                ? ` (${request.discountValue}%)`
                                : ` (रू ${Number(request.discountValue || 0).toFixed(2)})`}
                            </span>
                            <span>
                              - {formatCurrency(Number(request.subtotalAmount) - Number(request.totalAmount))}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                  {/* Items */}
                  <div className="mt-2 space-y-1">
                    {request.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span>
                          {item.product.name} x {item.quantity} {item.product.unit}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(item.totalAmount)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Notes */}
                  {request.notes && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Notes: {request.notes}
                    </p>
                  )}

                  {/* Rejection Reason */}
                  {request.status === "REJECTED" && request.rejectionReason && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-sm text-red-700">
                      Reason: {request.rejectionReason}
                    </div>
                  )}

                  {/* Actions */}
                  {request.status === "PENDING" && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                        onClick={() => handleApprove(request)}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        {t("farmer.saleRequests.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs"
                        onClick={() => handleReject(request)}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        {t("farmer.saleRequests.reject")}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("farmer.saleRequests.approveDialogTitle")}</DialogTitle>
            <DialogDescription>{t("farmer.saleRequests.approveDialogBody")}</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-2 py-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("farmer.saleRequests.requestLabel")}</span>
                <span className="font-medium">{selectedRequest.requestNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("farmer.saleRequests.dealerLabel")}</span>
                <span className="font-medium">{selectedRequest.dealer.name}</span>
              </div>
              {selectedRequest.subtotalAmount != null &&
                selectedRequest.discountType &&
                Number(selectedRequest.subtotalAmount) > Number(selectedRequest.totalAmount) ? (
                <div className="p-3 rounded-lg bg-muted/60 border border-border/60 text-sm space-y-1">
                  <p className="font-medium mb-2 text-muted-foreground">Price breakdown</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Original amount</span>
                    <span>{formatCurrency(Number(selectedRequest.subtotalAmount))}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>
                      Discount by dealer
                      {selectedRequest.discountType === "PERCENT"
                        ? ` (${selectedRequest.discountValue}%)`
                        : ` (रू ${Number(selectedRequest.discountValue || 0).toFixed(2)})`}
                    </span>
                    <span>
                      - {formatCurrency(Number(selectedRequest.subtotalAmount) - Number(selectedRequest.totalAmount))}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t border-border/60">
                    <span>{t("farmer.saleRequests.totalAmountLabel")}</span>
                    <span className="font-bold">{formatCurrency(selectedRequest.totalAmount)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("farmer.saleRequests.totalAmountLabel")}</span>
                  <span className="font-bold">{formatCurrency(selectedRequest.totalAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("farmer.saleRequests.itemsCountLabel")}</span>
                <span>{t("farmer.saleRequests.itemsCountValue", { count: selectedRequest.items.length })}</span>
              </div>

              {/* Purchase Category Selection */}
              <div className="pt-3 border-t">
                <Label className="text-sm font-medium">Purchase Category</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Select the category for inventory tracking
                </p>
                <Select value={purchaseCategory} onValueChange={setPurchaseCategory}>
                  <SelectTrigger className="!bg-white">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="FEED">Feed</SelectItem>
                    <SelectItem value="MEDICINE">Medicine</SelectItem>
                    <SelectItem value="CHICKS">Chicks</SelectItem>
                    <SelectItem value="EQUIPMENT">Equipment</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
              disabled={approveMutation.isPending}
            >
              {t("farmer.saleRequests.cancel")}
            </Button>
            <Button
              onClick={confirmApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? t("farmer.saleRequests.approving") : t("farmer.saleRequests.approve")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("farmer.saleRequests.rejectDialogTitle")}</DialogTitle>
            <DialogDescription>{t("farmer.saleRequests.rejectDialogBody")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejectionReason">{t("farmer.saleRequests.reasonLabel")}</Label>
              <Textarea
                id="rejectionReason"
                placeholder={t("farmer.saleRequests.reasonPlaceholder")}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionReason("");
              }}
              disabled={rejectMutation.isPending}
            >
              {t("farmer.saleRequests.cancel")}
            </Button>
            <Button
              onClick={confirmReject}
              disabled={rejectMutation.isPending}
              variant="destructive"
            >
              {rejectMutation.isPending ? t("farmer.saleRequests.rejecting") : t("farmer.saleRequests.reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
