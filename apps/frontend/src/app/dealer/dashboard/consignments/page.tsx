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

export default function DealerConsignmentsPage() {
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
      // Prepare items payload with selling prices
      const itemsPayload = selectedConsignment.items.map((item) => {
        const costPrice = Number(item.unitPrice);
        // Default to 1.2 * cost if not set by user
        const sellingPrice = sellingPrices[item.id] !== undefined
          ? Number(sellingPrices[item.id])
          : (costPrice * 1.2);

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
      toast.success("Receipt confirmed! Sale created and inventory updated.");
      setIsConfirmReceiptDialogOpen(false);
      setSelectedConsignment(null);
      setGrnRef("");
      setReceiptNotes("");
      setSellingPrices({});
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Consignment Management
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage consignments from companies
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/dealer/dashboard/company")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">Back</span>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="received">Received from Company</TabsTrigger>
          <TabsTrigger value="requested">My Requests</TabsTrigger>
        </TabsList>

        {/* Received Consignments Tab */}
        <TabsContent value="received">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Received Consignments</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {receivedConsignments.length} consignments from companies
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={receivedConsignments}
                loading={receivedLoading}
                emptyMessage="No consignments received. Companies can send you consignments through catalog orders."
                columns={[
                  {
                    key: 'requestNumber',
                    label: 'Request #',
                    width: '100px',
                    render: (val) => <span className="font-medium">{val}</span>
                  },
                  {
                    key: 'fromCompany',
                    label: 'Company',
                    width: '100px',
                    render: (val) => val?.name || "N/A"
                  },
                  {
                    key: 'items',
                    label: 'Items',
                    width: '60px',
                    render: (val) => `${val?.length || 0}`
                  },
                  {
                    key: 'totalAmount',
                    label: 'Amount',
                    align: 'right',
                    width: '90px',
                    render: (val) => <span className="font-semibold">{formatCurrency(val)}</span>
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    width: '100px',
                    render: (val) => getStatusBadge(val)
                  },
                  {
                    key: 'createdAt',
                    label: 'Date',
                    width: '80px',
                    render: (val) => formatDate(val)
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
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
                                  consignment.items.map((item) => ({
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
                            Received
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
              <CardTitle className="text-base md:text-lg">My Requests</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {requestedConsignments.length} requests sent to companies
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={requestedConsignments}
                loading={requestedLoading}
                emptyMessage="No requests sent. Consignment requests are created when you place orders through company catalogs."
                columns={[
                  {
                    key: 'requestNumber',
                    label: 'Request #',
                    width: '100px',
                    render: (val) => <span className="font-medium">{val}</span>
                  },
                  {
                    key: 'fromCompany',
                    label: 'Company',
                    width: '100px',
                    render: (val) => val?.name || "N/A"
                  },
                  {
                    key: 'items',
                    label: 'Items',
                    width: '60px',
                    render: (val) => `${val?.length || 0}`
                  },
                  {
                    key: 'totalAmount',
                    label: 'Amount',
                    align: 'right',
                    width: '90px',
                    render: (val) => <span className="font-semibold">{formatCurrency(val)}</span>
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    width: '100px',
                    render: (val) => getStatusBadge(val)
                  },
                  {
                    key: 'createdAt',
                    label: 'Date',
                    width: '80px',
                    render: (val) => formatDate(val)
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
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
                            Received
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
            <DialogTitle>Accept Consignment</DialogTitle>
            <DialogDescription>
              Accept {selectedConsignment?.requestNumber} as sent by the company (quantities cannot be changed).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Items (quantities as sent by company)</Label>
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
                        Quantity: {originalItem?.quantity || 0} • Unit Price:{" "}
                        {formatCurrency(originalItem?.unitPrice)}
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
              <Label htmlFor="accept-notes">Notes (Optional)</Label>
              <Textarea
                id="accept-notes"
                value={acceptNotes}
                onChange={(e) => setAcceptNotes(e.target.value)}
                placeholder="Add notes..."
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Confirm Consignment Receipt</DialogTitle>
            <DialogDescription>
              Confirm receipt of {selectedConsignment?.requestNumber}. This will create a sale and update your inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
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

            {selectedConsignment && (
              <div className="space-y-4">
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

                <div>
                  <Label className="text-base font-semibold mb-2 block">Set Selling Prices</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    Review and adjust the selling price for each item. Default is set to 20% markup on cost price.
                  </p>

                  <div className="space-y-3">
                    {selectedConsignment.items.map((item) => {
                      const costPrice = Number(item.unitPrice);
                      const currentSellingPrice = sellingPrices[item.id] !== undefined
                        ? sellingPrices[item.id]
                        : (costPrice * 1.2).toFixed(2);

                      return (
                        <div key={item.id} className="flex flex-col sm:flex-row gap-4 p-3 border rounded-md items-start sm:items-center bg-card">
                          <div className="flex-1">
                            <p className="font-medium">{item.companyProduct?.name || "Unknown Product"}</p>
                            <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                              <span>Qty: {item.acceptedQuantity || item.quantity}</span>
                              <span>Cost: {formatCurrency(item.unitPrice)}</span>
                            </div>
                          </div>

                          <div className="w-full sm:w-48">
                            <Label htmlFor={`price-${item.id}`} className="text-xs mb-1.5 block">
                              Selling Price (per unit)
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
              <Label htmlFor="receipt-notes">Notes (Optional)</Label>
              <Textarea
                id="receipt-notes"
                value={receiptNotes}
                onChange={(e) => setReceiptNotes(e.target.value)}
                placeholder="Add any notes about the received goods..."
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

      <RejectionReasonDialog
        consignmentId={selectedConsignment?.id || null}
        open={isRejectionInfoOpen}
        onOpenChange={setIsRejectionInfoOpen}
      />

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

function RejectionReasonDialog({
  consignmentId,
  open,
  onOpenChange,
}: {
  consignmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: auditLogs, isLoading } = useGetDealerConsignmentAuditLogs(
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

