"use client";

import { useState } from "react";
import { DollarSign, Clock, CheckCircle, XCircle, Send, Plus, ArrowLeft } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/common/components/ui/card";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { useRouter } from "next/navigation";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/common/components/ui/dialog";
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

import {
  useGetFarmerPaymentRequests,
  useGetFarmerPaymentRequestStatistics,
  useRespondToPaymentRequest,
} from "@/fetchers/payment/paymentRequestQueries";
import { useCreateFarmerPaymentRequest } from "@/fetchers/farmer/farmerPaymentRequestQueries";
import { useGetFarmerDealers } from "@/fetchers/farmer/farmerVerificationQueries";
import { useI18n } from "@/i18n/useI18n";
import { DateDisplay } from "@/common/components/ui/date-display";
import { toast } from "sonner";
import { ImageUpload } from "@/common/components/ui/image-upload";

export default function FarmerPaymentRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const { t } = useI18n();
  const router = useRouter();

  // Queries
  const { data: requestsData, isLoading } = useGetFarmerPaymentRequests({
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  });

  const { data: statsData } = useGetFarmerPaymentRequestStatistics();
  const { data: dealersData } = useGetFarmerDealers();

  // Submit proof state
  const [isSubmitProofOpen, setIsSubmitProofOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [proofPaymentMethod, setProofPaymentMethod] = useState<string>("");
  const [proofReference, setProofReference] = useState<string>("");
  const [proofReceiptUrl, setProofReceiptUrl] = useState<string>("");

  // Create payment request state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDealerId, setCreateDealerId] = useState("");
  const [createAmount, setCreateAmount] = useState<number>(0);
  const [createPaymentMethod, setCreatePaymentMethod] = useState("");
  const [createReference, setCreateReference] = useState("");
  const [createDate, setCreateDate] = useState(new Date().toISOString().split("T")[0]);
  const [createDescription, setCreateDescription] = useState("");
  const [createReceiptUrl, setCreateReceiptUrl] = useState("");

  // Mutations
  const respondMutation = useRespondToPaymentRequest();
  const createMutation = useCreateFarmerPaymentRequest();

  const connectedDealers = dealersData?.data || [];

  const handleSubmitProof = async () => {
    if (!selectedRequest) return;
    if (!proofPaymentMethod && !proofReference) {
      toast.error("Please provide payment method or reference");
      return;
    }

    try {
      await respondMutation.mutateAsync({
        requestId: selectedRequest.id,
        paymentMethod: proofPaymentMethod || undefined,
        paymentReference: proofReference || undefined,
        paymentDate: new Date().toISOString(),
        proofOfPaymentUrl: proofReceiptUrl || undefined,
      });
      toast.success("Payment proof submitted successfully");
      setIsSubmitProofOpen(false);
      setSelectedRequest(null);
      setProofPaymentMethod("");
      setProofReference("");
      setProofReceiptUrl("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to submit proof");
    }
  };

  const handleCreatePaymentRequest = async () => {
    if (!createDealerId || !createAmount || createAmount <= 0) {
      toast.error("Please select a dealer and enter a valid amount");
      return;
    }
    if (!createPaymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    try {
      await createMutation.mutateAsync({
        dealerId: createDealerId,
        amount: createAmount,
        paymentMethod: createPaymentMethod,
        paymentReference: createReference || undefined,
        paymentDate: createDate || new Date().toISOString().split("T")[0],
        description: createDescription || undefined,
        receiptImageUrl: createReceiptUrl || undefined,
      });
      toast.success("Payment request sent to dealer. They can accept or reject it.");
      setIsCreateOpen(false);
      setCreateDealerId("");
      setCreateAmount(0);
      setCreatePaymentMethod("");
      setCreateReference("");
      setCreateDate(new Date().toISOString().split("T")[0]);
      setCreateDescription("");
      setCreateReceiptUrl("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create payment request");
    }
  };

  const formatCurrency = (amount: number | string) => {
    return `रू ${Number(amount).toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: (
        <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
          <Clock className="h-3 w-3 mr-1" />
          {t("farmer.paymentRequests.statusPending")}
        </Badge>
      ),
      APPROVED: (
        <Badge variant="outline" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          {t("farmer.paymentRequests.statusApproved")}
        </Badge>
      ),
      REJECTED: (
        <Badge variant="outline" className="bg-red-100 text-red-800">
          <XCircle className="h-3 w-3 mr-1" />
          {t("farmer.paymentRequests.statusRejected")}
        </Badge>
      ),
    };
    return variants[status as keyof typeof variants] || status;
  };

  const stats = statsData?.data || {
    pending: 0,
    approved: 0,
    rejected: 0,
    total: 0,
    pendingAmount: 0,
  };

  const requests = requestsData?.data || [];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/farmer/dashboard/dealer-ledger")}
            className="h-7 w-7 md:h-8 md:w-8 shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("farmer.paymentRequests.title")}</h1>
            <p className="text-muted-foreground">{t("farmer.paymentRequests.subtitle")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("farmer.paymentRequests.help")}
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create payment request
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("farmer.paymentRequests.stats.pending")}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{stats.pending}</div>
            <p className="text-[9px] md:text-xs text-muted-foreground mt-0.5">
              <span className="hidden md:inline">{formatCurrency(stats.pendingAmount)}</span>
              <span className="md:hidden">रू{Math.round(stats.pendingAmount).toLocaleString()}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("farmer.paymentRequests.stats.approved")}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("farmer.paymentRequests.stats.rejected")}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("farmer.paymentRequests.stats.total")}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      {/* Filter */}
      <div className="flex justify-end">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-background">
            <SelectValue placeholder={t("farmer.paymentRequests.status")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("farmer.paymentRequests.statusAll")}</SelectItem>
            <SelectItem value="PENDING">{t("farmer.paymentRequests.stats.pending")}</SelectItem>
            <SelectItem value="APPROVED">{t("farmer.paymentRequests.stats.approved")}</SelectItem>
            <SelectItem value="REJECTED">{t("farmer.paymentRequests.stats.rejected")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="received">
            Received (From Dealer)
            {requests.filter((r: any) => r.requestNumber?.startsWith("DPR-")).length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {requests.filter((r: any) => r.requestNumber?.startsWith("DPR-")).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent (My Requests)
            {requests.filter((r: any) => !r.requestNumber?.startsWith("DPR-")).length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {requests.filter((r: any) => !r.requestNumber?.startsWith("DPR-")).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="text-center py-8">{t("farmer.paymentRequests.loading")}</CardContent>
            </Card>
          ) : requests.filter((r: any) => r.requestNumber?.startsWith("DPR-")).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                <p>No payment requests received from dealers.</p>
              </CardContent>
            </Card>
          ) : (
            requests
              .filter((r: any) => r.requestNumber?.startsWith("DPR-"))
              .map((request: any) => (
                <Card key={request.id}>
                  <CardHeader className="p-3 md:p-6 pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm md:text-lg">
                          {request.requestNumber}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">From Dealer</Badge>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                        {request.status === "PENDING" && !request.paymentReference && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsSubmitProofOpen(true);
                            }}
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Submit Proof
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6 pt-0">
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                      <div>
                        <div className="text-sm text-muted-foreground">{t("farmer.paymentRequests.dealer")}</div>
                        <div className="font-medium">{request.dealer?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.dealer?.contact}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">{t("farmer.paymentRequests.amount")}</div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(request.amount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">{t("farmer.paymentRequests.date")}</div>
                        <div>
                          <DateDisplay date={request.createdAt} format="long" />
                        </div>
                      </div>
                      {request.paymentReference && (
                        <div>
                          <div className="text-sm text-muted-foreground">
                            {t("farmer.paymentRequests.reference")}
                          </div>
                          <div className="text-xs md:text-sm truncate">{request.paymentReference}</div>
                        </div>
                      )}
                      {request.description && (
                        <div className="md:col-span-2">
                          <div className="text-sm text-muted-foreground">
                            {t("farmer.paymentRequests.description")}
                          </div>
                          <div className="text-xs md:text-sm">{request.description}</div>
                        </div>
                      )}
                      {request.status === "REJECTED" && request.rejectionReason && (
                        <div className="md:col-span-2">
                          <div className="text-sm text-red-600 font-medium">
                            {t("farmer.paymentRequests.rejectionReason")}
                          </div>
                          <div className="text-xs md:text-sm text-red-600">
                            {request.rejectionReason}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-3">
          {isLoading ? (
            <Card>
              <CardContent className="text-center py-8">{t("farmer.paymentRequests.loading")}</CardContent>
            </Card>
          ) : requests.filter((r: any) => !r.requestNumber?.startsWith("DPR-")).length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                <p>No payment requests sent by you.</p>
              </CardContent>
            </Card>
          ) : (
            requests
              .filter((r: any) => !r.requestNumber?.startsWith("DPR-"))
              .map((request: any) => (
                <Card key={request.id}>
                  <CardHeader className="p-3 md:p-6 pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm md:text-lg">
                          {request.requestNumber}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 flex-wrap">
                          {request.requestNumber?.startsWith("LPR-") ? (
                            <Badge variant="outline" className="text-[10px]">To Dealer (General)</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">To Dealer (Invoice Linked)</Badge>
                          )}
                          {!request.requestNumber?.startsWith("LPR-") && !request.isLedgerLevel && (
                            <>{t("farmer.paymentRequests.invoice")}: {request.dealerSale?.invoiceNumber}</>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6 pt-0">
                    <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
                      <div>
                        <div className="text-sm text-muted-foreground">{t("farmer.paymentRequests.dealer")}</div>
                        <div className="font-medium">{request.dealer?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {request.dealer?.contact}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">{t("farmer.paymentRequests.amount")}</div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(request.amount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">{t("farmer.paymentRequests.date")}</div>
                        <div>
                          <DateDisplay date={request.createdAt} format="long" />
                        </div>
                      </div>
                      {request.paymentReference && (
                        <div>
                          <div className="text-sm text-muted-foreground">
                            {t("farmer.paymentRequests.reference")}
                          </div>
                          <div className="text-xs md:text-sm truncate">{request.paymentReference}</div>
                        </div>
                      )}
                      {request.description && (
                        <div className="md:col-span-2">
                          <div className="text-sm text-muted-foreground">
                            {t("farmer.paymentRequests.description")}
                          </div>
                          <div className="text-xs md:text-sm">{request.description}</div>
                        </div>
                      )}
                      {request.status === "REJECTED" && request.rejectionReason && (
                        <div className="md:col-span-2">
                          <div className="text-sm text-red-600 font-medium">
                            {t("farmer.paymentRequests.rejectionReason")}
                          </div>
                          <div className="text-xs md:text-sm text-red-600">
                            {request.rejectionReason}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>
      </Tabs>

      {/* Submit Proof Dialog */}
      <Dialog open={isSubmitProofOpen} onOpenChange={setIsSubmitProofOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Payment Proof</DialogTitle>
            <DialogDescription>
              Submit payment details for request {selectedRequest?.requestNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedRequest && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Amount to Pay</div>
                <div className="text-lg font-bold">
                  {formatCurrency(selectedRequest.amount)}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={proofPaymentMethod} onValueChange={setProofPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="MOBILE_BANKING">Mobile Banking</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="reference">Payment Reference</Label>
              <Input
                id="reference"
                value={proofReference}
                onChange={(e) => setProofReference(e.target.value)}
                placeholder="Transaction ID, receipt number, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Receipt (Optional)</Label>
              <ImageUpload
                value={proofReceiptUrl}
                onChange={setProofReceiptUrl}
                folder="payment-proofs"
                placeholder="Upload receipt"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSubmitProofOpen(false);
                setSelectedRequest(null);
                setProofPaymentMethod("");
                setProofReference("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitProof}
              disabled={respondMutation.isPending || (!proofPaymentMethod && !proofReference)}
            >
              {respondMutation.isPending ? "Submitting..." : "Submit Proof"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create payment request dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create payment request</DialogTitle>
            <DialogDescription>
              Send payment proof to a dealer. They can accept or reject. On accept, the payment is recorded on your account with that dealer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="create-dealer">Dealer *</Label>
              <Select value={createDealerId} onValueChange={setCreateDealerId}>
                <SelectTrigger id="create-dealer">
                  <SelectValue placeholder="Select dealer" />
                </SelectTrigger>
                <SelectContent>
                  {connectedDealers.map((dealer: { id: string; name: string; contact?: string }) => (
                    <SelectItem key={dealer.id} value={dealer.id}>
                      {dealer.name} {dealer.contact ? `– ${dealer.contact}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-amount">Amount *</Label>
              <Input
                id="create-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={createAmount || ""}
                onChange={(e) => setCreateAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-method">Payment method *</Label>
              <Select value={createPaymentMethod} onValueChange={setCreatePaymentMethod}>
                <SelectTrigger id="create-method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="MOBILE_BANKING">Mobile Banking</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-reference">Payment reference (optional)</Label>
              <Input
                id="create-reference"
                value={createReference}
                onChange={(e) => setCreateReference(e.target.value)}
                placeholder="Transaction ID, receipt number, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-date">Payment date</Label>
              <Input
                id="create-date"
                type="date"
                value={createDate}
                onChange={(e) => setCreateDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-description">Description (optional)</Label>
              <Textarea
                id="create-description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Optional note"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Receipt (Optional)</Label>
              <ImageUpload
                value={createReceiptUrl}
                onChange={setCreateReceiptUrl}
                folder="payment-receipts"
                placeholder="Upload receipt"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePaymentRequest}
              disabled={createMutation.isPending || !createDealerId || !createAmount || createAmount <= 0 || !createPaymentMethod}
            >
              {createMutation.isPending ? "Sending..." : "Send payment request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
