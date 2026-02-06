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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { Textarea } from "@/common/components/ui/textarea";
import { toast } from "sonner";
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

export default function DealerPaymentsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("received");
  const [search, setSearch] = useState("");
  const [isViewRequestOpen, setIsViewRequestOpen] = useState(false);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isSubmitProofOpen, setIsSubmitProofOpen] = useState(false);
  const [isCreateRequestOpen, setIsCreateRequestOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(
    null
  );
  const [paymentToCancel, setPaymentToCancel] = useState<string | null>(null);

  // Form state for submitting proof
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
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
    new Date().toISOString().split("T")[0]
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

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number | string | undefined | null) => {
    if (amount === undefined || amount === null) return "रू 0.00";
    const numAmount = typeof amount === "string" ? parseFloat(amount) : Number(amount);
    if (isNaN(numAmount)) return "रू 0.00";
    return `रू ${numAmount.toFixed(2)}`;
  };

  const formatPaymentMethod = (method: string | undefined | null) => {
    if (!method) return "N/A";
    return method
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "ACCEPTED":
        return (
          <Badge variant="default">
            <CheckCircle className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case "PAYMENT_SUBMITTED":
        return (
          <Badge variant="default" className="bg-yellow-600">
            <FileText className="h-3 w-3 mr-1" />
            Payment Submitted
          </Badge>
        );
      case "VERIFIED":
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "CANCELLED":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleAcceptRequest = async () => {
    if (!selectedRequest) return;

    try {
      await acceptRequestMutation.mutateAsync(selectedRequest.id);
      toast.success("Payment request accepted");
      setIsAcceptDialogOpen(false);
      setIsViewRequestOpen(false);
      setSelectedRequest(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to accept request");
    }
  };

  const handleSubmitProof = async () => {
    if (!selectedRequest || !paymentMethod) {
      toast.error("Please fill in all required fields");
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
      toast.success("Payment proof submitted successfully");
      setIsSubmitProofOpen(false);
      setIsViewRequestOpen(false);
      setSelectedRequest(null);
      setPaymentMethod("CASH");
      setPaymentReference("");
      setPaymentReceiptUrl("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit proof");
    }
  };

  const handleCreateRequest = async () => {
    if (!requestCompanyId || !requestAmount || requestAmount <= 0 || !requestPaymentMethod) {
      toast.error("Please fill in all required fields");
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
      toast.success("Payment proof submitted successfully. Waiting for company verification.");
      setIsCreateRequestOpen(false);
      setRequestCompanyId("");
      setRequestSaleId("");
      setRequestAmount(0);
      setRequestDescription("");
      setRequestPaymentMethod("CASH");
      setRequestPaymentReference("");
      setRequestPaymentReceiptUrl("");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to create request";
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
      toast.success("Payment request cancelled successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to cancel request");
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
              <span className="hidden sm:inline">Back to Companies</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Payment Requests
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage payment requests with companies
          </p>
        </div>
        <Button onClick={() => setIsCreateRequestOpen(true)} size="sm" className="w-full md:w-auto">
          <Plus className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
          <span className="hidden sm:inline">Submit </span>Payment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Pending</CardTitle>
            <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{pendingReceived}</div>
            <p className="text-[9px] md:text-xs text-muted-foreground">
              Awaiting
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-green-600">
              {acceptedRequests}
            </div>
            <p className="text-[9px] md:text-xs text-muted-foreground">
              Ready
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Amount</CardTitle>
            <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold truncate">
              <span className="hidden md:inline">{formatCurrency(pendingAmount)}</span>
              <span className="md:hidden">रू{Math.round(pendingAmount).toLocaleString()}</span>
            </div>
            <p className="text-[9px] md:text-xs text-muted-foreground">
              Pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="received" className="flex-1 md:flex-none text-xs md:text-sm">Received</TabsTrigger>
          <TabsTrigger value="sent" className="flex-1 md:flex-none text-xs md:text-sm">Sent</TabsTrigger>
        </TabsList>

        {/* Received Requests Tab */}
        <TabsContent value="received" className="space-y-4">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle className="text-base md:text-lg">Received Requests</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    From companies
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
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
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="ACCEPTED">Accepted</SelectItem>
                      <SelectItem value="PAYMENT_SUBMITTED">Submitted</SelectItem>
                      <SelectItem value="VERIFIED">Verified</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={receivedRequests}
                loading={receivedLoading}
                emptyMessage="No payment requests. Requests will appear here."
                columns={[
                  {
                    key: 'createdAt',
                    label: 'Date',
                    width: '90px',
                    render: (val) => formatDate(val)
                  },
                  {
                    key: 'company',
                    label: 'Company',
                    width: '100px',
                    render: (val) => <span className="font-medium truncate max-w-[80px] block">{val?.name || "N/A"}</span>
                  },
                  {
                    key: 'companySale',
                    label: 'Invoice',
                    width: '80px',
                    render: (val) => val?.invoiceNumber || "General"
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    align: 'right',
                    width: '90px',
                    render: (val) => <span className="font-semibold">{formatCurrency(val)}</span>
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    width: '110px',
                    render: (val) => getStatusBadge(val)
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
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
                              setIsAcceptDialogOpen(true);
                            }}
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
                              setIsSubmitProofOpen(true);
                            }}
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
                  <CardTitle className="text-base md:text-lg">Sent Requests</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Submitted to companies
                  </CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
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
                emptyMessage="No requests sent. Submit a payment to get started."
                columns={[
                  {
                    key: 'createdAt',
                    label: 'Date',
                    width: '90px',
                    render: (val) => formatDate(val)
                  },
                  {
                    key: 'company',
                    label: 'Company',
                    width: '100px',
                    render: (val) => <span className="font-medium truncate max-w-[80px] block">{val?.name || "N/A"}</span>
                  },
                  {
                    key: 'companySale',
                    label: 'Invoice',
                    width: '80px',
                    render: (val) => val?.invoiceNumber || "General"
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    align: 'right',
                    width: '90px',
                    render: (val) => <span className="font-semibold">{formatCurrency(val)}</span>
                  },
                  {
                    key: 'paymentMethod',
                    label: 'Method',
                    width: '80px',
                    render: (val) => formatPaymentMethod(val)
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    width: '110px',
                    render: (val) => getStatusBadge(val)
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
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
            <DialogTitle>Payment Request Details</DialogTitle>
            <DialogDescription>
              View payment request information
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Request Number</Label>
                  <p className="font-medium">{selectedRequest.requestNumber}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </div>
                <div>
                  <Label>
                    {selectedRequest.direction === "COMPANY_TO_DEALER"
                      ? "Company"
                      : "Dealer"}
                  </Label>
                  <p className="font-medium">
                    {selectedRequest.direction === "COMPANY_TO_DEALER"
                      ? selectedRequest.company?.name || "N/A"
                      : selectedRequest.dealer?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p className="font-medium text-lg">
                    {formatCurrency(selectedRequest.amount)}
                  </p>
                </div>
                {selectedRequest.companySale && (
                  <>
                    <div>
                      <Label>Invoice Number</Label>
                      <p className="font-medium">
                        {selectedRequest.companySale.invoiceNumber || "N/A"}
                      </p>
                    </div>
                    <div>
                      <Label>Due Amount</Label>
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
                    <Label>Payment Method</Label>
                    <p className="font-medium">
                      {selectedRequest.paymentMethod}
                    </p>
                  </div>
                )}
                {selectedRequest.paymentReference && (
                  <div>
                    <Label>Payment Reference</Label>
                    <p className="font-medium">
                      {selectedRequest.paymentReference}
                    </p>
                  </div>
                )}
                {selectedRequest.paymentDate && (
                  <div>
                    <Label>Payment Date</Label>
                    <p className="font-medium">
                      {formatDate(selectedRequest.paymentDate)}
                    </p>
                  </div>
                )}
              </div>
              {selectedRequest.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm">{selectedRequest.description}</p>
                </div>
              )}
              {selectedRequest.reviewNotes && (
                <div>
                  <Label>Review Notes</Label>
                  <p className="text-sm">{selectedRequest.reviewNotes}</p>
                </div>
              )}
              {selectedRequest.paymentReceiptUrl && (
                <div>
                  <Label>Payment Receipt</Label>
                  <div className="mt-2">
                    <a
                      href={selectedRequest.paymentReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline"
                    >
                      <Image className="h-4 w-4" />
                      View Receipt Image
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
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accept Request Dialog */}
      <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Payment Request</DialogTitle>
            <DialogDescription>
              Accept this payment request and proceed to submit payment proof
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>Amount:</span>
                  <span className="font-bold">
                    {formatCurrency(selectedRequest.amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Company:</span>
                  <span className="font-medium">
                    {selectedRequest.company?.name || "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAcceptDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAcceptRequest}
              disabled={acceptRequestMutation.isPending}
            >
              {acceptRequestMutation.isPending
                ? "Accepting..."
                : "Accept Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Proof Dialog */}
      <Dialog open={isSubmitProofOpen} onOpenChange={setIsSubmitProofOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit Payment Proof</DialogTitle>
            <DialogDescription>
              Submit payment proof for verification
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedRequest && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span>Amount:</span>
                  <span className="font-bold">
                    {formatCurrency(selectedRequest.amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Company:</span>
                  <span className="font-medium">
                    {selectedRequest.company?.name || "N/A"}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="payment-method">Payment Method *</Label>
              <Select
                value={paymentMethod}
                onValueChange={setPaymentMethod}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-reference">
                Payment Reference (Transaction ID, UPI ID, etc.)
              </Label>
              <Input
                id="payment-reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Enter transaction reference..."
              />
            </div>

            <div className="space-y-2">
              <Label>Receipt Image (Optional)</Label>
              <ImageUpload
                value={paymentReceiptUrl}
                onChange={(url) => setPaymentReceiptUrl(url)}
                folder="payment-receipts"
                placeholder="Upload receipt image"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-date">Payment Date *</Label>
              <Input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSubmitProofOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitProof}
              disabled={submitProofMutation.isPending}
            >
              {submitProofMutation.isPending
                ? "Submitting..."
                : "Submit Proof"}
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
            <DialogTitle>Submit Payment Proof</DialogTitle>
            <DialogDescription>
              Submit proof of payment you've already made to the company for verification and balance reduction
            </DialogDescription>
          </DialogHeader>


          <div className="grid gap-3 py-3">
            <CompanySearchSelect
              value={requestCompanyId}
              onValueChange={setRequestCompanyId}
              placeholder="Select company"
              label="Company"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="request-amount">Amount *</Label>
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
                <Label htmlFor="request-payment-date">Date *</Label>
                <Input
                  id="request-payment-date"
                  type="date"
                  value={requestPaymentDate}
                  onChange={(e) => setRequestPaymentDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="request-payment-method">Method *</Label>
                <Select
                  value={requestPaymentMethod}
                  onValueChange={setRequestPaymentMethod}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="request-payment-reference">Reference</Label>
                <Input
                  id="request-payment-reference"
                  value={requestPaymentReference}
                  onChange={(e) => setRequestPaymentReference(e.target.value)}
                  placeholder="Txn ID..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sale-id">Sale ID (Optional)</Label>
              <Input
                id="sale-id"
                value={requestSaleId}
                onChange={(e) => setRequestSaleId(e.target.value)}
                placeholder="Enter sale ID if known"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="request-description">Description</Label>
              <Textarea
                id="request-description"
                value={requestDescription}
                onChange={(e) => setRequestDescription(e.target.value)}
                placeholder="Add note..."
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Receipt Image</Label>
              <ImageUpload
                value={requestPaymentReceiptUrl}
                onChange={(url) => setRequestPaymentReceiptUrl(url)}
                folder="payment-receipts"
                placeholder="Upload receipt"
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded-md text-xs text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> Submitting proof for verification.
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateRequestOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRequest}
              disabled={createRequestMutation.isPending}
            >
              {createRequestMutation.isPending
                ? "Submitting..."
                : "Submit Payment"}
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
            <AlertDialogTitle>Cancel Payment Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this payment request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep It</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelRequest}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Yes, Cancel Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

