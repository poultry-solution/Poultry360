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
  useGetDealerPaymentRequests,
  useAcceptDealerPaymentRequest,
  useSubmitDealerPaymentProof,
  useCreateDealerPaymentRequest,
  useCancelDealerPaymentRequest,
  type PaymentRequest,
} from "@/fetchers/dealer/paymentRequestQueries";
import { CompanySearchSelect } from "@/common/components/forms/CompanySearchSelect";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Payment Requests
          </h1>
          <p className="text-muted-foreground">
            Manage payment requests with companies
          </p>
        </div>
        <Button onClick={() => setIsCreateRequestOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Submit Payment
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
              Awaiting acceptance
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accepted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {acceptedRequests}
            </div>
            <p className="text-xs text-muted-foreground">
              Ready for payment
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
              Total pending
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
                    Payment requests from companies
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by company or invoice..."
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
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
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
                    Payment requests from companies will appear here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivedRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(request.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {request.company?.name || "N/A"}
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
                            {/* Company-initiated requests: Dealer must accept and submit proof */}
                            {request.status === "PENDING" && request.direction === "COMPANY_TO_DEALER" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setIsAcceptDialogOpen(true);
                                }}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Accept
                              </Button>
                            )}
                            {request.status === "ACCEPTED" && request.direction === "COMPANY_TO_DEALER" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setIsSubmitProofOpen(true);
                                }}
                              >
                                <Upload className="h-4 w-4 mr-1" />
                                Submit Proof
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

        {/* Sent Requests Tab */}
        <TabsContent value="sent" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Sent Payment Requests</CardTitle>
                  <CardDescription>
                    Payment requests submitted to companies
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 w-[200px]"
                    />
                  </div>
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
                    Submit a payment to get started.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sentRequests.map((request) => {
                      console.log('Dealer Sent Request:', {
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
                          {request.company?.name || "N/A"}
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
                      );
                    })}
                  </TableBody>
                </Table>
              )}
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
              <Label htmlFor="payment-receipt">Receipt URL (Optional)</Label>
              <Input
                id="payment-receipt"
                value={paymentReceiptUrl}
                onChange={(e) => setPaymentReceiptUrl(e.target.value)}
                placeholder="Enter receipt URL..."
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
          <div className="space-y-4 py-4">
            <CompanySearchSelect
              value={requestCompanyId}
              onValueChange={setRequestCompanyId}
              placeholder="Search and select company..."
              label="Company"
              required
            />

            <div className="space-y-2">
              <Label htmlFor="sale-id">Sale ID (Optional)</Label>
              <Input
                id="sale-id"
                value={requestSaleId}
                onChange={(e) => setRequestSaleId(e.target.value)}
                placeholder="Enter sale ID (optional)"
              />
            </div>

            <div className="space-y-2">
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
                placeholder="Enter amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-description">Description (Optional)</Label>
              <Textarea
                id="request-description"
                value={requestDescription}
                onChange={(e) => setRequestDescription(e.target.value)}
                placeholder="Add description..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-payment-method">Payment Method *</Label>
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

            <div className="space-y-2">
              <Label htmlFor="request-payment-reference">
                Payment Reference (Transaction ID, Cheque #, etc.)
              </Label>
              <Input
                id="request-payment-reference"
                value={requestPaymentReference}
                onChange={(e) => setRequestPaymentReference(e.target.value)}
                placeholder="Enter payment reference..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-payment-receipt">Receipt URL (Optional)</Label>
              <Input
                id="request-payment-receipt"
                value={requestPaymentReceiptUrl}
                onChange={(e) => setRequestPaymentReceiptUrl(e.target.value)}
                placeholder="Enter receipt URL..."
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-md">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> You are submitting proof that you have already paid. The company will verify and reduce your outstanding balance.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-payment-date">Payment Date *</Label>
              <Input
                id="request-payment-date"
                type="date"
                value={requestPaymentDate}
                onChange={(e) => setRequestPaymentDate(e.target.value)}
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
                ? "Submitting..."
                : "Submit Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

