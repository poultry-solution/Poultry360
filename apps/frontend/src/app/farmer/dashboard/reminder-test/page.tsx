"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  Bell,
  CheckCircle,
  XCircle,
  Loader2,
  Play,
  RefreshCw,
  Clock,
  Send,
  Trash2,
  AlertTriangle,
  Zap,
} from "lucide-react";
import axiosInstance from "@/common/lib/axios";
import {
  useGetReminders,
  useCreateReminder,
  useDeleteReminder,
  getReminderTypeDisplayName,
  getReminderStatusDisplayName,
} from "@/fetchers/remainder/remainderQueries";
import { DateInput } from "@/common/components/ui/date-input";
import { DateDisplay } from "@/common/components/ui/date-display";
import { NotificationBell } from "@/common/components/notifications/NotificationBell";

interface CronStatus {
  isRunning: boolean;
  lastRun: string | null;
  nextRun: string | null;
  runCount: number;
}

interface DueReminderStats {
  dueCount: number;
  overdueCount: number;
  totalCount: number;
}

export default function ReminderTestPage() {
  const [apiStatus, setApiStatus] = useState<"checking" | "ok" | "error">(
    "checking"
  );
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [dueStats, setDueStats] = useState<DueReminderStats | null>(null);
  const [dueReminders, setDueReminders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Quick-create form for testing (reminder due in 1 minute)
  const [quickTitle, setQuickTitle] = useState("Test reminder - due now");
  const [quickDueDate, setQuickDueDate] = useState("");

  const { data: remindersResponse, refetch: refetchReminders } = useGetReminders(
    { limit: 50 },
    { enabled: true }
  );
  const createReminder = useCreateReminder();
  const deleteReminder = useDeleteReminder();

  const allReminders = remindersResponse?.data || [];

  // Check API connectivity and load cron status on mount
  useEffect(() => {
    checkApiStatus();
    loadCronStatus();
    loadDueReminders();
  }, []);

  const checkApiStatus = async () => {
    setApiStatus("checking");
    try {
      await axiosInstance.get("/reminders?limit=1");
      setApiStatus("ok");
    } catch (err: any) {
      setApiStatus("error");
    }
  };

  const loadCronStatus = async () => {
    try {
      const res = await axiosInstance.get("/reminder-notifications/cron-status");
      setCronStatus(res.data?.data || null);
    } catch {
      setCronStatus(null);
    }
  };

  const loadDueReminders = async () => {
    try {
      const res = await axiosInstance.get("/reminder-notifications/due");
      setDueReminders(res.data?.data || []);
      setDueStats({
        dueCount: res.data?.data?.length || 0,
        overdueCount: 0,
        totalCount: res.data?.count || 0,
      });
    } catch {
      setDueReminders([]);
      setDueStats(null);
    }
  };

  const loadDueStats = async () => {
    try {
      const res = await axiosInstance.get("/reminder-notifications/stats");
      setDueStats(res.data?.data || null);
    } catch {
      setDueStats(null);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const sendTestNotification = async () => {
    try {
      setIsLoading(true);
      clearMessages();
      await axiosInstance.post("/reminder-notifications/test", {
        title: "Test Reminder",
        body: "This is a test reminder notification from Poultry360",
        type: "GENERAL_REMINDER",
      });
      setSuccess("Test notification sent! Check for push notification.");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send test notification");
    } finally {
      setIsLoading(false);
    }
  };

  const createDueNowReminder = async () => {
    try {
      setIsLoading(true);
      clearMessages();
      // Empty = 1 min ago. Otherwise parse date as start of day (ensure it's due)
      let dueDate: Date;
      if (!quickDueDate) {
        dueDate = new Date(Date.now() - 60000);
      } else {
        const parsed = new Date(
          quickDueDate.includes("T") ? quickDueDate : quickDueDate + "T00:00:00"
        );
        dueDate = parsed <= new Date() ? parsed : new Date(Date.now() - 60000);
      }
      const isoDate = dueDate.toISOString();

      await createReminder.mutateAsync({
        title: quickTitle,
        description: "Created from reminder test page - for testing notifications",
        type: "GENERAL",
        dueDate: isoDate,
        isRecurring: false,
        recurrencePattern: "NONE",
      } as any);

      setSuccess(
        `Reminder created with due date ${dueDate.toLocaleString()}. Use "Trigger All Due" or wait for cron.`
      );
      setQuickTitle("Test reminder - due now");
      setQuickDueDate("");
      refetchReminders();
      loadDueReminders();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create reminder");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerAllDue = async () => {
    try {
      setIsLoading(true);
      clearMessages();
      const res = await axiosInstance.post("/reminder-notifications/trigger-all");
      const r = res.data?.results || {};
      setSuccess(
        `Triggered: ${r.processed || 0} processed, ${r.successful || 0} successful, ${r.failed || 0} failed.`
      );
      if (r.errors?.length) setError(r.errors.join("; "));
      refetchReminders();
      loadDueReminders();
      loadCronStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to trigger reminders");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerCronNow = async () => {
    try {
      setIsLoading(true);
      clearMessages();
      await axiosInstance.post("/reminder-notifications/trigger-cron");
      setSuccess("Cron job triggered manually. Check backend logs for output.");
      refetchReminders();
      loadDueReminders();
      loadCronStatus();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to trigger cron");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerUserReminders = async () => {
    try {
      setIsLoading(true);
      clearMessages();
      const res = await axiosInstance.post(
        "/reminder-notifications/trigger-user"
      );
      const r = res.data?.results || {};
      setSuccess(
        `User reminders: ${r.processed || 0} processed, ${r.successful || 0} successful.`
      );
      refetchReminders();
      loadDueReminders();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to trigger user reminders");
    } finally {
      setIsLoading(false);
    }
  };

  const triggerSpecific = async (reminderId: string) => {
    try {
      setIsLoading(true);
      clearMessages();
      await axiosInstance.post(
        `/reminder-notifications/trigger/${reminderId}`
      );
      setSuccess("Reminder triggered successfully.");
      refetchReminders();
      loadDueReminders();
    } catch (err: any) {
      setError(
        err.response?.data?.error || "Failed to trigger specific reminder"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reminder?")) return;
    try {
      await deleteReminder.mutateAsync(id);
      setSuccess("Reminder deleted.");
      refetchReminders();
      loadDueReminders();
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bell className="h-8 w-8 text-blue-600" />
          Reminder Test Page
        </h1>
        <NotificationBell />
      </div>

      {/* API Status & Cron Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {apiStatus === "checking" && (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
              {apiStatus === "ok" && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {apiStatus === "error" && (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              API Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge
                variant={
                  apiStatus === "ok"
                    ? "default"
                    : apiStatus === "error"
                    ? "destructive"
                    : "secondary"
                }
              >
                {apiStatus === "ok"
                  ? "Connected"
                  : apiStatus === "error"
                  ? "Error"
                  : "Checking..."}
              </Badge>
              <Button variant="outline" size="sm" onClick={checkApiStatus}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Cron Job Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cronStatus ? (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <Badge
                    variant={cronStatus.isRunning ? "default" : "secondary"}
                  >
                    {cronStatus.isRunning ? "Running" : "Stopped"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Run count:</span>
                  <span>{cronStatus.runCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last run:</span>
                  <span className="text-xs">
                    {cronStatus.lastRun
                      ? new Date(cronStatus.lastRun).toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Next run:</span>
                  <span className="text-xs">
                    {cronStatus.nextRun
                      ? new Date(cronStatus.nextRun).toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Could not load cron status
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={loadCronStatus}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Quick Create Due-Now Reminder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Create Reminder (for testing)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Create a reminder due now or in the past to test notifications. Then
            use &quot;Trigger All Due&quot; or wait for the cron (runs every 5
            min).
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                placeholder="Test reminder title"
              />
            </div>
            <div>
              <DateInput
                label="Due Date (leave empty = 1 min ago)"
                value={quickDueDate}
                onChange={(v) => setQuickDueDate(v ? (v.includes("T") ? v.split("T")[0] : v) : "")}
              />
            </div>
          </div>
          <Button
            className="mt-4"
            onClick={createDueNowReminder}
            disabled={isLoading || !quickTitle}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Create & Set Due
          </Button>
        </CardContent>
      </Card>

      {/* Test Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Test Actions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Manually trigger reminder processing and notifications.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={sendTestNotification}
              disabled={isLoading}
            >
              <Send className="h-4 w-4 mr-2" />
              Send Test Push Notification
            </Button>
            <Button
              variant="outline"
              onClick={triggerAllDue}
              disabled={isLoading}
            >
              <Zap className="h-4 w-4 mr-2" />
              Trigger All Due Reminders
            </Button>
            <Button
              variant="outline"
              onClick={triggerUserReminders}
              disabled={isLoading}
            >
              <Bell className="h-4 w-4 mr-2" />
              Trigger My Reminders
            </Button>
            <Button
              variant="outline"
              onClick={triggerCronNow}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Trigger Cron Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Due Reminders (Backend) */}
      <Card>
        <CardHeader>
          <CardTitle>Due Reminders (Backend /reminder-notifications/due)</CardTitle>
          <p className="text-sm text-muted-foreground">
            PENDING reminders whose due date has passed. These will get
            notifications when cron runs or when you trigger manually.
          </p>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            className="mb-4"
            onClick={() => {
              loadDueReminders();
              loadDueStats();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {dueReminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No due reminders. Create one with a past due date above.
            </p>
          ) : (
            <div className="space-y-2">
              {dueReminders.map((r: any) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div>
                    <span className="font-medium">{r.title}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      <DateDisplay date={r.dueDate} format="short" /> •{" "}
                      {getReminderTypeDisplayName(r.type)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => triggerSpecific(r.id)}
                      disabled={isLoading}
                    >
                      Trigger
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => handleDelete(r.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>All Reminders (Recent 50)</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            className="mb-4"
            onClick={() => refetchReminders()}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          {allReminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reminders yet.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {allReminders.map((r: any) => {
                const isDue =
                  r.status === "PENDING" && new Date(r.dueDate) <= new Date();
                return (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between p-3 border rounded-md ${
                      isDue ? "border-amber-300 bg-amber-50/50" : ""
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{r.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {getReminderStatusDisplayName(r.status)}
                        </Badge>
                        {isDue && (
                          <Badge variant="secondary" className="text-amber-700">
                            Due
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        <DateDisplay date={r.dueDate} format="long" /> •{" "}
                        {getReminderTypeDisplayName(r.type)}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {isDue && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => triggerSpecific(r.id)}
                          disabled={isLoading}
                        >
                          Trigger
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => handleDelete(r.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Testing Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>
            1. <strong>Push setup:</strong> Ensure notifications are enabled in
            Settings and you have granted browser permission.
          </p>
          <p>
            2. <strong>Send Test Notification:</strong> Sends a test push
            immediately. Use to verify push works.
          </p>
          <p>
            3. <strong>Create Due Reminder:</strong> Create a reminder with due
            date in the past (or leave empty for 1 min ago). It appears under
            &quot;Due Reminders&quot;.
          </p>
          <p>
            4. <strong>Trigger All Due:</strong> Manually processes all due
            reminders and sends push notifications (same as cron).
          </p>
          <p>
            5. <strong>Trigger Cron Now:</strong> Runs the 5-minute cron job
            once. Check backend logs for output.
          </p>
          <p>
            6. <strong>Trigger My Reminders:</strong> Processes only your
            reminders.
          </p>
          <p>
            7. <strong>Automatic:</strong> Cron runs every 5 minutes in UTC. Due
            reminders (PENDING + dueDate ≤ now) get notifications.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
