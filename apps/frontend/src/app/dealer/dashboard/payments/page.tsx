"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Search,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Calendar,
  Plus,
  FileText,
  Upload,
  ArrowLeft,
  Image,
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
import { DataTable, Column } from "@/common/components/ui/data-table";
import { Badge } from "@/common/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/common/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,

} from "@/common/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";
import { getNowLocalDateTime } from "@/common/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { Textarea } from "@/common/components/ui/textarea";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";
import {
  useGetDealerPaymentRequests,
  useAcceptDealerPaymentRequest,
  useSubmitDealerPaymentProof,
  useCreateDealerPaymentRequest,
  useCancelDealerPaymentRequest,
  type PaymentRequest,
} from "@/fetchers/dealer/paymentRequestQueries";
import { CompanySearchSelect } from "@/common/components/forms/CompanySearchSelect";
import { ImageUpload } from "@/common/components/ui/image-upload";
import { DateInput } from "@/common/components/ui/date-input";
import { DateDisplay } from "@/common/components/ui/date-display";

export default function DealerPaymentsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("received");
  const [search, setSearch] = useState("");
  const [isViewRequestOpen, setIsViewRequestOpen] = useState(false);
  const [isAcceptAndProofDialogOpen, setIsAcceptAndProofDialogOpen] = useState(false);
  const [isSubmitProofOpen, setIsSubmitProofOpen] = useState(false);
  const [isCreateRequestOpen, setIsCreateRequestOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(
    null
  );
  const [paymentToCancel, setPaymentToCancel] = useState<string | null>(null);

  // Form state for accept-and-submit-proof and submit-proof
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    getNowLocalDateTime()
  );

  // Form state for creating request
  const [requestCompanyId, setRequestCompanyId] = useState("");
  const [requestSaleId, setRequestSaleId] = useState("");
  const [requestAmount, setRequestAmount] = useState<number>(0);
  const [requestDescription, setRequestDescription] = useState("");
  const [requestPaymentMethod, setRequestPaymentMethod] = useState("CASH");
  const [requestPaymentReference, setRequestPaymentReference] = useState("");
  const [requestPaymentReceiptUrl, setRequestPaymentReceiptUrl] = useState("");
  const [requestPaymentDate, setRequestPaymentDate] = useState(
    getNowLocalDateTime()
  );

  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Queries
  const { data: receivedData, isLoading: receivedLoading } =
    useGetDealerPaymentRequests({
      direction: "COMPANY_TO_DEALER",
      status: statusFilter !== "ALL" ? statusFilter : undefined,
    });
  const { data: sentData, isLoading: sentLoading } =
    useGetDealerPaymentRequests({
      direction: "DEALER_TO_COMPANY",
      status: statusFilter !== "ALL" ? statusFilter : undefined,
    });

  const acceptRequestMutation = useAcceptDealerPaymentRequest();
  const submitProofMutation = useSubmitDealerPaymentProof();
  const createRequestMutation = useCreateDealerPaymentRequest();
  const cancelRequestMutation = useCancelDealerPaymentRequest();

  const receivedRequests = receivedData?.data || [];
  const sentRequests = sentData?.data || [];

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null) return "रू 0.00";
    const numAmount = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(numAmount)) return "रू 0.00";
    return `रू ${numAmount.toFixed(2)}`;
  };

  const formatPaymentMethod = (method: string | undefined | null) => {
    if (!method) return "N/A";
    return t(`dealer.payments.methods.${method}`) || method;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            {t("dealer.payments.stats.pending")}
          </Badge>
        );
      case "ACCEPTED":
        return (
          <Badge variant="default">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("dealer.payments.stats.accepted")}
          </Badge>
        );
      case "PAYMENT_SUBMITTED":
        return (
          <Badge variant="default" className="bg-yellow-600">
            <FileText className="h-3 w-3 mr-1" />
            {t("dealer.payments.status.submitted")}
          </Badge>
        );
      case "VERIFIED":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("dealer.payments.status.verified")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            {t("dealer.payments.status.rejected")}
          </Badge>
        );
      case "CANCELLED":
        return <Badge variant="outline">{t("dealer.payments.status.cancelled")}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleAcceptAndSubmitProof = async () => {
    if (!selectedRequest || !paymentMethod) {
      toast.error(t("dealer.payments.messages.fillRequired"));
      return;
    }

    try {
      await acceptRequestMutation.mutateAsync(selectedRequest.id);
      await submitProofMutation.mutateAsync({
        id: selectedRequest.id,
        paymentMethod,
        paymentReference: paymentReference || undefined,
        paymentReceiptUrl: paymentReceiptUrl || undefined,
        paymentDate,
      });
      toast.success(t("dealer.payments.messages.acceptSuccess"));
      setIsAcceptAndProofDialogOpen(false);
      setIsViewRequestOpen(false);
      setSelectedRequest(null);
      setPaymentMethod("CASH");
      setPaymentReference("");
      setPaymentReceiptUrl("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("dealer.payments.messages.acceptFailed"));
    }
  };

  const handleSubmitProof = async () => {
    if (!selectedRequest || !paymentMethod) {
      toast.error(t("dealer.payments.messages.fillRequired"));
      return;
    }

    try {
      await submitProofMutation.mutateAsync({
        id: selectedRequest.id,
        paymentMethod,
        paymentReference: paymentReference || undefined,
        paymentReceiptUrl: paymentReceiptUrl || undefined,
        paymentDate,
      });
      toast.success(t("dealer.payments.messages.submitSuccess"));
      setIsSubmitProofOpen(false);
      setIsViewRequestOpen(false);
      setSelectedRequest(null);
      setPaymentMethod("CASH");
      setPaymentReference("");
      setPaymentReceiptUrl("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("dealer.payments.messages.submitFailed"));
    }
  };

  const handleCreateRequest = async () => {
    if (!requestCompanyId || !requestAmount || requestAmount <= 0 || !requestPaymentMethod) {
      toast.error(t("dealer.payments.messages.fillRequired"));
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        companyId: requestCompanyId,
        amount: requestAmount,
        companySaleId: requestSaleId || undefined,
        description: requestDescription || undefined,
        paymentMethod: requestPaymentMethod,
        paymentReference: requestPaymentReference || undefined,
        paymentReceiptUrl: requestPaymentReceiptUrl || undefined,
        paymentDate: requestPaymentDate,
      });
      toast.success(t("dealer.payments.messages.createSuccess"));
      setIsCreateRequestOpen(false);
      setRequestCompanyId("");
      setRequestSaleId("");
      setRequestAmount(0);
      setRequestDescription("");
      setRequestPaymentMethod("CASH");
      setRequestPaymentReference("");
      setRequestPaymentReceiptUrl("");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || t("dealer.payments.messages.createFailed");
      toast.error(errorMessage);
      console.error("Create payment request error:", error);
    }
  };

  const handleCancelRequest = (requestId: string) => {
    setPaymentToCancel(requestId);
  };

  const confirmCancelRequest = async () => {
    if (!paymentToCancel) return;
    try {
      await cancelRequestMutation.mutateAsync(paymentToCancel);
      toast.success(t("dealer.payments.messages.cancelSuccess"));
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("dealer.payments.messages.cancelFailed"));
    } finally {
      setPaymentToCancel(null);
    }
  };

  const pendingReceived = receivedRequests.filter(
    (r) => r.status === "PENDING"
  ).length;
  const acceptedRequests = receivedRequests.filter(
    (r) => r.status === "ACCEPTED"
  ).length;
  const pendingAmount = receivedRequests
    .filter((r) => r.status === "PENDING" || r.status === "ACCEPTED")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dealer/dashboard/company")}
              className="text-xs md:text-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">{t("dealer.payments.buttons.back")}</span>
              <span className="sm:hidden">{t("dealer.payments.buttons.back")}</span>
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {t("dealer.payments.title")}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("dealer.payments.subtitle")}
          </p>
        </div>
        <Button onClick={() => setIsCreateRequestOpen(true)} size="sm" className="w-full md:w-auto">
          <Plus className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="hidden sm:inline">{t("dealer.payments.buttons.submit")}</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">{t("dealer.payments.stats.pending")}</CardTitle>
            <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{pendingReceived}</div>
            <p className="text-[9px] md:text-xs text-muted-foreground">
              {t("dealer.payments.stats.awaiting")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">{t("dealer.payments.stats.accepted")}</CardTitle>
            <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-green-600">
              {acceptedRequests}
            </div>
            <p className="text-[9px] md:text-xs text-muted-foreground">
              {t("dealer.payments.stats.ready")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">{t("dealer.payments.stats.amount")}</CardTitle>
            <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold truncate">
              <span className="hidden md:inline">{formatCurrency(pendingAmount)}</span>
              <span className="md:hidden">रू{Math.round(pendingAmount).toLocaleString()}</span>
            </div>
            <p className="text-[9px] md:text-xs text-muted-foreground">
              {t("dealer.payments.stats.pending")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="received" className="flex-1 md:flex-none text-xs md:text-sm">{t("dealer.payments.tabs.received")}</TabsTrigger>
          <TabsTrigger value="sent" className="flex-1 md:flex-none text-xs md:text-sm">{t("dealer.payments.tabs.sent")}</TabsTrigger>
        </TabsList>

        {/* Received Requests Tab */}
        <TabsContent value="received" className="space-y-4">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle className="text-base md:text-lg">{t("dealer.payments.received.title")}</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    {t("dealer.payments.received.description")}
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder={t("dealer.payments.filters.searchPlaceholder")}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-8 text-xs w-full sm:w-[150px]"
                    />
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger className="h-8 text-xs w-full sm:w-[130px]">
                      <SelectValue placeholder={t("dealer.payments.filters.statusPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">{t("dealer.payments.filters.all")}</SelectItem>
                      <SelectItem value="PENDING">{t("dealer.payments.stats.pending")}</SelectItem>
                      <SelectItem value="ACCEPTED">{t("dealer.payments.stats.accepted")}</SelectItem>
                      <SelectItem value="PAYMENT_SUBMITTED">{t("dealer.payments.status.submitted")}</SelectItem>
                      <SelectItem value="VERIFIED">{t("dealer.payments.status.verified")}</SelectItem>
                      <SelectItem value="REJECTED">{t("dealer.payments.status.rejected")}</SelectItem>
                      <SelectItem value="CANCELLED">{t("dealer.payments.status.cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={receivedRequests}
                loading={receivedLoading}
                emptyMessage={t("dealer.payments.received.empty")}
                columns={[
                  {
                    key: 'createdAt',
                    label: t("dealer.payments.columns.date"),
                    width: '90px',
                    render: (val) => <DateDisplay date={val} />
                  },
                  {
                    key: 'company',
                    label: t("dealer.payments.columns.company"),
                    width: '100px',
                    render: (val) => <span className="font-medium truncate max-w-[80px] block">{val?.name || "N/A"}</span>
                  },
                  {
                    key: 'companySale',
                    label: t("dealer.payments.columns.invoice"),
                    width: '80px',
                    render: (val) => val?.invoiceNumber || "General"
                  },
                  {
                    key: 'amount',
                    label: t("dealer.payments.columns.amount"),
                    align: 'right',
                    width: '90px',
                    render: (val) => <span className="font-semibold">{formatCurrency(val)}</span>
                  },
                  {
                    key: 'status',
                    label: t("dealer.payments.columns.status"),
                    width: '110px',
                    render: (val) => getStatusBadge(val)
                  },
                  {
                    key: 'actions',
                    label: t("dealer.payments.columns.actions"),
                    align: 'right',
                    width: '110px',
                    render: (_, request) => (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsViewRequestOpen(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {request.status === "PENDING" && request.direction === "COMPANY_TO_DEALER" && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setSelectedRequest(request);
                              setPaymentMethod("CASH");
                              setPaymentReference("");
                              setPaymentReceiptUrl("");
                              setPaymentDate(getNowLocalDateTime());
                              setIsAcceptAndProofDialogOpen(true);
                            }}
                            title="Accept & submit proof"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {request.status === "ACCEPTED" && request.direction === "COMPANY_TO_DEALER" && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              setSelectedRequest(request);
                              setPaymentMethod("CASH");
                              setPaymentReference("");
                              setPaymentReceiptUrl("");
                              setPaymentDate(getNowLocalDateTime());
                              setIsSubmitProofOpen(true);
                            }}
                            title="Submit proof"
                          >
                            <Upload className="h-3.5 w-3.5" />
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

        {/* Sent Requests Tab */}
        <TabsContent value="sent" className="space-y-4">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle className="text-base md:text-lg">{t("dealer.payments.sent.title")}</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    {t("dealer.payments.sent.description")}
                  </CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t("dealer.payments.filters.searchPlaceholder")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs w-full sm:w-[150px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={sentRequests}
                loading={sentLoading}
                emptyMessage={t("dealer.payments.sent.empty")}
                columns={[
                  {
                    key: 'createdAt',
                    label: t("dealer.payments.columns.date"),
                    width: '90px',
                    render: (val) => <DateDisplay date={val} />
                  },
                  {
                    key: 'company',
                    label: t("dealer.payments.columns.company"),
                    width: '100px',
                    render: (val) => <span className="font-medium truncate max-w-[80px] block">{val?.name || "N/A"}</span>
                  },
                  {
                    key: 'companySale',
                    label: t("dealer.payments.columns.invoice"),
                    width: '80px',
                    render: (val) => val?.invoiceNumber || "General"
                  },
                  {
                    key: 'amount',
                    label: t("dealer.payments.columns.amount"),
                    align: 'right',
                    width: '90px',
                    render: (val) => <span className="font-semibold">{formatCurrency(val)}</span>
                  },
                  {
                    key: 'paymentMethod',
                    label: t("dealer.payments.columns.method"),
                    width: '80px',
                    render: (val) => formatPaymentMethod(val)
                  },
                  {
                    key: 'status',
                    label: t("dealer.payments.columns.status"),
                    width: '110px',
                    render: (val) => getStatusBadge(val)
                  },
                  {
                    key: 'actions',
                    label: t("dealer.payments.columns.actions"),
                    align: 'right',
                    width: '90px',
                    render: (_, request) => (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsViewRequestOpen(true);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {request.status === "PENDING" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleCancelRequest(request.id)}
                            disabled={cancelRequestMutation.isPending}
                          >
                            <XCircle className="h-3.5 w-3.5" />
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

      {/* View Request Dialog */}
      <Dialog open={isViewRequestOpen} onOpenChange={setIsViewRequestOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("dealer.payments.dialogs.view.title")}</DialogTitle>
            <DialogDescription>
              {t("dealer.payments.dialogs.view.description")}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("dealer.payments.dialogs.view.requestNumber")}</Label>
                  <p className="font-medium">{selectedRequest.requestNumber}</p>
                </div>
                <div>
                  <Label>{t("dealer.payments.dialogs.view.status")}</Label>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <Label>
                    {selectedRequest.direction === "COMPANY_TO_DEALER"
                      ? t("dealer.payments.dialogs.view.company")
                      : t("dealer.payments.dialogs.view.dealer")}
                  </Label>
                  <p className="font-medium">
                    {selectedRequest.direction === "COMPANY_TO_DEALER"
                      ? selectedRequest.company?.name || "N/A"
                      : selectedRequest.dealer?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <Label>{t("dealer.payments.dialogs.view.dueAmount")}</Label>
                  <p className="font-medium text-lg">
                    {formatCurrency(selectedRequest.amount)}
                  </p>
                </div>
                {selectedRequest.companySale && (
                  <>
                    <div>
                      <Label>{t("dealer.payments.dialogs.view.invoiceNumber")}</Label>
                      <p className="font-medium">
                        {selectedRequest.companySale.invoiceNumber || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label>{t("dealer.payments.dialogs.view.dueAmount")}</Label>
                      <p className="font-medium">
                        {formatCurrency(
                          Number(selectedRequest.companySale.dueAmount || 0)
                        )}
                      </p>
                    </div>
                  </>
                )}
                {selectedRequest.paymentMethod && (
                  <div>
                    <Label>{t("dealer.payments.dialogs.view.paymentMethod")}</Label>
                    <p className="font-medium">
                      {formatPaymentMethod(selectedRequest.paymentMethod)}
                    </p>
                  </div>
                )}
                {selectedRequest.paymentReference && (
                  <div>
                    <Label>{t("dealer.payments.dialogs.view.paymentReference")}</Label>
                    <p className="font-medium">
                      {selectedRequest.paymentReference}
                    </p>
                  </div>
                )}
                {selectedRequest.paymentDate && (
                  <div>
                    <Label>{t("dealer.payments.dialogs.view.paymentDate")}</Label>
                    <p className="font-medium">
                      <DateDisplay date={selectedRequest.paymentDate} />
                    </p>
                  </div>
                )}
              </div>
              {selectedRequest.description && (
                <div>
                  <Label>{t("dealer.payments.dialogs.view.descriptionLabel")}</Label>
                  <p className="text-sm">{selectedRequest.description}</p>
                </div>
              )}
              {selectedRequest.reviewNotes && (
                <div>
                  <Label>{t("dealer.payments.dialogs.view.reviewNotes")}</Label>
                  <p className="text-sm">{selectedRequest.reviewNotes}</p>
                </div>
              )}
              {selectedRequest.paymentReceiptUrl && (
                <div>
                  <Label>{t("dealer.payments.dialogs.view.receipt")}</Label>
                  <div className="mt-2">
                    <a
                      href={selectedRequest.paymentReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      <Image className="h-4 w-4" />
                      {t("dealer.payments.dialogs.view.viewReceipt")}
                    </a>
                    <div className="mt-2 relative aspect-video w-full max-w-sm rounded-lg border overflow-hidden bg-muted">
                      <img
                        src={selectedRequest.paymentReceiptUrl}
                        alt="Payment Receipt"
                        className="object-contain w-full h-full"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewRequestOpen(false)}>
              {t("dealer.payments.dialogs.view.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept & submit proof (one go) – for received PENDING requests */}
      <Dialog
        open={isAcceptAndProofDialogOpen}
        onOpenChange={(open) => {
          setIsAcceptAndProofDialogOpen(open);
          if (!open) {
            setPaymentMethod("CASH");
            setPaymentReference("");
            setPaymentReceiptUrl("");
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("dealer.payments.dialogs.acceptProof.title")}</DialogTitle>
            <DialogDescription>
              {t("dealer.payments.dialogs.acceptProof.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRequest && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>{t("dealer.payments.dialogs.common.amount")}:</span>
                  <span className="font-bold">
                    {formatCurrency(selectedRequest.amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("dealer.payments.dialogs.common.company")}:</span>
                  <span className="font-medium">
                    {selectedRequest.company?.name || "N/A"}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="accept-proof-payment-method">{t("dealer.payments.dialogs.common.method")}</Label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
              >
                <SelectTrigger id="accept-proof-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">{t("dealer.payments.methods.CASH")}</SelectItem>
                  <SelectItem value="BANK_TRANSFER">{t("dealer.payments.methods.BANK_TRANSFER")}</SelectItem>
                  <SelectItem value="CHEQUE">{t("dealer.payments.methods.CHEQUE")}</SelectItem>
                  <SelectItem value="UPI">{t("dealer.payments.methods.UPI")}</SelectItem>
                  <SelectItem value="OTHER">{t("dealer.payments.methods.OTHER")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accept-proof-reference">
                {t("dealer.payments.dialogs.common.reference")}
              </Label>
              <Input
                id="accept-proof-reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder={t("dealer.payments.dialogs.common.referencePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("dealer.payments.dialogs.common.receipt")}</Label>
              <ImageUpload
                value={paymentReceiptUrl}
                onChange={(url) => setPaymentReceiptUrl(url)}
                folder="payment-receipts"
                placeholder={t("dealer.payments.dialogs.common.uploadPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <DateInput
                label={t("dealer.payments.dialogs.common.date")}
                value={paymentDate}
                onChange={setPaymentDate}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAcceptAndProofDialogOpen(false)}
            >
              {t("dealer.payments.dialogs.common.cancel")}
            </Button>
            <Button
              onClick={handleAcceptAndSubmitProof}
              disabled={acceptRequestMutation.isPending || submitProofMutation.isPending}
            >
              {acceptRequestMutation.isPending || submitProofMutation.isPending
                ? t("dealer.payments.dialogs.acceptProof.submitting")
                : t("dealer.payments.dialogs.acceptProof.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Proof Dialog (for requests already accepted without proof) */}
      <Dialog
        open={isSubmitProofOpen}
        onOpenChange={(open) => {
          setIsSubmitProofOpen(open);
          if (!open) {
            setPaymentMethod("CASH");
            setPaymentReference("");
            setPaymentReceiptUrl("");
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("dealer.payments.dialogs.submitProof.title")}</DialogTitle>
            <DialogDescription>
              {t("dealer.payments.dialogs.submitProof.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRequest && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>{t("dealer.payments.dialogs.common.amount")}:</span>
                  <span className="font-bold">
                    {formatCurrency(selectedRequest.amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t("dealer.payments.dialogs.common.company")}:</span>
                  <span className="font-medium">
                    {selectedRequest.company?.name || "N/A"}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="payment-method">{t("dealer.payments.dialogs.common.method")}</Label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">{t("dealer.payments.methods.CASH")}</SelectItem>
                  <SelectItem value="BANK_TRANSFER">{t("dealer.payments.methods.BANK_TRANSFER")}</SelectItem>
                  <SelectItem value="CHEQUE">{t("dealer.payments.methods.CHEQUE")}</SelectItem>
                  <SelectItem value="UPI">{t("dealer.payments.methods.UPI")}</SelectItem>
                  <SelectItem value="OTHER">{t("dealer.payments.methods.OTHER")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-reference">
                {t("dealer.payments.dialogs.common.reference")}
              </Label>
              <Input
                id="payment-reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder={t("dealer.payments.dialogs.common.referencePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("dealer.payments.dialogs.common.receipt")}</Label>
              <ImageUpload
                value={paymentReceiptUrl}
                onChange={(url) => setPaymentReceiptUrl(url)}
                folder="payment-receipts"
                placeholder={t("dealer.payments.dialogs.common.uploadPlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <DateInput
                label={t("dealer.payments.dialogs.common.date")}
                value={paymentDate}
                onChange={setPaymentDate}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSubmitProofOpen(false)}
            >
              {t("dealer.payments.dialogs.common.cancel")}
            </Button>
            <Button
              onClick={handleSubmitProof}
              disabled={submitProofMutation.isPending}
            >
              {submitProofMutation.isPending
                ? t("dealer.payments.dialogs.submitProof.submitting")
                : t("dealer.payments.dialogs.submitProof.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Request Dialog */}
      <Dialog
        open={isCreateRequestOpen}
        onOpenChange={setIsCreateRequestOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("dealer.payments.dialogs.create.title")}</DialogTitle>
            <DialogDescription>
              {t("dealer.payments.dialogs.create.description")}
            </DialogDescription>
          </DialogHeader>


          <div className="grid gap-3 py-3">
            <CompanySearchSelect
              value={requestCompanyId}
              onValueChange={setRequestCompanyId}
              placeholder={t("dealer.payments.dialogs.common.selectCompany")}
              label={t("dealer.payments.dialogs.common.company")}
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="request-amount">{t("dealer.payments.dialogs.common.amount")} *</Label>
                <Input
                  id="request-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={requestAmount}
                  onChange={(e) =>
                    setRequestAmount(parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <DateInput
                  label={t("dealer.payments.dialogs.common.date")}
                  value={requestPaymentDate}
                  onChange={setRequestPaymentDate}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="request-payment-method">{t("dealer.payments.dialogs.common.method")}</Label>
                <Select
                  value={requestPaymentMethod}
                  onValueChange={setRequestPaymentMethod}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">{t("dealer.payments.methods.CASH")}</SelectItem>
                    <SelectItem value="BANK_TRANSFER">{t("dealer.payments.methods.BANK_TRANSFER")}</SelectItem>
                    <SelectItem value="CHEQUE">{t("dealer.payments.methods.CHEQUE")}</SelectItem>
                    <SelectItem value="UPI">{t("dealer.payments.methods.UPI")}</SelectItem>
                    <SelectItem value="OTHER">{t("dealer.payments.methods.OTHER")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="request-payment-reference">{t("dealer.payments.dialogs.common.reference")}</Label>
                <Input
                  id="request-payment-reference"
                  value={requestPaymentReference}
                  onChange={(e) => setRequestPaymentReference(e.target.value)}
                  placeholder="Txn ID..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sale-id">{t("dealer.payments.dialogs.common.saleId")}</Label>
              <Input
                id="sale-id"
                value={requestSaleId}
                onChange={(e) => setRequestSaleId(e.target.value)}
                placeholder={t("dealer.payments.dialogs.common.saleIdPlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="request-description">{t("dealer.payments.dialogs.common.description")}</Label>
              <Textarea
                id="request-description"
                value={requestDescription}
                onChange={(e) => setRequestDescription(e.target.value)}
                placeholder={t("dealer.payments.dialogs.common.descriptionPlaceholder")}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("dealer.payments.dialogs.common.receipt")}</Label>
              <ImageUpload
                value={requestPaymentReceiptUrl}
                onChange={(url) => setRequestPaymentReceiptUrl(url)}
                folder="payment-receipts"
                placeholder={t("dealer.payments.dialogs.common.uploadPlaceholder")}
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded-md text-xs text-blue-800 dark:text-blue-200">
              <strong>{t("dealer.payments.dialogs.create.note")}</strong>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateRequestOpen(false)}
            >
              {t("dealer.payments.dialogs.common.cancel")}
            </Button>
            <Button
              onClick={handleCreateRequest}
              disabled={createRequestMutation.isPending}
            >
              {createRequestMutation.isPending
                ? t("dealer.payments.dialogs.create.submitting")
                : t("dealer.payments.dialogs.create.submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!paymentToCancel}
        onOpenChange={(open) => !open && setPaymentToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dealer.payments.dialogs.cancel.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dealer.payments.dialogs.cancel.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("dealer.payments.dialogs.cancel.keep")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelRequest}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {t("dealer.payments.dialogs.cancel.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

