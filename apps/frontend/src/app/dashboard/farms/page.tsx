"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { useGetUserFarms, useCreateFarm } from "@/fetchers/farms/farmQueries";
import { toast } from "sonner";
import { useAuth } from "@/store/store";
import { FarmResponse } from "@myapp/shared-types";

export default function FarmsPage() {
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

      {/* Farms Grid */}
      {!farmsLoading && !farmsError && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
          {farms.length === 0 ? (
            <div className="col-span-full text-center py-8">
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
              <Card key={farm.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      {farm.name}
                    </span>
                  </CardTitle>
                  <CardDescription>Farm ID: {farm.id}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Capacity:</span>
                      <span className="font-medium">
                        {farm.capacity.toLocaleString()} birds
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Owner:</span>
                      <span className="font-medium">{farm.owner.name}</span>
                    </div>
                    {farm.description && (
                      <div className="text-sm text-muted-foreground">
                        {farm.description}
                      </div>
                    )}

                    {/* Batches Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="h-8 px-3 cursor-pointer w-full sm:w-auto transition-colors hover:bg-[#10841E] hover:text-white hover:border-[#10841E]"
                        onClick={() =>
                          openBatchesModal(farm.id, farm.name, "active")
                        }
                      >
                        Active Batches ({farm._count.batches})
                      </Button>
                      <Button
                        variant="outline"
                        className="h-8 px-3 cursor-pointer w-full sm:w-auto transition-colors hover:bg-[#10841E] hover:text-white hover:border-[#10841E]"
                        onClick={() =>
                          openBatchesModal(farm.id, farm.name, "closed")
                        }
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                  placeholder="Enter farm name"
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
                  placeholder="Enter maximum capacity"
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
                  placeholder="Enter farm description"
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
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Batch management will be available soon.
                {batchFilter === "active"
                  ? " Active batches"
                  : " Closed batches"}{" "}
                for this farm will be displayed here.
              </p>
            </div>
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
