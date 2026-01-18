"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Store,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
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
  type FarmerVerificationRequest,
} from "@/fetchers/farmer/farmerVerificationQueries";
import { PublicDealerSearchSelect } from "@/common/components/forms/PublicDealerSearchSelect";

export default function FarmerDealersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);

  // Queries
  const { data: requestsData, isLoading: requestsLoading } =
    useGetFarmerVerificationRequests();
  const { data: dealersData, isLoading: dealersLoading } = useGetFarmerDealers();

  // Mutations
  const createRequestMutation = useCreateFarmerVerificationRequest();

  const requests = requestsData?.data || [];
  const connectedDealers = dealersData?.data || [];

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Dealers</h1>
            <p className="text-muted-foreground">
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Dealers</h1>
          <p className="text-muted-foreground">
            Manage your dealer connections and verification requests
          </p>
        </div>
        <Button onClick={() => setIsApplyDialogOpen(true)} className="bg-primary">
          <Plus className="mr-2 h-4 w-4" />
          Apply to Dealer
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Dealers</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedDealers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected Requests</CardTitle>
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
                  placeholder="Search by dealer name, contact, or address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Connected Dealers Section */}
      <Card>
        <CardHeader>
          <CardTitle>My Connected Dealers</CardTitle>
          <CardDescription>
            {filteredConnectedDealers.length} dealer(s) connected
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredConnectedDealers.map((dealer) => (
                <Card key={dealer.id} className="relative border-green-200 bg-green-50/30">
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
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Connected
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
                        <span className="font-medium text-green-600">
                          {new Date(dealer.connectedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          // Navigate to dealer details page - to be implemented later
                          toast.info("Dealer interaction features coming soon!");
                        }}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
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
        <CardHeader>
          <CardTitle>Verification Requests</CardTitle>
          <CardDescription>
            {filteredVerificationRequests.length} pending/rejected request(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredVerificationRequests.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No verification requests</h3>
              <p className="text-muted-foreground mb-4">
                {search || statusFilter !== "ALL"
                  ? "No requests match your filters."
                  : "You don't have any pending or rejected verification requests."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredVerificationRequests.map((request) => (
                <Card key={request.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {request.dealer?.name || "Unknown Dealer"}
                        </CardTitle>
                        {request.dealer?.contact && (
                          <CardDescription className="mt-1">
                            {request.dealer.contact}
                          </CardDescription>
                        )}
                        {request.dealer?.address && (
                          <CardDescription className="mt-1">
                            {request.dealer.address}
                          </CardDescription>
                        )}
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
                        <span className="text-muted-foreground">Applied:</span>
                        <span className="font-medium">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {request.status === "REJECTED" && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Rejection Count:</span>
                            <span className="font-medium text-red-600">
                              {request.rejectedCount}/3
                            </span>
                          </div>
                          {request.lastRejectedAt && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Last Rejected:</span>
                              <span className="font-medium">
                                {new Date(request.lastRejectedAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      {request.status === "REJECTED" && canRetry(request) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-blue-600 hover:text-blue-700"
                          onClick={() => handleRetry(request)}
                          disabled={createRequestMutation.isPending}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retry
                        </Button>
                      )}
                      {request.status === "REJECTED" && !canRetry(request) && (
                        <div className="flex-1">
                          <p className="text-xs text-red-600 text-center">
                            {getRetryMessage(request)}
                          </p>
                        </div>
                      )}
                      {request.status === "PENDING" && (
                        <div className="flex-1">
                          <p className="text-xs text-yellow-600 text-center font-medium">
                            Waiting for dealer approval
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
