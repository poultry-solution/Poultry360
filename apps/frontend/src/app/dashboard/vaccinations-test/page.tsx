"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/lib/axios";

interface Vaccination {
  id: string;
  vaccineName: string;
  scheduledDate: string;
  completedDate?: string;
  status: "PENDING" | "COMPLETED" | "OVERDUE";
  notes?: string;
  doseNumber: number;
  totalDoses: number;
  daysBetweenDoses?: number;
  batchId?: string;
  farmId?: string;
  batch?: {
    id: string;
    batchNumber: string;
  };
  farm?: {
    id: string;
    name: string;
  };
  reminder?: {
    id: string;
    status: string;
    dueDate: string;
  };
}

interface VaccinationSchedule {
  id: string;
  vaccineName: string;
  totalDoses: number;
  daysBetweenDoses?: number;
  notes?: string;
  batchId?: string;
  farmId?: string;
  batch?: {
    id: string;
    batchNumber: string;
  };
  farm?: {
    id: string;
    name: string;
  };
  firstDoseDate: string;
  lastDoseDate: string;
  doses: Vaccination[];
  status: "PENDING" | "COMPLETED" | "OVERDUE";
  completedDoses: number;
  pendingDoses: number;
  overdueDoses: number;
}

interface Batch {
  id: string;
  batchNumber: string;
  status: string;
}

interface Farm {
  id: string;
  name: string;
}

