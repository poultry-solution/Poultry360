"use client";

import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, RotateCcw, Bell, Calendar, Plus, Filter, Trash2 } from "lucide-react";
import {
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

export default function RemindersPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "overdue" | "scheduled" | "completed">("upcoming");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Real queries
  const upcomingQuery = useGetUpcomingReminders(7);
  const overdueQuery = useGetOverdueReminders();
  const scheduledQuery = useGetScheduledReminders();
  const completedTodayQuery = useGetCompletedTodayReminders();

  const createReminder = useCreateReminder();
  const markCompleted = useMarkReminderCompleted();
  const markNotDone = useMarkReminderNotDone();
  const deleteReminder = useDeleteReminder();
  const cleanupDuplicates = useCleanupDuplicateReminders();

  // Track which reminder is being processed for loading states
  const [processingReminderId, setProcessingReminderId] = useState<string | null>(null);

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
  }, [upcomingQuery, overdueQuery, scheduledQuery, completedTodayQuery]);

  // Handle form submission
  const handleCreateReminder = async () => {
    if (!form.title || !form.dueDate) return;
    
    try {
      await createReminder.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        type: form.type as any,
        dueDate: new Date(form.dueDate).toISOString(),
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
    if (!confirm('Are you sure you want to delete this reminder? For recurring reminders, this will delete ALL future instances.')) {
      return;
    }
    
    setProcessingReminderId(reminderId);
    try {
      await deleteReminder.mutateAsync(reminderId);
    } catch (error) {
      console.error('Failed to delete reminder:', error);
    } finally {
      setProcessingReminderId(null);
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
  const upcomingReminders = upcomingQuery.data?.data || [];
  const overdueReminders = overdueQuery.data?.data || [];
  const scheduledReminders = scheduledQuery.data?.data || [];
  const completedTodayReminders = completedTodayQuery.data?.data || [];

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
                  <select 
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="GENERAL">General</option>
                    <option value="VACCINATION">Vaccination</option>
                    <option value="FEEDING">Feeding</option>
                    <option value="MEDICATION">Medication</option>
                    <option value="CLEANING">Cleaning</option>
                    <option value="WEIGHING">Weighing</option>
                    <option value="SUPPLIER_PAYMENT">Supplier Payment</option>
                    <option value="CUSTOMER_PAYMENT">Customer Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Due Date & Time</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  />
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
                      <select 
                        className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
                        value={form.recurrencePattern}
                        onChange={(e) => setForm({ ...form, recurrencePattern: e.target.value })}
                      >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
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
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "upcoming"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Upcoming ({totalUpcoming})
          </button>
          <button
            onClick={() => setActiveTab("overdue")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "overdue"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Overdue ({totalOverdue})
          </button>
          <button
            onClick={() => setActiveTab("scheduled")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "scheduled"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Scheduled ({totalScheduled})
          </button>
          <button
            onClick={() => setActiveTab("completed")}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === "completed"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Completed Today ({completedToday})
          </button>
        </div>

        {/* Reminders List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(activeTab === "upcoming" ? upcomingReminders : 
            activeTab === "overdue" ? overdueReminders : 
            activeTab === "scheduled" ? scheduledReminders :
            completedTodayReminders).map((reminder) => (
            <Card key={reminder.id} className="shadow-md hover:shadow-xl transition-all border-l-4 border-l-blue-500">
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
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge 
                      variant={
                        activeTab === "completed" ? "default" :
                        reminder.status === "OVERDUE" ? "destructive" : "secondary"
                      }
                      className="text-xs"
                    >
                      {activeTab === "completed" ? "Completed" : formatDueIn(reminder.dueDate.toString())}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(reminder.dueDate).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="flex gap-2">
                    {activeTab !== "completed" && (
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
          ))}
        </div>

        {/* Empty State */}
        {(activeTab === "upcoming" ? upcomingReminders : 
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
    </div>
  );
}