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
  FileText,
  Calendar,
  DollarSign,
  Ban,
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
import { useGetCompanyDealers } from "@/fetchers/company/companyDealerQueries";
import { useGetCompanyProducts } from "@/fetchers/company/companyProductQueries";

export default function CompanyConsignmentsPage() {
  const [activeTab, setActiveTab] = useState("sent");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);
  
  // Dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isDispatchDialogOpen, setIsDispatchDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  // Form state for create consignment
  const [createDealerId, setCreateDealerId] = useState("");
  const [createItems, setCreateItems] = useState<Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>>([]);
  const [createNotes, setCreateNotes] = useState("");

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

  const { data: dealersData } = useGetCompanyDealers({ limit: 100 });
  const { data: productsData } = useGetCompanyProducts({ limit: 100 });

  // Mutations
  const createMutation = useCreateCompanyConsignment();
  const approveMutation = useApproveConsignment();
  const dispatchMutation = useDispatchConsignment();
  const rejectMutation = useRejectConsignment();
  const cancelMutation = useCancelCompanyConsignment();

  const sentConsignments = sentData?.data || [];
  const receivedConsignments = receivedData?.data || [];
  const dealers = dealersData?.data || [];
  const products = productsData?.data || [];

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
          <Badge variant="destructive">
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

  const handleCreateConsignment = async () => {
    if (!createDealerId || createItems.length === 0) {
      toast.error("Please select dealer and add items");
      return;
    }

    try {
      await createMutation.mutateAsync({
        dealerId: createDealerId,
        items: createItems,
        notes: createNotes || undefined,
      });
      toast.success("Consignment created successfully");
      setIsCreateDialogOpen(false);
      resetCreateForm();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create consignment");
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

  const resetCreateForm = () => {
    setCreateDealerId("");
    setCreateItems([]);
    setCreateNotes("");
  };

  const resetDispatchForm = () => {
    setDispatchRef("");
    setTrackingInfo("");
    setDispatchNotes("");
  };

  const addCreateItem = () => {
    setCreateItems([...createItems, { productId: "", quantity: 0, unitPrice: 0 }]);
  };

  const removeCreateItem = (index: number) => {
    setCreateItems(createItems.filter((_, i) => i !== index));
  };

  const updateCreateItem = (index: number, field: string, value: any) => {
    const updated = [...createItems];
    updated[index] = { ...updated[index], [field]: value };
    setCreateItems(updated);
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
        <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-primary">
          <Plus className="mr-2 h-4 w-4" />
          New Consignment
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
                    Create your first consignment to a dealer.
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Consignment
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
                                variant="destructive"
                                size="sm"
                                onClick={() => handleCancelConsignment(consignment.id)}
                                disabled={cancelMutation.isPending}
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

      {/* Create Consignment Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Consignment</DialogTitle>
            <DialogDescription>
              Send products to a dealer on consignment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dealer">Select Dealer *</Label>
              <Select value={createDealerId} onValueChange={setCreateDealerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select dealer..." />
                </SelectTrigger>
                <SelectContent>
                  {dealers.map((dealer) => (
                    <SelectItem key={dealer.id} value={dealer.id}>
                      {dealer.name} - {dealer.contact}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Products *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCreateItem}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Product
                </Button>
              </div>
              {createItems.map((item, index) => (
                <div
                  key={index}
                  className="flex gap-2 items-end p-3 border rounded-md"
                >
                  <div className="flex-1 space-y-2">
                    <Label htmlFor={`product-${index}`}>Product</Label>
                    <Select
                      value={item.productId}
                      onValueChange={(value) =>
                        updateCreateItem(index, "productId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product..." />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} (Stock: {product.currentStock})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-2">
                    <Label htmlFor={`quantity-${index}`}>Quantity</Label>
                    <Input
                      id={`quantity-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        updateCreateItem(index, "quantity", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="w-32 space-y-2">
                    <Label htmlFor={`unitPrice-${index}`}>Unit Price</Label>
                    <Input
                      id={`unitPrice-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateCreateItem(index, "unitPrice", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="w-32">
                    <p className="text-sm font-medium">Total</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCreateItem(index)}
                  >
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {createItems.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No items added yet. Click "Add Product" to get started.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                placeholder="Add any notes or special instructions..."
                rows={3}
              />
            </div>

            {createItems.length > 0 && (
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm font-medium">Total Amount</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(
                    createItems.reduce(
                      (sum, item) => sum + item.quantity * item.unitPrice,
                      0
                    )
                  )}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetCreateForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateConsignment}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Consignment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              variant="destructive"
              onClick={handleRejectConsignment}
              disabled={rejectMutation.isPending || !rejectReason}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                    <div>
                      <p className="text-sm text-muted-foreground">Due</p>
                      <p className="font-medium">
                        {formatCurrency(selectedConsignment.companySale.dueAmount)}
                      </p>
                    </div>
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
