"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import {
  Building2,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Badge } from "@/common/components/ui/badge";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { useGetUserFarms, useCreateFarm } from "@/fetchers/farms/farmQueries";
import { useGetFarmBatches } from "@/fetchers/batches/batchQueries";
import { toast } from "sonner";
import { useAuth } from "@/common/store/store";
import { FarmResponse, BatchResponse } from "@myapp/shared-types";
import { DateDisplay } from "@/common/components/ui/date-display";
import { useI18n } from "@/i18n/useI18n";
import { useRouter } from "next/navigation";

export default function FarmsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [formData, setFormData] = useState({
    name: "",
    capacity: "",
    description: "",
  });

  // Fetch user's farms
  const {
    data: farmsResponse,
    isLoading: farmsLoading,
    error: farmsError,
  } = useGetUserFarms("all", { page, limit });
  const farms = farmsResponse?.data || [];
  const pagination = farmsResponse?.pagination;

  // Create farm mutation
  const createFarmMutation = useCreateFarm();
  const { user } = useAuth();

  // Batches modal state
  const [isBatchesModalOpen, setIsBatchesModalOpen] = useState(false);
  const [batchFilter, setBatchFilter] = useState<"active" | "closed">("active");
  const [selectedFarm, setSelectedFarm] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const openBatchesModal = (
    farmId: string,
    farmName: string,
    filter: "active" | "closed"
  ) => {
    setSelectedFarm({ id: farmId, name: farmName });
    setBatchFilter(filter);
    setIsBatchesModalOpen(true);
  };

  // Fetch batches for selected farm when modal opens
  const { data: modalBatchesResponse, isLoading: modalBatchesLoading, error: modalBatchesError } =
    useGetFarmBatches(selectedFarm?.id || "", {
      status: batchFilter === "active" ? "ACTIVE" : "COMPLETED",
      page: 1,
      limit: 10,
    });
  const modalBatches: BatchResponse[] = modalBatchesResponse?.data || [];


  function calculateBatchAge(startDate: string | Date) {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createFarmMutation.mutateAsync({
        name: formData.name,
        capacity: parseInt(formData.capacity),
        description: formData.description || undefined,
        ownerId: user?.id || "",
        managers: [],
      });

      toast.success(t("farmer.farms.toasts.created"));
      setPage(1);

      // Reset form and close modal
      setIsModalOpen(false);
      setFormData({ name: "", capacity: "", description: "" });
    } catch (error) {
      console.error("Failed to create farm:", error);
      // Error toast is handled by axios interceptor
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setFormData({ name: "", capacity: "", description: "" });
  };

  const openFarm = (farmId: string) => {
    router.push(`/farmer/dashboard/farms/${farmId}`);
  };

  const farmColumns: Column<FarmResponse>[] = [
    {
      key: "name",
      label: "Farm",
      width: "280px",
      render: (_value, farm) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-medium leading-tight truncate">{farm.name}</p>
              {farm.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {farm.description}
                </p>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "capacity",
      label: "Capacity",
      width: "140px",
      render: (value) => (
        <div className="font-medium">
          {Number(value).toLocaleString()} {t("farmer.farms.birds")}
        </div>
      ),
    },
    {
      key: "batches",
      label: "Batches",
      width: "220px",
      render: (_value, farm) => (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-md px-2 py-0.5">
            {farm._count.batches || 0} total
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openBatchesModal(farm.id, farm.name, "active");
            }}
          >
            {t("farmer.farms.activeBatches", { count: farm._count.activeBatches || 0 })}
          </Button>
        </div>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      width: "160px",
      type: "date",
    },
  ];

  const farmActions = [
    {
      label: "View farm",
      icon: <Eye className="h-4 w-4" />,
      onClick: (farm: FarmResponse) => openFarm(farm.id),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("farmer.farms.title")}</h1>
          <p className="text-muted-foreground">
            {t("farmer.farms.subtitle")}
          </p>
        </div>
        <Button
          variant="outline"
          className="border-green-200 hover:bg-green-50 hover:text-green-700 w-full sm:w-auto"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("farmer.farms.addFarm")}
        </Button>
      </div>

      {/* Loading State */}
      {farmsLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">{t("farmer.farms.loading")}</span>
        </div>
      )}

      {/* Error State */}
      {farmsError && (
        <div className="text-center py-8">
          <p className="text-red-600">
            {t("farmer.farms.error")}
          </p>
        </div>
      )}

      {/* Farms List */}
      {!farmsLoading && !farmsError && (
        <div className="space-y-3">
          <div className="flex flex-col gap-1 px-1">
            <h2 className="text-base md:text-lg font-semibold">Farms</h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              {pagination?.total || 0} farms total
              {pagination ? ` • Showing ${((pagination.page - 1) * pagination.limit) + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)}` : ""}
            </p>
          </div>
          {farms.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("farmer.farms.emptyTitle")}</h3>
              <p className="text-muted-foreground mb-4">{t("farmer.farms.emptyHelp")}</p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("farmer.farms.createFarm")}
              </Button>
            </div>
          ) : (
            <DataTable
              data={farms}
              columns={farmColumns}
              actions={farmActions}
              onRowClick={(farm) => openFarm(farm.id)}
              showFooter={false}
              emptyMessage={t("farmer.farms.emptyHelp")}
            />
          )}
        </div>
      )}

      {!farmsLoading && !farmsError && farms.length > 0 && pagination && (
        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {pagination.total} farms total
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

      {/* Add Farm Modal */}
      <Modal isOpen={isModalOpen} onClose={handleClose} title={t("farmer.farms.modal.addTitle")}>
        <form onSubmit={handleSubmit}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">{t("farmer.farms.modal.farmName")}</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="capacity">{t("farmer.farms.modal.capacity")}</Label>
                <Input
                  id="capacity"
                  name="capacity"
                  type="number"
                  value={formData.capacity}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">{t("farmer.farms.modal.description")}</Label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={3}
                />
              </div>
            </div>
          </ModalContent>

          <ModalFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("farmer.farms.modal.cancel")}
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={createFarmMutation.isPending}
            >
              {createFarmMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("farmer.farms.modal.creating")}
                </>
              ) : (
                t("farmer.farms.modal.create")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Batches List Modal */}
      <Modal
        isOpen={isBatchesModalOpen}
        onClose={() => setIsBatchesModalOpen(false)}
        title={t("farmer.farms.modal.batchesTitle", {
          farm: selectedFarm?.name ?? t("farmer.farms.title"),
          status: batchFilter === "active" ? t("farmer.farms.status.active") : t("farmer.farms.status.closed"),
        })}
      >
        <ModalContent>
          <div className="space-y-3">
            {modalBatchesLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>{t("farmer.farms.modal.loadingBatches", {
                  status: batchFilter === "active" ? t("farmer.farms.status.active") : t("farmer.farms.status.closed")
                })}</p>
              </div>
            ) : modalBatchesError ? (
              <div className="text-center py-8">
                <p className="text-red-600">{t("farmer.farms.modal.errorBatches")}</p>
              </div>
            ) : modalBatches.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">{t("farmer.farms.modal.noBatches", {
                  status: batchFilter === "active" ? t("farmer.farms.status.active") : t("farmer.farms.status.closed")
                })}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {modalBatches.map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between rounded-md border p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{batch.batchNumber}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${batch.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                          {batch.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("farmer.farms.modal.started")} <DateDisplay date={batch.startDate} format="short" /> •{" "}
                        {t("farmer.farms.modal.age")} {calculateBatchAge(batch.startDate)} {t("farmer.farms.modal.days")} •{" "}
                        {t("farmer.farms.modal.current")} {batch.currentChicks?.toLocaleString?.() || t("common.notAvailable")}
                      </p>
                    </div>
                    <Button variant="outline" asChild onClick={(e) => e.stopPropagation()}>
                      <Link href={`/farmer/dashboard/batches/${batch.id}`}>{t("farmer.farms.modal.view")}</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsBatchesModalOpen(false)}
          >
            {t("farmer.farms.modal.close")}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
