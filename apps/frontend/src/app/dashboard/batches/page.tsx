"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Layers, Plus, TrendingUp, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal, ModalContent, ModalFooter } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetAllBatches,
  useCreateBatch,
} from "@/fetchers/batches/batchQueries";
import { useGetUserFarms as useGetFarms } from "@/fetchers/farms/farmQueries";
import { toast } from "sonner";
import { getTodayLocalDate } from "@/lib/utils";
import { BatchResponse, BatchStatus } from "@myapp/shared-types";

export default function BatchesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);


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
    farmId: "",
    startDate: getTodayLocalDate(),
    initialChicks: "",
    initialChickWeight: "0.045",
    notes: "",
  });

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
    const month = d.toLocaleString("en-US", { month: "long" });
    const day = d.getDate();
    return `${month}-${day}-${farm.name}`;
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

    try {
      await createBatchMutation.mutateAsync({
        batchNumber:
          formData.batchNumber ||
          `B-${new Date().getFullYear()}-${String(batches.length + 1).padStart(3, "0")}`,

        farmId: formData.farmId,
        startDate: startDate,
        initialChicks: parseInt(formData.initialChicks),
        initialChickWeight: parseFloat(formData.initialChickWeight),
        status: "ACTIVE" as BatchStatus,
      });

      toast.success("Batch created successfully!");
      setIsModalOpen(false);
      setFormData({
        batchNumber: "",
        farmId: "",
        startDate: "",
        initialChicks: "",
        initialChickWeight: "0.045",
        notes: "",
      });
    } catch (error) {
      console.error("Failed to create batch:", error);
      // Error toast is handled by axios interceptor
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setFormData({
      batchNumber: "",
      farmId: "",
      startDate: getTodayLocalDate(),
      initialChicks: "",
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Batches</h1>
          <p className="text-muted-foreground">
            Track your production batches and performance.
          </p>
        </div>
        <Button
          className="bg-primary hover:bg-primary/90 cursor-pointer"
          onClick={() => setIsModalOpen(true)}
          disabled={farmsLoading}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Batch
        </Button>
      </div>

      {/* Loading State */}
      {batchesLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading batches...</span>
        </div>
      )}

      {/* Error State */}
      {batchesError && (
        <div className="text-center py-8">
          <p className="text-red-600">
            Failed to load batches. Please try again.
          </p>
        </div>
      )}

      {/* Batch Stats */}
      {!batchesLoading && !batchesError && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card
            className="group cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground hover:border-transparent"
            onClick={() => openCountModal("Active")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium group-hover:text-primary-foreground">
                Active Batches
              </CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold group-hover:text-primary-foreground">
                {activeBatches.length}
              </div>
              <p className="text-xs text-muted-foreground group-hover:text-primary-foreground">
                Currently running
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Birds</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {batches
                  .reduce((sum, b: BatchResponse) => sum + b.initialChicks, 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all batches
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Current Birds
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {batches
                  .reduce((sum, b: BatchResponse) => sum + b.currentChicks, 0)
                  .toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Currently alive</p>
            </CardContent>
          </Card>

          <Card
            className="group cursor-pointer transition-colors hover:bg-primary hover:text-primary-foreground hover:border-transparent"
            onClick={() => openCountModal("Closed")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium group-hover:text-primary-foreground">
                Closed Batches
              </CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground group-hover:text-primary-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold group-hover:text-primary-foreground">
                {closedBatches.length}
              </div>
              <p className="text-xs text-muted-foreground group-hover:text-primary-foreground">
                Till now
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Batches List */}
      {!batchesLoading && !batchesError && (
        <div className="grid gap-4">
          {batches.length === 0 ? (
            <div className="text-center py-8">
              <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No batches found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first batch.
              </p>
              <Button onClick={() => setIsModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Batch
              </Button>
            </div>
          ) : (
            batches.map((b: BatchResponse) => (
              <Link
                key={b.id}
                href={`/dashboard/batches/${b.id}`}
                className="block"
              >
                <Card className="hover:border-primary cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{b.batchNumber}</span>
                      <Badge
                        variant="default"
                        className={
                          b.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {b.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {b.farm.name} • Started:{" "}
                      {new Date(b.startDate).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          Initial Birds:
                        </span>
                        <p className="font-medium">
                          {b.initialChicks.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Current Birds:
                        </span>
                        <p className="font-medium">
                          {b.currentChicks.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Age:</span>
                        <p className="font-medium">
                          {Math.floor(
                            (new Date().getTime() -
                              new Date(b.startDate).getTime()) /
                              (1000 * 60 * 60 * 24)
                          )}{" "}
                          days
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
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
        title="Create New Batch"
      >
        <form onSubmit={handleSubmit}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="batchNumber">Batch Name</Label>
                <div className="relative">
                  <Input
                    id="batchNumber"
                    name="batchNumber"
                    value={formData.batchNumber}
                    readOnly
                    aria-readonly
                    title="Auto-generated from Start Date and Farm"
                    className="bg-muted cursor-not-allowed"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                    Auto
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-generated from Start Date and Farm
                </p>
              </div>
              <div>
                <Label htmlFor="farmId">Farm</Label>
                <select
                  id="farmId"
                  name="farmId"
                  value={formData.farmId}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                  required
                >
                  <option value="">Select a farm</option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="initialChicks">Initial Chicks</Label>
                <Input
                  id="initialChicks"
                  name="initialChicks"
                  type="number"
                  value={formData.initialChicks}
                  onChange={handleChange}
                  placeholder="e.g., 2500"
                  required
                />
              </div>
              <div>
                <Label htmlFor="initialChickWeight">
                  Initial Chick Weight (kg)
                </Label>
                <Input
                  id="initialChickWeight"
                  name="initialChickWeight"
                  type="number"
                  step="0.001"
                  value={formData.initialChickWeight}
                  onChange={handleChange}
                  placeholder="e.g., 0.045"
                  required
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={3}
                  placeholder="Any remarks"
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
              disabled={createBatchMutation.isPending}
            >
              {createBatchMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Batch"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Active/Closed Lists Modal */}
      <Modal
        isOpen={isCountModalOpen}
        onClose={() => setIsCountModalOpen(false)}
        title={`${countFilter} Batches`}
      >
        <ModalContent>
          <div className="space-y-3">
            {(countFilter === "Active" ? activeBatches : closedBatches).map(
              (b: BatchResponse) => (
                <Link
                  key={b.id}
                  href={`/dashboard/batches/${b.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between rounded-md border p-3 hover:border-primary/60 cursor-pointer">
                    <div>
                      <div className="font-medium">{b.batchNumber}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.farm.name} • Started:{" "}
                        {new Date(b.startDate).toLocaleDateString()}
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
                No {countFilter.toLowerCase()} batches.
              </p>
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsCountModalOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
