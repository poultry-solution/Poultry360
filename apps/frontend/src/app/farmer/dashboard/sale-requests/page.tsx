"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle, XCircle, ShoppingBag, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
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
import { Textarea } from "@/common/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";

interface SaleRequest {
  id: string;
  requestNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  totalAmount: number;
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

export default function FarmerSaleRequestsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [selectedRequest, setSelectedRequest] = useState<SaleRequest | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

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
    mutationFn: async (requestId: string) => {
      const { data } = await axiosInstance.post(
        `/farmer/sale-requests/${requestId}/approve`
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["farmer-sale-requests"] });
      queryClient.invalidateQueries({ queryKey: ["farmer-sale-request-stats"] });
      toast.success(t("farmer.saleRequests.toast.approved"));
      setIsApproveDialogOpen(false);
      setSelectedRequest(null);
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

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number | string) => {
    return `रू ${Number(amount).toFixed(2)}`;
  };

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
    setIsApproveDialogOpen(true);
  };

  const handleReject = (request: SaleRequest) => {
    setSelectedRequest(request);
    setIsRejectDialogOpen(true);
  };

  const confirmApprove = () => {
    if (selectedRequest) {
      approveMutation.mutate(selectedRequest.id);
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

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 md:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/farmer/dashboard/dealers")}
          className="h-7 w-7 md:h-8 md:w-8 shrink-0"
        >
          <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("farmer.saleRequests.title")}</h1>
          <p className="text-muted-foreground">{t("farmer.saleRequests.subtitle")}</p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("farmer.saleRequests.stats.pending")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-[9px] md:text-xs text-muted-foreground">
              <span className="hidden md:inline">{formatCurrency(stats.pendingAmount)}</span>
              <span className="md:hidden">रू{Math.round(stats.pendingAmount).toLocaleString()}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("farmer.saleRequests.stats.approved")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("farmer.saleRequests.stats.rejected")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("farmer.saleRequests.stats.total")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{stats.total || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">{t("farmer.saleRequests.loading")}</div>
          </CardContent>
        </Card>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">{t("farmer.saleRequests.emptyTitle")}</h3>
              <p className="text-muted-foreground">{t("farmer.saleRequests.emptyHelp")}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="p-3 md:p-6 pb-2 md:pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm md:text-lg flex flex-wrap items-center gap-2">
                      {request.requestNumber}
                      {getStatusBadge(request.status)}
                    </CardTitle>
                    <CardDescription>
                      {t("farmer.saleRequests.from")}: {request.dealer.name} • {formatDate(request.date)}
                    </CardDescription>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-lg md:text-2xl font-bold">
                      <span className="hidden md:inline">{formatCurrency(request.totalAmount)}</span>
                      <span className="md:hidden">रू{Math.round(request.totalAmount).toLocaleString()}</span>
                    </div>
                    {request.paidAmount > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {t("farmer.saleRequests.paid")}: {formatCurrency(request.paidAmount)}
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="space-y-3">
                  {/* Items - scrollable on mobile */}
                  <div>
                    <h4 className="font-medium mb-2">{t("farmer.saleRequests.itemsTitle")}</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("farmer.saleRequests.table.product")}</TableHead>
                          <TableHead>{t("farmer.saleRequests.table.quantity")}</TableHead>
                          <TableHead>{t("farmer.saleRequests.table.unitPrice")}</TableHead>
                          <TableHead>{t("farmer.saleRequests.table.total")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {request.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.product.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {item.product.type}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.quantity} {item.product.unit}
                            </TableCell>
                            <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(item.totalAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Notes */}
                  {request.notes && (
                    <div>
                      <h4 className="font-medium mb-1">{t("farmer.saleRequests.notes")}</h4>
                      <p className="text-sm text-muted-foreground">{request.notes}</p>
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {request.status === "REJECTED" && request.rejectionReason && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <h4 className="font-medium text-red-800 mb-1">{t("farmer.saleRequests.rejectionReason")}</h4>
                      <p className="text-sm text-red-700">{request.rejectionReason}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {request.status === "PENDING" && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={() => handleApprove(request)}
                        className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none h-8 text-xs"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t("farmer.saleRequests.approve")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleReject(request)}
                        className="border-red-300 text-red-600 hover:bg-red-50 flex-1 sm:flex-none h-8 text-xs"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {t("farmer.saleRequests.reject")}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("farmer.saleRequests.totalAmountLabel")}</span>
                <span className="font-bold">
                  {formatCurrency(selectedRequest.totalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("farmer.saleRequests.itemsCountLabel")}</span>
                <span>{t("farmer.saleRequests.itemsCountValue", { count: selectedRequest.items.length })}</span>
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
    </div>
  );
}
