"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Archive,
  ArchiveRestore,
  X,
  Wallet,
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
  useCancelDealerVerificationRequest,
  useArchiveDealerCompany,
  useUnarchiveDealerCompany,
  useGetArchivedDealerCompanies,
  type DealerVerificationRequest,
} from "@/fetchers/dealer/dealerVerificationQueries";
import { useGetAllCompanyAccounts } from "@/fetchers/dealer/dealerCompanyAccountQueries";
import { PublicCompanySearchSelect } from "@/common/components/forms/PublicCompanySearchSelect";

export default function DealerCompanyPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [viewTab, setViewTab] = useState<"active" | "archived">("active");
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<{ id: string; name: string } | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<{ id: string; companyName: string } | null>(null);

  // Queries
  const { data: requestsData, isLoading: requestsLoading } =
    useGetDealerVerificationRequests();
  const { data: companiesData, isLoading: companiesLoading } = useGetDealerCompanies();
  const { data: archivedCompaniesData, isLoading: archivedLoading } = useGetArchivedDealerCompanies();
  const { data: accountsData } = useGetAllCompanyAccounts();
  const accounts = accountsData || [];

  // Mutations
  const createRequestMutation = useCreateDealerVerificationRequest();
  const cancelRequestMutation = useCancelDealerVerificationRequest();
  const archiveMutation = useArchiveDealerCompany();
  const unarchiveMutation = useUnarchiveDealerCompany();

  const requests = requestsData?.data || [];
  const connectedCompanies = companiesData?.data || [];
  const archivedCompanies = archivedCompaniesData?.data || [];

  // Filter out APPROVED requests from verification requests (they're shown in connected companies)
  // Note: REJECTED requests can be retried and will become PENDING, so we show both
  const verificationRequests = requests.filter(
    (request) => request.status === "PENDING" || request.status === "REJECTED"
  );

  // Filter verification requests based on status filter and search
  const filteredVerificationRequests = verificationRequests.filter((request) => {
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

  // Filter connected companies based on search
  const filteredConnectedCompanies = connectedCompanies.filter((company) => {
    const matchesSearch = search
      ? company.name?.toLowerCase().includes(search.toLowerCase()) ||
        company.address?.toLowerCase().includes(search.toLowerCase())
      : true;

    return matchesSearch;
  });

  // Group verification requests by status
  const pendingRequests = verificationRequests.filter((r) => r.status === "PENDING");
  const rejectedRequests = verificationRequests.filter((r) => r.status === "REJECTED");

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

  const handleUnarchive = async (connectionId: string, companyName: string) => {
    try {
      await unarchiveMutation.mutateAsync(connectionId);
      toast.success(`${companyName} restored successfully`);
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

  // Get balance for a specific company
  const getCompanyBalance = (companyId: string) => {
    const account = accounts.find((a) => a.companyId === companyId);
    return account?.balance || 0;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `रू ${Math.abs(amount).toFixed(2)}`;
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

      {/* Account Summary Cards */}
      {(() => {
        const totalOwed = accounts
          .filter((a) => a.balance > 0)
          .reduce((sum, a) => sum + a.balance, 0);
        const totalAdvance = accounts
          .filter((a) => a.balance < 0)
          .reduce((sum, a) => sum + Math.abs(a.balance), 0);

        return (
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Connected Companies</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">{connectedCompanies.length}</div>
                  <span className="text-sm text-muted-foreground">Active</span>
                  {archivedCompanies.length > 0 && (
                    <>
                      <span className="text-sm text-muted-foreground">/</span>
                      <div className="text-xl font-semibold text-muted-foreground">{archivedCompanies.length}</div>
                      <span className="text-sm text-muted-foreground">Archived</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Balance Owed</CardTitle>
                <Wallet className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalOwed)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Amount you owe to companies
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Advance</CardTitle>
                <Wallet className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalAdvance)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your advance/credit balance
                </p>
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
        );
      })()}

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
            {viewTab === "active" && (
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
            )}
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
          Archived ({archivedCompanies.length})
        </button>
      </div>

      {viewTab === "active" ? (
        <>
          {/* Connected Companies Section */}
      <Card>
        <CardHeader>
          <CardTitle>My Connected Companies</CardTitle>
          <CardDescription>
            {filteredConnectedCompanies.length} company(ies) connected
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredConnectedCompanies.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No connected companies</h3>
              <p className="text-muted-foreground mb-4">
                {search
                  ? "No companies match your search."
                  : "Apply to a company to get started and once approved, you'll see them here."}
              </p>
              {!search && (
                <Button onClick={() => setIsApplyDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Apply to Company
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredConnectedCompanies.map((company) => (
                <Card key={company.id} className="relative border-green-200 bg-green-50/30">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{company.name}</CardTitle>
                        {company.address && (
                          <CardDescription className="mt-1">
                            {company.address}
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
                    {(() => {
                      const balance = getCompanyBalance(company.id);
                      return (
                        <>
                          <div className="space-y-2 text-sm">
                            {/* Balance Display */}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Balance:</span>
                              <span
                                className={`font-bold ${
                                  balance > 0
                                    ? "text-red-600"
                                    : balance < 0
                                    ? "text-green-600"
                                    : ""
                                }`}
                              >
                                {balance > 0
                                  ? `${formatCurrency(balance)} (Owed)`
                                  : balance < 0
                                  ? `${formatCurrency(balance)} (Advance)`
                                  : "रू 0.00"}
                              </span>
                            </div>
                            {company.owner && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Owner:</span>
                                  <span className="font-medium">{company.owner.name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Contact:</span>
                                  <span className="font-medium">{company.owner.phone}</span>
                                </div>
                              </>
                            )}
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Connected:</span>
                              <span className="font-medium text-green-600">
                                {new Date(company.connectedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => router.push(`/dealer/dashboard/companies/${company.id}/account`)}
                            >
                              <Wallet className="mr-2 h-4 w-4" />
                              View Account
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                window.location.href = `/dealer/dashboard/company/${company.id}/catalog`;
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Catalog
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setArchiveConfirm({ id: company.dealerCompanyId, name: company.name })}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Archive className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      );
                    })()}
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
                        <>
                          <div className="flex-1">
                            <p className="text-xs text-yellow-600 text-center font-medium">
                              Waiting for company approval
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCancelConfirm({ id: request.id, companyName: request.company?.name || "this company" })}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="mr-1 h-4 w-4" />
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
        /* Archived Companies Tab */
        <Card>
          <CardHeader>
            <CardTitle>Archived Companies</CardTitle>
            <CardDescription>
              {archivedCompanies.length} archived company(ies)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {archivedCompanies.length === 0 ? (
              <div className="text-center py-8">
                <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No archived companies</h3>
                <p className="text-muted-foreground">
                  Connections you archive will appear here and can be restored anytime.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {archivedCompanies.map((company) => (
                  <Card key={company.id} className="relative border-gray-300 bg-gray-50/30">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{company.name}</CardTitle>
                          {company.address && (
                            <CardDescription className="mt-1">
                              {company.address}
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
                        {company.owner && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Owner:</span>
                              <span className="font-medium">{company.owner.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Contact:</span>
                              <span className="font-medium">{company.owner.phone}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Connected:</span>
                          <span className="font-medium">
                            {new Date(company.connectedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleUnarchive(company.dealerCompanyId, company.name)}
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
                Are you sure you want to cancel your verification request to {cancelConfirm.companyName}?
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
