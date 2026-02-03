"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Store,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Archive,
  ArchiveRestore,
  X,
  Users,
  FileCheck,
  DollarSign,
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
import { toast } from "sonner";
import {
  useGetFarmerVerificationRequests,
  useGetFarmerDealers,
  useCreateFarmerVerificationRequest,
  useCancelFarmerVerificationRequest,
  useArchiveFarmerDealer,
  useUnarchiveFarmerDealer,
  useGetArchivedFarmerDealers,
  type FarmerVerificationRequest,
} from "@/fetchers/farmer/farmerVerificationQueries";
import { PublicDealerSearchSelect } from "@/common/components/forms/PublicDealerSearchSelect";

export default function FarmerDealersPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [viewTab, setViewTab] = useState<"active" | "archived">("active");
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<{ id: string; name: string } | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<{ id: string; dealerName: string } | null>(null);

  // Queries
  const { data: requestsData, isLoading: requestsLoading } =
    useGetFarmerVerificationRequests();
  const { data: dealersData, isLoading: dealersLoading } = useGetFarmerDealers();
  const { data: archivedDealersData, isLoading: archivedLoading } = useGetArchivedFarmerDealers();

  // Mutations
  const createRequestMutation = useCreateFarmerVerificationRequest();
  const cancelRequestMutation = useCancelFarmerVerificationRequest();
  const archiveMutation = useArchiveFarmerDealer();
  const unarchiveMutation = useUnarchiveFarmerDealer();

  const requests = requestsData?.data || [];
  const connectedDealers = dealersData?.data || [];
  const archivedDealers = archivedDealersData?.data || [];

  // Filter out APPROVED requests from verification requests (they're shown in connected dealers)
  const verificationRequests = requests.filter(
    (request) => request.status === "PENDING" || request.status === "REJECTED"
  );

  // Filter verification requests based on status filter and search
  const filteredVerificationRequests = verificationRequests.filter((request) => {
    const matchesStatus =
      statusFilter === "ALL" || request.status === statusFilter;
    const matchesSearch = search
      ? request.dealer?.name
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      request.dealer?.contact
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      request.dealer?.address
        ?.toLowerCase()
        .includes(search.toLowerCase())
      : true;

    return matchesStatus && matchesSearch;
  });

  // Filter connected dealers based on search
  const filteredConnectedDealers = connectedDealers.filter((dealer) => {
    const matchesSearch = search
      ? dealer.name?.toLowerCase().includes(search.toLowerCase()) ||
      dealer.contact?.toLowerCase().includes(search.toLowerCase()) ||
      dealer.address?.toLowerCase().includes(search.toLowerCase())
      : true;

    return matchesSearch;
  });

  // Group verification requests by status
  const pendingRequests = verificationRequests.filter((r) => r.status === "PENDING");
  const rejectedRequests = verificationRequests.filter((r) => r.status === "REJECTED");

  const handleApply = async () => {
    if (!selectedDealerId) {
      toast.error("Please select a dealer");
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        dealerId: selectedDealerId,
      });
      toast.success("Verification request sent successfully");
      setIsApplyDialogOpen(false);
      setSelectedDealerId(null);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
        "Failed to send verification request. Please check if you can retry (wait 1 hour after rejection, and ensure you haven't been rejected 3 times)."
      );
    }
  };

  const handleRetry = async (request: FarmerVerificationRequest) => {
    if (!request.dealerId) {
      toast.error("Dealer ID not found");
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        dealerId: request.dealerId,
      });
      toast.success("Retry request sent successfully");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
        "Failed to retry verification request. Please check if you can retry (wait 1 hour after rejection, and ensure you haven't been rejected 3 times)."
      );
    }
  };

  const canRetry = (request: FarmerVerificationRequest): boolean => {
    if (request.status !== "REJECTED") return false;
    if (request.rejectedCount >= 3) return false;
    if (!request.lastRejectedAt) return true;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const lastRejected = new Date(request.lastRejectedAt);
    return lastRejected < oneHourAgo;
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelRequestMutation.mutateAsync(requestId);
      toast.success("Verification request cancelled successfully");
      setCancelConfirm(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to cancel request");
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

  const handleUnarchive = async (connectionId: string, dealerName: string) => {
    try {
      await unarchiveMutation.mutateAsync(connectionId);
      toast.success(`${dealerName} restored successfully`);
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

  const getRetryMessage = (request: FarmerVerificationRequest): string => {
    if (request.rejectedCount >= 3) {
      return "Cannot retry - 3 rejections reached";
    }
    if (request.lastRejectedAt) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const lastRejected = new Date(request.lastRejectedAt);
      if (lastRejected > oneHourAgo) {
        const minutesRemaining = Math.ceil(
          (lastRejected.getTime() - oneHourAgo.getTime()) / (60 * 1000)
        );
        return `Wait ${minutesRemaining} more minutes before retrying`;
      }
    }
    return "";
  };

  if (requestsLoading || dealersLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Dealers</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Manage your dealer connections and verification requests
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Dealers</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage your dealer connections
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-green-50 hover:text-green-700 border-green-200 text-xs md:text-sm"
            onClick={() => router.push("/farmer/dashboard/dealer-ledger")}
          >
            <Users className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Feed </span>Ledger
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-green-50 hover:text-green-700 border-green-200 text-xs md:text-sm"
            onClick={() => router.push("/farmer/dashboard/sale-requests")}
          >
            <FileCheck className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Sale </span>Requests
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hover:bg-green-50 hover:text-green-700 border-green-200 text-xs md:text-sm"
            onClick={() => router.push("/farmer/dashboard/payment-requests")}
          >
            <DollarSign className="mr-1 md:mr-2 h-3.5 w-3.5 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Payment </span>Requests
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-2 grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Connected</CardTitle>
            <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="flex items-baseline gap-1">
              <div className="text-base md:text-2xl font-bold">{connectedDealers.length}</div>
              {archivedDealers.length > 0 && (
                <span className="text-[9px] md:text-xs text-muted-foreground">+{archivedDealers.length} archived</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Pending</CardTitle>
            <Clock className="h-3 w-3 md:h-4 md:w-4 text-yellow-600" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{pendingRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-3 py-2 md:p-6 md:pb-2">
            <CardTitle className="text-[10px] md:text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{rejectedRequests.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search dealers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
            </div>
            {viewTab === "active" && (
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value)}
              >
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tab Selector and Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setViewTab("active")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewTab === "active"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Active
          </button>
          <button
            onClick={() => setViewTab("archived")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewTab === "archived"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            Archived ({archivedDealers.length})
          </button>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsApplyDialogOpen(true)}
          className="w-full sm:w-auto border-green-200 hover:bg-green-50 hover:text-green-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          Apply to Dealer
        </Button>
      </div>

      {viewTab === "active" ? (
        <>
          {/* Connected Dealers Section */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Connected Dealers</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {filteredConnectedDealers.length} connected
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {filteredConnectedDealers.length === 0 ? (
                <div className="text-center py-8">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No connected dealers</h3>
                  <p className="text-muted-foreground mb-4">
                    {search
                      ? "No dealers match your search."
                      : "Apply to a dealer to get started and once approved, you'll see them here."}
                  </p>
                  {!search && (
                    <Button onClick={() => setIsApplyDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Apply to Dealer
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredConnectedDealers.map((dealer) => (
                    <Card key={dealer.id} className="relative border-green-200 bg-green-50/30">
                      <CardHeader className="p-3 md:p-6 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm md:text-lg truncate">{dealer.name}</CardTitle>
                            {dealer.contact && (
                              <CardDescription className="text-xs mt-0.5">
                                {dealer.contact}
                              </CardDescription>
                            )}
                          </div>
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px] md:text-xs shrink-0">
                            <CheckCircle className="mr-1 h-2.5 w-2.5 md:h-3 md:w-3" />
                            <span className="hidden sm:inline">Connected</span>
                            <span className="sm:hidden">✓</span>
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 md:p-6 pt-0">
                        <div className="grid grid-cols-2 gap-1 text-xs md:text-sm">
                          {dealer.owner && (
                            <>
                              <div>
                                <span className="text-muted-foreground">Owner:</span>
                                <p className="font-medium truncate">{dealer.owner.name}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Phone:</span>
                                <p className="font-medium">{dealer.owner.phone}</p>
                              </div>
                            </>
                          )}
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Connected:</span>
                            <span className="font-medium text-green-600 ml-1">
                              {new Date(dealer.connectedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs"
                            onClick={() => {
                              toast.info("Dealer interaction features coming soon!");
                            }}
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setArchiveConfirm({ id: dealer.dealerFarmerId, name: dealer.name })}
                            className="text-muted-foreground hover:text-foreground px-2"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verification Requests Section */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Requests</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {filteredVerificationRequests.length} pending/rejected
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              {filteredVerificationRequests.length === 0 ? (
                <div className="text-center py-6">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-base font-semibold mb-2">No requests</h3>
                  <p className="text-xs text-muted-foreground">
                    {search || statusFilter !== "ALL"
                      ? "No requests match your filters."
                      : "No pending or rejected requests."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredVerificationRequests.map((request) => (
                    <Card key={request.id} className="relative">
                      <CardHeader className="p-3 md:p-6 pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm md:text-lg truncate">
                              {request.dealer?.name || "Unknown"}
                            </CardTitle>
                            {request.dealer?.contact && (
                              <CardDescription className="text-xs mt-0.5">
                                {request.dealer.contact}
                              </CardDescription>
                            )}
                          </div>
                          {getStatusBadge(request.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 md:p-6 pt-0">
                        <div className="grid grid-cols-2 gap-1 text-xs md:text-sm">
                          <div>
                            <span className="text-muted-foreground">Applied:</span>
                            <p className="font-medium">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {request.status === "REJECTED" && (
                            <div>
                              <span className="text-muted-foreground">Rejections:</span>
                              <p className="font-medium text-red-600">
                                {request.rejectedCount}/3
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex gap-2">
                          {request.status === "REJECTED" && canRetry(request) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs text-blue-600 hover:text-blue-700"
                              onClick={() => handleRetry(request)}
                              disabled={createRequestMutation.isPending}
                            >
                              <RefreshCw className="mr-1 h-3 w-3" />
                              Retry
                            </Button>
                          )}
                          {request.status === "REJECTED" && !canRetry(request) && (
                            <div className="flex-1">
                              <p className="text-[10px] text-red-600 text-center">
                                {getRetryMessage(request)}
                              </p>
                            </div>
                          )}
                          {request.status === "PENDING" && (
                            <>
                              <div className="flex-1">
                                <p className="text-[10px] text-yellow-600 text-center font-medium">
                                  Awaiting approval
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCancelConfirm({ id: request.id, dealerName: request.dealer?.name || "this dealer" })}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 px-2 text-xs"
                              >
                                <X className="mr-1 h-3 w-3" />
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        /* Archived Dealers Tab */
        <Card>
          <CardHeader>
            <CardTitle>Archived Dealers</CardTitle>
            <CardDescription>
              {archivedDealers.length} archived dealer(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {archivedDealers.length === 0 ? (
              <div className="text-center py-8">
                <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No archived dealers</h3>
                <p className="text-muted-foreground">
                  Connections you archive will appear here and can be restored anytime.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {archivedDealers.map((dealer) => (
                  <Card key={dealer.id} className="relative border-gray-300 bg-gray-50/30">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{dealer.name}</CardTitle>
                          {dealer.contact && (
                            <CardDescription className="mt-1">
                              {dealer.contact}
                            </CardDescription>
                          )}
                          {dealer.address && (
                            <CardDescription className="mt-1">
                              {dealer.address}
                            </CardDescription>
                          )}
                        </div>
                        <Badge className="bg-gray-200 text-gray-700 hover:bg-gray-200">
                          <Archive className="mr-1 h-3 w-3" />
                          Archived
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {dealer.owner && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Owner:</span>
                              <span className="font-medium">{dealer.owner.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Phone:</span>
                              <span className="font-medium">{dealer.owner.phone}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Connected:</span>
                          <span className="font-medium">
                            {new Date(dealer.connectedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleUnarchive(dealer.dealerFarmerId, dealer.name)}
                          disabled={unarchiveMutation.isPending}
                        >
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Restore Connection
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Archive Confirmation Dialog */}
      {archiveConfirm && (
        <Dialog open={!!archiveConfirm} onOpenChange={() => setArchiveConfirm(null)}>
          <DialogContent>
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

      {/* Cancel Request Confirmation Dialog */}
      {cancelConfirm && (
        <Dialog open={!!cancelConfirm} onOpenChange={() => setCancelConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Verification Request</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel your verification request to {cancelConfirm.dealerName}?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelConfirm(null)}>
                No, Keep It
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleCancelRequest(cancelConfirm.id)}
                disabled={cancelRequestMutation.isPending}
              >
                Yes, Cancel Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Apply to Dealer Dialog */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>Apply to Dealer</DialogTitle>
            <DialogDescription>
              Search and select a dealer to send a verification request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Dealer</label>
              <PublicDealerSearchSelect
                value={selectedDealerId || undefined}
                onValueChange={(dealerId) => setSelectedDealerId(dealerId || null)}
                placeholder="Search for a dealer..."
              />
              {selectedDealerId && (
                <p className="text-xs text-muted-foreground">
                  You can only have one pending request per dealer. If already approved,
                  you&apos;re connected. If rejected, wait 1 hour before retrying (max 3
                  retries).
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsApplyDialogOpen(false);
                setSelectedDealerId(null);
              }}
              disabled={createRequestMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!selectedDealerId || createRequestMutation.isPending}
              className="bg-primary"
            >
              {createRequestMutation.isPending ? "Sending..." : "Apply to Dealer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
