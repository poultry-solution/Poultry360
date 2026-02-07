"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Users,
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
import { DataTable, Column } from "@/common/components/ui/data-table";
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
import { toast } from "sonner";
import {
  useGetCompanyVerificationRequests,
  useApproveVerificationRequest,
  useRejectVerificationRequest,
  useGetPendingVerificationCount,
  type CompanyVerificationRequest,
} from "@/fetchers/company/companyVerificationQueries";

export default function CompanyVerificationPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [selectedRequest, setSelectedRequest] = useState<CompanyVerificationRequest | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [balanceLimit, setBalanceLimit] = useState<string>("");

  // Queries
  const { data: pendingData, isLoading: pendingLoading } = useGetCompanyVerificationRequests({
    status: "PENDING",
    page,
    limit: 10,
    search: search || undefined,
  });

  const { data: approvedData, isLoading: approvedLoading } = useGetCompanyVerificationRequests({
    status: "APPROVED",
    page,
    limit: 10,
    search: search || undefined,
  });

  const { data: rejectedData, isLoading: rejectedLoading } = useGetCompanyVerificationRequests({
    status: "REJECTED",
    page,
    limit: 10,
    search: search || undefined,
  });

  const { data: pendingCount } = useGetPendingVerificationCount();

  // Mutations
  const approveMutation = useApproveVerificationRequest();
  const rejectMutation = useRejectVerificationRequest();

  // Get data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case "PENDING":
        return { data: pendingData, isLoading: pendingLoading };
      case "APPROVED":
        return { data: approvedData, isLoading: approvedLoading };
      case "REJECTED":
        return { data: rejectedData, isLoading: rejectedLoading };
    }
  };

  const { data: currentData, isLoading: currentLoading } = getCurrentData();
  const requests = currentData?.data || [];
  const pagination = currentData?.pagination;

  const handleViewRequest = (request: CompanyVerificationRequest) => {
    setSelectedRequest(request);
    setIsViewDialogOpen(true);
  };

  const handleOpenApproveDialog = (request: CompanyVerificationRequest) => {
    setSelectedRequest(request);
    setIsApproveDialogOpen(true);
  };

  const handleOpenRejectDialog = (request: CompanyVerificationRequest) => {
    setSelectedRequest(request);
    setIsRejectDialogOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    try {
      await approveMutation.mutateAsync({
        requestId: selectedRequest.id,
        balanceLimit: balanceLimit ? parseFloat(balanceLimit) : null,
      });
      toast.success("Verification request approved successfully");
      setIsApproveDialogOpen(false);
      setSelectedRequest(null);
      setBalanceLimit("");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to approve request");
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    try {
      await rejectMutation.mutateAsync(selectedRequest.id);
      toast.success("Verification request rejected");
      setIsRejectDialogOpen(false);
      setSelectedRequest(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reject request");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/company/dashboard/dealers">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verification Requests</h1>
          <p className="text-muted-foreground">
            Review and manage dealer verification requests
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingData?.pagination?.total || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {approvedData?.pagination?.total || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rejectedData?.pagination?.total || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by dealer name, owner name, or contact..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Verification Requests</CardTitle>
          <CardDescription>
            {pagination?.total || 0} total {activeTab.toLowerCase()} requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as "PENDING" | "APPROVED" | "REJECTED");
            setPage(1);
          }}>
            <TabsList>
              <TabsTrigger value="PENDING">
                Pending
                {pendingCount && pendingCount > 0 && (
                  <Badge className="ml-2 bg-yellow-500 text-white">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="APPROVED">Approved</TabsTrigger>
              <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {currentLoading ? (
                <div className="text-center py-8">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No {activeTab.toLowerCase()} requests</h3>
                  <p className="text-muted-foreground">
                    {activeTab === "PENDING"
                      ? "No pending verification requests at this time."
                      : activeTab === "APPROVED"
                        ? "No approved requests yet."
                        : "No rejected requests."}
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dealer Name</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">
                            {request.dealer?.name || "N/A"}
                          </TableCell>
                          <TableCell>
                            {request.dealer?.owner?.name || "N/A"}
                            {request.dealer?.owner?.phone && (
                              <div className="text-xs text-muted-foreground">
                                {request.dealer.owner.phone}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{request.dealer?.contact || "N/A"}</TableCell>
                          <TableCell>
                            {request.dealer?.address || (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>
                            {new Date(request.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewRequest(request)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {activeTab === "PENDING" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenApproveDialog(request)}
                                    title="Approve"
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenRejectDialog(request)}
                                    title="Reject"
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {pagination.page} of {pagination.totalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page - 1)}
                          disabled={page === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(page + 1)}
                          disabled={page === pagination.totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Dealer Verification Request Details</DialogTitle>
            <DialogDescription>
              View detailed information about this verification request
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div>
                <h3 className="font-semibold mb-3">Dealer Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dealer Name:</span>
                    <span className="font-medium">{selectedRequest.dealer?.name || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Contact:</span>
                    <span className="font-medium">{selectedRequest.dealer?.contact || "N/A"}</span>
                  </div>
                  {selectedRequest.dealer?.address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="font-medium">{selectedRequest.dealer.address}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Owner Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Owner Name:</span>
                    <span className="font-medium">
                      {selectedRequest.dealer?.owner?.name || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Phone:</span>
                    <span className="font-medium">
                      {selectedRequest.dealer?.owner?.phone || "N/A"}
                    </span>
                  </div>
                  {selectedRequest.dealer?.owner?.status && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge
                        className={
                          selectedRequest.dealer.owner.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {selectedRequest.dealer.owner.status}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Request Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    {getStatusBadge(selectedRequest.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Requested Date:</span>
                    <span className="font-medium">
                      {new Date(selectedRequest.createdAt).toLocaleString()}
                    </span>
                  </div>
                  {selectedRequest.status === "REJECTED" && selectedRequest.rejectedCount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rejection Count:</span>
                      <span className="font-medium">{selectedRequest.rejectedCount}</span>
                    </div>
                  )}
                  {selectedRequest.lastRejectedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Rejected:</span>
                      <span className="font-medium">
                        {new Date(selectedRequest.lastRejectedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {selectedRequest && activeTab === "PENDING" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleOpenRejectDialog(selectedRequest);
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  Reject
                </Button>
                <Button
                  onClick={() => {
                    setIsViewDialogOpen(false);
                    handleOpenApproveDialog(selectedRequest);
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Confirmation Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Approve Verification Request</DialogTitle>
            <DialogDescription asChild>
              <div>
                Are you sure you want to approve this dealer's request to join your company?
                {selectedRequest && (
                  <div className="mt-2 p-2 bg-blue-50 rounded">
                    <p className="font-medium">{selectedRequest.dealer?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Owner: {selectedRequest.dealer?.owner?.name}
                    </p>
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="balanceLimit">Balance Limit (Optional)</Label>
            <Input
              id="balanceLimit"
              type="number"
              min="0"
              step="0.01"
              value={balanceLimit}
              onChange={(e) => setBalanceLimit(e.target.value)}
              placeholder="Enter maximum balance limit (leave empty for no limit)"
            />
            <p className="text-xs text-muted-foreground">
              Set a maximum balance limit for this dealer. You can change this later.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsApproveDialogOpen(false)}
              disabled={approveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Reject Verification Request</DialogTitle>
            <DialogDescription asChild>
              <div>
                Are you sure you want to reject this dealer's request?
                {selectedRequest && (
                  <div className="mt-2 p-2 bg-red-50 rounded">
                    <p className="font-medium">{selectedRequest.dealer?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Owner: {selectedRequest.dealer?.owner?.name}
                    </p>
                    {selectedRequest.rejectedCount > 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        This will be rejection #{selectedRequest.rejectedCount + 1}. After 3
                        rejections, the dealer cannot apply again.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReject}
              disabled={rejectMutation.isPending}
              variant="destructive"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
