"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Building2, Plus, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { useGetUserFarms, useCreateFarm } from "@/fetchers/farms/farmQueries";
import { useGetFarmBatches } from "@/fetchers/batches/batchQueries";
import { toast } from "sonner";
import { useAuth } from "@/common/store/store";
import { FarmResponse, BatchResponse } from "@myapp/shared-types";
import { DateDisplay } from "@/common/components/ui/date-display";
import { useI18n } from "@/i18n/useI18n";

export default function FarmsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  } = useGetUserFarms("all");
  const farms = farmsResponse?.data || [];

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("farmer.farms.title")}</h1>
          <p className="text-muted-foreground">
            {t("farmer.farms.subtitle")}
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 cursor-pointer"
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
        <div className="grid gap-4">
          {farms.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("farmer.farms.emptyTitle")}</h3>
              <p className="text-muted-foreground mb-4">{t("farmer.farms.emptyHelp")}</p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t("farmer.farms.createFarm")}
              </Button>
            </div>
          ) : (
            farms.map((farm: FarmResponse) => (
              <Link
                key={farm.id}
                href={`/farmer/dashboard/farms/${farm.id}`}
                className="block"
              >
                <Card className="hover:border-primary cursor-pointer transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        {farm.name}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 transition-colors hover:bg-primary hover:text-primary-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            openBatchesModal(farm.id, farm.name, "active");
                          }}
                        >
                          {/* batches can be active or closed */}
                          {t("farmer.farms.activeBatches", { count: farm._count.activeBatches || 0 })}
                        </Button>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    {farm.description && (
                      <CardDescription className="mt-1">
                        {farm.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t("farmer.farms.capacity")}</span>
                        <p className="font-medium">
                          {farm.capacity.toLocaleString()} {t("farmer.farms.birds")}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("farmer.farms.owner")}</span>
                        <p className="font-medium">{farm.owner.name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("farmer.farms.totalBatches")}</span>
                        <p className="font-medium">{farm._count.batches || 0}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("farmer.farms.created")}</span>
                        <p className="font-medium">
                          <DateDisplay date={farm.createdAt} format="short" />
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
