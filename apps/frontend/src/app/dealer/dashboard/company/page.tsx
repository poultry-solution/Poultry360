"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
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
  useGetDealerVerificationRequests,
  useGetDealerCompanies,
  useCreateDealerVerificationRequest,
  type DealerVerificationRequest,
} from "@/fetchers/dealer/dealerVerificationQueries";
import { PublicCompanySearchSelect } from "@/common/components/forms/PublicCompanySearchSelect";

export default function DealerCompanyPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  // Queries
  const { data: requestsData, isLoading: requestsLoading } =
    useGetDealerVerificationRequests();
  const { data: companiesData, isLoading: companiesLoading } = useGetDealerCompanies();

  // Mutations
  const createRequestMutation = useCreateDealerVerificationRequest();

  const requests = requestsData?.data || [];
  const approvedCompanies = companiesData?.data || [];

  // Filter requests based on status filter and search
  const filteredRequests = requests.filter((request) => {
    const matchesStatus =
      statusFilter === "ALL" || request.status === statusFilter;
    const matchesSearch = search
      ? request.company?.name
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        request.company?.address
          ?.toLowerCase()
          .includes(search.toLowerCase())
      : true;

    return matchesStatus && matchesSearch;
  });

  // Group requests by status
  const pendingRequests = filteredRequests.filter((r) => r.status === "PENDING");
  const approvedRequests = filteredRequests.filter((r) => r.status === "APPROVED");
  const rejectedRequests = filteredRequests.filter((r) => r.status === "REJECTED");

  const handleApply = async () => {
    if (!selectedCompanyId) {
      toast.error("Please select a company");
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        companyId: selectedCompanyId,
      });
      toast.success("Verification request sent successfully");
      setIsApplyDialogOpen(false);
      setSelectedCompanyId(null);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Failed to send verification request. Please check if you can retry (wait 1 hour after rejection, and ensure you haven't been rejected 3 times)."
      );
    }
  };

  const handleRetry = async (request: DealerVerificationRequest) => {
    if (!request.companyId) {
      toast.error("Company ID not found");
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        companyId: request.companyId,
      });
      toast.success("Retry request sent successfully");
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
          "Failed to retry verification request. Please check if you can retry (wait 1 hour after rejection, and ensure you haven't been rejected 3 times)."
      );
    }
  };

  const canRetry = (request: DealerVerificationRequest): boolean => {
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

  const getRetryMessage = (request: DealerVerificationRequest): string => {
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

  if (requestsLoading || companiesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Companies</h1>
            <p className="text-muted-foreground">
              Manage your company connections and verification requests
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
          <h1 className="text-3xl font-bold tracking-tight">My Companies</h1>
          <p className="text-muted-foreground">
            Manage your company connections and verification requests
          </p>
        </div>
        <Button onClick={() => setIsApplyDialogOpen(true)} className="bg-primary">
          <Plus className="mr-2 h-4 w-4" />
          Apply to Company
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
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
                  placeholder="Search by company name or address..."
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
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Company Requests */}
      <Card>
        <CardHeader>
          <CardTitle>Company Verification Requests</CardTitle>
          <CardDescription>
            {filteredRequests.length} request(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No company requests</h3>
              <p className="text-muted-foreground mb-4">
                {search || statusFilter !== "ALL"
                  ? "No requests match your filters."
                  : "Get started by applying to a company."}
              </p>
              {!search && statusFilter === "ALL" && (
                <Button onClick={() => setIsApplyDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Apply to Company
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {request.company?.name || "Unknown Company"}
                        </CardTitle>
                        {request.company?.address && (
                          <CardDescription className="mt-1">
                            {request.company.address}
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
                      {request.status === "APPROVED" && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Connected:</span>
                          <span className="font-medium text-green-600">
                            {new Date(request.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      {request.status === "APPROVED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            // Navigate to company details page - to be implemented later
                            toast.info("Company interaction features coming soon!");
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Company
                        </Button>
                      )}
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apply to Company Dialog */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>Apply to Company</DialogTitle>
            <DialogDescription>
              Search and select a company to send a verification request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Company</label>
              <PublicCompanySearchSelect
                value={selectedCompanyId || undefined}
                onValueChange={(companyId) => setSelectedCompanyId(companyId || null)}
                placeholder="Search for a company..."
              />
              {selectedCompanyId && (
                <p className="text-xs text-muted-foreground">
                  You can only have one pending request per company. If already approved,
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
                setSelectedCompanyId(null);
              }}
              disabled={createRequestMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!selectedCompanyId || createRequestMutation.isPending}
              className="bg-primary"
            >
              {createRequestMutation.isPending ? "Sending..." : "Apply to Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
