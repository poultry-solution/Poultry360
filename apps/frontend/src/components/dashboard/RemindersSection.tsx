"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Check, Clock, Plus, X } from "lucide-react";
import {
  getReminderTypeDisplayName,
  formatReminderDueDate,
  isReminderDueSoon,
} from "@/fetchers/remainder/remainderQueries";
import { DateDisplay } from "@/common/components/ui/date-display";
import { useI18n } from "@/i18n/useI18n";

interface RemindersSectionProps {
  upcoming: any[];
  overdue: any[];
  statistics: any;
  remindersLoading: boolean;
  remindersError: any;
  markCompletedMutation: any;
  deleteReminderMutation: any;
  onMarkCompleted: (id: string) => void;
  onDeleteReminder: (id: string) => void;
  onAddReminder: () => void;
}

export function RemindersSection({
  upcoming,
  overdue,
  statistics,
  remindersLoading,
  remindersError,
  markCompletedMutation,
  deleteReminderMutation,
  onMarkCompleted,
  onDeleteReminder,
  onAddReminder,
}: RemindersSectionProps) {
  const { t } = useI18n();

  // Sort upcoming by nearest due date
  const sortedUpcoming = [...(upcoming || [])].sort(
    (a: any, b: any) =>
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  // Format relative time until due (e.g., "in 42 min")
  const formatDueIn = (dateString: string) => {
    const now = new Date().getTime();
    const due = new Date(dateString).getTime();
    const diffMs = due - now;
    if (diffMs <= 0) return t("farmer.dashboard.reminders.now");
    const diffMin = Math.round(diffMs / 60000);
    if (diffMin < 60) return t("farmer.dashboard.reminders.inMin", { count: diffMin });
    const diffHr = Math.round(diffMin / 60);
    if (diffHr < 24) return t("farmer.dashboard.reminders.inHr", { count: diffHr });
    const diffDay = Math.round(diffHr / 24);
    return t("farmer.dashboard.reminders.inDay", { count: diffDay });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t("farmer.dashboard.reminders.title")}</CardTitle>
            <CardDescription>
              {t("farmer.dashboard.reminders.description")}
              {statistics.totalReminders > 0 && (
                <span className="ml-2 text-xs">
                  {t("farmer.dashboard.reminders.pendingOverdue", {
                    pending: statistics.pendingReminders,
                    overdue: statistics.overdueReminders,
                  })}
                </span>
              )}
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={onAddReminder}
            className="cursor-pointer bg-primary hover:bg-primary/90 hover:shadow-md transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("farmer.dashboard.reminders.add")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {remindersLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50 animate-pulse" />
            <p>{t("farmer.dashboard.reminders.loading")}</p>
          </div>
        ) : remindersError ? (
          <div className="text-center py-8 text-red-600">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("farmer.dashboard.reminders.failed")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overdue Reminders */}
            {overdue.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-600 mb-2">
                  {t("farmer.dashboard.reminders.overdueTitle", { count: overdue.length })}
                </h4>
                {overdue.slice(0, 3).map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center space-x-4 p-3 border border-red-200 rounded-lg bg-red-50/50 mb-2"
                  >
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {reminder.title}
                      </p>
                      <p className="text-xs text-red-600">
                        {formatReminderDueDate(reminder.dueDate)} •{" "}
                        {getReminderTypeDisplayName(reminder.type)}
                        {reminder.farm && ` • ${reminder.farm.name}`}
                        {reminder.batch &&
                          ` • ${reminder.batch.batchNumber}`}
                      </p>
                      {(reminder.batch || reminder.farm) && (
                        <div className="flex gap-1 mt-1">
                          {reminder.batch && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              📦 {reminder.batch.batchNumber}
                            </span>
                          )}
                          {reminder.farm && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              🏡 {reminder.farm.name}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onMarkCompleted(reminder.id)}
                        disabled={markCompletedMutation.isPending}
                        className="h-8 px-2 text-xs hover:bg-primary/10 hover:text-primary cursor-pointer"
                      >
                        <Check className="h-4 w-4 text-primary hover:text-primary/80" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDeleteReminder(reminder.id)}
                        disabled={deleteReminderMutation.isPending}
                        className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                      >
                        <X className="h-4 w-4 text-red-600 hover:text-red-700" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming Reminders */}
            {sortedUpcoming.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-primary mb-2">
                  {t("farmer.dashboard.reminders.upcomingTitle", { count: sortedUpcoming.length })}
                </h4>
                {sortedUpcoming.slice(0, 5).map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center space-x-4 p-3 border rounded-lg hover:bg-muted/50 mb-2"
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${isReminderDueSoon(reminder.dueDate)
                        ? "bg-yellow-100"
                        : "bg-primary/10"
                        }`}
                    >
                      <Clock
                        className={`h-4 w-4 ${isReminderDueSoon(reminder.dueDate)
                          ? "text-yellow-600"
                          : "text-primary"
                          }`}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {reminder.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <DateDisplay date={reminder.dueDate} format="short" /> (
                        {formatDueIn(reminder.dueDate.toString())}) •{" "}
                        {getReminderTypeDisplayName(reminder.type)}
                        {reminder.farm && ` • ${reminder.farm.name}`}
                        {reminder.batch &&
                          ` • ${reminder.batch.batchNumber}`}
                      </p>
                      {(reminder.batch || reminder.farm) && (
                        <div className="flex gap-1 mt-1">
                          {reminder.batch && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              📦 {reminder.batch.batchNumber}
                            </span>
                          )}
                          {reminder.farm && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              🏡 {reminder.farm.name}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onMarkCompleted(reminder.id)}
                        disabled={markCompletedMutation.isPending}
                        className="h-8 px-2 text-xs hover:bg-primary/10 hover:text-primary cursor-pointer"
                      >
                        <Check className="h-4 w-4 text-primary hover:text-primary/80" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDeleteReminder(reminder.id)}
                        disabled={deleteReminderMutation.isPending}
                        className="h-8 px-2 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                      >
                        <X className="h-4 w-4 text-red-600 hover:text-red-700" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {upcoming.length === 0 && overdue.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t("farmer.dashboard.reminders.empty")}</p>
                <Button
                  size="sm"
                  onClick={onAddReminder}
                  className="cursor-pointer mt-4 bg-primary hover:bg-primary/90 hover:shadow-md transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("farmer.dashboard.reminders.addFirst")}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
