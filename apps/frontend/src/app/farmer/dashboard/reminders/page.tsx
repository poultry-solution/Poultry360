"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { CheckCircle, Clock, RotateCcw, Bell, Calendar, Plus, Filter, Trash2 } from "lucide-react";
import {
  useGetReminders,
  useGetUpcomingReminders,
  useGetOverdueReminders,
  useGetScheduledReminders,
  useGetCompletedTodayReminders,
  useCreateReminder,
  useMarkReminderCompleted,
  useMarkReminderNotDone,
  useDeleteReminder,
  useCleanupDuplicateReminders,
  getReminderTypeDisplayName,
  formatReminderDueDate,
} from "@/fetchers/remainder/remainderQueries";
import { DateInput } from "@/common/components/ui/date-input";
import { DateDisplay } from "@/common/components/ui/date-display";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";

export default function RemindersPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "overdue" | "scheduled" | "completed" | "all">("upcoming");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Get all reminders query (for debugging and "All" tab)
  const allRemindersQuery = useGetReminders({ limit: 1000 }, { enabled: activeTab === "all" });

  // Real queries
  const upcomingQuery = useGetUpcomingReminders(7, {
    enabled: activeTab === "upcoming" || activeTab === "all"
  });
  const overdueQuery = useGetOverdueReminders({
    enabled: activeTab === "overdue" || activeTab === "all"
  });
  const scheduledQuery = useGetScheduledReminders({
    enabled: activeTab === "scheduled" || activeTab === "all"
  });
  const completedTodayQuery = useGetCompletedTodayReminders({
    enabled: activeTab === "completed" || activeTab === "all"
  });

  const createReminder = useCreateReminder();
  const markCompleted = useMarkReminderCompleted();
  const markNotDone = useMarkReminderNotDone();
  const deleteReminder = useDeleteReminder();
  const cleanupDuplicates = useCleanupDuplicateReminders();

  // Track which reminder is being processed for loading states
  const [processingReminderId, setProcessingReminderId] = useState<string | null>(null);

  // Delete confirmation dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "GENERAL",
    dueDate: "",
    isRecurring: false,
    recurrencePattern: "DAILY",
    recurrenceInterval: 1,
  });

  // Listen for notification actions
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_ACTION') {
        console.log('Received notification action in reminders page:', event.data);
        // Refetch reminders
        allRemindersQuery.refetch();
        upcomingQuery.refetch();
        overdueQuery.refetch();
        scheduledQuery.refetch();
        completedTodayQuery.refetch();
      }
    };

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return () => {
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [allRemindersQuery, upcomingQuery, overdueQuery, scheduledQuery, completedTodayQuery]);

  // Handle form submission
  const handleCreateReminder = async () => {
    if (!form.title || !form.dueDate) return;

    try {
      // DateInput already returns ISO string, so we can use it directly
      await createReminder.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        type: form.type as any,
        dueDate: form.dueDate, // Already ISO string from DateInput
        isRecurring: form.isRecurring,
        recurrencePattern: form.isRecurring ? (form.recurrencePattern as any) : "NONE",
        recurrenceInterval: form.isRecurring ? Number(form.recurrenceInterval) : undefined,
      } as any);

      // Reset form
      setForm({
        title: "",
        description: "",
        type: "GENERAL",
        dueDate: "",
        isRecurring: false,
        recurrencePattern: "DAILY",
        recurrenceInterval: 1,
      });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create reminder:', error);
    }
  };

  // Handle mark as completed with loading state
  const handleMarkCompleted = async (reminderId: string) => {
    setProcessingReminderId(reminderId);
    try {
      await markCompleted.mutateAsync(reminderId);
    } catch (error) {
      console.error('Failed to mark reminder as completed:', error);
    } finally {
      setProcessingReminderId(null);
    }
  };

  // Handle mark as not done with loading state
  const handleMarkNotDone = async (reminderId: string) => {
    setProcessingReminderId(reminderId);
    try {
      await markNotDone.mutateAsync({ id: reminderId, rescheduleMinutes: 60 });
    } catch (error) {
      console.error('Failed to mark reminder as not done:', error);
    } finally {
      setProcessingReminderId(null);
    }
  };

  // Handle delete reminder with loading state
  const handleDeleteReminder = async (reminderId: string) => {
    setPendingDeleteId(reminderId);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteReminder = async () => {
    if (!pendingDeleteId) return;

    setDeleteDialogOpen(false);
    setProcessingReminderId(pendingDeleteId);
    try {
      await deleteReminder.mutateAsync(pendingDeleteId);
    } catch (error) {
      console.error('Failed to delete reminder:', error);
    } finally {
      setProcessingReminderId(null);
      setPendingDeleteId(null);
    }
  };

  const formatDueIn = (dateString: string) => {
    const now = Date.now();
    const due = new Date(dateString).getTime();
    const diffMs = due - now;

    if (diffMs <= 0) return "Overdue";

    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m`;

    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;

    const diffDay = Math.round(diffHr / 24);
    return `${diffDay}d`;
  };

  const getReminderIcon = (type: string) => {
    const icons: Record<string, string> = {
      FEEDING: "🍽️",
      VACCINATION: "💉",
      CLEANING: "🧹",
      MEDICATION: "💊",
      WEIGHING: "⚖️",
      GENERAL: "📝",
      SUPPLIER_PAYMENT: "💰",
      CUSTOMER_PAYMENT: "💳",
    };
    return icons[type] || "📌";
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      FEEDING: "bg-green-100 text-green-700 border-green-200",
      VACCINATION: "bg-blue-100 text-blue-700 border-blue-200",
      CLEANING: "bg-purple-100 text-purple-700 border-purple-200",
      MEDICATION: "bg-red-100 text-red-700 border-red-200",
      WEIGHING: "bg-yellow-100 text-yellow-700 border-yellow-200",
      GENERAL: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return colors[type] || "bg-gray-100 text-gray-700 border-gray-200";
  };

  // Get data from queries
  const allReminders = allRemindersQuery.data?.data || [];
  const upcomingReminders = upcomingQuery.data?.data || [];
  const overdueReminders = overdueQuery.data?.data || [];
  const scheduledReminders = scheduledQuery.data?.data || [];
  const completedTodayReminders = completedTodayQuery.data?.data || [];

  // Debug: Log all reminders to console
  useEffect(() => {
    if (allRemindersQuery.data) {
      console.log("📋 All Reminders:", allRemindersQuery.data);
      console.log("📋 Total Count:", allReminders.length);
    }
  }, [allRemindersQuery.data, allReminders.length]);

  // Calculate stats
  const totalUpcoming = upcomingReminders.length;
  const totalOverdue = overdueReminders.length;
  const totalScheduled = scheduledReminders.length;
  const completedToday = completedTodayReminders.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <Bell className="h-8 w-8 text-blue-600" />
              Reminders
            </h1>
            <p className="text-slate-600 mt-1">Manage your farm tasks and notifications</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-600 hover:bg-blue-700 shadow-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Reminder
            </Button>
            <Button
              onClick={() => cleanupDuplicates.mutate()}
              variant="outline"
              className="shadow-lg"
              disabled={cleanupDuplicates.isPending}
            >
              {cleanupDuplicates.isPending ? "Cleaning..." : "Clean Duplicates"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-yellow-500 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Upcoming</p>
                  <p className="text-2xl font-bold text-slate-900">{totalUpcoming}</p>
                </div>
                <Clock className="h-10 w-10 text-yellow-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Overdue</p>
                  <p className="text-2xl font-bold text-slate-900">{totalOverdue}</p>
                </div>
                <Bell className="h-10 w-10 text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Completed Today</p>
                  <p className="text-2xl font-bold text-slate-900">{completedToday}</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">Scheduled</p>
                  <p className="text-2xl font-bold text-slate-900">{totalScheduled}</p>
                </div>
                <Calendar className="h-10 w-10 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card className="shadow-lg border-2 border-blue-200">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-lg">Create New Reminder</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
                  <input
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="E.g., Feed morning batch"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Additional details..."
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                  <Select
                    value={form.type}
                    onValueChange={(value) => setForm({ ...form, type: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GENERAL">General</SelectItem>
                      <SelectItem value="VACCINATION">Vaccination</SelectItem>
                      <SelectItem value="FEEDING">Feeding</SelectItem>
                      <SelectItem value="MEDICATION">Medication</SelectItem>
                      <SelectItem value="CLEANING">Cleaning</SelectItem>
                      <SelectItem value="WEIGHING">Weighing</SelectItem>
                      <SelectItem value="SUPPLIER_PAYMENT">Supplier Payment</SelectItem>
                      <SelectItem value="CUSTOMER_PAYMENT">Customer Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <DateInput
                    label="Due Date"
                    value={form.dueDate}
                    onChange={(value) => {
                      // DateInput returns ISO string (AD format) - ready for database
                      setForm({ ...form, dueDate: value });
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Date picker adapts to your calendar preference (BS/AD)
                  </p>
                </div>

                <div className="md:col-span-2 flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 rounded"
                      checked={form.isRecurring}
                      onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                    />
                    <span className="text-sm text-slate-700">Recurring reminder</span>
                  </label>
                </div>

                {form.isRecurring && (
                  <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Pattern</label>
                      <Select
                        value={form.recurrencePattern}
                        onValueChange={(value) => setForm({ ...form, recurrencePattern: value })}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select pattern" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAILY">Daily</SelectItem>
                          <SelectItem value="WEEKLY">Weekly</SelectItem>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="CUSTOM">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Interval</label>
                      <input
                        type="number"
                        min={1}
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                        value={form.recurrenceInterval}
                        onChange={(e) => setForm({ ...form, recurrenceInterval: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                )}

                <div className="md:col-span-2 flex gap-3">
                  <Button
                    className="bg-blue-600 hover:bg-blue-700 flex-1"
                    onClick={handleCreateReminder}
                    disabled={createReminder.isPending || !form.title || !form.dueDate}
                  >
                    {createReminder.isPending ? "Creating..." : "Create Reminder"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === "all"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            All ({allReminders.length})
          </button>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === "upcoming"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            Upcoming ({totalUpcoming})
          </button>
          <button
            onClick={() => setActiveTab("overdue")}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === "overdue"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            Overdue ({totalOverdue})
          </button>
          <button
            onClick={() => setActiveTab("scheduled")}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === "scheduled"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            All Scheduled ({totalScheduled})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${activeTab === "completed"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            Completed Today ({completedToday})
          </button>
        </div>

        {/* Reminders List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(activeTab === "all" ? allReminders :
            activeTab === "upcoming" ? upcomingReminders :
              activeTab === "overdue" ? overdueReminders :
                activeTab === "scheduled" ? scheduledReminders :
                  completedTodayReminders).map((reminder) => {
                    const isCompleted = reminder.status === "COMPLETED";
                    return (
                      <Card
                        key={reminder.id}
                        className={`shadow-md hover:shadow-xl transition-all border-l-4 ${isCompleted
                          ? "border-l-green-500 bg-green-50/30"
                          : "border-l-blue-500"
                          }`}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="text-2xl">{getReminderIcon(reminder.type)}</div>
                              <div className="flex-1">
                                <h3 className="font-semibold text-slate-900 text-lg mb-1">
                                  {reminder.title}
                                </h3>
                                {reminder.description && (
                                  <p className="text-sm text-slate-600 mb-2">{reminder.description}</p>
                                )}
                                <div className="flex flex-wrap gap-2 items-center">
                                  <Badge className={`${getTypeColor(reminder.type)} border`}>
                                    {getReminderTypeDisplayName(reminder.type)}
                                  </Badge>
                                  {reminder.isRecurring && (
                                    <Badge variant="outline" className="text-purple-600 border-purple-300">
                                      🔄 Recurring
                                    </Badge>
                                  )}
                                  {reminder.batch && (
                                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                                      📦 {reminder.batch.batchNumber}
                                    </Badge>
                                  )}
                                  {reminder.farm && (
                                    <Badge variant="outline" className="text-green-600 border-green-300">
                                      🏡 {reminder.farm.name}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge
                                variant={
                                  isCompleted ? "default" :
                                    activeTab === "completed" ? "default" :
                                      reminder.status === "OVERDUE" ? "destructive" : "secondary"
                                }
                                className={`text-xs ${isCompleted ? "bg-green-600 text-white" : ""}`}
                              >
                                {isCompleted ? (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3" />
                                    Completed
                                  </span>
                                ) : activeTab === "completed" ? "Completed" : formatDueIn(reminder.dueDate.toString())}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <DateDisplay date={reminder.dueDate} format="long" />
                            </div>
                            <div className="flex gap-2">
                              {/* Only show action buttons if not completed */}
                              {!isCompleted && activeTab !== "completed" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 h-8 px-3"
                                    onClick={() => handleMarkCompleted(reminder.id)}
                                    disabled={processingReminderId === reminder.id}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {processingReminderId === reminder.id ? "..." : "Done"}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-3 border-slate-300"
                                    onClick={() => handleMarkNotDone(reminder.id)}
                                    disabled={processingReminderId === reminder.id}
                                  >
                                    <RotateCcw className="h-3 w-3 mr-1" />
                                    +1h
                                  </Button>
                                </>
                              )}
                              {/* Always show delete button */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-3 border-red-300 text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteReminder(reminder.id)}
                                disabled={processingReminderId === reminder.id}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
        </div>

        {/* Empty State */}
        {(activeTab === "all" ? allReminders :
          activeTab === "upcoming" ? upcomingReminders :
            activeTab === "overdue" ? overdueReminders :
              activeTab === "scheduled" ? scheduledReminders :
                completedTodayReminders).length === 0 && (
            <Card className="shadow-md">
              <CardContent className="p-12 text-center">
                <div className="text-6xl mb-4">✨</div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                  All caught up!
                </h3>
                <p className="text-slate-600">
                  No {activeTab === "upcoming" ? "upcoming" :
                    activeTab === "overdue" ? "overdue" :
                      activeTab === "scheduled" ? "scheduled" :
                        "completed"} reminders at the moment.
                </p>
              </CardContent>
            </Card>
          )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this reminder? For recurring reminders, this will delete ALL future instances. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteReminder}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}