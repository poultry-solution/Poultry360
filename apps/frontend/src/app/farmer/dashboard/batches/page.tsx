"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Layers, Plus, TrendingUp, Users, Loader2 } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import {
  useGetAllBatches,
  useCreateBatch,
} from "@/fetchers/batches/batchQueries";
import { useGetUserFarms as useGetFarms } from "@/fetchers/farms/farmQueries";
import { toast } from "sonner";
import { getTodayLocalDate } from "@/common/lib/utils";
import { BatchResponse, BatchStatus } from "@myapp/shared-types";
import { useInventoryByType } from "@/fetchers/inventory/inventoryQueries";
import { DateInput } from "@/common/components/ui/date-input";
import { DateDisplay } from "@/common/components/ui/date-display";
import { useI18n } from "@/i18n/useI18n";


export default function BatchesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { t } = useI18n();


  // Fetch batches data
  const {
    data: batchesResponse,
    isLoading: batchesLoading,
    error: batchesError,
  } = useGetAllBatches();
  const batches = batchesResponse?.data || [];

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

    const d = new Date(startDateStr);
    if (isNaN(d.getTime())) return "";

    // Format date as "Month-Day"
    const month = d.toLocaleString("en-US", { month: "long" });
    const day = d.getDate();

    // Add current time (HH-MM-SS with dashes)
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");

    return `${month}-${day}-${farm.name}-${hh}-${mm}-${ss}`;
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
          `B-${new Date().getFullYear()}-${String(batches.length + 1).padStart(3, "0")}`,

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

  const activeBatches = batches.filter(
    (b: BatchResponse) => b.status === "ACTIVE"
  );
  const closedBatches = batches.filter(
    (b: BatchResponse) => b.status === "COMPLETED"
  );

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

      {/* Batch Stats */}
      {!batchesLoading && !batchesError && (
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
                {activeBatches.length}
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
                {batches
                  .reduce((sum, b: BatchResponse) => sum + b.initialChicks, 0)
                  .toLocaleString()}
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
                {batches
                  .reduce((sum, b: BatchResponse) => sum + b.currentChicks, 0)
                  .toLocaleString()}
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
                {closedBatches.length}
              </div>
              <p className="text-xs text-muted-foreground group-hover:text-primary-foreground">
                {t("farmer.batches.stats.tillNow")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Batches List */}
      {!batchesLoading && !batchesError && (
        <div className="grid gap-4">
          {/* Suggest closing batches with 0 current chicks */}
          {activeBatches.some((b: BatchResponse) => (b as any).currentChicks === 0) && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-orange-900">
                      {t("farmer.batches.finishedNoticeTitle")}
                    </div>
                    <div className="text-sm text-orange-800">
                      {t("farmer.batches.finishedNoticeBody")}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {batches.length === 0 ? (
            <div className="text-center py-8">
              <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("farmer.batches.emptyTitle")}</h3>
              <p className="text-muted-foreground mb-4">{t("farmer.batches.emptyHelp")}</p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("farmer.batches.createBatch")}
              </Button>
            </div>
          ) : (
            batches.map((b: BatchResponse) => (
              <Link
                key={b.id}
                href={`/farmer/dashboard/batches/${b.id}`}
                className="block"
              >
                <Card className="hover:border-primary cursor-pointer">
                  <CardHeader className="p-3 md:p-6">
                    <CardTitle className="flex items-center justify-between text-sm md:text-base">
                      <span className="truncate max-w-[180px] md:max-w-none">{b.batchNumber}</span>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant="outline"
                          className="text-[10px] md:text-xs font-normal"
                        >
                          {(b as any).batchType === "LAYERS" ? t("farmer.batches.modal.layers") : t("farmer.batches.modal.broiler")}
                        </Badge>
                        <Badge
                          variant="default"
                          className={
                            b.status === "ACTIVE"
                              ? "bg-green-100 text-green-800 text-[10px] md:text-xs"
                              : "bg-gray-100 text-gray-800 text-[10px] md:text-xs"
                          }
                        >
                          {b.status}
                        </Badge>
                      </div>
                    </CardTitle>
                    <CardDescription>
                      {b.farm.name} • {t("farmer.batches.list.started")}{" "}
                      <DateDisplay date={b.startDate} format="short" />
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 md:p-6 pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          {t("farmer.batches.list.initialBirds")}
                        </span>
                        <p className="font-medium">
                          {b.initialChicks.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {t("farmer.batches.list.currentBirds")}
                        </span>
                        <p className="font-medium">
                          {b.currentChicks.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("farmer.batches.list.age")}</span>
                        <p className="font-medium">
                          {Math.floor(
                            (new Date().getTime() -
                              new Date(b.startDate).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )}{" "}
                          {t("farmer.batches.list.days")}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("farmer.batches.list.status")}</span>
                        <p
                          className={`font-medium ${b.status === "ACTIVE" ? "text-green-600" : "text-gray-600"}`}
                        >
                          {b.status}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
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
                <select
                  id="batchType"
                  name="batchType"
                  value={formData.batchType}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  required
                >
                  <option value="BROILER">{t("farmer.batches.modal.broiler")}</option>
                  <option value="LAYERS">{t("farmer.batches.modal.layers")}</option>
                </select>
              </div>
              <div>
                <Label htmlFor="farmId">{t("farmer.batches.modal.farm")}</Label>
                <select
                  id="farmId"
                  name="farmId"
                  value={formData.farmId}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  required
                >
                  <option value="">{t("farmer.batches.modal.selectFarm")}</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
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
                      <select
                        id="singleItem"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                        value={singleAlloc.itemId}
                        onChange={(e) => setSingleAlloc((p) => ({ ...p, itemId: e.target.value }))}
                      >
                        <option value="">{t("farmer.batches.modal.selectItem")}</option>
                        {(chicksInventory.items || []).map((it: any) => (
                          <option key={it.id} value={it.id}>
                            {it.name} (Stock: {Number(it.currentStock)})
                          </option>
                        ))}
                      </select>
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
                          <select
                            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                            value={row.itemId}
                            onChange={(e) => {
                              const v = e.target.value;
                              setAllocations((prev) => prev.map((r, i) => (i === idx ? { ...r, itemId: v } : r)));
                            }}
                          >
                            <option value="">{t("farmer.batches.modal.selectItem")}</option>
                            {(chicksInventory.items || []).map((it: any) => (
                              <option key={it.id} value={it.id}>
                                {it.name} (Stock: {Number(it.currentStock)})
                              </option>
                            ))}
                          </select>
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
            {(countFilter === "Active" ? activeBatches : closedBatches).map(
              (b: BatchResponse) => (
                <Link
                  key={b.id}
                  href={`/farmer/dashboard/batches/${b.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60 cursor-pointer">
                    <div>
                      <div className="font-medium">{b.batchNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.farm.name} • Started:{" "}
                        <DateDisplay date={b.startDate} format="short" />
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
                      {b.status}
                    </Badge>
                  </div>
                </Link>
              )
            )}
            {(countFilter === "Active" ? activeBatches : closedBatches)
              .length === 0 && (
              <p className="text-sm text-muted-foreground">
                {t("farmer.batches.modal.none", {
                  status:
                    countFilter === "Active"
                      ? t("farmer.batches.counts.active").toLowerCase()
                      : t("farmer.batches.counts.closed").toLowerCase(),
                })}
              </p>
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
