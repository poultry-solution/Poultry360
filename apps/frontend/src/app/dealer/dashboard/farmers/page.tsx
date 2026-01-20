"use client";

import { useState } from "react";
import {
  Search,
  UserCircle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Archive,
  ArchiveRestore,
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
import { Badge } from "@/common/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
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
  useGetDealerFarmerRequests,
  useApproveFarmerRequest,
  useRejectFarmerRequest,
  useGetConnectedFarmers,
  useArchiveDealerFarmer,
  useUnarchiveDealerFarmer,
  useGetArchivedDealerFarmers,
} from "@/fetchers/dealer/dealerFarmerQueries";

export default function DealerFarmersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [viewTab, setViewTab] = useState<"active" | "archived">("active");
  const [actionRequest, setActionRequest] = useState<{
    id: string;
    action: "approve" | "reject";
    farmerName: string;
  } | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<{ id: string; name: string } | null>(null);

  const limit = 12;

  // Queries
  const { data: requestsData, isLoading: requestsLoading } =
    useGetDealerFarmerRequests({
      page,
      limit,
      search: search.length >= 2 ? search : undefined,
      status: statusFilter === "ALL" ? undefined : statusFilter,
    });

  const { data: connectedFarmersData, isLoading: farmersLoading } =
    useGetConnectedFarmers();

  const { data: archivedFarmersData, isLoading: archivedLoading } = 
    useGetArchivedDealerFarmers();

  // Mutations
  const approveMutation = useApproveFarmerRequest();
  const rejectMutation = useRejectFarmerRequest();
  const archiveMutation = useArchiveDealerFarmer();
  const unarchiveMutation = useUnarchiveDealerFarmer();

  const requests = requestsData?.data || [];
  const pagination = requestsData?.pagination;
  const connectedFarmers = connectedFarmersData?.data || [];
  const archivedFarmers = archivedFarmersData?.data || [];

  // Group requests by status
  const pendingRequests = requests.filter((r) => r.status === "PENDING");
  const approvedRequests = requests.filter((r) => r.status === "APPROVED");
  const rejectedRequests = requests.filter((r) => r.status === "REJECTED");

  const handleApprove = async () => {
    if (!actionRequest) return;

    try {
      await approveMutation.mutateAsync(actionRequest.id);
      toast.success(`Request from ${actionRequest.farmerName} approved successfully`);
      setActionRequest(null);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to approve request"
      );
    }
  };

  const handleReject = async () => {
    if (!actionRequest) return;

    try {
      await rejectMutation.mutateAsync(actionRequest.id);
      toast.success(`Request from ${actionRequest.farmerName} rejected`);
      setActionRequest(null);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to reject request"
      );
    }
  };

  const handleArchive = async (connectionId: string) => {
    try {
      await archiveMutation.mutateAsync(connectionId);
      toast.success("Connection archived successfully");
      setArchiveConfirm(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to archive connection");
    }
  };

  const handleUnarchive = async (connectionId: string, farmerName: string) => {
    try {
      await unarchiveMutation.mutateAsync(connectionId);
      toast.success(`Connection with ${farmerName} restored successfully`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to restore connection");
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

  if (requestsLoading && page === 1) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Farmer Verification Requests
            </h1>
            <p className="text-muted-foreground">
              Review and manage farmer connection requests
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Farmer Verification Requests
        </h1>
        <p className="text-muted-foreground">
          Review and manage farmer connection requests
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Farmers</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{connectedFarmers.length}</div>
              <span className="text-sm text-muted-foreground">Active</span>
              {archivedFarmers.length > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">/</span>
                  <div className="text-xl font-semibold text-muted-foreground">{archivedFarmers.length}</div>
                  <span className="text-sm text-muted-foreground">Archived</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedRequests.length}</div>
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
                  placeholder="Search by farmer name or phone..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1); // Reset to first page on search
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1); // Reset to first page on filter change
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tab Selector */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setViewTab("active")}
          className={`px-4 py-2 font-medium transition-colors ${
            viewTab === "active"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setViewTab("archived")}
          className={`px-4 py-2 font-medium transition-colors ${
            viewTab === "archived"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Archived ({archivedFarmers.length})
        </button>
      </div>

      {viewTab === "active" ? (
        <>
          {/* Connected Farmers Section */}
          <Card>
            <CardHeader>
              <CardTitle>My Connected Farmers</CardTitle>
              <CardDescription>
                {connectedFarmers.length} farmer(s) connected to your dealership
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connectedFarmers.length === 0 ? (
                <div className="text-center py-8">
                  <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No connected farmers</h3>
                  <p className="text-muted-foreground">
                    Farmers who request to connect will appear here once approved.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {connectedFarmers.map((farmer) => (
                    <Card key={farmer.id} className="border-green-200 bg-green-50/30">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-5 w-5 text-gray-400" />
                            <div>
                              <CardTitle className="text-base">{farmer.name}</CardTitle>
                              <CardDescription className="text-xs">
                                {farmer.phone}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Connected
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-xs text-muted-foreground mb-3">
                          Connected: {new Date(farmer.connectedAt).toLocaleDateString()}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-gray-600 hover:text-gray-700"
                          onClick={() => setArchiveConfirm({ id: farmer.dealerFarmerId, name: farmer.name })}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Farmer Requests */}
          <Card>
          <CardHeader>
            <CardTitle>Farmer Verification Requests</CardTitle>
            <CardDescription>
              {pagination?.total || 0} request(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <div className="text-center py-8">
                <UserCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No farmer requests</h3>
                <p className="text-muted-foreground">
                  {search || statusFilter !== "PENDING"
                    ? "No requests match your filters."
                    : "No farmers have requested to connect with your dealership yet."}
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {requests.map((request) => (
                    <Card key={request.id} className="relative">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <UserCircle className="h-5 w-5 text-gray-400 shrink-0" />
                            <div className="min-w-0">
                              <CardTitle className="text-base truncate">
                                {request.farmer?.name || "Unknown Farmer"}
                              </CardTitle>
                              {request.farmer?.phone && (
                                <CardDescription className="text-xs truncate">
                                  {request.farmer.phone}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status:</span>
                            <span className="font-medium">{request.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Requested:</span>
                            <span className="font-medium">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {request.status === "REJECTED" && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Rejection Count:
                              </span>
                              <span className="font-medium text-red-600">
                                {request.rejectedCount}/3
                              </span>
                            </div>
                          )}
                        </div>

                        {request.status === "PENDING" && (
                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-green-600 hover:text-green-700 border-green-600 hover:border-green-700"
                              onClick={() =>
                                setActionRequest({
                                  id: request.id,
                                  action: "approve",
                                  farmerName: request.farmer?.name || "this farmer",
                                })
                              }
                              disabled={
                                approveMutation.isPending || rejectMutation.isPending
                              }
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-red-600 hover:text-red-700 border-red-600 hover:border-red-700"
                              onClick={() =>
                                setActionRequest({
                                  id: request.id,
                                  action: "reject",
                                  farmerName: request.farmer?.name || "this farmer",
                                })
                              }
                              disabled={
                                approveMutation.isPending || rejectMutation.isPending
                              }
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total
                      )}{" "}
                      of {pagination.total} requests
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || requestsLoading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage((p) =>
                            Math.min(pagination.totalPages, p + 1)
                          )
                        }
                        disabled={
                          page === pagination.totalPages || requestsLoading
                        }
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
        </>
      ) : (
        /* Archived Farmers Tab */
        <Card>
          <CardHeader>
            <CardTitle>Archived Farmers</CardTitle>
            <CardDescription>
              {archivedFarmers.length} archived farmer(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {archivedFarmers.length === 0 ? (
              <div className="text-center py-8">
                <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No archived farmers</h3>
                <p className="text-muted-foreground">
                  Connections you archive will appear here and can be restored anytime.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {archivedFarmers.map((farmer) => (
                  <Card key={farmer.id} className="border-gray-200 bg-gray-50/30">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-5 w-5 text-gray-400" />
                          <div>
                            <CardTitle className="text-base">{farmer.name}</CardTitle>
                            <CardDescription className="text-xs">
                              {farmer.phone}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 text-xs">
                          <Archive className="mr-1 h-3 w-3" />
                          Archived
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-muted-foreground mb-3">
                        Connected: {new Date(farmer.connectedAt).toLocaleDateString()}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-green-600 hover:text-green-700 border-green-600 hover:border-green-700"
                        onClick={() => handleUnarchive(farmer.dealerFarmerId, farmer.name)}
                        disabled={unarchiveMutation.isPending}
                      >
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                        Restore
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Confirmation Dialog */}
      {actionRequest && (
        <Dialog
          open={!!actionRequest}
          onOpenChange={(open) => !open && setActionRequest(null)}
        >
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>
                {actionRequest.action === "approve"
                  ? "Approve Verification Request"
                  : "Reject Verification Request"}
              </DialogTitle>
              <DialogDescription>
                {actionRequest.action === "approve"
                  ? `Are you sure you want to approve the request from ${actionRequest.farmerName}? This will establish a connection between your dealership and this farmer.`
                  : `Are you sure you want to reject the request from ${actionRequest.farmerName}? They will be able to retry after 1 hour (up to 3 rejections total).`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setActionRequest(null)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={
                  actionRequest.action === "approve"
                    ? handleApprove
                    : handleReject
                }
                disabled={approveMutation.isPending || rejectMutation.isPending}
                className={
                  actionRequest.action === "approve"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }
              >
                {approveMutation.isPending || rejectMutation.isPending
                  ? "Processing..."
                  : actionRequest.action === "approve"
                  ? "Approve"
                  : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Archive Confirmation Dialog */}
      {archiveConfirm && (
        <Dialog open={!!archiveConfirm} onOpenChange={() => setArchiveConfirm(null)}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Archive Connection</DialogTitle>
              <DialogDescription>
                Are you sure you want to archive your connection with {archiveConfirm.name}? 
                You can restore it later from the Archived tab.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setArchiveConfirm(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleArchive(archiveConfirm.id)}
                disabled={archiveMutation.isPending}
              >
                Archive
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
