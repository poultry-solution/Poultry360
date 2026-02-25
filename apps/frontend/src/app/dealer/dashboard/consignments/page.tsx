"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Package,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  DollarSign,
  Ban,
  Receipt,
  AlertCircle,
  ArrowLeft,
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
import { Label } from "@/common/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { DataTable, Column } from "@/common/components/ui/data-table";
import { Badge } from "@/common/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Textarea } from "@/common/components/ui/textarea";
import { toast } from "sonner";
import {
  useGetDealerConsignments,
  useAcceptConsignment,
  useConfirmReceipt,
  useRejectDealerConsignment,
  useGetDealerConsignmentAuditLogs,
  type Consignment,
} from "@/fetchers/dealer/consignmentQueries";
import { useI18n } from "@/i18n/useI18n";

export default function DealerConsignmentsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("received");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);

  // Dialogs
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isConfirmReceiptDialogOpen, setIsConfirmReceiptDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isRejectionInfoOpen, setIsRejectionInfoOpen] = useState(false);

  // Form state for accept
  const [acceptItems, setAcceptItems] = useState<Array<{
    itemId: string;
    acceptedQuantity: number;
  }>>([]);
  const [acceptNotes, setAcceptNotes] = useState("");

  // Form state for confirm receipt
  const [grnRef, setGrnRef] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [sellingPrices, setSellingPrices] = useState<Record<string, string>>({});

  // Form state for reject
  const [rejectReason, setRejectReason] = useState("");

  // Queries
  const { data: receivedData, isLoading: receivedLoading } = useGetDealerConsignments({
    direction: "COMPANY_TO_DEALER",
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    search: search || undefined,
  });

  const { data: requestedData, isLoading: requestedLoading } = useGetDealerConsignments({
    direction: "DEALER_TO_COMPANY",
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    search: search || undefined,
  });

  // Mutations
  const acceptMutation = useAcceptConsignment();
  const confirmReceiptMutation = useConfirmReceipt();
  const rejectMutation = useRejectDealerConsignment();


  const receivedConsignments = receivedData?.data || [];
  const requestedConsignments = requestedData?.data || [];

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    const num = typeof amount === "string" ? parseFloat(amount) : (amount || 0);
    if (isNaN(num)) return "रू 0.00";
    return `रू ${num.toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CREATED":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t("dealer.consignments.filters.created")}
          </Badge>
        );
      case "ACCEPTED_PENDING_DISPATCH":
        return (
          <Badge variant="default" className="bg-blue-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("dealer.consignments.filters.accepted")}
          </Badge>
        );
      case "DISPATCHED":
        return (
          <Badge variant="default" className="bg-purple-600">
            <Truck className="h-3 w-3 mr-1" />
            {t("dealer.consignments.filters.dispatched")}
          </Badge>
        );
      case "RECEIVED":
        return (
          <Badge variant="default" className="bg-green-600">
            <Package className="h-3 w-3 mr-1" />
            {t("dealer.consignments.filters.received")}
          </Badge>
        );
      case "SETTLED":
        return (
          <Badge variant="default" className="bg-emerald-600">
            <DollarSign className="h-3 w-3 mr-1" />
            {t("dealer.consignments.filters.settled")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            {t("dealer.consignments.filters.rejected")}
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="secondary" className="bg-gray-500">
            <Ban className="h-3 w-3 mr-1" />
            {t("dealer.consignments.filters.cancelled")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleAcceptConsignment = async () => {
    if (!selectedConsignment || acceptItems.length === 0) {
      toast.error(t("dealer.consignments.messages.specifyQuantities"));
      return;
    }

    try {
      await acceptMutation.mutateAsync({
        id: selectedConsignment.id,
        items: acceptItems,
        notes: acceptNotes || undefined,
      });
      toast.success(t("dealer.consignments.messages.acceptedSuccess"));
      setIsAcceptDialogOpen(false);
      setSelectedConsignment(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("dealer.consignments.messages.acceptFailed"));
    }
  };

  const handleConfirmReceipt = async () => {
    if (!selectedConsignment) return;

    try {
      // Prepare items payload with selling prices (use discounted unit price as cost when applicable)
      const itemsPayload = selectedConsignment.items.map((item) => {
        const qty = Number(item.acceptedQuantity || item.quantity) || 1;
        const costPrice =
          qty > 0 ? Number(item.totalAmount) / qty : Number(item.unitPrice);
        const sellingPrice = sellingPrices[item.id] !== undefined
          ? Number(sellingPrices[item.id])
          : Math.round(costPrice * 1.2 * 100) / 100;

        return {
          itemId: item.id,
          sellingPrice
        };
      });

      await confirmReceiptMutation.mutateAsync({
        id: selectedConsignment.id,
        grnRef: grnRef || undefined,
        notes: receiptNotes || undefined,
        items: itemsPayload,
      });
      toast.success(t("dealer.consignments.messages.receiptConfirmed"));
      setIsConfirmReceiptDialogOpen(false);
      setSelectedConsignment(null);
      setGrnRef("");
      setReceiptNotes("");
      setSellingPrices({});
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("dealer.consignments.messages.receiptFailed"));
    }
  };

  const handleRejectConsignment = async () => {
    if (!selectedConsignment) return;

    try {
      await rejectMutation.mutateAsync({
        id: selectedConsignment.id,
        reason: rejectReason || undefined,
      });
      toast.success(t("dealer.consignments.messages.rejectedSuccess"));
      setIsRejectDialogOpen(false);
      setSelectedConsignment(null);
      setRejectReason("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("dealer.consignments.messages.rejectFailed"));
    }
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {t("dealer.consignments.title")}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("dealer.consignments.subtitle")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/dealer/dashboard/company")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">{t("dealer.consignments.buttons.back")}</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("dealer.consignments.filters.searchPlaceholder")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder={t("dealer.consignments.filters.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("dealer.consignments.filters.allStatuses")}</SelectItem>
                <SelectItem value="CREATED">{t("dealer.consignments.filters.created")}</SelectItem>
                <SelectItem value="ACCEPTED_PENDING_DISPATCH">{t("dealer.consignments.filters.accepted")}</SelectItem>
                <SelectItem value="DISPATCHED">{t("dealer.consignments.filters.dispatched")}</SelectItem>
                <SelectItem value="RECEIVED">{t("dealer.consignments.filters.received")}</SelectItem>
                <SelectItem value="SETTLED">{t("dealer.consignments.filters.settled")}</SelectItem>
                <SelectItem value="REJECTED">{t("dealer.consignments.filters.rejected")}</SelectItem>
                <SelectItem value="CANCELLED">{t("dealer.consignments.filters.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="received">{t("dealer.consignments.tabs.received")}</TabsTrigger>
          <TabsTrigger value="requested">{t("dealer.consignments.tabs.requested")}</TabsTrigger>
        </TabsList>

        {/* Received Consignments Tab */}
        <TabsContent value="received">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">{t("dealer.consignments.list.receivedTitle")}</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {t("dealer.consignments.list.receivedSubtitle", { count: receivedConsignments.length })}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={receivedConsignments}
                loading={receivedLoading}
                emptyMessage={t("dealer.consignments.list.receivedEmpty")}
                columns={[
                  {
                    key: 'requestNumber',
                    label: t("dealer.consignments.list.columns.requestNumber"),
                    width: '100px',
                    render: (val) => <span className="font-medium">{val}</span>
                  },
                  {
                    key: 'fromCompany',
                    label: t("dealer.consignments.list.columns.company"),
                    width: '100px',
                    render: (val) => val?.name || "N/A"
                  },
                  {
                    key: 'items',
                    label: t("dealer.consignments.list.columns.items"),
                    width: '60px',
                    render: (val) => `${val?.length || 0}`
                  },
                  {
                    key: 'totalAmount',
                    label: t("dealer.consignments.list.columns.amount"),
                    align: 'right',
                    width: '90px',
                    render: (val) => <span className="font-semibold">{formatCurrency(val)}</span>
                  },
                  {
                    key: 'status',
                    label: t("dealer.consignments.list.columns.status"),
                    width: '100px',
                    render: (val) => getStatusBadge(val)
                  },
                  {
                    key: 'createdAt',
                    label: t("dealer.consignments.list.columns.date"),
                    width: '80px',
                    render: (val) => formatDate(val)
                  },
                  {
                    key: 'actions',
                    label: t("dealer.consignments.list.columns.actions"),
                    align: 'right',
                    width: '160px',
                    render: (_, consignment) => (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setSelectedConsignment(consignment);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {consignment.status === "CREATED" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => {
                                setSelectedConsignment(consignment);
                                setAcceptItems(
                                  consignment.items.map((item: any) => ({
                                    itemId: item.id,
                                    acceptedQuantity: Number(item.quantity),
                                  }))
                                );
                                setIsAcceptDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-7 text-xs px-2 bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => {
                                setSelectedConsignment(consignment);
                                setIsRejectDialogOpen(true);
                              }}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {consignment.status === "DISPATCHED" && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedConsignment(consignment);
                              setIsConfirmReceiptDialogOpen(true);
                            }}
                          >
                            {t("dealer.consignments.buttons.received")}
                          </Button>
                        )}
                      </div>
                    )
                  }
                ] as Column[]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requested Consignments Tab */}
        <TabsContent value="requested">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">{t("dealer.consignments.list.requestedTitle")}</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {t("dealer.consignments.list.requestedSubtitle", { count: requestedConsignments.length })}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={requestedConsignments}
                loading={requestedLoading}
                emptyMessage={t("dealer.consignments.list.requestedEmpty")}
                columns={[
                  {
                    key: 'requestNumber',
                    label: t("dealer.consignments.list.columns.requestNumber"),
                    width: '100px',
                    render: (val) => <span className="font-medium">{val}</span>
                  },
                  {
                    key: 'fromCompany',
                    label: t("dealer.consignments.list.columns.company"),
                    width: '100px',
                    render: (val) => val?.name || "N/A"
                  },
                  {
                    key: 'items',
                    label: t("dealer.consignments.list.columns.items"),
                    width: '60px',
                    render: (val) => `${val?.length || 0}`
                  },
                  {
                    key: 'totalAmount',
                    label: t("dealer.consignments.list.columns.amount"),
                    align: 'right',
                    width: '90px',
                    render: (val) => <span className="font-semibold">{formatCurrency(val)}</span>
                  },
                  {
                    key: 'status',
                    label: t("dealer.consignments.list.columns.status"),
                    width: '100px',
                    render: (val) => getStatusBadge(val)
                  },
                  {
                    key: 'createdAt',
                    label: t("dealer.consignments.list.columns.date"),
                    width: '80px',
                    render: (val) => formatDate(val)
                  },
                  {
                    key: 'actions',
                    label: t("dealer.consignments.list.columns.actions"),
                    align: 'right',
                    width: '130px',
                    render: (_, consignment) => (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setSelectedConsignment(consignment);
                            setIsViewDialogOpen(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {consignment.status === "REJECTED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2 text-red-600 border-red-200"
                            onClick={() => {
                              setSelectedConsignment(consignment);
                              setIsRejectionInfoOpen(true);
                            }}
                          >
                            <AlertCircle className="h-3 w-3" />
                          </Button>
                        )}
                        {consignment.status === "DISPATCHED" && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedConsignment(consignment);
                              setIsConfirmReceiptDialogOpen(true);
                            }}
                          >
                            {t("dealer.consignments.buttons.received")}
                          </Button>
                        )}
                      </div>
                    )
                  }
                ] as Column[]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Accept Consignment Dialog */}
      <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("dealer.consignments.dialogs.accept.title")}</DialogTitle>
            <DialogDescription>
              {t("dealer.consignments.dialogs.accept.description", { number: selectedConsignment?.requestNumber || "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>{t("dealer.consignments.dialogs.accept.itemsLabel")}</Label>
              {acceptItems.map((item) => {
                const originalItem = selectedConsignment?.items.find(
                  (i) => i.id === item.itemId
                );
                return (
                  <div key={item.itemId} className="flex gap-3 items-center p-3 border rounded-md">
                    <div className="flex-1">
                      <p className="font-medium">
                        {originalItem?.companyProduct?.name || "Unknown Product"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("dealer.consignments.dialogs.accept.quantity", { qty: originalItem?.quantity || 0 })} • {t("dealer.consignments.dialogs.accept.unitPrice", { price: formatCurrency(originalItem?.unitPrice) })}
                      </p>
                    </div>
                    <div className="text-right font-medium">
                      {originalItem?.quantity || 0}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accept-notes">{t("dealer.consignments.dialogs.accept.notesLabel")}</Label>
              <Textarea
                id="accept-notes"
                value={acceptNotes}
                onChange={(e) => setAcceptNotes(e.target.value)}
                placeholder={t("dealer.consignments.dialogs.accept.notesPlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAcceptDialogOpen(false);
                setAcceptNotes("");
              }}
            >
              {t("dealer.consignments.dialogs.accept.cancel")}
            </Button>
            <Button
              onClick={handleAcceptConsignment}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? t("dealer.consignments.dialogs.accept.confirming") : t("dealer.consignments.dialogs.accept.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Receipt Dialog */}
      <Dialog open={isConfirmReceiptDialogOpen} onOpenChange={setIsConfirmReceiptDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("dealer.consignments.dialogs.receipt.title")}</DialogTitle>
            <DialogDescription>
              {t("dealer.consignments.dialogs.receipt.description", { number: selectedConsignment?.requestNumber || "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                {t("dealer.consignments.dialogs.receipt.important.title")}
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                {t("dealer.consignments.dialogs.receipt.important.desc")}
              </p>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 mt-2 ml-4 list-disc space-y-1">
                <li>{t("dealer.consignments.dialogs.receipt.important.point1")}</li>
                <li>{t("dealer.consignments.dialogs.receipt.important.point2")}</li>
                <li>{t("dealer.consignments.dialogs.receipt.important.point3")}</li>
                <li>{t("dealer.consignments.dialogs.receipt.important.point4")}</li>
              </ul>
            </div>

            {selectedConsignment && (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-md">
                  <p className="text-sm font-medium mb-2">{t("dealer.consignments.dialogs.receipt.summary")}</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground">{t("dealer.consignments.dialogs.receipt.itemsCount")}</p>
                      <p className="font-medium">{t("dealer.consignments.dialogs.receipt.productsCount", { count: selectedConsignment.items.length })}</p>
                    </div>
                    {selectedConsignment.subtotalAmount != null &&
                      selectedConsignment.discountType ? (
                      <>
                        <div>
                          <p className="text-muted-foreground">{t("dealer.consignments.dialogs.receipt.subtotal")}</p>
                          <p className="font-medium">
                            {formatCurrency(Number(selectedConsignment.subtotalAmount))}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            {t("dealer.consignments.dialogs.receipt.discount")}
                            {selectedConsignment.discountType === "PERCENT"
                              ? ` (${selectedConsignment.discountValue}%)`
                              : ""}
                          </p>
                          <p className="font-medium text-green-600">
                            -{" "}
                            {formatCurrency(
                              Number(selectedConsignment.subtotalAmount) -
                              Number(selectedConsignment.totalAmount)
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">{t("dealer.consignments.dialogs.receipt.total")}</p>
                          <p className="font-medium">
                            {formatCurrency(selectedConsignment.totalAmount)}
                          </p>
                        </div>
                      </>
                    ) : (
                      <div>
                        <p className="text-muted-foreground">{t("dealer.consignments.dialogs.receipt.total")}</p>
                        <p className="font-medium">
                          {formatCurrency(selectedConsignment.totalAmount)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold mb-2 block">Set Selling Prices</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Review and adjust the selling price for each item. Default is set to 20% markup on cost price.
                  </p>

                  <div className="space-y-3">
                    {selectedConsignment.items.map((item) => {
                      const qty = Number(item.acceptedQuantity || item.quantity) || 1;
                      const costPrice =
                        qty > 0 ? Number(item.totalAmount) / qty : Number(item.unitPrice);
                      const currentSellingPrice = sellingPrices[item.id] !== undefined
                        ? sellingPrices[item.id]
                        : (costPrice * 1.2).toFixed(2);

                      return (
                        <div key={item.id} className="flex flex-col sm:flex-row gap-4 p-3 border rounded-md items-start sm:items-center bg-card">
                          <div className="flex-1">
                            <p className="font-medium">{item.companyProduct?.name || "Unknown Product"}</p>
                            <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                              <span>{t("dealer.consignments.dialogs.receipt.qty", { qty: item.acceptedQuantity || item.quantity })}</span>
                              <span>{t("dealer.consignments.dialogs.receipt.cost", { cost: formatCurrency(costPrice) })}</span>
                            </div>
                          </div>

                          <div className="w-full sm:w-48">
                            <Label htmlFor={`price-${item.id}`} className="text-xs mb-1.5 block">
                              {t("dealer.consignments.dialogs.receipt.sellingPriceLabel")}
                            </Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                रू
                              </span>
                              <Input
                                id={`price-${item.id}`}
                                type="number"
                                min="0"
                                step="0.01"
                                className="pl-8"
                                value={currentSellingPrice}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSellingPrices(prev => ({
                                    ...prev,
                                    [item.id]: val
                                  }));
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="receipt-notes">{t("dealer.consignments.dialogs.receipt.notesLabel")}</Label>
              <Textarea
                id="receipt-notes"
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder={t("dealer.consignments.dialogs.receipt.notesPlaceholder")}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmReceiptDialogOpen(false);
                setGrnRef("");
                setReceiptNotes("");
                setSellingPrices({});
              }}
            >
              {t("dealer.consignments.dialogs.receipt.cancel")}
            </Button>
            <Button
              onClick={handleConfirmReceipt}
              disabled={confirmReceiptMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {confirmReceiptMutation.isPending ? t("dealer.consignments.dialogs.receipt.confirming") : t("dealer.consignments.dialogs.receipt.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dealer.consignments.dialogs.reject.title")}</DialogTitle>
            <DialogDescription>
              {t("dealer.consignments.dialogs.reject.description", { number: selectedConsignment?.requestNumber || "" })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">{t("dealer.consignments.dialogs.reject.reasonLabel")}</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t("dealer.consignments.dialogs.reject.reasonPlaceholder")}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectReason("");
              }}
            >
              {t("dealer.consignments.dialogs.reject.cancel")}
            </Button>
            <Button
              variant="destructive"
              className="text-black hover:bg-red-600 hover:text-white"
              onClick={handleRejectConsignment}
              disabled={rejectMutation.isPending || !rejectReason}
            >
              {rejectMutation.isPending ? t("dealer.consignments.dialogs.reject.confirming") : t("dealer.consignments.dialogs.reject.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RejectionReasonDialog
        consignmentId={selectedConsignment?.id || null}
        open={isRejectionInfoOpen}
        onOpenChange={setIsRejectionInfoOpen}
      />

      {/* View Dialog - Reusing same structure as company page */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("dealer.consignments.dialogs.details.title")}</DialogTitle>
            <DialogDescription>
              {selectedConsignment?.requestNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedConsignment && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("dealer.consignments.dialogs.details.labels.status")}</Label>
                  <div className="mt-1">{getStatusBadge(selectedConsignment.status)}</div>
                </div>
                <div>
                  <Label>{t("dealer.consignments.dialogs.details.labels.direction")}</Label>
                  <p className="font-medium mt-1">{selectedConsignment.direction}</p>
                </div>
                <div>
                  <Label>{t("dealer.consignments.dialogs.details.labels.company")}</Label>
                  <p className="font-medium mt-1">
                    {selectedConsignment.fromCompany?.name || "N/A"}
                  </p>
                </div>
                {selectedConsignment.subtotalAmount != null &&
                  selectedConsignment.discountType ? (
                  <>
                    <div>
                      <Label>{t("dealer.consignments.dialogs.details.labels.subtotal")}</Label>
                      <p className="font-medium mt-1">
                        {formatCurrency(Number(selectedConsignment.subtotalAmount))}
                      </p>
                    </div>
                    <div>
                      <Label>
                        {t("dealer.consignments.dialogs.details.labels.discount")}
                        {selectedConsignment.discountType === "PERCENT"
                          ? ` (${selectedConsignment.discountValue}%)`
                          : ` (रू ${Number(selectedConsignment.discountValue || 0).toFixed(2)})`}
                      </Label>
                      <p className="font-medium mt-1 text-green-600">
                        -{" "}
                        {formatCurrency(
                          Number(selectedConsignment.subtotalAmount) -
                          Number(selectedConsignment.totalAmount)
                        )}
                      </p>
                    </div>
                    <div>
                      <Label>{t("dealer.consignments.dialogs.details.labels.total")}</Label>
                      <p className="font-medium mt-1">
                        {formatCurrency(selectedConsignment.totalAmount)}
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <Label>{t("dealer.consignments.dialogs.details.labels.total")}</Label>
                    <p className="font-medium mt-1">
                      {formatCurrency(selectedConsignment.totalAmount)}
                    </p>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <Label>{t("dealer.consignments.dialogs.details.labels.items")}</Label>
                <Table className="mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("dealer.consignments.dialogs.details.table.product")}</TableHead>
                      <TableHead className="text-right">{t("dealer.consignments.dialogs.details.table.requested")}</TableHead>
                      <TableHead className="text-right">{t("dealer.consignments.dialogs.details.table.approved")}</TableHead>
                      <TableHead className="text-right">{t("dealer.consignments.dialogs.details.table.received")}</TableHead>
                      <TableHead className="text-right">{t("dealer.consignments.dialogs.details.table.unitPrice")}</TableHead>
                      <TableHead className="text-right">{t("dealer.consignments.dialogs.details.table.total")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedConsignment.items.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.companyProduct?.name || "N/A"}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          {item.acceptedQuantity || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.receivedQuantity || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Dispatch Info */}
              {selectedConsignment.dispatchRef && (
                <div className="space-y-2 p-4 bg-muted rounded-md">
                  <Label>{t("dealer.consignments.dialogs.details.dispatch.title")}</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("dealer.consignments.dialogs.details.dispatch.reference")}</p>
                      <p className="font-medium">{selectedConsignment.dispatchRef}</p>
                    </div>
                    {selectedConsignment.trackingInfo && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t("dealer.consignments.dialogs.details.dispatch.tracking")}</p>
                        <p className="font-medium">{selectedConsignment.trackingInfo}</p>
                      </div>
                    )}
                    {selectedConsignment.dispatchedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t("dealer.consignments.dialogs.details.dispatch.dispatchedOn")}</p>
                        <p className="font-medium">
                          {formatDate(selectedConsignment.dispatchedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Receipt Info */}
              {selectedConsignment.grnRef && (
                <div className="space-y-2 p-4 bg-green-50 dark:bg-green-950 rounded-md">
                  <Label>{t("dealer.consignments.dialogs.details.receipt.title")}</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t("dealer.consignments.dialogs.details.receipt.grn")}</p>
                      <p className="font-medium">{selectedConsignment.grnRef}</p>
                    </div>
                    {selectedConsignment.receivedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t("dealer.consignments.dialogs.details.receipt.receivedOn")}</p>
                        <p className="font-medium">
                          {formatDate(selectedConsignment.receivedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Linked Sale */}
              {selectedConsignment.companySale && (() => {
                const cs = selectedConsignment.companySale as {
                  invoiceNumber?: string;
                  totalAmount: number;
                  subtotalAmount?: number | null;
                  discount?: { type: string; value: number } | null;
                  account?: { balance: number };
                };
                const hasSaleDiscount = cs.subtotalAmount != null && cs.discount;
                const saleSubtotal = cs.subtotalAmount != null ? Number(cs.subtotalAmount) : Number(cs.totalAmount);
                const discountLabel = cs.discount
                  ? cs.discount.type === "PERCENT"
                    ? `${Number(cs.discount.value)}%`
                    : `रू ${Number(cs.discount.value).toFixed(2)}`
                  : "";
                return (
                  <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-md">
                    <Label>{t("dealer.consignments.dialogs.details.linkedSale.title")}</Label>
                    <div className="grid grid-cols-3 gap-4 mt-2">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("dealer.consignments.dialogs.details.linkedSale.invoice")}</p>
                        <p className="font-medium">
                          {cs.invoiceNumber}
                        </p>
                      </div>
                      {hasSaleDiscount ? (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">{t("dealer.consignments.dialogs.details.linkedSale.subtotal")}</p>
                            <p className="font-medium">{formatCurrency(saleSubtotal)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{t("dealer.consignments.dialogs.details.linkedSale.discount")} ({discountLabel})</p>
                            <p className="font-medium text-green-600">
                              - {formatCurrency(saleSubtotal - Number(cs.totalAmount))}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{t("dealer.consignments.dialogs.details.linkedSale.total")}</p>
                            <p className="font-medium">{formatCurrency(Number(cs.totalAmount))}</p>
                          </div>
                        </>
                      ) : (
                        <div>
                          <p className="text-sm text-muted-foreground">{t("dealer.consignments.dialogs.details.linkedSale.total")}</p>
                          <p className="font-medium">{formatCurrency(Number(cs.totalAmount))}</p>
                        </div>
                      )}
                      {cs?.account && (
                        <div>
                          <p className="text-sm text-muted-foreground">{t("dealer.consignments.dialogs.details.linkedSale.balance")}</p>
                          <p className={`font-medium ${Number(cs.account.balance) > 0 ? "text-red-600" : Number(cs.account.balance) < 0 ? "text-green-600" : ""}`}>
                            {formatCurrency(cs.account.balance)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Notes */}
              {selectedConsignment.notes && (
                <div>
                  <Label>{t("dealer.consignments.dialogs.details.labels.notes")}</Label>
                  <p className="mt-1 text-sm">{selectedConsignment.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              {t("dealer.consignments.buttons.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RejectionReasonDialog({
  consignmentId,
  open,
  onOpenChange,
}: {
  consignmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { data: auditLogs, isLoading } = useGetDealerConsignmentAuditLogs(
    consignmentId || ""
  );

  const rejectionLog = auditLogs?.find((log) => log.action === "REJECTED");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dealer.consignments.dialogs.rejectionReason.title")}</DialogTitle>
          <DialogDescription>
            {t("dealer.consignments.dialogs.rejectionReason.description")}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <p className="text-muted-foreground">{t("dealer.consignments.dialogs.rejectionReason.loading")}</p>
            </div>
          ) : rejectionLog ? (
            <div className="bg-red-50 p-4 rounded-md border border-red-100 text-red-800">
              <p className="font-medium mb-1">{t("dealer.consignments.dialogs.rejectionReason.reasonLabel")}</p>
              <p>{rejectionLog.notes || t("dealer.consignments.dialogs.rejectionReason.noReason")}</p>
              <p className="text-xs text-red-600 mt-2 pt-2 border-t border-red-200">
                {t("dealer.consignments.dialogs.rejectionReason.rejectedBy", { name: rejectionLog.actor?.name, date: new Date(rejectionLog.createdAt).toLocaleDateString() })}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">{t("dealer.consignments.dialogs.rejectionReason.noDetails")}</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t("dealer.consignments.dialogs.rejectionReason.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

