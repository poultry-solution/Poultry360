"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateInput } from "@/components/ui/date-input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import axios from "axios";
import { useAuthStore } from "@/store/store";
import { DateDisplay } from "@/components/ui/date-display";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Reminder {
  id: string;
  title: string;
  description?: string;
  type: string;
  dueDate: string;
  isRecurring: boolean;
  recurrencePattern: string;
  status: string;
  farmId?: string;
  batchId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ReminderStats {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
  byType: Record<string, number>;
}

export default function RemindersTestPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [stats, setStats] = useState<ReminderStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [cronStatus, setCronStatus] = useState<any>(null);

  const { accessToken } = useAuthStore.getState();

  const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    withCredentials: true,
  });

  // Form states
  const [newReminder, setNewReminder] = useState({
    title: "",
    description: "",
    type: "GENERAL",
    dueDate: "",
    isRecurring: false,
    recurrencePattern: "NONE",
    farmId: "",
    batchId: "",
  });

  const [customTimeReminder, setCustomTimeReminder] = useState({
    title: "",
    description: "",
    specificTime: "22:00",
    isRecurring: true,
  });

  const [customIntervalReminder, setCustomIntervalReminder] = useState({
    title: "",
    description: "",
    interval: { unit: "hours", value: 3 },
  });

  const [dayOfWeekReminder, setDayOfWeekReminder] = useState({
    title: "",
    description: "",
    dayOfWeek: 1,
    timeOfDay: "09:00",
  });

  // Load reminders, stats, and cron status
  const loadReminders = async () => {
    setLoading(true);
    setError(null);

    try {
      const [remindersRes, statsRes, cronStatusRes] = await Promise.all([
        axiosInstance.get("/reminders"),
        axiosInstance.get("/reminders/stats"),
        axiosInstance.get("/reminder-notifications/cron-status"),
      ]);

      if (!remindersRes.data || !statsRes.data) {
        throw new Error("Failed to load reminders");
      }

      const remindersData = remindersRes.data;
      const statsData = statsRes.data;
      const cronStatusData = cronStatusRes.data;

      setReminders(remindersData.data || []);
      setStats(statsData.data || null);
      setCronStatus(cronStatusData.data || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create regular reminder
  const createReminder = async () => {
    if (!newReminder.title || !newReminder.dueDate) {
      setError("Title and due date are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Omit empty farmId/batchId to avoid backend FK errors
      const payload: any = { ...newReminder };
      if (!payload.farmId) delete payload.farmId;
      if (!payload.batchId) delete payload.batchId;

      const response = await axiosInstance.post("/reminders", payload);

      if (!response.data) {
        throw new Error("Failed to create reminder");
      }

      await loadReminders();
      setNewReminder({
        title: "",
        description: "",
        type: "GENERAL",
        dueDate: "",
        isRecurring: false,
        recurrencePattern: "NONE",
        farmId: "",
        batchId: "",
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create custom time reminder
  const createCustomTimeReminder = async () => {
    if (!customTimeReminder.title) {
      setError("Title is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post(
        "/reminders/custom-time",
        customTimeReminder
      );

      if (!response.data) {
        throw new Error("Failed to create custom time reminder");
      }

      await loadReminders();
      setCustomTimeReminder({
        title: "",
        description: "",
        specificTime: "22:00",
        isRecurring: true,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create custom interval reminder
  const createCustomIntervalReminder = async () => {
    if (!customIntervalReminder.title) {
      setError("Title is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post(
        "/reminders/custom-interval",
        customIntervalReminder
      );

      if (!response.data) {
        throw new Error("Failed to create custom interval reminder");
      }

      await loadReminders();
      setCustomIntervalReminder({
        title: "",
        description: "",
        interval: { unit: "hours", value: 3 },
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create day-of-week reminder
  const createDayOfWeekReminder = async () => {
    if (!dayOfWeekReminder.title) {
      setError("Title is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post(
        "/reminders/day-of-week",
        dayOfWeekReminder
      );

      if (!response.data) {
        throw new Error("Failed to create day-of-week reminder");
      }

      await loadReminders();
      setDayOfWeekReminder({
        title: "",
        description: "",
        dayOfWeek: 1,
        timeOfDay: "09:00",
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get due reminders (for testing)
  const getDueReminders = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get("/reminder-notifications/due");

      if (!response.data) {
        throw new Error("Failed to get due reminders");
      }

      const result = response.data;
      alert(`Found ${result.count} due reminders`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Trigger all due reminders
  const triggerAllDueReminders = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post(
        "/reminder-notifications/trigger-all",
        {}
      );

      if (!response.data) {
        throw new Error("Failed to trigger due reminders");
      }

      const result = response.data;
      alert(
        `Triggered ${result.results.processed} reminders: ${result.results.successful} successful, ${result.results.failed} failed`
      );
      await loadReminders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Trigger cron job manually
  const triggerCronNow = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post(
        "/reminder-notifications/trigger-cron",
        {}
      );

      if (!response.data) {
        throw new Error("Failed to trigger cron job");
      }

      alert("Cron job triggered manually! Check the backend logs for details.");
      await loadReminders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create a quick test reminder (due in 1 minute)
  const createQuickTestReminder = async () => {
    const now = new Date();
    const dueDate = new Date(now.getTime() + 60000); // 1 minute from now

    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post("/reminders", {
        title: "Quick Test Reminder",
        description: "This reminder is due in 1 minute for testing",
        type: "GENERAL",
        dueDate: dueDate.toISOString(),
        isRecurring: false,
        recurrencePattern: "NONE",
      });

      if (!response.data) {
        throw new Error("Failed to create test reminder");
      }

      await loadReminders();
      alert("Quick test reminder created! It will be due in 1 minute.");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Mark reminder as completed
  const markAsCompleted = async (reminderId: string) => {
    try {
      await axiosInstance.post(`/reminders/${reminderId}/mark-completed`);
      await loadReminders();
    } catch (error) {
      console.error("Error marking reminder as completed:", error);
    }
  };

  // Mark reminder as not done (reschedule)
  const markAsNotDone = async (reminderId: string) => {
    try {
      await axiosInstance.post(`/reminders/${reminderId}/mark-not-done`);
      await loadReminders();
    } catch (error) {
      console.error("Error marking reminder as not done:", error);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadReminders();

    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "secondary";
      case "COMPLETED":
        return "default";
      default:
        return "outline";
    }
  };


  const getDayName = (dayNumber: number) => {
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    return days[dayNumber];
  };

  const getNextCronTime = () => {
    const now = new Date();
    const nextMinute = new Date(now);
    nextMinute.setMinutes(
      now.getMinutes() + (5 - (now.getMinutes() % 5)),
      0,
      0
    );
    return nextMinute;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reminder System Test</h1>
        <div className="flex gap-2">
          <Button onClick={loadReminders} disabled={loading}>
            <Bell className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={createQuickTestReminder} disabled={loading}>
            Quick Test (1 min)
          </Button>
          <Button onClick={getDueReminders} disabled={loading}>
            Check Due Reminders
          </Button>
          <Button onClick={triggerAllDueReminders} disabled={loading}>
            Trigger All Due
          </Button>
          <Button onClick={triggerCronNow} disabled={loading}>
            Trigger Cron Now
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Current Time</Label>
              <div className="mt-1 text-lg font-mono">
                {currentTime.toLocaleString()}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Next Cron Check</Label>
              <div className="mt-1 text-lg font-mono">
                {cronStatus?.status?.nextRun
                  ? new Date(cronStatus.status.nextRun).toLocaleString()
                  : getNextCronTime().toLocaleString()}
              </div>
            </div>
          </div>

          {cronStatus && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-medium">Cron Status</Label>
                <div className="mt-1">
                  <Badge
                    variant={
                      cronStatus.status?.isRunning ? "default" : "destructive"
                    }
                  >
                    {cronStatus.status?.isRunning ? "Running" : "Stopped"}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Run Count</Label>
                <div className="mt-1 text-lg font-bold">
                  {cronStatus.status?.runCount || 0}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Time Until Next</Label>
                <div className="mt-1 text-lg font-mono">
                  {cronStatus.timeUntilNextRunFormatted || "N/A"}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Card */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Reminder Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.pending}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.completed}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.overdue}
                </div>
                <div className="text-sm text-gray-600">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Regular Reminder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Regular Reminder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={newReminder.title}
                onChange={(e) =>
                  setNewReminder({ ...newReminder, title: e.target.value })
                }
                placeholder="Reminder title"
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                value={newReminder.type}
                onValueChange={(value) =>
                  setNewReminder({ ...newReminder, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GENERAL">General</SelectItem>
                  <SelectItem value="VACCINATION">Vaccination</SelectItem>
                  <SelectItem value="FEEDING">Feeding</SelectItem>
                  <SelectItem value="MEDICATION">Medication</SelectItem>
                  <SelectItem value="CLEANING">Cleaning</SelectItem>
                  <SelectItem value="WEIGHING">Weighing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={newReminder.description}
              onChange={(e: any) =>
                setNewReminder({ ...newReminder, description: e.target.value })
              }
              placeholder="Reminder description"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <DateInput
                label="Due Date *"
                value={newReminder.dueDate}
                onChange={(value) => setNewReminder({ ...newReminder, dueDate: value })}
              />
            </div>
            <div>
              <Label htmlFor="recurrence">Recurrence</Label>
              <Select
                value={newReminder.recurrencePattern}
                onValueChange={(value) =>
                  setNewReminder({
                    ...newReminder,
                    recurrencePattern: value,
                    isRecurring: value !== "NONE",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">None</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={createReminder}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Creating..." : "Create Reminder"}
          </Button>
        </CardContent>
      </Card>

      {/* Create Custom Time Reminder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Create Custom Time Reminder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="custom-title">Title *</Label>
              <Input
                id="custom-title"
                value={customTimeReminder.title}
                onChange={(e: any) =>
                  setCustomTimeReminder({
                    ...customTimeReminder,
                    title: e.target.value,
                  })
                }
                placeholder="e.g., Talk with dealer"
              />
            </div>
            <div>
              <Label htmlFor="specific-time">Time</Label>
              <Input
                id="specific-time"
                type="time"
                value={customTimeReminder.specificTime}
                onChange={(e: any) =>
                  setCustomTimeReminder({
                    ...customTimeReminder,
                    specificTime: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div>
            <Label htmlFor="custom-description">Description</Label>
            <Input
              id="custom-description"
              value={customTimeReminder.description}
              onChange={(e) =>
                setCustomTimeReminder({
                  ...customTimeReminder,
                  description: e.target.value,
                })
              }
              placeholder="e.g., Call dealer about feed prices"
            />
          </div>

          <Button
            onClick={createCustomTimeReminder}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Creating..." : "Create Custom Time Reminder"}
          </Button>
        </CardContent>
      </Card>

      {/* Create Custom Interval Reminder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create Custom Interval Reminder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="interval-title">Title *</Label>
              <Input
                id="interval-title"
                value={customIntervalReminder.title}
                onChange={(e) =>
                  setCustomIntervalReminder({
                    ...customIntervalReminder,
                    title: e.target.value,
                  })
                }
                placeholder="e.g., Check temperature"
              />
            </div>
            <div>
              <Label htmlFor="interval-unit">Interval Unit</Label>
              <Select
                value={customIntervalReminder.interval.unit}
                onValueChange={(value) =>
                  setCustomIntervalReminder({
                    ...customIntervalReminder,
                    interval: {
                      ...customIntervalReminder.interval,
                      unit: value,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="weeks">Weeks</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="interval-description">Description</Label>
              <Input
                id="interval-description"
                value={customIntervalReminder.description}
                onChange={(e) =>
                  setCustomIntervalReminder({
                    ...customIntervalReminder,
                    description: e.target.value,
                  })
                }
                placeholder="e.g., Monitor chicken house temperature"
              />
            </div>
            <div>
              <Label htmlFor="interval-value">Interval Value</Label>
              <Input
                id="interval-value"
                type="number"
                min="1"
                value={customIntervalReminder.interval.value}
                onChange={(e) =>
                  setCustomIntervalReminder({
                    ...customIntervalReminder,
                    interval: {
                      ...customIntervalReminder.interval,
                      value: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>

          <Button
            onClick={createCustomIntervalReminder}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Creating..." : "Create Custom Interval Reminder"}
          </Button>
        </CardContent>
      </Card>

      {/* Create Day-of-Week Reminder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Create Day-of-Week Reminder
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dow-title">Title *</Label>
              <Input
                id="dow-title"
                value={dayOfWeekReminder.title}
                onChange={(e) =>
                  setDayOfWeekReminder({
                    ...dayOfWeekReminder,
                    title: e.target.value,
                  })
                }
                placeholder="e.g., Order supplies"
              />
            </div>
            <div>
              <Label htmlFor="day-of-week">Day of Week</Label>
              <Select
                value={dayOfWeekReminder.dayOfWeek.toString()}
                onValueChange={(value) =>
                  setDayOfWeekReminder({
                    ...dayOfWeekReminder,
                    dayOfWeek: parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sunday</SelectItem>
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dow-description">Description</Label>
              <Input
                id="dow-description"
                value={dayOfWeekReminder.description}
                onChange={(e) =>
                  setDayOfWeekReminder({
                    ...dayOfWeekReminder,
                    description: e.target.value,
                  })
                }
                placeholder="e.g., Weekly supply order"
              />
            </div>
            <div>
              <Label htmlFor="time-of-day">Time of Day</Label>
              <Input
                id="time-of-day"
                type="time"
                value={dayOfWeekReminder.timeOfDay}
                onChange={(e) =>
                  setDayOfWeekReminder({
                    ...dayOfWeekReminder,
                    timeOfDay: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <Button
            onClick={createDayOfWeekReminder}
            disabled={loading}
            className="w-full"
          >
            {loading
              ? "Creating..."
              : `Create ${getDayName(dayOfWeekReminder.dayOfWeek)} Reminder`}
          </Button>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How the Reminder System Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>
            1. <strong>Create Reminders:</strong> Use the forms above to create
            different types of reminders
          </p>
          <p>
            2. <strong>Cron Job:</strong> Every 5 minutes, the system
            automatically checks for due reminders (see System Status above)
          </p>
          <p>
            3. <strong>Notifications:</strong> When a reminder is due, the
            system sends push notifications automatically
          </p>
          <p>
            4. <strong>Recurring:</strong> Recurring reminders automatically
            schedule the next occurrence
          </p>
          <p>
            5. <strong>Manual Trigger:</strong> Use "Trigger All Due" to
            manually process due reminders (for testing)
          </p>
          <p>
            6. <strong>Trigger Cron Now:</strong> Use "Trigger Cron Now" to
            manually trigger the cron job immediately (for testing)
          </p>
          <p>
            7. <strong>Check Due:</strong> Use "Check Due Reminders" to see
            which reminders are currently due
          </p>
          <p>
            8. <strong>Debug Info:</strong> The System Status shows cron run
            count, next run time, and time until next execution
          </p>
        </CardContent>
      </Card>

      {/* Reminders List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Reminders ({reminders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {reminders.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No reminders found</p>
          ) : (
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <div key={reminder.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(reminder.status)}
                      <div>
                        <h3 className="font-medium">{reminder.title}</h3>
                        {reminder.description && (
                          <p className="text-sm text-gray-600">
                            {reminder.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusColor(reminder.status)}>
                        {reminder.status}
                      </Badge>
                      <Badge variant="outline">{reminder.type}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    <div>Due: <DateDisplay date={reminder.dueDate} format="long" /></div>
                    {reminder.isRecurring && (
                      <div>Recurring: {reminder.recurrencePattern}</div>
                    )}
                  </div>
                  {reminder.status === "OVERDUE" && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => markAsCompleted(reminder.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Mark Done
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsNotDone(reminder.id)}
                        className="border-orange-500 text-orange-600 hover:bg-orange-50"
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        Not Done (Reschedule)
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
