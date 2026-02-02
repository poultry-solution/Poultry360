"use client";

import { useState } from "react";
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
  useGetDealerConsignments,
  useAcceptConsignment,
  useConfirmReceipt,
  useRejectDealerConsignment,
  type Consignment,
} from "@/fetchers/dealer/consignmentQueries";

export default function DealerConsignmentsPage() {
  const [activeTab, setActiveTab] = useState("received");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);

  // Dialogs
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isConfirmReceiptDialogOpen, setIsConfirmReceiptDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  // Form state for accept
  const [acceptItems, setAcceptItems] = useState<Array<{
    itemId: string;
    acceptedQuantity: number;
  }>>([]);
  const [acceptNotes, setAcceptNotes] = useState("");

  // Form state for confirm receipt
  const [grnRef, setGrnRef] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");

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

  const handleAcceptConsignment = async () => {
    if (!selectedConsignment || acceptItems.length === 0) {
      toast.error("Please specify accepted quantities");
      return;
    }

    try {
      await acceptMutation.mutateAsync({
        id: selectedConsignment.id,
        items: acceptItems,
        notes: acceptNotes || undefined,
      });
      toast.success("Consignment accepted successfully");
      setIsAcceptDialogOpen(false);
      setSelectedConsignment(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to accept consignment");
    }
  };

  const handleConfirmReceipt = async () => {
    if (!selectedConsignment) return;

    try {
      await confirmReceiptMutation.mutateAsync({
        id: selectedConsignment.id,
        grnRef: grnRef || undefined,
        notes: receiptNotes || undefined,
      });
      toast.success("Receipt confirmed! Sale created and inventory updated.");
      setIsConfirmReceiptDialogOpen(false);
      setSelectedConsignment(null);
      setGrnRef("");
      setReceiptNotes("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to confirm receipt");
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



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Consignment Management
          </h1>
          <p className="text-muted-foreground">
            Manage consignments from companies
          </p>
        </div>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="received">Received from Company</TabsTrigger>
          <TabsTrigger value="requested">My Requests</TabsTrigger>
        </TabsList>

        {/* Received Consignments Tab */}
        <TabsContent value="received">
          <Card>
            <CardHeader>
              <CardTitle>Received Consignments</CardTitle>
              <CardDescription>
                Consignments received from companies
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
                    No consignments received
                  </h3>
                  <p className="text-muted-foreground">
                    Companies can send you consignments through catalog orders.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request #</TableHead>
                      <TableHead>Company</TableHead>
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
                        <TableCell>{consignment.fromCompany?.name || "N/A"}</TableCell>
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

                            {/* Accept action for CREATED status */}
                            {consignment.status === "CREATED" && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedConsignment(consignment);
                                    setAcceptItems(
                                      consignment.items.map((item) => ({
                                        itemId: item.id,
                                        acceptedQuantity: Number(item.quantity),
                                      }))
                                    );
                                    setIsAcceptDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Accept
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
                                  <XCircle className="h-4 w-4 mr-1 text-black" />
                                  Reject
                                </Button>
                              </>
                            )}

                            {/* Confirm Receipt for DISPATCHED status */}
                            {consignment.status === "DISPATCHED" && (
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setSelectedConsignment(consignment);
                                  setIsConfirmReceiptDialogOpen(true);
                                }}
                              >
                                <Receipt className="h-4 w-4 mr-1" />
                                Confirm Receipt
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

        {/* Requested Consignments Tab */}
        <TabsContent value="requested">
          <Card>
            <CardHeader>
              <CardTitle>My Requests</CardTitle>
              <CardDescription>
                Consignment requests you've sent to companies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requestedLoading ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : requestedConsignments.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No requests sent
                  </h3>
                  <p className="text-muted-foreground">
                    Consignment requests are created when you place orders through company catalogs.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Request #</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestedConsignments.map((consignment) => (
                      <TableRow key={consignment.id}>
                        <TableCell className="font-medium">
                          {consignment.requestNumber}
                        </TableCell>
                        <TableCell>{consignment.fromCompany?.name || "N/A"}</TableCell>
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


                            {/* Confirm Receipt for DISPATCHED status */}
                            {consignment.status === "DISPATCHED" && (
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setSelectedConsignment(consignment);
                                  setIsConfirmReceiptDialogOpen(true);
                                }}
                              >
                                <Receipt className="h-4 w-4 mr-1" />
                                Confirm Receipt
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

      {/* Accept Consignment Dialog */}
      <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Accept Consignment</DialogTitle>
            <DialogDescription>
              Review and accept quantities for {selectedConsignment?.requestNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Accept Quantities</Label>
              {acceptItems.map((item, index) => {
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
                        Offered: {originalItem?.quantity || 0} • Unit Price:{" "}
                        {formatCurrency(originalItem?.unitPrice)}
                      </p>
                    </div>
                    <div className="w-32">
                      <Label htmlFor={`accept-qty-${index}`}>Accept Qty</Label>
                      <Input
                        id={`accept-qty-${index}`}
                        type="number"
                        min="0"
                        max={Number(originalItem?.quantity || 0)}
                        step="0.01"
                        value={item.acceptedQuantity}
                        onChange={(e) => {
                          const updated = [...acceptItems];
                          updated[index].acceptedQuantity =
                            parseFloat(e.target.value) || 0;
                          setAcceptItems(updated);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accept-notes">Notes (Optional)</Label>
              <Textarea
                id="accept-notes"
                value={acceptNotes}
                onChange={(e) => setAcceptNotes(e.target.value)}
                placeholder="Add notes or reasons for quantity changes..."
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
              Cancel
            </Button>
            <Button
              onClick={handleAcceptConsignment}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? "Accepting..." : "Accept"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Receipt Dialog */}
      <Dialog open={isConfirmReceiptDialogOpen} onOpenChange={setIsConfirmReceiptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Consignment Receipt</DialogTitle>
            <DialogDescription>
              Confirm receipt of {selectedConsignment?.requestNumber}. This will create a sale and update your inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-4 rounded-md">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                ⚠️ Important
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                Confirming receipt will:
              </p>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 mt-2 ml-4 list-disc space-y-1">
                <li>Create a sale record in your name</li>
                <li>Add products to your dealer inventory</li>
                <li>Create an accounts payable balance</li>
                <li>Apply any advance payments you've made</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grn-ref">GRN Reference (Optional)</Label>
              <Input
                id="grn-ref"
                value={grnRef}
                onChange={(e) => setGrnRef(e.target.value)}
                placeholder="e.g., GRN-12345"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt-notes">Notes (Optional)</Label>
              <Textarea
                id="receipt-notes"
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="Add any notes about the received goods..."
                rows={3}
              />
            </div>

            {selectedConsignment && (
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm font-medium mb-2">Consignment Summary</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Items</p>
                    <p className="font-medium">{selectedConsignment.items.length} products</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Amount</p>
                    <p className="font-medium">{formatCurrency(selectedConsignment.totalAmount)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsConfirmReceiptDialogOpen(false);
                setGrnRef("");
                setReceiptNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReceipt}
              disabled={confirmReceiptMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {confirmReceiptMutation.isPending ? "Confirming..." : "Confirm Receipt"}
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
              Reject consignment {selectedConsignment?.requestNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Reason for Rejection *</Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why you're rejecting this consignment..."
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
              variant="destructive"
              className="text-black hover:bg-red-600 hover:text-white"
              onClick={handleRejectConsignment}
              disabled={rejectMutation.isPending || !rejectReason}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog - Reusing same structure as company page */}
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
                  <Label>Company</Label>
                  <p className="font-medium mt-1">
                    {selectedConsignment.fromCompany?.name || "N/A"}
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
    </div>
  );
}

