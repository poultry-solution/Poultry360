"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  Search,
  Filter,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  FileText,
  Calendar,
  DollarSign,
  Ban,
  Plus,
  AlertCircle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
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
  useGetCompanyConsignments,
  useGetConsignmentDetails,
  useCreateCompanyConsignment,
  useApproveConsignment,
  useDispatchConsignment,
  useRejectConsignment,
  useCancelCompanyConsignment,
  useGetConsignmentAuditLogs,
  type Consignment,
  type AuditLog,
} from "@/fetchers/company/consignmentQueries";

export default function CompanyConsignmentsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("sent");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);

  // Dialogs
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isDispatchDialogOpen, setIsDispatchDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isRejectionInfoOpen, setIsRejectionInfoOpen] = useState(false);

  // Form state for approve
  const [approveItems, setApproveItems] = useState<Array<{
    itemId: string;
    acceptedQuantity: number;
  }>>([]);
  const [approveNotes, setApproveNotes] = useState("");

  // Form state for dispatch
  const [dispatchRef, setDispatchRef] = useState("");
  const [trackingInfo, setTrackingInfo] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");

  // Form state for reject
  const [rejectReason, setRejectReason] = useState("");

  // Queries
  const { data: sentData, isLoading: sentLoading } = useGetCompanyConsignments({
    direction: "COMPANY_TO_DEALER",
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    search: search || undefined,
  });

  const { data: receivedData, isLoading: receivedLoading } = useGetCompanyConsignments({
    direction: "DEALER_TO_COMPANY",
    status: statusFilter !== "ALL" ? statusFilter : undefined,
    search: search || undefined,
  });

  // Mutations
  const approveMutation = useApproveConsignment();
  const dispatchMutation = useDispatchConsignment();
  const rejectMutation = useRejectConsignment();
  const cancelMutation = useCancelCompanyConsignment();

  const sentConsignments = sentData?.data || [];
  const receivedConsignments = receivedData?.data || [];

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
            Created
          </Badge>
        );
      case "ACCEPTED_PENDING_DISPATCH":
        return (
          <Badge variant="default" className="bg-blue-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Accepted
          </Badge>
        );
      case "DISPATCHED":
        return (
          <Badge variant="default" className="bg-purple-600">
            <Truck className="h-3 w-3 mr-1" />
            Dispatched
          </Badge>
        );
      case "RECEIVED":
        return (
          <Badge variant="default" className="bg-green-600">
            <Package className="h-3 w-3 mr-1" />
            Received
          </Badge>
        );
      case "SETTLED":
        return (
          <Badge variant="default" className="bg-emerald-600">
            <DollarSign className="h-3 w-3 mr-1" />
            Settled
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="secondary" className="bg-gray-500">
            <Ban className="h-3 w-3 mr-1" />
            Cancelled



          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleApproveConsignment = async () => {
    if (!selectedConsignment || approveItems.length === 0) {
      toast.error("Please specify accepted quantities");
      return;
    }

    try {
      await approveMutation.mutateAsync({
        id: selectedConsignment.id,
        items: approveItems,
        notes: approveNotes || undefined,
      });
      toast.success("Consignment approved successfully");
      setIsApproveDialogOpen(false);
      setSelectedConsignment(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve consignment");
    }
  };

  const handleDispatchConsignment = async () => {
    if (!selectedConsignment) return;

    try {
      await dispatchMutation.mutateAsync({
        id: selectedConsignment.id,
        dispatchRef: dispatchRef || undefined,
        trackingInfo: trackingInfo || undefined,
        notes: dispatchNotes || undefined,
      });
      toast.success("Consignment dispatched successfully");
      setIsDispatchDialogOpen(false);
      setSelectedConsignment(null);
      resetDispatchForm();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to dispatch consignment");
    }
  };

  const handleRejectConsignment = async () => {
    if (!selectedConsignment) return;

    try {
      await rejectMutation.mutateAsync({
        id: selectedConsignment.id,
        reason: rejectReason || undefined,
      });
      toast.success("Consignment rejected");
      setIsRejectDialogOpen(false);
      setSelectedConsignment(null);
      setRejectReason("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject consignment");
    }
  };

  const handleCancelConsignment = async (consignmentId: string) => {
    if (!confirm("Are you sure you want to cancel this consignment?")) {
      return;
    }

    try {
      await cancelMutation.mutateAsync({ id: consignmentId });
      toast.success("Consignment cancelled");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to cancel consignment");
    }
  };

  const resetDispatchForm = () => {
    setDispatchRef("");
    setTrackingInfo("");
    setDispatchNotes("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Consignment Management
          </h1>
          <p className="text-muted-foreground">
            Manage product consignments to dealers
          </p>
        </div>
        <Button onClick={() => router.push("/company/dashboard/sales/new")} className="bg-primary">
          <Plus className="mr-2 h-4 w-4" />
          New Sale
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
                  placeholder="Search by request number..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="CREATED">Created</SelectItem>
                <SelectItem value="ACCEPTED_PENDING_DISPATCH">Accepted</SelectItem>
                <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="SETTLED">Settled</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Sent and Received */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="sent">Sent to Dealers</TabsTrigger>
          <TabsTrigger value="received">Received from Dealers</TabsTrigger>
        </TabsList>

        {/* Sent Consignments Tab */}
        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle>Sent Consignments</CardTitle>
              <CardDescription>
                Consignments you've sent to dealers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sentLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : sentConsignments.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No consignments yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create a sale to a connected dealer to start a consignment.
                  </p>
                  <Button onClick={() => router.push("/company/dashboard/sales/new")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Sale
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request #</TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sentConsignments.map((consignment) => (
                      <TableRow key={consignment.id}>
                        <TableCell className="font-medium">
                          {consignment.requestNumber}
                        </TableCell>
                        <TableCell>{consignment.toDealer?.name || "N/A"}</TableCell>
                        <TableCell>{consignment.items.length} items</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(consignment.totalAmount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(consignment.status)}</TableCell>
                        <TableCell>{formatDate(consignment.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedConsignment(consignment);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {consignment.status === "ACCEPTED_PENDING_DISPATCH" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedConsignment(consignment);
                                  setIsDispatchDialogOpen(true);
                                }}
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                Dispatch
                              </Button>
                            )}
                            {(consignment.status === "CREATED" || consignment.status === "ACCEPTED_PENDING_DISPATCH") && (
                              <Button
                                className="text-black cursor-pointer hover:bg-red-600 hover:text-white"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleCancelConsignment(consignment.id)}
                                disabled={cancelMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            )}
                            {consignment.status === "REJECTED" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={() => {
                                  setSelectedConsignment(consignment);
                                  setIsRejectionInfoOpen(true);
                                }}
                              >
                                <AlertCircle className="h-4 w-4 mr-1" />
                                Reason
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

        {/* Received Consignments Tab */}
        <TabsContent value="received">
          <Card>
            <CardHeader>
              <CardTitle>Received Requests</CardTitle>
              <CardDescription>
                Consignment requests from dealers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {receivedLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : receivedConsignments.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No requests received
                  </h3>
                  <p className="text-muted-foreground">
                    Dealers can request consignments from you.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request #</TableHead>
                      <TableHead>Dealer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivedConsignments.map((consignment) => (
                      <TableRow key={consignment.id}>
                        <TableCell className="font-medium">
                          {consignment.requestNumber}
                        </TableCell>
                        <TableCell>{consignment.fromDealer?.name || "N/A"}</TableCell>
                        <TableCell>{consignment.items.length} items</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(consignment.totalAmount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(consignment.status)}</TableCell>
                        <TableCell>{formatDate(consignment.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedConsignment(consignment);
                                setIsViewDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {consignment.status === "CREATED" && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedConsignment(consignment);
                                    setApproveItems(
                                      consignment.items.map((item) => ({
                                        itemId: item.id,
                                        acceptedQuantity: Number(item.quantity),
                                      }))
                                    );
                                    setIsApproveDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  className="text-black"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedConsignment(consignment);
                                    setIsRejectDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {consignment.status === "ACCEPTED_PENDING_DISPATCH" && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedConsignment(consignment);
                                  setIsDispatchDialogOpen(true);
                                }}
                              >
                                <Truck className="h-4 w-4 mr-1" />
                                Dispatch
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

      {/* Approve Consignment Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Approve Consignment Request</DialogTitle>
            <DialogDescription>
              Review and approve quantities for {selectedConsignment?.requestNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Approve Quantities</Label>
              {approveItems.map((item, index) => {
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
                        Requested: {originalItem?.quantity || 0} • Unit Price:{" "}
                        {formatCurrency(originalItem?.unitPrice)}
                      </p>
                    </div>
                    <div className="w-32">
                      <Label htmlFor={`approve-qty-${index}`}>Accept Qty</Label>
                      <Input
                        id={`approve-qty-${index}`}
                        type="number"
                        min="0"
                        max={Number(originalItem?.quantity || 0)}
                        step="0.01"
                        value={item.acceptedQuantity}
                        onChange={(e) => {
                          const updated = [...approveItems];
                          updated[index].acceptedQuantity =
                            parseFloat(e.target.value) || 0;
                          setApproveItems(updated);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label htmlFor="approve-notes">Notes (Optional)</Label>
              <Textarea
                id="approve-notes"
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="Add notes or reasons for quantity changes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsApproveDialogOpen(false);
                setApproveNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproveConsignment}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispatch Dialog */}
      <Dialog open={isDispatchDialogOpen} onOpenChange={setIsDispatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispatch Consignment</DialogTitle>
            <DialogDescription>
              Enter dispatch and tracking details for {selectedConsignment?.requestNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dispatchRef">Dispatch Reference</Label>
              <Input
                id="dispatchRef"
                value={dispatchRef}
                onChange={(e) => setDispatchRef(e.target.value)}
                placeholder="e.g., Dispatch-12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="trackingInfo">Tracking Information</Label>
              <Input
                id="trackingInfo"
                value={trackingInfo}
                onChange={(e) => setTrackingInfo(e.target.value)}
                placeholder="Courier name, LR number, vehicle details..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dispatch-notes">Notes (Optional)</Label>
              <Textarea
                id="dispatch-notes"
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="Additional dispatch notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDispatchDialogOpen(false);
                resetDispatchForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDispatchConsignment}
              disabled={dispatchMutation.isPending}
            >
              {dispatchMutation.isPending ? "Dispatching..." : "Dispatch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Consignment</DialogTitle>
            <DialogDescription>
              Reject consignment request {selectedConsignment?.requestNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason for Rejection *</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this consignment is being rejected..."
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
              Cancel
            </Button>
            <Button
              className="text-black hover:bg-red-500 hover:text-white"
              variant="destructive"
              onClick={handleRejectConsignment}
              disabled={rejectMutation.isPending || !rejectReason}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>




      <RejectionReasonDialog
        consignmentId={selectedConsignment?.id || null}
        open={isRejectionInfoOpen}
        onOpenChange={setIsRejectionInfoOpen}
      />

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Consignment Details</DialogTitle>
            <DialogDescription>
              {selectedConsignment?.requestNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedConsignment && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedConsignment.status)}</div>
                </div>
                <div>
                  <Label>Direction</Label>
                  <p className="font-medium mt-1">{selectedConsignment.direction}</p>
                </div>
                <div>
                  <Label>Dealer</Label>
                  <p className="font-medium mt-1">
                    {selectedConsignment.toDealer?.name || selectedConsignment.fromDealer?.name}
                  </p>
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <p className="font-medium mt-1">
                    {formatCurrency(selectedConsignment.totalAmount)}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div>
                <Label>Items</Label>
                <Table className="mt-2">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Requested</TableHead>
                      <TableHead className="text-right">Approved</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedConsignment.items.map((item) => (
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
                  <Label>Dispatch Information</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Reference</p>
                      <p className="font-medium">{selectedConsignment.dispatchRef}</p>
                    </div>
                    {selectedConsignment.trackingInfo && (
                      <div>
                        <p className="text-sm text-muted-foreground">Tracking</p>
                        <p className="font-medium">{selectedConsignment.trackingInfo}</p>
                      </div>
                    )}
                    {selectedConsignment.dispatchedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground">Dispatched On</p>
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
                  <Label>Receipt Information</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">GRN Reference</p>
                      <p className="font-medium">{selectedConsignment.grnRef}</p>
                    </div>
                    {selectedConsignment.receivedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground">Received On</p>
                        <p className="font-medium">
                          {formatDate(selectedConsignment.receivedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Linked Sale */}
              {selectedConsignment.companySale && (
                <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-md">
                  <Label>Linked Sale</Label>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Invoice #</p>
                      <p className="font-medium">
                        {selectedConsignment.companySale.invoiceNumber}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-medium">
                        {formatCurrency(selectedConsignment.companySale.totalAmount)}
                      </p>
                    </div>
                    {(selectedConsignment.companySale as any)?.account && (
                      <div>
                        <p className="text-sm text-muted-foreground">Account Balance</p>
                        <p className={`font-medium ${Number((selectedConsignment.companySale as any).account.balance) > 0 ? "text-red-600" : Number((selectedConsignment.companySale as any).account.balance) < 0 ? "text-green-600" : ""}`}>
                          {formatCurrency((selectedConsignment.companySale as any).account.balance)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedConsignment.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="mt-1 text-sm">{selectedConsignment.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
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
  const { data: auditLogs, isLoading } = useGetConsignmentAuditLogs(
    consignmentId || ""
  );

  const rejectionLog = auditLogs?.find((log) => log.action === "REJECTED");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejection Reason</DialogTitle>
          <DialogDescription>
            Reason provided for rejection
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <p className="text-muted-foreground">Loading details...</p>
            </div>
          ) : rejectionLog ? (
            <div className="bg-red-50 p-4 rounded-md border border-red-100 text-red-800">
              <p className="font-medium mb-1">Reason:</p>
              <p>{rejectionLog.notes || "No specific reason provided."}</p>
              <p className="text-xs text-red-600 mt-2 pt-2 border-t border-red-200">
                Rejected by {rejectionLog.actor?.name} on {new Date(rejectionLog.createdAt).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No rejection details found.</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
