"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
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
import { Badge } from "@/common/components/ui/badge";
import { DateDisplay } from "@/common/components/ui/date-display";
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
import { DataTable, Column } from "@/common/components/ui/data-table";
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/farmer/dashboard/dealer-ledger")}
            className="h-7 w-7 md:h-8 md:w-8 shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("farmer.dealers.title")}</h1>
            <p className="text-muted-foreground">
              {t("farmer.dealers.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-2 grid-cols-3">
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
          <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
            <div className="text-base md:text-2xl font-bold">{pendingRequests.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("farmer.dealers.stats.rejected")}</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
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
                  placeholder={t("farmer.dealers.filters.searchPlaceholder")}
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
            {t("farmer.dealers.tabs.active")}
          </button>
          <button
            onClick={() => setViewTab("archived")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewTab === "archived"
              ? "border-b-2 border-primary text-primary"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {t("farmer.dealers.tabs.archived", { count: archivedDealers.length })}
          </button>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsApplyDialogOpen(true)}
          className="w-full sm:w-auto border-green-200 hover:bg-green-50 hover:text-green-700"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("farmer.dealers.buttons.apply")}
        </Button>
      </div>

      {viewTab === "active" ? (
        <>
          {/* Connected Dealers Table */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">{t("farmer.dealers.connectedSection.title")}</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {t("farmer.dealers.connectedSection.description", { count: filteredConnectedDealers.length })}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={filteredConnectedDealers}
                loading={dealersLoading}
                emptyMessage={
                  search
                    ? t("farmer.dealers.connectedSection.emptySearch")
                    : t("farmer.dealers.connectedSection.emptyDefault")
                }
                columns={[
                  {
                    key: "name",
                    label: t("farmer.dealers.labels.dealer") || "Dealer",
                    width: "160px",
                    render: (val) => <span className="font-medium">{val}</span>,
                  },
                  {
                    key: "contact",
                    label: t("farmer.dealers.labels.contact") || "Contact",
                    width: "130px",
                    render: (val) => val || "—",
                  },
                  {
                    key: "balance",
                    label: t("farmer.dealers.labels.balance"),
                    align: "right",
                    width: "130px",
                    render: (val) => {
                      const num = Number(val ?? 0);
                      return (
                        <span
                          className={
                            num > 0
                              ? "text-red-600 font-semibold"
                              : num < 0
                                ? "text-green-600 font-semibold"
                                : ""
                          }
                        >
                          {num > 0
                            ? `रू ${Math.abs(num).toFixed(2)} (Due)`
                            : num < 0
                              ? `रू ${Math.abs(num).toFixed(2)} (Adv)`
                              : "रू 0.00"}
                        </span>
                      );
                    },
                  },
                  {
                    key: "owner",
                    label: t("farmer.dealers.labels.owner") || "Owner",
                    width: "120px",
                    render: (_, row) =>
                      row.owner?.name ? (
                        <span className="text-sm">{row.owner.name}</span>
                      ) : (
                        "—"
                      ),
                  },
                  {
                    key: "connectedAt",
                    label: t("farmer.dealers.labels.connected") || "Connected",
                    width: "120px",
                    render: (val) =>
                      val ? (
                        <span className="text-green-600 text-sm">
                          <DateDisplay date={val} format="long" />
                        </span>
                      ) : (
                        "—"
                      ),
                  },
                  {
                    key: "status",
                    label: t("farmer.dealers.labels.statusLabel"),
                    width: "100px",
                    render: () => (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        {t("farmer.dealers.status.connected")}
                      </Badge>
                    ),
                  },
                  {
                    key: "actions",
                    label: t("farmer.dealers.labels.actions"),
                    align: "right",
                    width: "160px",
                    render: (_, dealer) => (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => router.push(`/farmer/dashboard/dealers/${dealer.id}`)}
                        >
                          <Eye className="mr-2 h-3.5 w-3.5" />
                          {t("farmer.dealers.buttons.viewDetails")}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => setArchiveConfirm({ id: dealer.dealerFarmerId, name: dealer.name })}
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ),
                  },
                ] as Column[]}
              />
              {filteredConnectedDealers.length === 0 && !search && (
                <div className="p-4 flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => setIsApplyDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t("farmer.dealers.buttons.apply")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Verification Requests Table */}
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">{t("farmer.dealers.verificationSection.title")}</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                {t("farmer.dealers.verificationSection.description", { count: filteredVerificationRequests.length })}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={filteredVerificationRequests}
                loading={requestsLoading}
                emptyMessage={
                  search || statusFilter !== "ALL"
                    ? t("farmer.dealers.verificationSection.emptyFiltered")
                    : t("farmer.dealers.verificationSection.emptyDefault")
                }
                columns={[
                  {
                    key: "dealer",
                    label: t("farmer.dealers.labels.dealer") || "Dealer",
                    width: "160px",
                    render: (_, row) => (
                      <span className="font-medium">{row.dealer?.name || t("chat.unknown")}</span>
                    ),
                  },
                  {
                    key: "contact",
                    label: t("farmer.dealers.labels.contact") || "Contact",
                    width: "130px",
                    render: (_, row) => row.dealer?.contact || "—",
                  },
                  {
                    key: "status",
                    label: t("farmer.dealers.labels.statusLabel") || "Status",
                    width: "100px",
                    render: (_, row) => getStatusBadge(row.status),
                  },
                  {
                    key: "createdAt",
                    label: t("farmer.dealers.labels.applied") || "Applied",
                    width: "120px",
                    render: (val) => (val ? <DateDisplay date={val} format="long" /> : "—"),
                  },
                  {
                    key: "rejectedInfo",
                    label: t("farmer.dealers.labels.rejected"),
                    width: "100px",
                    render: (_, row) =>
                      row.status === "REJECTED" ? (
                        <span className="text-xs text-red-600">
                          {row.rejectedCount}/3
                          {row.lastRejectedAt && (
                            <span className="block text-muted-foreground">
                              <DateDisplay date={row.lastRejectedAt} format="short" />
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      ),
                  },
                  {
                    key: "actions",
                    label: t("farmer.dealers.labels.actions"),
                    align: "right",
                    width: "180px",
                    render: (_, request) => (
                      <div className="flex justify-end gap-1">
                        {request.status === "REJECTED" && canRetry(request) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs px-2 text-blue-600 hover:text-blue-700"
                            onClick={() => handleRetry(request)}
                            disabled={createRequestMutation.isPending}
                          >
                            <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            {t("farmer.dealers.buttons.retry")}
                          </Button>
                        )}
                        {request.status === "PENDING" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() =>
                              setCancelConfirm({
                                id: request.id,
                                dealerName: request.dealer?.name || "this dealer",
                              })
                            }
                          >
                            <X className="mr-1 h-3.5 w-3.5" />
                            {t("farmer.dealers.buttons.cancel")}
                          </Button>
                        )}
                        {request.status === "REJECTED" && !canRetry(request) && (
                          <p className="text-[10px] text-red-600 text-right py-1">
                            {getRetryMessage(request)}
                          </p>
                        )}
                      </div>
                    ),
                  },
                ] as Column[]}
              />
            </CardContent>
          </Card>
        </>
      ) : (
        /* Archived Dealers Tab */
        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-base md:text-lg">{t("farmer.dealers.archivedSection.title")}</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              {t("farmer.dealers.archivedSection.description", { count: archivedDealers.length })}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              data={archivedDealers}
              loading={archivedLoading}
              emptyMessage={t("farmer.dealers.archivedSection.emptyHelp")}
              columns={[
                {
                  key: "name",
                  label: t("farmer.dealers.labels.dealer") || "Dealer",
                  width: "160px",
                  render: (val) => <span className="font-medium">{val}</span>,
                },
                {
                  key: "contact",
                  label: t("farmer.dealers.labels.contact") || "Contact",
                  width: "130px",
                  render: (val) => val || "—",
                },
                {
                  key: "address",
                  label: t("farmer.dealers.labels.address"),
                  width: "140px",
                  render: (val) => (val ? <span className="truncate max-w-[120px] block">{val}</span> : "—"),
                },
                {
                  key: "owner",
                  label: t("farmer.dealers.labels.owner") || "Owner",
                  width: "120px",
                  render: (_, row) => row.owner?.name ?? "—",
                },
                {
                  key: "connectedAt",
                  label: t("farmer.dealers.labels.connected") || "Connected",
                  width: "120px",
                  render: (val) => (val ? <DateDisplay date={val} format="long" /> : "—"),
                },
                {
                  key: "actions",
                  label: t("farmer.dealers.labels.actions"),
                  align: "right",
                  width: "120px",
                  render: (_, dealer) => (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => handleUnarchive(dealer.dealerFarmerId, dealer.name)}
                        disabled={unarchiveMutation.isPending}
                      >
                        <ArchiveRestore className="mr-2 h-3.5 w-3.5" />
                        {t("farmer.dealers.buttons.restore")}
                      </Button>
                    </div>
                  ),
                },
              ] as Column[]}
            />
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
