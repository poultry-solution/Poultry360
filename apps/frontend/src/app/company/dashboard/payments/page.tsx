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
  useGetCompanyPaymentRequests,
  useCreateCompanyPaymentRequest,
  useAcceptCompanyPaymentRequest,
  useVerifyCompanyPaymentRequest,
  useCancelCompanyPaymentRequest,
  type PaymentRequest,
} from "@/fetchers/company/paymentRequestQueries";
import { useGetCompanyDealers } from "@/fetchers/company/companyDealerQueries";
import { useGetDealerAccount } from "@/fetchers/company/companyDealerAccountQueries";
import { DateDisplay } from "@/common/components/ui/date-display";

export default function CompanyPaymentsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("received");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isCreateRequestOpen, setIsCreateRequestOpen] = useState(false);
  const [isViewRequestOpen, setIsViewRequestOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(
    null
  );
  const [paymentToCancel, setPaymentToCancel] = useState<string | null>(null);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [verifyApproved, setVerifyApproved] = useState(true);
  const [verifyNotes, setVerifyNotes] = useState("");

  // Form state for creating request
  const [selectedDealerId, setSelectedDealerId] = useState("");
  const [requestAmount, setRequestAmount] = useState<number>(0);
  const [requestDescription, setRequestDescription] = useState("");

  // Queries
  const { data: receivedData, isLoading: receivedLoading } =
    useGetCompanyPaymentRequests({
      direction: "DEALER_TO_COMPANY",
      status: statusFilter !== "ALL" ? statusFilter : undefined,
    });
  const { data: sentData, isLoading: sentLoading } =
    useGetCompanyPaymentRequests({
      direction: "COMPANY_TO_DEALER",
      status: statusFilter !== "ALL" ? statusFilter : undefined,
    });
  const { data: dealersData } = useGetCompanyDealers({ limit: 100 });

  // Fetch dealer account when dealer is selected
  const { data: dealerAccount } = useGetDealerAccount(selectedDealerId);

  const createRequestMutation = useCreateCompanyPaymentRequest();
  const acceptRequestMutation = useAcceptCompanyPaymentRequest();
  const verifyRequestMutation = useVerifyCompanyPaymentRequest();
  const cancelRequestMutation = useCancelCompanyPaymentRequest();

  const receivedRequests = receivedData?.data || [];
  const sentRequests = sentData?.data || [];
  const dealers = dealersData?.data || [];

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

  const handleCreateRequest = async () => {
    if (!selectedDealerId || !requestAmount || requestAmount <= 0) {
      toast.error("Please select a dealer and enter a valid amount");
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        dealerId: selectedDealerId,
        amount: requestAmount,
        description: requestDescription || undefined,
      });

      toast.success("Payment request created successfully");
      setIsCreateRequestOpen(false);
      setSelectedDealerId("");
      setRequestAmount(0);
      setRequestDescription("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create request");
    }
  };

  const handleVerifyRequest = async () => {
    if (!selectedRequest) return;

    try {
      await verifyRequestMutation.mutateAsync({
        id: selectedRequest.id,
        isApproved: verifyApproved,
        reviewNotes: verifyNotes || undefined,
      });

      toast.success(
        verifyApproved
          ? "Payment verified and approved"
          : "Payment request rejected"
      );
      setIsVerifyDialogOpen(false);
      setIsViewRequestOpen(false);
      setSelectedRequest(null);
      setVerifyNotes("");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to verify request";
      toast.error(errorMessage);
      console.error("Verify payment request error:", error);
    }
  };

  const handleCancelRequest = (requestId: string) => {
    setPaymentToCancel(requestId);
  };

  const confirmCancelRequest = async () => {
    if (!paymentToCancel) return;
    try {
      await cancelRequestMutation.mutateAsync(paymentToCancel);
      toast.success("Payment request cancelled");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to cancel request";
      toast.error(errorMessage);
    } finally {
      setPaymentToCancel(null);
    }
  };

  const pendingReceived = receivedRequests.filter(
    (r) => r.status === "PAYMENT_SUBMITTED"
  ).length;
  const verifiedToday = receivedRequests.filter(
    (r) =>
      r.status === "VERIFIED" &&
      r.reviewedAt &&
      new Date(r.reviewedAt).toDateString() === new Date().toDateString()
  ).length;
  const pendingAmount = receivedRequests
    .filter((r) => r.status === "PAYMENT_SUBMITTED")
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Payment Requests
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage payment requests with dealers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/company/dashboard/payments/history")}>
            <Clock className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </Button>
          <Button onClick={() => setIsCreateRequestOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Create Request</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold">{pendingReceived}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Awaiting verification</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Verified</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold text-green-600">{verifiedToday}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 md:p-6 pb-1 md:pb-2">
            <CardTitle className="text-xs md:text-sm font-medium">Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-lg md:text-2xl font-bold">रू {Math.round(pendingAmount)}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="received" className="flex-1 md:flex-none">Received</TabsTrigger>
          <TabsTrigger value="sent" className="flex-1 md:flex-none">Sent</TabsTrigger>
        </TabsList>

        {/* Received Requests Tab */}
        <TabsContent value="received" className="space-y-4">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base md:text-lg">Received Payment Requests</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    {receivedRequests.length} requests from dealers
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 w-full sm:w-[150px]"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[110px] sm:w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PAYMENT_SUBMITTED">Submitted</SelectItem>
                      <SelectItem value="VERIFIED">Verified</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={receivedRequests}
                loading={receivedLoading}
                emptyMessage="No payment requests from dealers."
                columns={[
                  {
                    key: 'createdAt',
                    label: 'Date',
                    width: '90px',
                    render: (val) => <DateDisplay date={val} />
                  },
                  {
                    key: 'dealer',
                    label: 'Dealer',
                    width: '120px',
                    render: (val) => <span className="font-medium">{val?.name || "N/A"}</span>
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    align: 'right',
                    width: '100px',
                    render: (val) => <span className="font-semibold">{formatCurrency(val)}</span>
                  },
                  {
                    key: 'paymentMethod',
                    label: 'Method',
                    width: '90px',
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
                    width: '180px',
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
                        {request.status === "PENDING" && request.direction === "DEALER_TO_COMPANY" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={async () => {
                                try {
                                  await acceptRequestMutation.mutateAsync(request.id);
                                  toast.success("Payment request accepted");
                                } catch (error: any) {
                                  toast.error(error.response?.data?.message || "Failed");
                                }
                              }}
                              disabled={acceptRequestMutation.isPending}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                              onClick={() => {
                                setSelectedRequest(request);
                                setVerifyApproved(false);
                                setIsVerifyDialogOpen(true);
                              }}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {request.status === "PAYMENT_SUBMITTED" && request.direction === "DEALER_TO_COMPANY" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => {
                                setSelectedRequest(request);
                                setVerifyApproved(true);
                                setIsVerifyDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                              onClick={() => {
                                setSelectedRequest(request);
                                setVerifyApproved(false);
                                setIsVerifyDialogOpen(true);
                              }}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base md:text-lg">Sent Payment Requests</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    {sentRequests.length} requests sent to dealers
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 w-full sm:w-[150px]"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[110px] sm:w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="PAYMENT_SUBMITTED">Submitted</SelectItem>
                      <SelectItem value="VERIFIED">Verified</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={sentRequests}
                loading={sentLoading}
                emptyMessage="No payment requests sent. Create one to get started."
                columns={[
                  {
                    key: 'createdAt',
                    label: 'Date',
                    width: '90px',
                    render: (val) => <DateDisplay date={val} />
                  },
                  {
                    key: 'dealer',
                    label: 'Dealer',
                    width: '120px',
                    render: (val) => <span className="font-medium">{val?.name || "N/A"}</span>
                  },
                  {
                    key: 'companySale',
                    label: 'Invoice',
                    width: '90px',
                    render: (val) => val?.invoiceNumber || "Account"
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    align: 'right',
                    width: '100px',
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
                    width: '140px',
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
                        {request.status === "PAYMENT_SUBMITTED" && request.direction === "COMPANY_TO_DEALER" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => {
                                setSelectedRequest(request);
                                setVerifyApproved(true);
                                setIsVerifyDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                              onClick={() => {
                                setSelectedRequest(request);
                                setVerifyApproved(false);
                                setIsVerifyDialogOpen(true);
                              }}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {request.status === "PENDING" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleCancelRequest(request.id)}
                            disabled={cancelRequestMutation.isPending}
                          >
                            <XCircle className="h-3 w-3" />
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

      {/* Create Request Dialog */}
      <Dialog open={isCreateRequestOpen} onOpenChange={setIsCreateRequestOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Payment Request</DialogTitle>
            <DialogDescription>
              Send a payment request to a dealer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dealer">Dealer *</Label>
              <Select
                value={selectedDealerId}
                onValueChange={(value) => {
                  setSelectedDealerId(value);
                  if (dealerAccount) {
                    setRequestAmount(Math.max(0, Number(dealerAccount.balance)));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dealer" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {dealers.map((dealer: any) => (
                    <SelectItem key={dealer.id} value={dealer.id}>
                      {dealer.name} - {dealer.contact}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDealerId && (
              <>
                {dealerAccount && (
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Account Balance:</span>
                      <span className={`font-bold ${Number(dealerAccount.balance) > 0 ? "text-red-600" : Number(dealerAccount.balance) < 0 ? "text-green-600" : ""}`}>
                        {formatCurrency(dealerAccount.balance)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Number(dealerAccount.balance) > 0
                        ? "Dealer owes company"
                        : Number(dealerAccount.balance) < 0
                          ? "Company owes dealer (advance)"
                          : "No balance"}
                    </div>
                  </div>
                )}

              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={requestAmount}
                onChange={(e) =>
                  setRequestAmount(parseFloat(e.target.value) || 0)
                }
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={requestDescription}
                onChange={(e) => setRequestDescription(e.target.value)}
                placeholder="Add description..."
                rows={3}
              />
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
                ? "Creating..."
                : "Create Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  <Label>Dealer</Label>
                  <p className="font-medium">
                    {selectedRequest.dealer?.name || "N/A"}
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
                      <Label>Sale Total Amount</Label>
                      <p className="font-medium">
                        {formatCurrency(
                          Number(selectedRequest.companySale.totalAmount || 0)
                        )}
                      </p>
                    </div>
                    {selectedRequest.companySale.account && (
                      <div>
                        <Label>Current Account Balance</Label>
                        <p className={`font-medium ${Number(selectedRequest.companySale.account.balance) > 0 ? "text-red-600" : Number(selectedRequest.companySale.account.balance) < 0 ? "text-green-600" : ""}`}>
                          {formatCurrency(
                            Number(selectedRequest.companySale.account.balance || 0)
                          )}
                        </p>
                      </div>
                    )}
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
                      <DateDisplay date={selectedRequest.paymentDate} />
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

      {/* Verify Request Dialog */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {verifyApproved ? "Approve Payment" : "Reject Payment"}
            </DialogTitle>
            <DialogDescription>
              {verifyApproved
                ? "Verify and approve this payment request"
                : "Reject this payment request"}
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
                  <span>Dealer:</span>
                  <span className="font-medium">
                    {selectedRequest.dealer?.name || "N/A"}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">
                {verifyApproved ? "Notes (Optional)" : "Rejection Reason *"}
              </Label>
              <Textarea
                id="notes"
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder={
                  verifyApproved
                    ? "Add notes..."
                    : "Enter rejection reason..."
                }
                rows={3}
                required={!verifyApproved}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsVerifyDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyRequest}
              disabled={verifyRequestMutation.isPending}
              variant={verifyApproved ? "default" : "destructive"}
              className={!verifyApproved ? "text-black" : ""}
            >
              {verifyRequestMutation.isPending
                ? "Processing..."
                : verifyApproved
                  ? "Approve"
                  : "Reject"}
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
