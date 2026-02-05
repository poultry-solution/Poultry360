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
import { useI18n } from "@/i18n/useI18n";

export default function FarmerDealersPage() {
  const router = useRouter();
  const { t } = useI18n();
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
      toast.error(t("farmer.dealers.toasts.selectDealer"));
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        dealerId: selectedDealerId,
      });
      toast.success(t("farmer.dealers.toasts.requestSent"));
      setIsApplyDialogOpen(false);
      setSelectedDealerId(null);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
        t("farmer.dealers.toasts.requestFailed")
      );
    }
  };

  const handleRetry = async (request: FarmerVerificationRequest) => {
    if (!request.dealerId) {
      toast.error(t("farmer.dealers.toasts.dealerIdMissing"));
      return;
    }

    try {
      await createRequestMutation.mutateAsync({
        dealerId: request.dealerId,
      });
      toast.success(t("farmer.dealers.toasts.retrySent"));
    } catch (error: any) {
      toast.error(
        error.response?.data?.message ||
        t("farmer.dealers.toasts.retryFailed")
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
      toast.success(t("farmer.dealers.toasts.cancelSuccess"));
      setCancelConfirm(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("farmer.dealers.toasts.cancelFailed"));
    }
  };

  const handleArchive = async (connectionId: string) => {
    try {
      await archiveMutation.mutateAsync(connectionId);
      toast.success(t("farmer.dealers.toasts.archiveSuccess"));
      setArchiveConfirm(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("farmer.dealers.toasts.archiveFailed"));
    }
  };

  const handleUnarchive = async (connectionId: string, dealerName: string) => {
    try {
      await unarchiveMutation.mutateAsync(connectionId);
      toast.success(t("farmer.dealers.toasts.restoreSuccess", { name: dealerName }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || t("farmer.dealers.toasts.restoreFailed"));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="mr-1 h-3 w-3" />
            {t("farmer.dealers.status.pending")}
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="mr-1 h-3 w-3" />
            {t("farmer.dealers.status.approved")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="mr-1 h-3 w-3" />
            {t("farmer.dealers.status.rejected")}
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getRetryMessage = (request: FarmerVerificationRequest): string => {
    if (request.rejectedCount >= 3) {
      return t("farmer.dealers.messages.retryLimit");
    }
    if (request.lastRejectedAt) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const lastRejected = new Date(request.lastRejectedAt);
      if (lastRejected > oneHourAgo) {
        const minutesRemaining = Math.ceil(
          (lastRejected.getTime() - oneHourAgo.getTime()) / (60 * 1000)
        );
        return t("farmer.dealers.messages.retryWait", { minutes: minutesRemaining });
      }
    }
    return "";
  };

  if (requestsLoading || dealersLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("farmer.dealers.title")}</h1>
            <p className="text-muted-foreground">
              {t("farmer.dealers.subtitle")}
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">{t("common.loading")}</div>
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
          <h1 className="text-3xl font-bold tracking-tight">{t("farmer.dealers.title")}</h1>
          <p className="text-muted-foreground">
            {t("farmer.dealers.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="hover:bg-green-50 hover:text-green-700 border-green-200"
            onClick={() => router.push("/farmer/dashboard/dealer-ledger")}
          >
            <Users className="mr-2 h-4 w-4" />
            {t("farmer.dealers.buttons.feedLedger")}
          </Button>
          <Button
            variant="outline"
            className="hover:bg-green-50 hover:text-green-700 border-green-200"
            onClick={() => router.push("/farmer/dashboard/sale-requests")}
          >
            <FileCheck className="mr-2 h-4 w-4" />
            {t("farmer.dealers.buttons.saleRequests")}
          </Button>
          <Button
            variant="outline"
            className="hover:bg-green-50 hover:text-green-700 border-green-200"
            onClick={() => router.push("/farmer/dashboard/payment-requests")}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            {t("farmer.dealers.buttons.paymentRequests")}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("farmer.dealers.stats.connected")}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold">{connectedDealers.length}</div>
              <span className="text-sm text-muted-foreground">{t("farmer.dealers.stats.active")}</span>
              {archivedDealers.length > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">/</span>
                  <div className="text-xl font-semibold text-muted-foreground">{archivedDealers.length}</div>
                  <span className="text-sm text-muted-foreground">{t("farmer.dealers.stats.archived")}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("farmer.dealers.stats.pending")}</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("farmer.dealers.stats.rejected")}</CardTitle>
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
                  placeholder={t("farmer.dealers.filters.searchPlaceholder")}
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
                  <SelectValue placeholder={t("farmer.dealers.filters.allStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t("farmer.dealers.filters.allStatus")}</SelectItem>
                  <SelectItem value="PENDING">{t("farmer.dealers.filters.pending")}</SelectItem>
                  <SelectItem value="REJECTED">{t("farmer.dealers.filters.rejected")}</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tab Selector */}
      {/* Tab Selector and Action Button */}
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setViewTab("active")}
            className={`px-4 py-2 font-medium transition-colors ${viewTab === "active"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {t("farmer.dealers.tabs.active")}
          </button>
          <button
            onClick={() => setViewTab("archived")}
            className={`px-4 py-2 font-medium transition-colors ${viewTab === "archived"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {t("farmer.dealers.tabs.archived", { count: archivedDealers.length })}
          </button>
        </div>
        <Button onClick={() => setIsApplyDialogOpen(true)} className="bg-primary">
          <Plus className="mr-2 h-4 w-4" />
          {t("farmer.dealers.buttons.apply")}
        </Button>
      </div>

      {viewTab === "active" ? (
        <>
          {/* Connected Dealers Section */}
          <Card>
            <CardHeader>
              <CardTitle>My Connected Dealers</CardTitle>
              <CardDescription>
                {t("farmer.dealers.connectedSection.description", { count: filteredConnectedDealers.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredConnectedDealers.length === 0 ? (
                <div className="text-center py-8">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t("farmer.dealers.connectedSection.emptyTitle")}</h3>
                  <p className="text-muted-foreground mb-4">
                    {search
                      ? t("farmer.dealers.connectedSection.emptySearch")
                      : t("farmer.dealers.connectedSection.emptyDefault")}
                  </p>
                  {!search && (
                    <Button onClick={() => setIsApplyDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t("farmer.dealers.buttons.apply")}
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
                            {t("farmer.dealers.status.connected")}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          {dealer.owner && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">{t("farmer.dealers.labels.owner")}</span>
                                <span className="font-medium">{dealer.owner.name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">{t("farmer.dealers.labels.phone")}</span>
                                <span className="font-medium">{dealer.owner.phone}</span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("farmer.dealers.labels.connected")}</span>
                            <span className="font-medium text-green-600">
                              {new Date(dealer.connectedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => {
                              // Navigate to dealer details page - to be implemented later
                              toast.info(t("farmer.dealers.messages.dealerInteractionSoon"));
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            {t("farmer.dealers.buttons.viewDetails")}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setArchiveConfirm({ id: dealer.dealerFarmerId, name: dealer.name })}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Archive className="h-4 w-4" />
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
                {t("farmer.dealers.verificationSection.description", { count: filteredVerificationRequests.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredVerificationRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t("farmer.dealers.verificationSection.emptyTitle")}</h3>
                  <p className="text-muted-foreground mb-4">
                    {search || statusFilter !== "ALL"
                      ? t("farmer.dealers.verificationSection.emptyFiltered")
                      : t("farmer.dealers.verificationSection.emptyDefault")}
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
                              {request.dealer?.name || t("chat.unknown")}
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
                            <span className="text-muted-foreground">{t("farmer.dealers.labels.status")}</span>
                            <span className="font-medium">{request.status}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">{t("farmer.dealers.labels.applied")}</span>
                            <span className="font-medium">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {request.status === "REJECTED" && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">{t("farmer.dealers.labels.rejectionCount")}</span>
                                <span className="font-medium text-red-600">
                                  {request.rejectedCount}/3
                                </span>
                              </div>
                              {request.lastRejectedAt && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">{t("farmer.dealers.labels.lastRejected")}</span>
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
                              {t("farmer.dealers.buttons.retry")}
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
                                  {t("farmer.dealers.messages.waitingApproval")}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCancelConfirm({ id: request.id, dealerName: request.dealer?.name || "this dealer" })}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="mr-1 h-4 w-4" />
                                {t("farmer.dealers.buttons.cancel")}
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
            <CardTitle>{t("farmer.dealers.archivedSection.title")}</CardTitle>
            <CardDescription>
              {t("farmer.dealers.archivedSection.description", { count: archivedDealers.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {archivedDealers.length === 0 ? (
              <div className="text-center py-8">
                <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("farmer.dealers.archivedSection.emptyTitle")}</h3>
                <p className="text-muted-foreground">{t("farmer.dealers.archivedSection.emptyHelp")}</p>
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
                          {t("farmer.dealers.stats.archived")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        {dealer.owner && (
                          <>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t("farmer.dealers.labels.owner")}</span>
                              <span className="font-medium">{dealer.owner.name}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t("farmer.dealers.labels.phone")}</span>
                              <span className="font-medium">{dealer.owner.phone}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("farmer.dealers.labels.connected")}</span>
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
                          {t("farmer.dealers.buttons.restore")}
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
              <DialogTitle>{t("farmer.dealers.dialogs.archiveTitle")}</DialogTitle>
              <DialogDescription>
                {t("farmer.dealers.dialogs.archiveBody", { name: archiveConfirm.name })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setArchiveConfirm(null)}>
                {t("farmer.dealers.buttons.cancel")}
              </Button>
              <Button
                onClick={() => handleArchive(archiveConfirm.id)}
                disabled={archiveMutation.isPending}
              >
                {t("farmer.dealers.buttons.archive")}
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
              <DialogTitle>{t("farmer.dealers.dialogs.cancelRequestTitle")}</DialogTitle>
              <DialogDescription>
                {t("farmer.dealers.dialogs.cancelRequestBody", { name: cancelConfirm.dealerName })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelConfirm(null)}>
                {t("farmer.dealers.dialogs.cancelKeep")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleCancelRequest(cancelConfirm.id)}
                disabled={cancelRequestMutation.isPending}
              >
                {t("farmer.dealers.dialogs.cancelConfirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Apply to Dealer Dialog */}
      <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle>{t("farmer.dealers.dialogs.applyTitle")}</DialogTitle>
            <DialogDescription>
              {t("farmer.dealers.dialogs.applyBody")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("farmer.dealers.dialogs.selectDealer")}</label>
              <PublicDealerSearchSelect
                value={selectedDealerId || undefined}
                onValueChange={(dealerId) => setSelectedDealerId(dealerId || null)}
                placeholder={t("common.searchPlaceholderDealer")}
              />
              {selectedDealerId && (
                <p className="text-xs text-muted-foreground">
                  {t("farmer.dealers.dialogs.applyHint")}
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
              {t("farmer.dealers.dialogs.applyCancel")}
            </Button>
            <Button
              onClick={handleApply}
              disabled={!selectedDealerId || createRequestMutation.isPending}
              className="bg-primary"
            >
              {createRequestMutation.isPending ? t("farmer.dealers.dialogs.applySending") : t("farmer.dealers.dialogs.applySubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
