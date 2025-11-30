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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
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
import { useGetCompanySales } from "@/fetchers/company/companySaleQueries";

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
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [verifyApproved, setVerifyApproved] = useState(true);
  const [verifyNotes, setVerifyNotes] = useState("");

  // Form state for creating request
  const [selectedDealerId, setSelectedDealerId] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState("");
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
  const { data: salesData } = useGetCompanySales({ limit: 1000 });

  const createRequestMutation = useCreateCompanyPaymentRequest();
  const acceptRequestMutation = useAcceptCompanyPaymentRequest();
  const verifyRequestMutation = useVerifyCompanyPaymentRequest();
  const cancelRequestMutation = useCancelCompanyPaymentRequest();

  const receivedRequests = receivedData?.data || [];
  const sentRequests = sentData?.data || [];
  const dealers = dealersData?.data || [];
  const sales = salesData?.data || [];

  // Filter sales for selected dealer
  const dealerSales =
    selectedDealerId && sales
      ? sales.filter((s: any) => s.dealerId === selectedDealerId)
      : [];

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

  const handleCreateRequest = async () => {
    if (!selectedDealerId || !requestAmount || requestAmount <= 0) {
      toast.error("Please select a dealer and enter a valid amount");
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        dealerId: selectedDealerId,
        amount: requestAmount,
        companySaleId: selectedSaleId || undefined,
        description: requestDescription || undefined,
      });

      toast.success("Payment request created successfully");
      setIsCreateRequestOpen(false);
      setSelectedDealerId("");
      setSelectedSaleId("");
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

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to cancel this payment request?")) {
      return;
    }

    try {
      await cancelRequestMutation.mutateAsync(requestId);
      toast.success("Payment request cancelled successfully");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to cancel request";
      toast.error(errorMessage);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Payment Requests
          </h1>
          <p className="text-muted-foreground">
            Manage payment requests with dealers
          </p>
        </div>
        <Button onClick={() => setIsCreateRequestOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Request
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReceived}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting verification
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {verifiedToday}
            </div>
            <p className="text-xs text-muted-foreground">
              Processed payments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(pendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting verification
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="received">Received Requests</TabsTrigger>
          <TabsTrigger value="sent">Sent Requests</TabsTrigger>
        </TabsList>

        {/* Received Requests Tab */}
        <TabsContent value="received" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Received Payment Requests</CardTitle>
                  <CardDescription>
                    Payment requests submitted by dealers for verification
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by dealer or invoice..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 w-[200px]"
                    />
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="ACCEPTED">Accepted</SelectItem>
                      <SelectItem value="PAYMENT_SUBMITTED">Payment Submitted</SelectItem>
                      <SelectItem value="VERIFIED">Verified</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {receivedLoading ? (
                <div className="text-center py-8">Loading requests...</div>
              ) : receivedRequests.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No payment requests
                  </h3>
                  <p className="text-muted-foreground">
                    Payment requests from dealers will appear here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivedRequests.map((request) => {
                      console.log('Company Received Request:', {
                        id: request.id,
                        status: request.status,
                        direction: request.direction,
                        paymentMethod: request.paymentMethod
                      });
                      return (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(request.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {request.dealer?.name || "N/A"}
                        </TableCell>
                        <TableCell>
                          {request.companySale?.invoiceNumber || "General"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(request.amount)}
                        </TableCell>
                        <TableCell>
                          {formatPaymentMethod(request.paymentMethod)}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsViewRequestOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {request.status === "PENDING" && request.direction === "DEALER_TO_COMPANY" && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await acceptRequestMutation.mutateAsync(request.id);
                                      toast.success("Payment request accepted");
                                    } catch (error: any) {
                                      const errorMessage = error.response?.data?.message || error.message || "Failed to accept request";
                                      toast.error(errorMessage);
                                    }
                                  }}
                                  disabled={acceptRequestMutation.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  {acceptRequestMutation.isPending ? "Accepting..." : "Accept"}
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setVerifyApproved(false);
                                    setIsVerifyDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {request.status === "PAYMENT_SUBMITTED" && request.direction === "DEALER_TO_COMPANY" && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setVerifyApproved(true);
                                    setIsVerifyDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Accept Payment Proof
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setVerifyApproved(false);
                                    setIsVerifyDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sent Requests Tab */}
        <TabsContent value="sent" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sent Payment Requests</CardTitle>
                  <CardDescription>
                    Payment requests sent to dealers
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by dealer or invoice..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 w-[200px]"
                    />
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="ACCEPTED">Accepted</SelectItem>
                      <SelectItem value="PAYMENT_SUBMITTED">Payment Submitted</SelectItem>
                      <SelectItem value="VERIFIED">Verified</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {sentLoading ? (
                <div className="text-center py-8">Loading requests...</div>
              ) : sentRequests.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No payment requests sent
                  </h3>
                  <p className="text-muted-foreground">
                    Create a payment request to get started.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sentRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(request.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {request.dealer?.name || "N/A"}
                        </TableCell>
                        <TableCell>
                          {request.companySale?.invoiceNumber || "General"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(request.amount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsViewRequestOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {request.status === "PAYMENT_SUBMITTED" && request.direction === "COMPANY_TO_DEALER" && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setVerifyApproved(true);
                                    setIsVerifyDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Accept Payment Proof
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setVerifyApproved(false);
                                    setIsVerifyDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {request.status === "PENDING" && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleCancelRequest(request.id)}
                                disabled={cancelRequestMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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
                  setSelectedSaleId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select dealer" />
                </SelectTrigger>
                <SelectContent>
                  {dealers.map((dealer: any) => (
                    <SelectItem key={dealer.id} value={dealer.id}>
                      {dealer.name} - {dealer.contact}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedDealerId && dealerSales.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="sale">Sale (Optional)</Label>
                <Select
                  value={selectedSaleId || "GENERAL"}
                  onValueChange={(value) => {
                    if (value === "GENERAL") {
                      setSelectedSaleId("");
                    } else {
                      setSelectedSaleId(value);
                      const sale = dealerSales.find((s: any) => s.id === value);
                      if (sale) {
                        setRequestAmount(Number(sale.dueAmount || 0));
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sale (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General Balance</SelectItem>
                    {dealerSales
                      .filter((s: any) => Number(s.dueAmount || 0) > 0)
                      .map((sale: any) => (
                        <SelectItem key={sale.id} value={sale.id}>
                          {sale.invoiceNumber || sale.id.slice(0, 8)} - Due:{" "}
                          {formatCurrency(Number(sale.dueAmount || 0))}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
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
    </div>
  );
}