const VaccinationTestPage = () => {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([]);
  const [vaccinationSchedules, setVaccinationSchedules] = useState<VaccinationSchedule[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");

  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    vaccineName: "",
    scheduledDate: "",
    notes: "",
    batchId: "none",
    farmId: "none",
    doseNumber: 1,
    totalDoses: 1,
    daysBetweenDoses: 0,
  });

  const [multiDoseForm, setMultiDoseForm] = useState({
    vaccineName: "",
    firstDoseDate: "",
    totalDoses: 2,
    daysBetweenDoses: 14,
    notes: "",
    batchId: "none",
    farmId: "none",
  });

  // Load data
  const loadVaccinations = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get("/vaccinations/upcoming?days=30");
      if (response.data.success) {
        setVaccinations(response.data.data);
      }
    } catch (error) {
      console.error("Error loading vaccinations:", error);
      toast.error("Failed to load vaccinations");
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      const response = await axiosInstance.get("/batches");
      if (response.data.success) {
        setBatches(response.data.data);
      }
    } catch (error) {
      console.error("Error loading batches:", error);
    }
  };

  const loadFarms = async () => {
    try {
      const response = await axiosInstance.get("/farms");
      if (response.data.success) {
        setFarms(response.data.data);
      }
    } catch (error) {
      console.error("Error loading farms:", error);
    }
  };

  const loadVaccinationSchedules = async () => {
    try {
      const response = await axiosInstance.get("/vaccinations/schedules");
      if (response.data.success) {
        setVaccinationSchedules(response.data.data);
      }
    } catch (error) {
      console.error("Error loading vaccination schedules:", error);
      toast.error("Failed to load vaccination schedules");
    }
  };

  useEffect(() => {
    loadVaccinations();
    loadVaccinationSchedules();
    loadBatches();
    loadFarms();
  }, []);

  // Create single vaccination
  const handleCreateVaccination = async () => {
    // Validate required fields
    if (!createForm.vaccineName.trim()) {
      toast.error("Vaccine name is required");
      return;
    }
    if (!createForm.scheduledDate) {
      toast.error("Scheduled date is required");
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.post("/vaccinations", {
        ...createForm,
        batchId: createForm.batchId === "none" ? "" : createForm.batchId,
        farmId: createForm.farmId === "none" ? "" : createForm.farmId,
        scheduledDate: new Date(createForm.scheduledDate).toISOString(),
      });

      if (response.data.success) {
        toast.success("Vaccination created successfully");
        setCreateForm({
          vaccineName: "",
          scheduledDate: "",
          notes: "",
          batchId: "none",
          farmId: "none",
          doseNumber: 1,
          totalDoses: 1,
          daysBetweenDoses: 0,
        });
        setShowCreateForm(false);
        loadVaccinations();
        loadVaccinationSchedules();
      } else {
        toast.error(response.data.error || "Failed to create vaccination");
      }
    } catch (error) {
      console.error("Error creating vaccination:", error);
      toast.error("Failed to create vaccination");
    } finally {
      setLoading(false);
    }
  };

  // Create multi-dose vaccination
  const handleCreateMultiDoseVaccination = async () => {
    // Validate required fields
    if (!multiDoseForm.vaccineName.trim()) {
      toast.error("Vaccine name is required");
      return;
    }
    if (!multiDoseForm.firstDoseDate) {
      toast.error("First dose date is required");
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.post("/vaccinations/multi-dose", {
        ...multiDoseForm,
        batchId: multiDoseForm.batchId === "none" ? "" : multiDoseForm.batchId,
        farmId: multiDoseForm.farmId === "none" ? "" : multiDoseForm.farmId,
        firstDoseDate: new Date(multiDoseForm.firstDoseDate).toISOString(),
      });

      if (response.data.success) {
        toast.success(`Created ${response.data.data.length} vaccination doses`);
        setMultiDoseForm({
          vaccineName: "",
          firstDoseDate: "",
          totalDoses: 2,
          daysBetweenDoses: 14,
          notes: "",
          batchId: "none",
          farmId: "none",
        });
        loadVaccinations();
        loadVaccinationSchedules();
      } else {
        toast.error(response.data.error || "Failed to create multi-dose vaccination");
      }
    } catch (error) {
      console.error("Error creating multi-dose vaccination:", error);
      toast.error("Failed to create multi-dose vaccination");
    } finally {
      setLoading(false);
    }
  };

  // Mark vaccination as completed
  const handleMarkCompleted = async (vaccinationId: string) => {
    try {
      setLoading(true);
      const response = await axiosInstance.post(`/vaccinations/${vaccinationId}/complete`);

      if (response.data.success) {
        toast.success("Vaccination marked as completed");
        loadVaccinations();
        loadVaccinationSchedules();
      } else {
        toast.error(response.data.error || "Failed to mark vaccination as completed");
      }
    } catch (error) {
      console.error("Error marking vaccination as completed:", error);
      toast.error("Failed to mark vaccination as completed");
    } finally {
      setLoading(false);
    }
  };

  // Delete vaccination
  const handleDeleteVaccination = async (vaccinationId: string) => {
    if (!confirm("Are you sure you want to delete this vaccination?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.delete(`/vaccinations/${vaccinationId}`);

      if (response.data.success) {
        toast.success("Vaccination deleted successfully");
        loadVaccinations();
        loadVaccinationSchedules();
      } else {
        toast.error(response.data.error || "Failed to delete vaccination");
      }
    } catch (error) {
      console.error("Error deleting vaccination:", error);
      toast.error("Failed to delete vaccination");
    } finally {
      setLoading(false);
    }
  };

  // Delete vaccination schedule
  const handleDeleteVaccinationSchedule = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to delete this entire vaccination schedule? This will delete all doses in the schedule.")) {
      return;
    }

    try {
      setLoading(true);
      const response = await axiosInstance.delete(`/vaccinations/schedule/${scheduleId}`);

      if (response.data.success) {
        toast.success("Vaccination schedule deleted successfully");
        loadVaccinations();
        loadVaccinationSchedules();
      } else {
        toast.error(response.data.error || "Failed to delete vaccination schedule");
      }
    } catch (error) {
      console.error("Error deleting vaccination schedule:", error);
      toast.error("Failed to delete vaccination schedule");
    } finally {
      setLoading(false);
    }
  };

  // Sync vaccination reminders
  const handleSyncReminders = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.post("/vaccinations/sync-reminders");

      if (response.data.success) {
        toast.success("Vaccination reminders synced successfully");
        loadVaccinations();
        loadVaccinationSchedules();
      } else {
        toast.error(response.data.error || "Failed to sync vaccination reminders");
      }
    } catch (error) {
      console.error("Error syncing vaccination reminders:", error);
      toast.error("Failed to sync vaccination reminders");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "OVERDUE":
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const upcomingVaccinations = vaccinations.filter(
    (v) => v.status === "PENDING" && new Date(v.scheduledDate) >= new Date()
  );
  const overdueVaccinations = vaccinations.filter(
    (v) => v.status === "PENDING" && new Date(v.scheduledDate) < new Date()
  );
  const completedVaccinations = vaccinations.filter(
    (v) => v.status === "COMPLETED"
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🩺 Vaccination Test Page</h1>
          <p className="text-gray-600">Test the vaccination reminder system</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSyncReminders} disabled={loading}>
            Sync Reminders
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Vaccination
          </Button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Vaccination</CardTitle>
            <CardDescription>Add a new vaccination schedule</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vaccineName">Vaccine Name</Label>
                <Input
                  id="vaccineName"
                  value={createForm.vaccineName}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      vaccineName: e.target.value,
                    })
                  }
                  placeholder="e.g., Newcastle Disease"
                />
              </div>
              <div>
                <Label htmlFor="scheduledDate">Scheduled Date</Label>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  value={createForm.scheduledDate}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      scheduledDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="doseNumber">Dose Number</Label>
                <Input
                  id="doseNumber"
                  type="number"
                  min="1"
                  value={createForm.doseNumber}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      doseNumber: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="totalDoses">Total Doses</Label>
                <Input
                  id="totalDoses"
                  type="number"
                  min="1"
                  value={createForm.totalDoses}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      totalDoses: parseInt(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="daysBetweenDoses">Days Between Doses</Label>
                <Input
                  id="daysBetweenDoses"
                  type="number"
                  min="0"
                  value={createForm.daysBetweenDoses}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      daysBetweenDoses: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="batchId">Batch (Optional)</Label>
                <Select
                  value={createForm.batchId}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, batchId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select batch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No batch</SelectItem>
                    {batches.map((batch) => (
                      <SelectItem key={batch.id} value={batch.id}>
                        {batch.batchNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="farmId">Farm (Optional)</Label>
                <Select
                  value={createForm.farmId}
                  onValueChange={(value) =>
                    setCreateForm({ ...createForm, farmId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select farm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No farm</SelectItem>
                    {farms.map((farm) => (
                      <SelectItem key={farm.id} value={farm.id}>
                        {farm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm({ ...createForm, notes: e.target.value })
                }
                placeholder="Additional notes about the vaccination"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateVaccination} disabled={loading}>
                Create Vaccination
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Multi-Dose Form */}
      <Card>
        <CardHeader>
          <CardTitle>Create Multi-Dose Vaccination</CardTitle>
          <CardDescription>
            Create a vaccination schedule with multiple doses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="multiVaccineName">Vaccine Name</Label>
              <Input
                id="multiVaccineName"
                value={multiDoseForm.vaccineName}
                onChange={(e) =>
                  setMultiDoseForm({
                    ...multiDoseForm,
                    vaccineName: e.target.value,
                  })
                }
                placeholder="e.g., Newcastle Disease"
              />
            </div>
            <div>
              <Label htmlFor="firstDoseDate">First Dose Date</Label>
              <Input
                id="firstDoseDate"
                type="datetime-local"
                value={multiDoseForm.firstDoseDate}
                onChange={(e) =>
                  setMultiDoseForm({
                    ...multiDoseForm,
                    firstDoseDate: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="totalDoses">Total Doses</Label>
              <Input
                id="totalDoses"
                type="number"
                min="2"
                value={multiDoseForm.totalDoses}
                onChange={(e) =>
                  setMultiDoseForm({
                    ...multiDoseForm,
                    totalDoses: parseInt(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="daysBetweenDoses">Days Between Doses</Label>
              <Input
                id="daysBetweenDoses"
                type="number"
                min="1"
                value={multiDoseForm.daysBetweenDoses}
                onChange={(e) =>
                  setMultiDoseForm({
                    ...multiDoseForm,
                    daysBetweenDoses: parseInt(e.target.value),
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="multiBatchId">Batch (Optional)</Label>
              <Select
                value={multiDoseForm.batchId}
                onValueChange={(value) =>
                  setMultiDoseForm({ ...multiDoseForm, batchId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No batch</SelectItem>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.batchNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="multiFarmId">Farm (Optional)</Label>
              <Select
                value={multiDoseForm.farmId}
                onValueChange={(value) =>
                  setMultiDoseForm({ ...multiDoseForm, farmId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select farm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No farm</SelectItem>
                  {farms.map((farm) => (
                    <SelectItem key={farm.id} value={farm.id}>
                      {farm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="multiNotes">Notes</Label>
            <Textarea
              id="multiNotes"
              value={multiDoseForm.notes}
              onChange={(e) =>
                setMultiDoseForm({ ...multiDoseForm, notes: e.target.value })
              }
              placeholder="Additional notes about the vaccination schedule"
            />
          </div>

          <Button onClick={handleCreateMultiDoseVaccination} disabled={loading}>
            Create Multi-Dose Vaccination
          </Button>
        </CardContent>
      </Card>

      {/* Vaccination List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({upcomingVaccinations.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">
            Overdue ({overdueVaccinations.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedVaccinations.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All Schedules ({vaccinationSchedules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          <div className="grid gap-4">
            {upcomingVaccinations.map((vaccination) => (
              <Card key={vaccination.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {vaccination.vaccineName}
                        </h3>
                        {getStatusBadge(vaccination.status)}
                        {vaccination.totalDoses > 1 && (
                          <Badge variant="outline">
                            Dose {vaccination.doseNumber}/
                            {vaccination.totalDoses}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(vaccination.scheduledDate)}
                        </div>
                        {vaccination.batch && (
                          <div>Batch: {vaccination.batch.batchNumber}</div>
                        )}
                        {vaccination.farm && (
                          <div>Farm: {vaccination.farm.name}</div>
                        )}
                      </div>
                      {vaccination.notes && (
                        <p className="text-sm text-gray-600">
                          {vaccination.notes}
                        </p>
                      )}
                      {vaccination.reminder && (
                        <div className="text-xs text-gray-500">
                          Reminder: {vaccination.reminder.status} -{" "}
                          {formatDate(vaccination.reminder.dueDate)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleMarkCompleted(vaccination.id)}
                        disabled={loading}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Completed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteVaccination(vaccination.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {upcomingVaccinations.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  No upcoming vaccinations found
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="overdue">
          <div className="grid gap-4">
            {overdueVaccinations.map((vaccination) => (
              <Card key={vaccination.id} className="border-red-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-red-800">
                          {vaccination.vaccineName}
                        </h3>
                        {getStatusBadge(vaccination.status)}
                        {vaccination.totalDoses > 1 && (
                          <Badge variant="outline">
                            Dose {vaccination.doseNumber}/
                            {vaccination.totalDoses}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(vaccination.scheduledDate)}
                        </div>
                        {vaccination.batch && (
                          <div>Batch: {vaccination.batch.batchNumber}</div>
                        )}
                        {vaccination.farm && (
                          <div>Farm: {vaccination.farm.name}</div>
                        )}
                      </div>
                      {vaccination.notes && (
                        <p className="text-sm text-gray-600">
                          {vaccination.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => handleMarkCompleted(vaccination.id)}
                        disabled={loading}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Completed
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteVaccination(vaccination.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {overdueVaccinations.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  No overdue vaccinations found
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed">
          <div className="grid gap-4">
            {completedVaccinations.map((vaccination) => (
              <Card key={vaccination.id} className="border-green-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-green-800">
                          {vaccination.vaccineName}
                        </h3>
                        {getStatusBadge(vaccination.status)}
                        {vaccination.totalDoses > 1 && (
                          <Badge variant="outline">
                            Dose {vaccination.doseNumber}/
                            {vaccination.totalDoses}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Scheduled: {formatDate(vaccination.scheduledDate)}
                        </div>
                        {vaccination.completedDate && (
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Completed: {formatDate(vaccination.completedDate)}
                          </div>
                        )}
                        {vaccination.batch && (
                          <div>Batch: {vaccination.batch.batchNumber}</div>
                        )}
                        {vaccination.farm && (
                          <div>Farm: {vaccination.farm.name}</div>
                        )}
                      </div>
                      {vaccination.notes && (
                        <p className="text-sm text-gray-600">
                          {vaccination.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteVaccination(vaccination.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {completedVaccinations.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  No completed vaccinations found
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all">
          <div className="grid gap-4">
            {vaccinationSchedules.map((schedule) => (
              <Card key={schedule.id} className="border-blue-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{schedule.vaccineName}</h3>
                        {getStatusBadge(schedule.status)}
                        <Badge variant="outline">
                          {schedule.totalDoses} doses
                        </Badge>
                        {schedule.daysBetweenDoses && (
                          <Badge variant="secondary">
                            Every {schedule.daysBetweenDoses} days
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(schedule.firstDoseDate)} - {formatDate(schedule.lastDoseDate)}
                        </div>
                        {schedule.batch && (
                          <div>Batch: {schedule.batch.batchNumber}</div>
                        )}
                        {schedule.farm && (
                          <div>Farm: {schedule.farm.name}</div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <Badge className="bg-green-100 text-green-800">
                          ✅ {schedule.completedDoses} completed
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800">
                          ⏳ {schedule.pendingDoses} pending
                        </Badge>
                        {schedule.overdueDoses > 0 && (
                          <Badge className="bg-red-100 text-red-800">
                            ⚠️ {schedule.overdueDoses} overdue
                          </Badge>
                        )}
                      </div>

                      {schedule.notes && (
                        <p className="text-sm text-gray-600">{schedule.notes}</p>
                      )}

                      {/* Show dose details */}
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                          View Dose Details ({schedule.doses.length} doses)
                        </summary>
                        <div className="mt-2 space-y-1">
                          {schedule.doses.map((dose) => (
                            <div key={dose.id} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Dose {dose.doseNumber}:</span>
                                <span>{formatDate(dose.scheduledDate)}</span>
                                {getStatusBadge(dose.status)}
                              </div>
                              {dose.completedDate && (
                                <span className="text-green-600">
                                  Completed: {formatDate(dose.completedDate)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteVaccinationSchedule(schedule.id)}
                        disabled={loading}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete Schedule
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {vaccinationSchedules.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  No vaccination schedules found
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VaccinationTestPage;
