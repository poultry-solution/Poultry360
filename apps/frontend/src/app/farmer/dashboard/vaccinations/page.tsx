"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { Badge } from "@/common/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit,
  Syringe,
  Activity,
  TrendingUp,
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Filter,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  useGetUpcomingVaccinations,
  useGetOverdueVaccinations,
  useGetVaccinationSchedules,
  useGetVaccinationStats,
  useMarkVaccinationCompleted,
  useDeleteVaccination,
  useDeleteVaccinationSchedule,
  useSyncVaccinationReminders,
} from "@/fetchers/vaccination/vaccinationQueries";
import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import { useGetUserFarms } from "@/fetchers/farms/farmQueries";
import { DateDisplay } from "@/common/components/ui/date-display";
import { DateInput } from "@/common/components/ui/date-input";

export default function VaccinationsPage() {
  // Data fetching
  const { data: upcomingResponse, isLoading: upcomingLoading } = useGetUpcomingVaccinations(30);
  const { data: overdueResponse, isLoading: overdueLoading } = useGetOverdueVaccinations();
  const { data: schedulesResponse, isLoading: schedulesLoading } = useGetVaccinationSchedules();
  const { data: statsResponse, isLoading: statsLoading } = useGetVaccinationStats();
  const { data: batchesResponse } = useGetAllBatches();
  const { data: farmsResponse } = useGetUserFarms("all");

  // Data processing
  const upcomingVaccinations = upcomingResponse?.data || [];
  const overdueVaccinations = overdueResponse?.data || [];
  const vaccinationSchedules = schedulesResponse?.data || [];
  const vaccinationStats = statsResponse?.data || { total: 0, pending: 0, completed: 0, overdue: 0, byBatch: {} };
  const activeBatches = (batchesResponse?.data || []).filter((batch: any) => batch.status === "ACTIVE");
  const farms = farmsResponse?.data || [];

  // State management
  const [activeTab, setActiveTab] = useState("schedules");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFarmFilter, setSelectedFarmFilter] = useState("none");
  const [selectedBatchFilter, setSelectedBatchFilter] = useState("none");
  const [expandedSchedules, setExpandedSchedules] = useState<Set<string>>(new Set());

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMultiDoseModalOpen, setIsMultiDoseModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVaccination, setEditingVaccination] = useState<any>(null);

  // Form states
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

  // Mutations
  const markCompletedMutation = useMarkVaccinationCompleted();
  const deleteVaccinationMutation = useDeleteVaccination();
  const deleteScheduleMutation = useDeleteVaccinationSchedule();
  const syncRemindersMutation = useSyncVaccinationReminders();

  // Filter batches based on selected farm (for forms)
  const getFilteredBatchesForForm = (selectedFarmId: string) => {
    return selectedFarmId && selectedFarmId !== "none"
      ? activeBatches.filter((batch: any) => batch.farmId === selectedFarmId)
      : activeBatches;
  };

  // Filter batches for create form
  const createFormFilteredBatches = getFilteredBatchesForForm(createForm.farmId);
  
  // Filter batches for multi-dose form
  const multiDoseFormFilteredBatches = getFilteredBatchesForForm(multiDoseForm.farmId);

  // Filter vaccinations based on search and filters
  const filterVaccinations = (vaccinations: any[]) => {
    return vaccinations.filter((vaccination) => {
      const matchesSearch = vaccination.vaccineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vaccination.notes?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFarm = !selectedFarmFilter || selectedFarmFilter === "none" || vaccination.farmId === selectedFarmFilter;
      const matchesBatch = !selectedBatchFilter || selectedBatchFilter === "none" || vaccination.batchId === selectedBatchFilter;
      return matchesSearch && matchesFarm && matchesBatch;
    });
  };

  const filteredUpcoming = filterVaccinations(upcomingVaccinations);
  const filteredOverdue = filterVaccinations(overdueVaccinations);

  // Filter schedules
  const filteredSchedules = vaccinationSchedules.filter((schedule) => {
    const matchesSearch = schedule.vaccineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         schedule.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFarm = !selectedFarmFilter || selectedFarmFilter === "none" || schedule.farmId === selectedFarmFilter;
    const matchesBatch = !selectedBatchFilter || selectedBatchFilter === "none" || schedule.batchId === selectedBatchFilter;
    return matchesSearch && matchesFarm && matchesBatch;
  });

  // Form handlers
  const updateCreateForm = (field: string, value: any) => {
    setCreateForm(prev => ({ ...prev, [field]: value }));
    // If farm is changed, reset batch selection
    if (field === "farmId") {
      setCreateForm(prev => ({ ...prev, batchId: "none" }));
    }
  };

  const updateMultiDoseForm = (field: string, value: any) => {
    setMultiDoseForm(prev => ({ ...prev, [field]: value }));
    // If farm is changed, reset batch selection
    if (field === "farmId") {
      setMultiDoseForm(prev => ({ ...prev, batchId: "none" }));
    }
  };


  const handleMarkCompleted = async (vaccinationId: string) => {
    try {
      await markCompletedMutation.mutateAsync(vaccinationId);
      toast.success("Vaccination marked as completed");
    } catch (error) {
      toast.error("Failed to mark vaccination as completed");
    }
  };

  const handleDeleteVaccination = async (vaccinationId: string) => {
    if (!confirm("Are you sure you want to delete this vaccination?")) return;
    
    try {
      await deleteVaccinationMutation.mutateAsync(vaccinationId);
      toast.success("Vaccination deleted successfully");
    } catch (error) {
      toast.error("Failed to delete vaccination");
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to delete this entire vaccination schedule? This will delete all doses in the schedule.")) return;
    
    try {
      await deleteScheduleMutation.mutateAsync(scheduleId);
      toast.success("Vaccination schedule deleted successfully");
    } catch (error) {
      toast.error("Failed to delete vaccination schedule");
    }
  };

  const handleSyncReminders = async () => {
    try {
      await syncRemindersMutation.mutateAsync();
      toast.success("Vaccination reminders synced successfully");
    } catch (error) {
      toast.error("Failed to sync vaccination reminders");
    }
  };

  // Utility functions
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "OVERDUE":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };


  const formatRelativeTime = (dateString: string) => {
    const now = new Date().getTime();
    const due = new Date(dateString).getTime();
    const diffMs = due - now;
    
    if (diffMs <= 0) return "Due now";
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    return `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
  };

  const toggleScheduleExpansion = (scheduleId: string) => {
    const newExpanded = new Set(expandedSchedules);
    if (newExpanded.has(scheduleId)) {
      newExpanded.delete(scheduleId);
    } else {
      newExpanded.add(scheduleId);
    }
    setExpandedSchedules(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Syringe className="h-8 w-8 text-primary" />
            Vaccination Management
          </h1>
          <p className="text-muted-foreground">
            Track and manage vaccination schedules for your poultry
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSyncReminders}
            disabled={syncRemindersMutation.isPending}
            className="flex items-center gap-2"
          >
            <Activity className="h-4 w-4" />
            Sync Reminders
          </Button>
          <Button
            onClick={() => setIsMultiDoseModalOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Multi-Dose
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Vaccination
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vaccinations</CardTitle>
            <Syringe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                vaccinationStats.total
              )}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {statsLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                vaccinationStats.pending
              )}
            </div>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                vaccinationStats.completed
              )}
            </div>
            <p className="text-xs text-muted-foreground">Done</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statsLoading ? (
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              ) : (
                vaccinationStats.overdue
              )}
            </div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vaccinations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedFarmFilter} onValueChange={setSelectedFarmFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by farm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All farms</SelectItem>
                  {farms.map((farm: any) => (
                    <SelectItem key={farm.id} value={farm.id}>
                      {farm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedBatchFilter} onValueChange={setSelectedBatchFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All batches</SelectItem>
                  {activeBatches.map((batch: any) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.batchNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upcoming" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Upcoming ({filteredUpcoming.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Overdue ({filteredOverdue.length})
          </TabsTrigger>
          <TabsTrigger value="schedules" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Schedules ({filteredSchedules.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Vaccinations */}
        <TabsContent value="upcoming">
          <div className="grid gap-4">
            {upcomingLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredUpcoming.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No upcoming vaccinations</h3>
                  <p className="text-muted-foreground mb-4">
                    You don't have any vaccinations scheduled for the next 30 days.
                  </p>
                  <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Vaccination
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredUpcoming.map((vaccination: any) => (
                <Card key={vaccination.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{vaccination.vaccineName}</h3>
                          {getStatusBadge(vaccination.status)}
                          {vaccination.totalDoses > 1 && (
                            <Badge variant="outline">
                              Dose {vaccination.doseNumber}/{vaccination.totalDoses}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <DateDisplay date={vaccination.scheduledDate} format="short" />
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {formatRelativeTime(vaccination.scheduledDate)}
                          </div>
                          {vaccination.batch && (
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {vaccination.batch.batchNumber}
                            </div>
                          )}
                          {vaccination.farm && (
                            <div>{vaccination.farm.name}</div>
                          )}
                        </div>
                        {vaccination.notes && (
                          <p className="text-sm text-muted-foreground">{vaccination.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleMarkCompleted(vaccination.id)}
                          disabled={markCompletedMutation.isPending}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Done
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteVaccination(vaccination.id)}
                          disabled={deleteVaccinationMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Overdue Vaccinations */}
        <TabsContent value="overdue">
          <div className="grid gap-4">
            {overdueLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredOverdue.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
                  <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                  <p className="text-muted-foreground">
                    You don't have any overdue vaccinations.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredOverdue.map((vaccination: any) => (
                <Card key={vaccination.id} className="border-red-200 bg-red-50/30 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg text-red-800">{vaccination.vaccineName}</h3>
                          {getStatusBadge(vaccination.status)}
                          {vaccination.totalDoses > 1 && (
                            <Badge variant="outline">
                              Dose {vaccination.doseNumber}/{vaccination.totalDoses}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <DateDisplay date={vaccination.scheduledDate} format="short" />
                          </div>
                          <div className="flex items-center gap-1 text-red-600">
                            <AlertTriangle className="h-4 w-4" />
                            Overdue
                          </div>
                          {vaccination.batch && (
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {vaccination.batch.batchNumber}
                            </div>
                          )}
                          {vaccination.farm && (
                            <div>{vaccination.farm.name}</div>
                          )}
                        </div>
                        {vaccination.notes && (
                          <p className="text-sm text-muted-foreground">{vaccination.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleMarkCompleted(vaccination.id)}
                          disabled={markCompletedMutation.isPending}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Mark Done
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteVaccination(vaccination.id)}
                          disabled={deleteVaccinationMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Vaccination Schedules */}
        <TabsContent value="schedules">
          <div className="grid gap-4">
            {schedulesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredSchedules.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No vaccination schedules</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first vaccination schedule to get started.
                  </p>
                  <Button onClick={() => setIsMultiDoseModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Schedule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredSchedules.map((schedule: any) => (
                <Card key={schedule.id} className="border-blue-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      {/* Schedule Header */}
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
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <DateDisplay date={schedule.firstDoseDate} format="short" /> - <DateDisplay date={schedule.lastDoseDate} format="short" />
                            </div>
                            {schedule.batch && (
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {schedule.batch.batchNumber}
                              </div>
                            )}
                            {schedule.farm && (
                              <div>{schedule.farm.name}</div>
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
                            <p className="text-sm text-muted-foreground">{schedule.notes}</p>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleScheduleExpansion(schedule.id)}
                          >
                            {expandedSchedules.has(schedule.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            {expandedSchedules.has(schedule.id) ? 'Hide' : 'Show'} Details
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            disabled={deleteScheduleMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete Schedule
                          </Button>
                        </div>
                      </div>

                      {/* Expandable Dose Details */}
                      {expandedSchedules.has(schedule.id) && (
                        <div className="border-t pt-4">
                          <h4 className="font-medium mb-3">Dose Details ({schedule.doses.length} doses)</h4>
                          <div className="grid gap-2">
                            {schedule.doses.map((dose: any) => (
                              <div key={dose.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium">{dose.doseNumber}</span>
                                  </div>
                                  <div>
                                    <div className="font-medium">Dose {dose.doseNumber}</div>
                                    <div className="text-sm text-muted-foreground">
                                      <DateDisplay date={dose.scheduledDate} format="short" />
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(dose.status)}
                                  {dose.completedDate && (
                                    <div className="text-sm text-green-600">
                                      Completed: <DateDisplay date={dose.completedDate} format="short" />
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <div className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Vaccination Progress</CardTitle>
                  <CardDescription>Overall completion status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Completed</span>
                      <span className="text-sm text-green-600">{vaccinationStats.completed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Pending</span>
                      <span className="text-sm text-blue-600">{vaccinationStats.pending}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Overdue</span>
                      <span className="text-sm text-red-600">{vaccinationStats.overdue}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vaccinations by Batch</CardTitle>
                  <CardDescription>Distribution across batches</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(vaccinationStats.byBatch).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No batch data available</p>
                    ) : (
                      Object.entries(vaccinationStats.byBatch).map(([batchId, count]) => {
                        const batch = activeBatches.find((b: any) => b.id === batchId);
                        return (
                          <div key={batchId} className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              {batch ? batch.batchNumber : 'Unknown Batch'}
                            </span>
                            <span className="text-sm">{count as number}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common vaccination management tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="h-20 flex flex-col items-center justify-center gap-2"
                  >
                    <Plus className="h-6 w-6" />
                    <span>Add Single Vaccination</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsMultiDoseModalOpen(true)}
                    className="h-20 flex flex-col items-center justify-center gap-2"
                  >
                    <Activity className="h-6 w-6" />
                    <span>Create Multi-Dose Schedule</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSyncReminders}
                    disabled={syncRemindersMutation.isPending}
                    className="h-20 flex flex-col items-center justify-center gap-2"
                  >
                    <Clock className="h-6 w-6" />
                    <span>Sync Reminders</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>



    </div>
  );
}
