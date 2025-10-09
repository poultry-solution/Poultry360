"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGetUpcomingReminders,
  useGetOverdueReminders,
  useMarkReminderCompleted,
  useMarkReminderNotDone,
  getReminderTypeDisplayName,
  formatReminderDueDate,
} from "@/fetchers/remainder/remainderQueries";
import { CheckCircle, Clock, RotateCcw } from "lucide-react";

export default function RemindersPage() {
  const upcomingQuery = useGetUpcomingReminders(14);
  const overdueQuery = useGetOverdueReminders();

  const markCompleted = useMarkReminderCompleted();
  const markNotDone = useMarkReminderNotDone();

  const sortedUpcoming = useMemo(() => {
    const items = upcomingQuery.data?.data || [];
    return [...items].sort(
      (a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }, [upcomingQuery.data]);

  const overdue = overdueQuery.data?.data || [];

  const formatDueIn = (dateString: string) => {
    const now = new Date().getTime();
    const due = new Date(dateString).getTime();
    const diffMs = due - now;
    if (diffMs <= 0) return "now";
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 60) return `in ${diffMin} min`;
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return `in ${diffHr} hr`;
    const diffDay = Math.round(diffHr / 24);
    return `in ${diffDay} day${diffDay > 1 ? "s" : ""}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reminders</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : sortedUpcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming reminders</p>
            ) : (
              <div className="space-y-3">
                {sortedUpcoming.map((reminder: any) => (
                  <div key={reminder.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-600" />
                        <div>
                          <div className="font-medium">{reminder.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatReminderDueDate(reminder.dueDate)} ({formatDueIn(reminder.dueDate)}) • {getReminderTypeDisplayName(reminder.type)}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">Pending</Badge>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => markCompleted.mutate(reminder.id)}
                        disabled={markCompleted.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Mark Done
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markNotDone.mutate({ id: reminder.id, rescheduleMinutes: 60 })}
                        disabled={markNotDone.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" /> Reschedule 1h
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            {overdueQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : overdue.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overdue reminders</p>
            ) : (
              <div className="space-y-3">
                {overdue.map((reminder: any) => (
                  <div key={reminder.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-red-600" />
                        <div>
                          <div className="font-medium">{reminder.title}</div>
                          <div className="text-xs text-muted-foreground">
                            Due: {new Date(reminder.dueDate).toLocaleString()} • {getReminderTypeDisplayName(reminder.type)}
                          </div>
                        </div>
                      </div>
                      <Badge variant="destructive">Overdue</Badge>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => markCompleted.mutate(reminder.id)}
                        disabled={markCompleted.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" /> Mark Done
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markNotDone.mutate({ id: reminder.id, rescheduleMinutes: 60 })}
                        disabled={markNotDone.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" /> Reschedule 1h
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


