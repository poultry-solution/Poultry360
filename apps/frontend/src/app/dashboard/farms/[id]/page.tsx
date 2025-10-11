"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { DateInput } from "@/common/components/ui/date-input";
import { DateDisplay } from "@/common/components/ui/date-display";
import {
  Building2,
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Loader2,
  ArrowLeft,
  BarChart3,
  Package,
  AlertCircle,
} from "lucide-react";
import { useGetFarmById, useGetFarmAnalytics, useDeleteFarm } from "@/fetchers/farms/farmQueries";
import { getTodayLocalDate } from "@/common/lib/utils";
import { useGetAllBatches, useCreateBatch, useDeleteBatch } from "@/fetchers/batches/batchQueries";
import { useInventoryByType } from "@/fetchers/inventory/inventoryQueries";
import { toast } from "sonner";
import { FarmResponse, BatchResponse, BatchStatus } from "@myapp/shared-types";

export default function FarmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const farmId = params.id as string;

  

  // State for modals and filters
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [batchFilter, setBatchFilter] = useState<"all" | "active" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFarmDeleted, setIsFarmDeleted] = useState(false);

  // Fetch farm data
  const {
    data: farmResponse,
    isLoading: farmLoading,
    error: farmError,
  } = useGetFarmById(farmId, { enabled: !isFarmDeleted });

  // Fetch farm analytics
  const {
    data: analyticsResponse,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useGetFarmAnalytics(farmId, { enabled: !isFarmDeleted });

  // Fetch batches for this farm
  const {
    data: batchesResponse,
    isLoading: batchesLoading,
    error: batchesError,
  } = useGetAllBatches({ farmId }, { enabled: !isFarmDeleted });

  // Delete farm mutation
  const deleteFarmMutation = useDeleteFarm();
  const createBatchMutation = useCreateBatch();
  const deleteBatchMutation = useDeleteBatch();

  const farm = farmResponse?.data;
  const analytics = analyticsResponse?.data;
  const batches = batchesResponse?.data || [];

  // Filter batches based on status and search
  const filteredBatches = batches.filter((batch: BatchResponse) => {
    const matchesStatus = batchFilter === "all" || batch.status === batchFilter.toUpperCase();
    const matchesSearch = batch.batchNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Calculate batch statistics
  const batchStats = {
    total: batches.length,
    active: batches.filter((b: BatchResponse) => b.status === "ACTIVE").length,
    completed: batches.filter((b: BatchResponse) => b.status === "COMPLETED").length,
  };

  const handleDeleteFarm = async () => {
    try {
      // Set deleted state to disable queries immediately
      setIsFarmDeleted(true);
      
      await deleteFarmMutation.mutateAsync(farmId);
      toast.success("Farm deleted successfully!");
      
      // Navigate immediately to prevent further queries
      router.replace("/dashboard/farms");
    } catch (error) {
      console.error("Failed to delete farm:", error);
      // Reset deleted state on error
      setIsFarmDeleted(false);
      // Error toast is handled by axios interceptor
    }
  };


  const calculateBatchAge = (startDate: string | Date) => {
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // --- Create Batch (local modal) ---
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isDeleteBatchModalOpen, setIsDeleteBatchModalOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<{ id: string; name: string } | null>(null);
  
  // Batch form data
  const [batchForm, setBatchForm] = useState({
    batchNumber: "",
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

  // Reset to current date when modal opens and precompute batch name
  useEffect(() => {
    if (isBatchModalOpen) {
      const today = getTodayLocalDate();
      setBatchForm(prev => ({
        ...prev,
        startDate: today,
      }));
    }
  }, [isBatchModalOpen]);

  // Precompute batch name when startDate or farm changes
  useEffect(() => {
    if (!isBatchModalOpen) return;
    if (!farm?.name) return;
    if (!batchForm.startDate) return;
    const d = new Date(batchForm.startDate);
    if (isNaN(d.getTime())) return;
    const month = d.toLocaleString("en-US", { month: "long" });
    const day = d.getDate();
    const suggested = `${month}-${day}-${farm.name}`;
    if (batchForm.batchNumber !== suggested) {
      setBatchForm((p) => ({ ...p, batchNumber: suggested }));
    }
  }, [isBatchModalOpen, batchForm.startDate, farm?.name]);

  function handleBatchChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setBatchForm((p) => {
      const next = { ...p, [name]: value };
      if (name === "startDate") {
        // Suggest: MonthName-Day-Farm Name
        if (value && farm?.name) {
          const d = new Date(value);
          if (!isNaN(d.getTime())) {
            const month = d.toLocaleString("en-US", { month: "long" });
            const day = d.getDate();
            next.batchNumber = `${month}-${day}-${farm.name}`;
          }
        }
      }
      return next;
    });
  }

  const submitCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    const startDateIso = batchForm.startDate
      ? new Date(batchForm.startDate).toISOString()
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
      toast.error("Please select chicks inventory and quantity");
      return;
    }

    try {
      await createBatchMutation.mutateAsync({
        batchNumber:
          batchForm.batchNumber ||
          `B-${new Date().getFullYear()}-${String(batches.length + 1).padStart(3, "0")}`,
        farmId,
        startDate: startDateIso,
        initialChickWeight: parseFloat(batchForm.initialChickWeight),
        status: "ACTIVE" as BatchStatus,
        chicksInventory: builtAllocations,
      });

      toast.success("Batch created successfully!");
      setIsBatchModalOpen(false);
      setBatchForm({
        batchNumber: "",
        startDate: getTodayLocalDate(),
        initialChickWeight: "0.045",
        notes: "",
      });
      setSingleAlloc({ itemId: "", quantity: "" });
      setAllocations([{ itemId: "", quantity: "" }]);
      setMultiSource(false);
    } catch (error) {
      console.error("Failed to create batch:", error);
    }
  };

  if (farmLoading || isFarmDeleted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>{isFarmDeleted ? "Deleting farm..." : "Loading farm details..."}</p>
        </div>
      </div>
    );
  }

  if (farmError || !farm) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Farm not found</h3>
        <p className="text-muted-foreground mb-4">
          The farm you&#39;re looking for doesn&#39;t exist or you don&#39;t have access to it.
        </p>
        <Button onClick={() => router.push("/dashboard/farms")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Farms
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/farms")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              {farm.name}
            </h1>
            <p className="text-muted-foreground">
              Capacity: {farm.capacity.toLocaleString()} birds
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit Farm
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDeleteModalOpen(true)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Farm Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{batchStats.total}</div>
            <p className="text-xs text-muted-foreground">
              {batchStats.active} active, {batchStats.completed} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Farm Capacity</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{farm.capacity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Maximum birds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analyticsLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `₹${Number(analytics?.totalSales || 0).toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {analyticsLoading ? (
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                `₹${Number(analytics?.totalExpenses || 0).toLocaleString()}`
              )}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime costs</p>
          </CardContent>
        </Card>
      </div>

      {/* Farm Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Farm Information</CardTitle>
            <CardDescription>Basic details about this farm</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Owner:</span>
              <span className="font-medium">{farm.owner.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Capacity:</span>
              <span className="font-medium">{farm.capacity.toLocaleString()} birds</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-medium"><DateDisplay date={farm.createdAt} format="short" /></span>
            </div>
            {farm.description && (
              <div>
                <span className="text-muted-foreground">Description:</span>
                <p className="mt-1 text-sm">{farm.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Farm Analytics</CardTitle>
            <CardDescription>Performance metrics for this farm</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {analyticsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex justify-between">
                    <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
                    <div className="h-4 w-16 bg-gray-200 animate-pulse rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profit:</span>
                  <span className={`font-medium ${(analytics?.profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{Number(analytics?.profit || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profit Margin:</span>
                  <span className={`font-medium ${(analytics?.profitMargin || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(analytics?.profitMargin || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Utilization:</span>
                  <span className="font-medium">
                    {(analytics?.utilization || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">This Month Sales:</span>
                  <span className="font-medium">
                    ₹{Number(analytics?.currentMonthSales || 0).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Batches Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Batches</CardTitle>
              <CardDescription>
                Manage and monitor all batches in this farm
              </CardDescription>
            </div>
            <Button onClick={() => setIsBatchModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Batch
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search batches..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={batchFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setBatchFilter("all")}
              >
                All ({batchStats.total})
              </Button>
              <Button
                variant={batchFilter === "active" ? "default" : "outline"}
                size="sm"
                onClick={() => setBatchFilter("active")}
              >
                Active ({batchStats.active})
              </Button>
              <Button
                variant={batchFilter === "completed" ? "default" : "outline"}
                size="sm"
                onClick={() => setBatchFilter("completed")}
              >
                Completed ({batchStats.completed})
              </Button>
            </div>
          </div>

          {/* Batches List */}
          {batchesLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading batches...</p>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No batches found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || batchFilter !== "all"
                  ? "No batches match your current filters."
                  : "Get started by creating your first batch for this farm from the Add Batch button above."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBatches.map((batch: BatchResponse) => (
                <Card key={batch.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{batch.batchNumber}</h3>
                          <Badge
                            variant={batch.status === "ACTIVE" ? "default" : "secondary"}
                            className={
                              batch.status === "ACTIVE"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {batch.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Initial Chicks:</span>
                            <p className="font-medium">{batch.initialChicks.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Current Chicks:</span>
                            <p className="font-medium">{batch.currentChicks?.toLocaleString() || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Age:</span>
                            <p className="font-medium">{calculateBatchAge(batch.startDate)} days</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Started:</span>
                            <p className="font-medium"><DateDisplay date={batch.startDate} format="short" /></p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/batches/${batch.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setBatchToDelete({ id: batch.id, name: batch.batchNumber });
                            setIsDeleteBatchModalOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Farm Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Farm"
      >
        <ModalContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold">Are you sure?</h3>
                <p className="text-muted-foreground">
                  This action cannot be undone. This will permanently delete the farm
                  &quot;{farm.name}&quot; and all associated data.
                </p>
              </div>
            </div>
            {batchStats.total > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This farm has {batchStats.total} batches. 
                  You may want to complete or transfer these batches before deleting the farm.
                </p>
              </div>
            )}
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsDeleteModalOpen(false)}
            disabled={deleteFarmMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleDeleteFarm}
            disabled={deleteFarmMutation.isPending}
          >
            {deleteFarmMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Farm"
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Batch Modal */}
      <Modal
        isOpen={isDeleteBatchModalOpen}
        onClose={() => setIsDeleteBatchModalOpen(false)}
        title="Delete Batch"
      >
        <ModalContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <div>
                <h3 className="text-lg font-semibold">Are you sure?</h3>
                <p className="text-muted-foreground">
                  This action cannot be undone. This will permanently delete batch
                  {" "}
                  <span className="font-medium">&quot;{batchToDelete?.name}&quot;</span>.
                </p>
              </div>
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsDeleteBatchModalOpen(false)}
            disabled={deleteBatchMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={async () => {
              if (!batchToDelete) return;
              try {
                await deleteBatchMutation.mutateAsync(batchToDelete.id);
                toast.success("Batch deleted successfully!");
                setIsDeleteBatchModalOpen(false);
                setBatchToDelete(null);
              } catch (error) {
                console.error("Failed to delete batch:", error);
              }
            }}
            disabled={deleteBatchMutation.isPending}
          >
            {deleteBatchMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Batch"
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Create Batch Modal */}
      <Modal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        title="Create New Batch"
      >
        <form onSubmit={submitCreateBatch}>
          <ModalContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="batchNumber">Batch Name</Label>
                <div className="relative">
                  <Input
                    id="batchNumber"
                    name="batchNumber"
                    value={batchForm.batchNumber}
                    readOnly
                    aria-readonly
                    title="Auto-generated from Start Date"
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
                <DateInput
                  label="Start Date"
                  value={batchForm.startDate}
                  onChange={(value) => setBatchForm(prev => ({ ...prev, startDate: value }))}
                />
              </div>
              
              {/* Chicks Inventory Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Chicks Inventory</Label>
                  <label className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={multiSource}
                      onChange={(e) => setMultiSource(e.target.checked)}
                    />
                    <span>Allocate from multiple items</span>
                  </label>
                </div>

                {/* Single source allocation */}
                {!multiSource && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="singleItem">Select Chicks Item</Label>
                      <select
                        id="singleItem"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                        value={singleAlloc.itemId}
                        onChange={(e) => setSingleAlloc((p) => ({ ...p, itemId: e.target.value }))}
                      >
                        <option value="">Select an item</option>
                        {(chicksInventory.items || []).map((it: any) => (
                          <option key={it.id} value={it.id}>
                            {it.name} (Stock: {Number(it.currentStock)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="singleQty">Quantity</Label>
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
                          <Label>Select Chicks Item</Label>
                          <select
                            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
                            value={row.itemId}
                            onChange={(e) => {
                              const v = e.target.value;
                              setAllocations((prev) => prev.map((r, i) => (i === idx ? { ...r, itemId: v } : r)));
                            }}
                          >
                            <option value="">Select an item</option>
                            {(chicksInventory.items || []).map((it: any) => (
                              <option key={it.id} value={it.id}>
                                {it.name} (Stock: {Number(it.currentStock)})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-3">
                          <Label>Quantity</Label>
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
                          <Label>Notes</Label>
                          <Input
                            placeholder="Optional"
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
                            Remove
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
                        Add Item
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Computed total chicks */}
              <div>
                <Label>Total Chicks</Label>
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
                <Label htmlFor="initialChickWeight">Initial Chick Weight (kg)</Label>
                <Input
                  id="initialChickWeight"
                  name="initialChickWeight"
                  type="number"
                  step="0.001"
                  value={batchForm.initialChickWeight}
                  onChange={handleBatchChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={batchForm.notes}
                  onChange={handleBatchChange}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={3}
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={() => setIsBatchModalOpen(false)}>
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
    </div>
  );
}
