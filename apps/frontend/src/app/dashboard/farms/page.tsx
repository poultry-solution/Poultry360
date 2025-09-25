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
} from "@/components/ui/card";
import { Building2, Plus, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { useGetUserFarms, useCreateFarm } from "@/fetchers/farms/farmQueries";
import { useGetFarmBatches } from "@/fetchers/batches/batchQueries";
import { toast } from "sonner";
import { useAuth } from "@/store/store";
import { FarmResponse, BatchResponse } from "@myapp/shared-types";

export default function FarmsPage() {
  const router = useRouter();
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

  function formatDate(date: string | Date) {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

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

      toast.success("Farm created successfully!");

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
          <h1 className="text-3xl font-bold tracking-tight">Farms</h1>
          <p className="text-muted-foreground">
            Manage your farm locations and details.
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 cursor-pointer"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Farm
        </Button>
      </div>

      {/* Loading State */}
      {farmsLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading farms...</span>
        </div>
      )}

      {/* Error State */}
      {farmsError && (
        <div className="text-center py-8">
          <p className="text-red-600">
            Failed to load farms. Please try again.
          </p>
        </div>
      )}

      {/* Farms List */}
      {!farmsLoading && !farmsError && (
        <div className="grid gap-4">
          {farms.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No farms found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first farm.
              </p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Farm
              </Button>
            </div>
          ) : (
            farms.map((farm: FarmResponse) => (
              <Link
                key={farm.id}
                href={`/dashboard/farms/${farm.id}`}
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
                          Active Batches ({farm._count.activeBatches || 0} )
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
                        <span className="text-muted-foreground">Capacity:</span>
                        <p className="font-medium">
                          {farm.capacity.toLocaleString()} birds
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Owner:</span>
                        <p className="font-medium">{farm.owner.name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Batches:</span>
                        <p className="font-medium">{farm._count.batches || 0}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Created:</span>
                        <p className="font-medium">
                          {formatDate(farm.createdAt)}
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
      <Modal isOpen={isModalOpen} onClose={handleClose} title="Add New Farm">
        <form onSubmit={handleSubmit}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Farm Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="capacity">Capacity (Number of Birds)</Label>
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
                <Label htmlFor="description">Description (Optional)</Label>
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
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90"
              disabled={createFarmMutation.isPending}
            >
              {createFarmMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Farm"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Batches List Modal */}
      <Modal
        isOpen={isBatchesModalOpen}
        onClose={() => setIsBatchesModalOpen(false)}
        title={`${selectedFarm?.name ?? "Farm"} – ${batchFilter === "active" ? "Active" : "Closed"} Batches`}
      >
        <ModalContent>
          <div className="space-y-3">
            {modalBatchesLoading ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p>Loading {batchFilter} batches...</p>
              </div>
            ) : modalBatchesError ? (
              <div className="text-center py-8">
                <p className="text-red-600">Failed to load batches. Please try again.</p>
              </div>
            ) : modalBatches.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No {batchFilter} batches found for this farm.</p>
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
                      <p className="text-sm text-muted-foreground">Started {formatDate(batch.startDate)} • Age {calculateBatchAge(batch.startDate)} days • Current {batch.currentChicks?.toLocaleString?.() || "N/A"}</p>
                    </div>
                    <Button variant="outline" asChild onClick={(e) => e.stopPropagation()}>
                      <Link href={`/dashboard/batches/${batch.id}`}>View</Link>
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
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
