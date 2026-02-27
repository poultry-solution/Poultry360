"use client";

import { useState } from "react";
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Loader2,
  ChevronDown,
  ChevronUp,
  Percent,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
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
import { toast } from "sonner";
import {
  useGetDealerPurchaseRequests,
  useGetDealerPurchaseRequestStats,
  useApprovePurchaseRequest,
  useRejectPurchaseRequest,
} from "@/fetchers/dealer/dealerPurchaseRequestQueries";

export default function DealerPurchaseRequestsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Approve dialog state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [discountType, setDiscountType] = useState<"PERCENT" | "FLAT">("PERCENT");
  const [discountValue, setDiscountValue] = useState<string>("");

  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: statsData } = useGetDealerPurchaseRequestStats();
  const { data: requestsData, isLoading } = useGetDealerPurchaseRequests({
    page,
    limit: 10,
    status: statusFilter || undefined,
  });

  const approveMutation = useApprovePurchaseRequest();
  const rejectMutation = useRejectPurchaseRequest();

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
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Discount calculation
  const calcDiscount = () => {
    if (!selectedRequest || !discountValue || Number(discountValue) <= 0)
      return { subtotal: Number(selectedRequest?.totalAmount || 0), discount: 0, final: Number(selectedRequest?.totalAmount || 0) };

    const subtotal = Number(selectedRequest.totalAmount);
    const val = Number(discountValue);

    if (discountType === "PERCENT") {
      const disc = Math.round((subtotal * Math.min(val, 100)) / 100 * 100) / 100;
      return { subtotal, discount: disc, final: Math.round((subtotal - disc) * 100) / 100 };
    }
    const disc = Math.min(val, subtotal);
    return { subtotal, discount: disc, final: Math.round((subtotal - disc) * 100) / 100 };
  };

  const openApproveDialog = (request: any) => {
    setSelectedRequest(request);
    setDiscountType("PERCENT");
    setDiscountValue("");
    setApproveDialogOpen(true);
  };

  const openRejectDialog = (request: any) => {
    setSelectedRequest(request);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    try {
      const val = Number(discountValue);
      const discount =
        val > 0
          ? { type: discountType, value: val }
          : undefined;
      await approveMutation.mutateAsync({
        requestId: selectedRequest.id,
        discount,
      });
      toast.success("Purchase request approved. Sale created.");
      setApproveDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve");
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      await rejectMutation.mutateAsync({
        requestId: selectedRequest.id,
        rejectionReason: rejectionReason || undefined,
      });
      toast.success("Purchase request rejected.");
      setRejectDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject");
    }
  };

  const discountCalc = calcDiscount();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Incoming Purchase Requests
        </h1>
        <p className="text-muted-foreground">
          Purchase requests from connected farmers
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.pendingAmount)} total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rejected}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-4">
        <Select
          value={statusFilter || "ALL"}
          onValueChange={(v) => {
            setStatusFilter(v === "ALL" ? "" : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No purchase requests
            </h3>
            <p className="text-muted-foreground">
              Purchase requests from farmers will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => {
            const isExpanded = expandedId === req.id;
            const hasDiscount = req.subtotalAmount != null;

            return (
              <Card key={req.id}>
                <CardContent className="p-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : req.id)
                    }
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{req.requestNumber}</p>
                        {getStatusBadge(req.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {req.farmer?.name}{" "}
                        {req.farmer?.companyName && `(${req.farmer.companyName})`}{" "}
                        - {formatDate(req.date)}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        {hasDiscount && (
                          <p className="text-xs text-muted-foreground line-through">
                            {formatCurrency(Number(req.subtotalAmount))}
                          </p>
                        )}
                        <p className="text-lg font-bold">
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
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {/* Items */}
                      <div className="space-y-2">
                        {req.items?.map((item: any) => (
                          <div
                            key={item.id}
                            className="flex justify-between text-sm"
                          >
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

                      {req.notes && (
                        <p className="text-sm text-muted-foreground">
                          Notes: {req.notes}
                        </p>
                      )}

                      {req.rejectionReason && (
                        <div className="p-2 bg-red-50 rounded text-sm text-red-700">
                          Rejection reason: {req.rejectionReason}
                        </div>
                      )}

                      {req.dealerSale && (
                        <p className="text-xs text-muted-foreground">
                          Invoice: {req.dealerSale.invoiceNumber}
                        </p>
                      )}

                      {/* Actions for PENDING */}
                      {req.status === "PENDING" && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openApproveDialog(req);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              openRejectDialog(req);
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </p>
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
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Purchase Request</DialogTitle>
            <DialogDescription>
              Review the order and optionally apply a discount before approving.
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              {/* Items Summary */}
              <div className="space-y-2">
                <Label>Order Items</Label>
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  {selectedRequest.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-sm"
                    >
                      <span>
                        {item.product?.name} x {Number(item.quantity)}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(Number(item.totalAmount))}
                      </span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold">
                    <span>Subtotal</span>
                    <span>
                      {formatCurrency(Number(selectedRequest.totalAmount))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Discount */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  Discount (Optional)
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={discountType}
                    onValueChange={(v) => setDiscountType(v as "PERCENT" | "FLAT")}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERCENT">Percentage (%)</SelectItem>
                      <SelectItem value="FLAT">Flat Amount (रू)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder={
                      discountType === "PERCENT" ? "e.g. 10" : "e.g. 500"
                    }
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    min="0"
                    max={
                      discountType === "PERCENT"
                        ? "100"
                        : String(Number(selectedRequest.totalAmount))
                    }
                  />
                </div>
              </div>

              {/* Preview */}
              {Number(discountValue) > 0 && (
                <div className="p-3 bg-green-50 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(discountCalc.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>
                      Discount (
                      {discountType === "PERCENT"
                        ? `${discountValue}%`
                        : `रू ${discountValue}`}
                      )
                    </span>
                    <span>-{formatCurrency(discountCalc.discount)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-1">
                    <span>Final Amount</span>
                    <span>{formatCurrency(discountCalc.final)}</span>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                From: {selectedRequest.farmer?.name}{" "}
                {selectedRequest.farmer?.companyName &&
                  `(${selectedRequest.farmer.companyName})`}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              disabled={approveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending
                ? "Approving..."
                : "Approve & Create Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Purchase Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this request from{" "}
              {selectedRequest?.farmer?.name}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Reason (Optional)</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
