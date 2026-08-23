"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
  Layers,
  Plus,
  TrendingUp,
  Users,
  Loader2,
} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
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
  useGetAllBatches,
  useCreateBatch,
} from "@/fetchers/batches/batchQueries";
import { useGetUserFarms as useGetFarms } from "@/fetchers/farms/farmQueries";
import { toast } from "sonner";
import { getTodayLocalDate } from "@/common/lib/utils";
import { getBSMonthDayForDisplay } from "@/common/lib/nepali-date";
import { BatchResponse, BatchStatus } from "@myapp/shared-types";
import { useInventoryByType } from "@/fetchers/inventory/inventoryQueries";
import { DateInput } from "@/common/components/ui/date-input";
import { DateDisplay } from "@/common/components/ui/date-display";
import { useI18n } from "@/i18n/useI18n";
import { DataTable, type Column } from "@/common/components/ui/data-table";


export default function BatchesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useI18n();

  // Fetch farms for the form
  const { data: farmsResponse, isLoading: farmsLoading } = useGetFarms("all");
  const farms = farmsResponse?.data || [];

  // Create batch mutation
  const createBatchMutation = useCreateBatch();

  const [formData, setFormData] = useState({
    batchNumber: "",
    batchType: "BROILER" as "BROILER" | "LAYERS",
    farmId: "",
    startDate: getTodayLocalDate(),
    initialChickWeight: "0.045",
    notes: "",
  });

  // Chicks inventory selections
  const [multiSource, setMultiSource] = useState(false);
  const [singleAlloc, setSingleAlloc] = useState<{ itemId: string; quantity: string; notes?: string }>({
    itemId: "",
    quantity: "",
  });
  const [allocations, setAllocations] = useState<Array<{ itemId: string; quantity: string; notes?: string }>>([
    { itemId: "", quantity: "" },
  ]);

  // Fetch chicks inventory items
  const chicksInventory = useInventoryByType("CHICKS" as any);

  // Modal for counts (active/closed lists)
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  const [countFilter, setCountFilter] = useState<"Active" | "Closed">("Active");

  function openCountModal(filter: "Active" | "Closed") {
    setCountFilter(filter);
    setIsCountModalOpen(true);
  }
  function computeBatchName(startDateStr: string, farmId: string) {
    if (!startDateStr || !farmId) return "";

    const farm = farms.find((f: any) => f.id === farmId);
    if (!farm) return "";

    const bsPart = getBSMonthDayForDisplay(startDateStr);
    if (!bsPart) return "";

    // Add current time (HH-MM-SS with dashes)
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    return `${bsPart}-${farm.name}-${hh}-${mm}-${ss}`;
  }

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value } as typeof prev;

      if (name === "startDate" || name === "farmId") {
        const suggested = computeBatchName(
          name === "startDate" ? value : next.startDate,
          name === "farmId" ? value : next.farmId
        );
        if (suggested) next.batchNumber = suggested;
      }

      return next;
    });
  }


  // Reset to current date when modal opens
  useEffect(() => {
    if (isModalOpen) {
      const today = getTodayLocalDate();
      setFormData(prev => ({
        ...prev,
        startDate: today,
      }));
    }
  }, [isModalOpen]);

  // Ensure batch name is precomputed when startDate or farmId changes
  useEffect(() => {
    if (!isModalOpen) return;
    const suggested = computeBatchName(formData.startDate, formData.farmId);
    if (suggested && formData.batchNumber !== suggested) {
      setFormData((p) => ({ ...p, batchNumber: suggested }));
    }
  }, [isModalOpen, formData.startDate, formData.farmId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const startDate = formData.startDate
      ? new Date(formData.startDate).toISOString()
      : new Date().toISOString();

    // Build chicksInventory payload
    const builtAllocations = multiSource
      ? allocations
        .filter((a) => a.itemId && Number(a.quantity) > 0)
        .map((a) => ({ itemId: a.itemId, quantity: parseInt(a.quantity, 10), notes: a.notes }))
      : singleAlloc.itemId && Number(singleAlloc.quantity) > 0
        ? [{ itemId: singleAlloc.itemId, quantity: parseInt(singleAlloc.quantity, 10), notes: singleAlloc.notes }]
        : [];

    if (builtAllocations.length === 0) {
      toast.error(t("farmer.batches.toasts.selectChicks"));
      return;
    }

    try {
      await createBatchMutation.mutateAsync({
        batchNumber:
          formData.batchNumber ||
          `B-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,

        batchType: formData.batchType,
        farmId: formData.farmId,
        startDate: startDate,
        initialChickWeight: parseFloat(formData.initialChickWeight),
        status: "ACTIVE" as BatchStatus,
        chicksInventory: builtAllocations,
      });

      toast.success(t("farmer.batches.toasts.created"));
      setIsModalOpen(false);
      setFormData({
        batchNumber: "",
        batchType: "BROILER",
        farmId: "",
        startDate: "",
        initialChickWeight: "0.045",
        notes: "",
      });
      setSingleAlloc({ itemId: "", quantity: "" });
      setAllocations([{ itemId: "", quantity: "" }]);
      setMultiSource(false);
    } catch (error) {
      console.error("Failed to create batch:", error);
      // Error toast is handled by axios interceptor
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setFormData({
      batchNumber: "",
      batchType: "BROILER",
      farmId: "",
      startDate: getTodayLocalDate(),
      initialChickWeight: "0.045",
      notes: "",
    });
  };

  const [page, setPage] = useState(1);
  const limit = 10;
  const [farmFilter, setFarmFilter] = useState("all");
  const [batchTypeFilter, setBatchTypeFilter] = useState<"ALL" | "BROILER" | "LAYERS">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ALL");

  const router = useRouter();

  const mainBatchQueryParams: {
    page: number;
    limit: number;
    farmId?: string;
    batchType?: "BROILER" | "LAYERS";
    status?: BatchStatus;
  } = {
    page,
    limit,
    farmId: farmFilter === "all" ? undefined : farmFilter,
    batchType: batchTypeFilter === "ALL" ? undefined : batchTypeFilter,
    status: statusFilter === "ALL" ? undefined : statusFilter,
  };

  const summaryBatchQueryParams: {
    page: number;
    limit: number;
    farmId?: string;
    batchType?: "BROILER" | "LAYERS";
  } = {
    page: 1,
    limit: 1,
    farmId: farmFilter === "all" ? undefined : farmFilter,
    batchType: batchTypeFilter === "ALL" ? undefined : batchTypeFilter,
  };

  const countModalStatus: BatchStatus =
    countFilter === "Active" ? "ACTIVE" : "COMPLETED";
  const countModalQueryParams: {
    page: number;
    limit: number;
    farmId?: string;
    batchType?: "BROILER" | "LAYERS";
    status: BatchStatus;
  } = {
    page: 1,
    limit: 1000,
    farmId: farmFilter === "all" ? undefined : farmFilter,
    batchType: batchTypeFilter === "ALL" ? undefined : batchTypeFilter,
    status: countModalStatus,
  };

  const {
    data: batchesResponse,
    isLoading: batchesLoading,
    error: batchesError,
  } = useGetAllBatches(mainBatchQueryParams);

  const {
    data: summaryResponse,
  } = useGetAllBatches(summaryBatchQueryParams);

  const {
    data: countModalResponse,
    isLoading: countModalLoading,
    error: countModalError,
  } = useGetAllBatches(countModalQueryParams, { enabled: isCountModalOpen });

  const batches = batchesResponse?.data || [];
  const pagination = batchesResponse?.pagination;
  const summary = summaryResponse?.summary || batchesResponse?.summary;
  const totalBatches = summary?.totalBatches ?? pagination?.total ?? 0;
  const totalBirds = summary?.totalInitialChicks ?? 0;
  const currentBirds = summary?.totalCurrentChicks ?? 0;
  const activeCount = summary?.activeBatches ?? 0;
  const closedCount = summary?.closedBatches ?? 0;
  const countModalBatches = countModalResponse?.data || [];

  const farmOptions = farms.map((farm: any) => ({
    id: farm.id,
    name: farm.name,
  }));

  const batchColumns = useMemo<Column<BatchResponse>[]>(() => [
    {
      key: "batchNumber",
      label: "Batch",
      width: "240px",
      render: (_value, batch) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium leading-tight">{batch.batchNumber}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {t("farmer.batches.list.started")} <DateDisplay date={batch.startDate} format="short" />
          </div>
        </div>
      ),
    },
    {
      key: "farm",
      label: "Farm",
      width: "210px",
      render: (_value, batch) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{batch.farm.name}</div>
          <div className="text-xs text-muted-foreground truncate">
            {batch.farm.capacity.toLocaleString()} birds capacity
          </div>
        </div>
      ),
    },
    {
      key: "batchType",
      label: "Type",
      width: "130px",
      render: (_value, batch) => (
        <Badge
          variant="outline"
          className="text-xs font-normal"
        >
          {batch.batchType === "LAYERS"
            ? t("farmer.batches.modal.layers")
            : t("farmer.batches.modal.broiler")}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      width: "130px",
      render: (_value, batch) => (
        <Badge
          variant="default"
          className={
            batch.status === "ACTIVE"
              ? "bg-green-100 text-green-800 text-xs"
              : "bg-gray-100 text-gray-800 text-xs"
          }
        >
          {batch.status}
        </Badge>
      ),
    },
    {
      key: "initialChicks",
      label: "Initial Birds",
      width: "140px",
      type: "number",
    },
    {
      key: "currentChicks",
      label: "Current Birds",
      width: "140px",
      type: "number",
    },
    {
      key: "age",
      label: "Age",
      width: "110px",
      render: (_value, batch) => {
        const age = Math.floor(
          (new Date().getTime() - new Date(batch.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
        );

        return <span className="font-medium">{age} days</span>;
      },
    },
  ], [t]);

  const handleBatchOpen = (batch: BatchResponse) => {
    router.push(`/farmer/dashboard/batches/${batch.id}`);
  };

  const handleResetFilters = () => {
    setPage(1);
    setFarmFilter("all");
    setBatchTypeFilter("ALL");
    setStatusFilter("ALL");
  };

  const emptyMessage =
    farmFilter === "all" && batchTypeFilter === "ALL" && statusFilter === "ALL"
      ? t("farmer.batches.emptyHelp")
      : "No batches match the selected filters.";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("farmer.batches.title")}</h1>
          <p className="text-muted-foreground">
            {t("farmer.batches.subtitle")}
          </p>
        </div>
        <Button
          variant="outline"
          className="border-green-200 hover:bg-green-50 hover:text-green-700 w-full sm:w-auto"
          onClick={() => setIsModalOpen(true)}
          disabled={farmsLoading}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("farmer.batches.newBatch")}
        </Button>
      </div>

      {/* Loading State */}
      {batchesLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">{t("farmer.batches.loading")}</span>
        </div>
      )}

      {/* Error State */}
      {batchesError && (
        <div className="text-center py-8">
          <p className="text-red-600">
            {t("farmer.batches.error")}
          </p>
        </div>
      )}

      {!batchesLoading && !batchesError && (
        <>
          {/* Batch Stats */}
          <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
            <Card
              className="group cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground hover:border-transparent"
              onClick={() => openCountModal("Active")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium group-hover:text-primary-foreground">
                  {t("farmer.batches.stats.active")}
                </CardTitle>
                <Layers className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground group-hover:text-primary-foreground" />
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold group-hover:text-primary-foreground">
                  {activeCount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-primary-foreground">
                  {t("farmer.batches.stats.running")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t("farmer.batches.stats.totalBirds")}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold">
                  {totalBirds.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t("farmer.batches.stats.acrossAll")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("farmer.batches.stats.currentBirds")}
                </CardTitle>
                <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold">
                  {currentBirds.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">{t("farmer.batches.stats.currentlyAlive")}</p>
              </CardContent>
            </Card>

            <Card
              className="group cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground hover:border-transparent"
              onClick={() => openCountModal("Closed")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium group-hover:text-primary-foreground">
                  {t("farmer.batches.stats.closed")}
                </CardTitle>
                <Layers className="h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground group-hover:text-primary-foreground" />
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0 md:p-6 md:pt-0">
                <div className="text-base md:text-2xl font-bold group-hover:text-primary-foreground">
                  {closedCount.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground group-hover:text-primary-foreground">
                  {t("farmer.batches.stats.tillNow")}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Table Filters */}
          <div className="rounded-lg border border-border/70 bg-background p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Farm</Label>
                  <Select
                    value={farmFilter}
                    onValueChange={(value) => {
                      setFarmFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All farms" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All farms</SelectItem>
                      {farmOptions.map((farm) => (
                        <SelectItem key={farm.id} value={farm.id}>
                          {farm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Batch type</Label>
                  <Select
                    value={batchTypeFilter}
                    onValueChange={(value) => {
                      setBatchTypeFilter(value as typeof batchTypeFilter);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="ALL">All types</SelectItem>
                      <SelectItem value="BROILER">Broiler</SelectItem>
                      <SelectItem value="LAYERS">Layers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value as typeof statusFilter);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="ALL">All status</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="COMPLETED">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Page size</Label>
                  <Input value={limit} readOnly className="bg-muted cursor-not-allowed" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleResetFilters}>
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Batches Table */}
          <div className="space-y-3">
            <div className="flex flex-col gap-1 px-1">
              <h2 className="text-base md:text-lg font-semibold">Batches</h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                {totalBatches} batches total
                {pagination
                  ? ` • Showing ${((pagination.page - 1) * pagination.limit) + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)}`
                  : ""}
              </p>
            </div>

            {totalBatches === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-background">
                <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t("farmer.batches.emptyTitle")}</h3>
                <p className="text-muted-foreground mb-4">{t("farmer.batches.emptyHelp")}</p>
                <Button onClick={() => setIsModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("farmer.batches.createBatch")}
                </Button>
              </div>
            ) : (
              <DataTable
                data={batches}
                columns={batchColumns}
                loading={batchesLoading}
                onRowClick={handleBatchOpen}
                emptyMessage={emptyMessage}
                rowClassName={(batch) =>
                  batch.status === "ACTIVE" ? "bg-green-50/30" : ""
                }
              />
            )}
          </div>

          {!batchesLoading && !batchesError && pagination && pagination.totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {pagination.total} batches total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination.totalPages || current, current + 1)
                    )
                  }
                  disabled={page >= (pagination.totalPages || 1)}
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* New Batch Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleClose}
        title={t("farmer.batches.modal.createTitle")}
      >
        <form onSubmit={handleSubmit}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="batchNumber">{t("farmer.batches.modal.batchName")}</Label>
                <div className="relative">
                  <Input
                    id="batchNumber"
                    name="batchNumber"
                    value={formData.batchNumber}
                    readOnly
                    aria-readonly
                    title={t("farmer.batches.modal.batchNameAuto")}
                    className="bg-muted cursor-not-allowed"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                    {t("farmer.batches.modal.auto")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("farmer.batches.modal.batchNameAuto")}
                </p>
              </div>
              <div>
                <Label htmlFor="batchType">{t("farmer.batches.modal.batchType")}</Label>
                <Select
                  value={formData.batchType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, batchType: value as "BROILER" | "LAYERS" }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("farmer.batches.modal.batchType")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="BROILER">{t("farmer.batches.modal.broiler")}</SelectItem>
                    <SelectItem value="LAYERS">{t("farmer.batches.modal.layers")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="farmId">{t("farmer.batches.modal.farm")}</Label>
                <Select
                  value={formData.farmId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, farmId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("farmer.batches.modal.selectFarm")} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {farms.map((farm) => (
                      <SelectItem key={farm.id} value={farm.id}>
                        {farm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <DateInput
                  label={t("farmer.batches.modal.startDate")}
                  value={formData.startDate}
                  onChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      startDate: value.includes("T") ? value.split("T")[0] : value,
                    }))
                  }
                />

              </div>
              {/* Chicks Inventory Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t("farmer.batches.modal.chicksInventory")}</Label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={multiSource}
                      onChange={(e) => setMultiSource(e.target.checked)}
                    />
                    <span>{t("farmer.batches.modal.multiAlloc")}</span>
                  </label>
                </div>

                {/* Single source allocation */}
                {!multiSource && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="singleItem">{t("farmer.batches.modal.selectChicksItem")}</Label>
                      <Select
                        value={singleAlloc.itemId}
                        onValueChange={(value) => setSingleAlloc((p) => ({ ...p, itemId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("farmer.batches.modal.selectItem")} />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          {(chicksInventory.items || []).map((it: any) => (
                            <SelectItem key={it.id} value={it.id}>
                              {it.name} (Stock: {Number(it.currentStock)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="singleQty">{t("farmer.batches.modal.quantity")}</Label>
                      <Input
                        id="singleQty"
                        type="number"
                        min={1}
                        value={singleAlloc.quantity}
                        onChange={(e) => setSingleAlloc((p) => ({ ...p, quantity: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {/* Multiple allocations */}
                {multiSource && (
                  <div className="space-y-2">
                    {allocations.map((row, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        <div className="md:col-span-6">
                          <Label>{t("farmer.batches.modal.selectChicksItem")}</Label>
                          <Select
                            value={row.itemId}
                            onValueChange={(value) => {
                              setAllocations((prev) => prev.map((r, i) => (i === idx ? { ...r, itemId: value } : r)));
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t("farmer.batches.modal.selectItem")} />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                              {(chicksInventory.items || []).map((it: any) => (
                                <SelectItem key={it.id} value={it.id}>
                                  {it.name} (Stock: {Number(it.currentStock)})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-3">
                          <Label>{t("farmer.batches.modal.quantity")}</Label>
                          <Input
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(e) => {
                              const v = e.target.value;
                              setAllocations((prev) => prev.map((r, i) => (i === idx ? { ...r, quantity: v } : r)));
                            }}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>{t("farmer.batches.modal.notes")}</Label>
                          <Input
                            placeholder={t("common.optional")}
                            value={row.notes || ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setAllocations((prev) => prev.map((r, i) => (i === idx ? { ...r, notes: v } : r)));
                            }}
                          />
                        </div>
                        <div className="md:col-span-1">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setAllocations((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            {t("farmer.batches.modal.remove")}
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setAllocations((prev) => [...prev, { itemId: "", quantity: "" }])}
                      >
                        {t("farmer.batches.modal.addItem")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Computed total chicks */}
              <div>
                <Label>{t("farmer.batches.modal.totalChicks")}</Label>
                <Input
                  readOnly
                  value={(() => {
                    const total = multiSource
                      ? allocations.reduce((sum, a) => sum + (Number(a.quantity) || 0), 0)
                      : Number(singleAlloc.quantity) || 0;
                    return String(total || 0);
                  })()}
                  className="bg-muted cursor-not-allowed"
                />
              </div>
              <div>
                <Label htmlFor="initialChickWeight">
                  {t("farmer.batches.modal.initialWeight")}
                </Label>
                <Input
                  id="initialChickWeight"
                  name="initialChickWeight"
                  type="number"
                  step="0.001"
                  value={formData.initialChickWeight}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="notes">{t("farmer.batches.modal.notesOptional")}</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={3}
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("farmer.batches.modal.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={createBatchMutation.isPending}
            >
              {createBatchMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.batches.modal.creating")}
                </>
              ) : (
                t("farmer.batches.createBatch")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Active/Closed Lists Modal */}
      <Modal
        isOpen={isCountModalOpen}
        onClose={() => setIsCountModalOpen(false)}
        title={t("farmer.batches.modal.countTitle", {
          status:
            countFilter === "Active"
              ? t("farmer.batches.counts.active")
              : t("farmer.batches.counts.closed"),
        })}
      >
        <ModalContent>
          <div className="space-y-3">
            {countModalLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : countModalError ? (
              <p className="text-sm text-red-600">Unable to load batches for this status.</p>
            ) : countModalBatches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("farmer.batches.modal.none", {
                  status:
                    countFilter === "Active"
                      ? t("farmer.batches.counts.active").toLowerCase()
                      : t("farmer.batches.counts.closed").toLowerCase(),
                })}
              </p>
            ) : (
              countModalBatches.map((batch: BatchResponse) => (
                <button
                  key={batch.id}
                  type="button"
                  onClick={() => handleBatchOpen(batch)}
                  className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:border-primary/60"
                >
                  <div>
                    <div className="font-medium">{batch.batchNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {batch.farm.name} • Started:{" "}
                      <DateDisplay date={batch.startDate} format="short" />
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      countFilter === "Active"
                        ? "text-green-600 border-green-600/30"
                        : "text-gray-600 border-gray-600/30"
                    }
                  >
                    {batch.status}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsCountModalOpen(false)}>
            {t("farmer.batches.modal.close")}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
