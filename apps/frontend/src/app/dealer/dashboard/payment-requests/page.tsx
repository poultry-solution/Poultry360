"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Search, Eye, Clock, CheckCircle, XCircle, ArrowLeft, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { DataTable, Column } from "@/common/components/ui/data-table";
import { Badge } from "@/common/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/common/components/ui/dialog";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import {
  useGetDealerPaymentRequests,
  useGetDealerPaymentRequestStatistics,
  useApprovePaymentRequest,
  useRejectPaymentRequest,
  useCreateDealerPaymentRequestToFarmer,
} from "@/fetchers/payment/paymentRequestQueries";
import { useGetConnectedFarmers, useGetFarmerAccount } from "@/fetchers/dealer/dealerFarmerQueries";
import { toast } from "sonner";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/common/components/ui/tabs";

export default function DealerPaymentRequestsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Create payment request state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>("");
  const [createAmount, setCreateAmount] = useState<string>("");
  const [createDescription, setCreateDescription] = useState<string>("");

  // Queries
  const { data: requestsData, isLoading } = useGetDealerPaymentRequests({
    page,
    limit: 10,
    status: statusFilter !== "ALL" ? statusFilter : undefined,
  });

  const { data: statsData } = useGetDealerPaymentRequestStatistics();
  const { data: farmersData } = useGetConnectedFarmers();
  const { data: selectedFarmerAccount } = useGetFarmerAccount(selectedFarmerId);

  // Mutations
  const approveMutation = useApprovePaymentRequest();
  const rejectMutation = useRejectPaymentRequest();
  const createMutation = useCreateDealerPaymentRequestToFarmer();

  const handleApprove = async (requestId: string) => {
    try {
      await approveMutation.mutateAsync(requestId);
      toast.success("Payment request approved successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve request");
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        requestId: selectedRequest.id,
        rejectionReason,
      });
      toast.success("Payment request rejected");
      setIsRejectDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject request");
    }
  };

  const handleCreateRequest = async () => {
    if (!selectedFarmerId) {
      toast.error("Please select a farmer");
      return;
    }
    if (!createAmount || Number(createAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      await createMutation.mutateAsync({
        farmerId: selectedFarmerId,
        amount: Number(createAmount),
        description: createDescription || undefined,
      });
      toast.success("Payment request created successfully");
      setIsCreateDialogOpen(false);
      setSelectedFarmerId("");
      setCreateAmount("");
      setCreateDescription("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create payment request");
    }
  };

  const formatCurrency = (amount: number | string) => {
    return `रू ${Number(amount).toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>,
      APPROVED: <Badge variant="outline" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>,
      REJECTED: <Badge variant="outline" className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>,
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
  const pagination = requestsData?.pagination;
  const connectedFarmers = farmersData?.data || [];

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dealer/dashboard/customers")}
            className="text-xs md:text-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" />
            <span className="hidden sm:inline">Back to Customers</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Payment Requests</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage payment requests from farmers
            </p>
          </div>
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="hidden sm:flex"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Request
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
            className="sm:hidden"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Pending</CardTitle>
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
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-green-600">{stats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Rejected</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold text-red-600">{stats.rejected}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        <div className="relative w-full sm:w-[200px]">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs bg-background"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 text-xs w-full sm:w-[130px] bg-background">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="received">
            Received (From Farmers)
            {requests.filter((r: any) => !r.requestNumber?.startsWith("DPR-")).length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {requests.filter((r: any) => !r.requestNumber?.startsWith("DPR-")).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent (To Farmers)
            {requests.filter((r: any) => r.requestNumber?.startsWith("DPR-")).length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {requests.filter((r: any) => r.requestNumber?.startsWith("DPR-")).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Payment Requests from Farmers</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Requests initiated by farmers (e.g., payment proofs)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={requests.filter((r: any) => !r.requestNumber?.startsWith("DPR-"))}
                loading={isLoading}
                emptyMessage="No payment requests received from farmers"
                columns={[
                  {
                    key: 'requestNumber',
                    label: 'Request',
                    width: '90px',
                    render: (val) => <span className="font-medium">{val}</span>
                  },
                  {
                    key: 'farmer',
                    label: 'Farmer',
                    width: '120px',
                    render: (val) => (
                      <div>
                        <div className="font-medium truncate">{val?.name}</div>
                        <div className="text-[10px] text-muted-foreground">{val?.phone}</div>
                      </div>
                    )
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    align: 'right',
                    width: '90px',
                    render: (val) => <span className="font-semibold">{formatCurrency(val)}</span>
                  },
                  {
                    key: 'createdAt',
                    label: 'Date',
                    width: '90px',
                    render: (val) => formatDate(val)
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    width: '100px',
                    render: (val) => getStatusBadge(val)
                  },
                  {
                    key: 'proofOfPaymentUrl',
                    label: 'Proof',
                    width: '60px',
                    align: 'center',
                    render: (val, row) => val ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setSelectedRequest(row);
                          setIsImageDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 text-blue-600" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    align: 'right',
                    width: '120px',
                    render: (_, request) => (
                      <>
                        {request.status === "PENDING" && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 bg-green-50 text-green-700 hover:bg-green-100"
                              onClick={() => handleApprove(request.id)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 bg-red-50 text-red-700 hover:bg-red-100"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsRejectDialogOpen(true);
                              }}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        {request.status === "REJECTED" && request.rejectionReason && (
                          <div className="text-[10px] text-red-600 max-w-[80px] truncate" title={request.rejectionReason}>
                            {request.rejectionReason}
                          </div>
                        )}
                      </>
                    )
                  }
                ] as Column[]}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Payment Requests Sent to Farmers</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Requests you sent asking farmers for payment
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={requests.filter((r: any) => r.requestNumber?.startsWith("DPR-"))}
                loading={isLoading}
                emptyMessage="No payment requests sent to farmers"
                columns={[
                  {
                    key: 'requestNumber',
                    label: 'Request',
                    width: '90px',
                    render: (val) => <span className="font-medium">{val}</span>
                  },
                  {
                    key: 'farmer',
                    label: 'Farmer',
                    width: '120px',
                    render: (val) => (
                      <div>
                        <div className="font-medium truncate">{val?.name}</div>
                        <div className="text-[10px] text-muted-foreground">{val?.phone}</div>
                      </div>
                    )
                  },
                  {
                    key: 'amount',
                    label: 'Amount',
                    align: 'right',
                    width: '90px',
                    render: (val) => <span className="font-semibold">{formatCurrency(val)}</span>
                  },
                  {
                    key: 'createdAt',
                    label: 'Date',
                    width: '90px',
                    render: (val) => formatDate(val)
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    width: '100px',
                    render: (val) => getStatusBadge(val)
                  },
                  {
                    key: 'proofOfPaymentUrl',
                    label: 'Proof',
                    width: '60px',
                    align: 'center',
                    render: (val, row) => val ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setSelectedRequest(row);
                          setIsImageDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 text-blue-600" />
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    align: 'right',
                    width: '120px',
                    render: (_, request) => (
                      <>
                        {request.status === "PENDING" && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 bg-green-50 text-green-700 hover:bg-green-100"
                              onClick={() => handleApprove(request.id)}
                              disabled={approveMutation.isPending}
                              title="Approve Payment"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 bg-red-50 text-red-700 hover:bg-red-100"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsRejectDialogOpen(true);
                              }}
                              title="Reject Payment"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        {request.status === "REJECTED" && request.rejectionReason && (
                          <div className="text-[10px] text-red-600 max-w-[80px] truncate" title={request.rejectionReason}>
                            {request.rejectionReason}
                          </div>
                        )}
                      </>
                    )
                  }
                ] as Column[]}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Payment Request Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Payment Request</DialogTitle>
            <DialogDescription>
              Request payment from a farmer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="farmer">Select Farmer</Label>
              <Select value={selectedFarmerId} onValueChange={setSelectedFarmerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a farmer" />
                </SelectTrigger>
                <SelectContent>
                  {connectedFarmers.map((farmer) => (
                    <SelectItem key={farmer.id} value={farmer.id}>
                      {farmer.name} ({farmer.phone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedFarmerId && selectedFarmerAccount && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Current Balance</div>
                <div className="text-lg font-bold">
                  {formatCurrency(selectedFarmerAccount.balance)}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="amount">Amount (रू)</Label>
              <Input
                id="amount"
                type="number"
                value={createAmount}
                onChange={(e) => setCreateAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Enter description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setSelectedFarmerId("");
                setCreateAmount("");
                setCreateDescription("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRequest}
              disabled={createMutation.isPending || !selectedFarmerId || !createAmount}
            >
              {createMutation.isPending ? "Creating..." : "Create Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payment request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsRejectDialogOpen(false);
                setRejectionReason("");
                setSelectedRequest(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {selectedRequest?.proofOfPaymentUrl ? (
              <img
                src={selectedRequest.proofOfPaymentUrl}
                alt="Payment Proof"
                className="max-h-[60vh] w-auto object-contain rounded-md"
              />
            ) : (
              <div className="text-center text-muted-foreground p-8">
                No proof image available
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            <div className="text-sm text-muted-foreground self-center">
              {selectedRequest?.requestNumber}
            </div>
            <Button variant="secondary" onClick={() => setIsImageDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
