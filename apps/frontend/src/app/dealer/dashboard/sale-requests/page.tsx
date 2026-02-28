"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileCheck,
  Search,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ShoppingCart,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/common/components/ui/tabs";
import { DataTable, Column } from "@/common/components/ui/data-table";
import { Badge } from "@/common/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import axiosInstance from "@/common/lib/axios";
import { useI18n } from "@/i18n/useI18n";
import { DateDisplay } from "@/common/components/ui/date-display";
import { toast } from "sonner";
import {
  useGetDealerPurchaseRequests,
  useGetDealerPurchaseRequestStats,
  useApprovePurchaseRequest,
  useRejectPurchaseRequest,
} from "@/fetchers/dealer/dealerPurchaseRequestQueries";

// ==================== TYPES ====================

interface SaleRequest {
  id: string;
  requestNumber: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  totalAmount: number;
  paidAmount: number;
  date: string;
  reviewedAt?: string;
  rejectionReason?: string;
  farmer: {
    id: string;
    name: string;
    phone: string;
    companyName?: string;
  };
  customer: {
    id: string;
    name: string;
    phone: string;
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

export default function DealerSaleRequestsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("sent");

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dealer/dashboard/sales")}
            className="text-xs md:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">{t("dealer.saleRequests.back")}</span>
            <span className="sm:hidden">{t("dealer.saleRequests.backMobile")}</span>
          </Button>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {t("dealer.saleRequests.title")}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t("dealer.saleRequests.subtitle")}
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            Sent Requests
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Received Requests
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

// ==================== SENT REQUESTS TAB (Sale Requests to Farmers) ====================

function SentRequestsTab() {
  const router = useRouter();
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["dealer-sale-requests", page, search, statusFilter],
    queryFn: async () => {
      const params: any = { page, limit: 10 };
      if (search) params.search = search;
      if (statusFilter !== "ALL") params.status = statusFilter;
      const { data } = await axiosInstance.get("/dealer/sales/requests", { params });
      return data;
    },
  });

  const { data: statsData } = useQuery({
    queryKey: ["dealer-sale-request-stats"],
    queryFn: async () => {
      const { data } = await axiosInstance.get("/dealer/sales/requests/statistics");
      return data;
    },
  });

  const requests: SaleRequest[] = requestsData?.data || [];
  const pagination = requestsData?.pagination;
  const stats = statsData?.data || { pending: 0, approved: 0, rejected: 0, pendingAmount: 0 };

  const formatCurrency = (amount: number | string) => `रू ${Number(amount).toFixed(2)}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="mr-1 h-3 w-3" />
            {t("dealer.saleRequests.stats.pending")}
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            {t("dealer.saleRequests.stats.approved")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            {t("dealer.saleRequests.stats.rejected")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <>
      {/* Statistics */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              {t("dealer.saleRequests.stats.pending")}
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
              {t("dealer.saleRequests.stats.approved")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              {t("dealer.saleRequests.stats.rejected")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              {t("dealer.saleRequests.stats.total")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{stats.total || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 md:p-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("dealer.saleRequests.filters.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === "ALL" ? "ALL" : value)}>
              <SelectTrigger className="h-8 text-xs w-full sm:w-[120px]">
                <SelectValue placeholder={t("dealer.saleRequests.filters.statusPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("dealer.saleRequests.filters.all")}</SelectItem>
                <SelectItem value="PENDING">{t("dealer.saleRequests.filters.pending")}</SelectItem>
                <SelectItem value="APPROVED">{t("dealer.saleRequests.filters.approved")}</SelectItem>
                <SelectItem value="REJECTED">{t("dealer.saleRequests.filters.rejected")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            data={requests}
            loading={isLoading}
            emptyMessage={t("dealer.saleRequests.table.empty")}
            columns={[
              {
                key: 'requestNumber',
                label: t("dealer.saleRequests.table.request"),
                width: '90px',
                render: (val) => <span className="font-medium">{val}</span>
              },
              {
                key: 'farmer',
                label: t("dealer.saleRequests.table.farmer"),
                width: '100px',
                render: (val) => (
                  <div>
                    <div className="font-medium truncate max-w-[80px]">{val?.name}</div>
                    <div className="text-[10px] text-muted-foreground">{val?.phone}</div>
                  </div>
                )
              },
              {
                key: 'date',
                label: t("dealer.saleRequests.table.date"),
                width: '80px',
                render: (val) => <DateDisplay date={val} />
              },
              {
                key: 'items',
                label: t("dealer.saleRequests.table.items"),
                width: '50px',
                render: (val) => val?.length || 0
              },
              {
                key: 'totalAmount',
                label: t("dealer.saleRequests.table.amount"),
                width: '90px',
                render: (val, row) => (
                  <div>
                    <div className="font-medium">{formatCurrency(val)}</div>
                    {row.paidAmount > 0 && (
                      <div className="text-[9px] text-muted-foreground">{t("dealer.saleRequests.table.paid", { amount: Math.round(row.paidAmount).toLocaleString() })}</div>
                    )}
                  </div>
                )
              },
              {
                key: 'status',
                label: t("dealer.saleRequests.table.status"),
                width: '100px',
                render: (val) => getStatusBadge(val)
              },
              {
                key: 'actions',
                label: t("dealer.saleRequests.table.view"),
                align: 'right',
                width: '60px',
                render: (_, request) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => router.push(`/dealer/dashboard/sale-requests/${request.id}`)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )
              }
            ] as Column[]}
          />

          {/* Pagination */}
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
                  {t("dealer.saleRequests.pagination.prev")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                >
                  {t("dealer.saleRequests.pagination.next")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

// ==================== RECEIVED REQUESTS TAB (Purchase Requests from Farmers) ====================

function ReceivedRequestsTab() {
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
              Approved
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-green-600">{stats?.approved ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              Rejected
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-red-600">{stats?.rejected ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium text-muted-foreground">
              Total
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{stats?.total ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 md:p-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1" />
            <Select
              value={statusFilter || "ALL"}
              onValueChange={(v) => {
                setStatusFilter(v === "ALL" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-xs w-full sm:w-[120px]">
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
        </CardContent>
      </Card>

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
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No purchase requests</h3>
              <p className="text-muted-foreground">
                Purchase requests from farmers will appear here.
              </p>
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

                        {req.status === "PENDING" && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                openApproveDialog(req);
                              }}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                openRejectDialog(req);
                              }}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                          </div>
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
              <div className="space-y-2">
                <Label>Order Items</Label>
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  {selectedRequest.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
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
                    <span>{formatCurrency(Number(selectedRequest.totalAmount))}</span>
                  </div>
                </div>
              </div>

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
                    placeholder={discountType === "PERCENT" ? "e.g. 10" : "e.g. 500"}
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

              {Number(discountValue) > 0 && (
                <div className="p-3 bg-green-50 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(discountCalc.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-green-700">
                    <span>
                      Discount ({discountType === "PERCENT" ? `${discountValue}%` : `रू ${discountValue}`})
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
                {selectedRequest.farmer?.companyName && `(${selectedRequest.farmer.companyName})`}
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
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? "Approving..." : "Approve & Create Sale"}
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
    </>
  );
}
