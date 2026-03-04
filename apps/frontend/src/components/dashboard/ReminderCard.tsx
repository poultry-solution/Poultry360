"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { DateInput } from "@/common/components/ui/date-input";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Bell, Check, Loader2, Plus } from "lucide-react";
import { useGetUserFarms } from "@/fetchers/farms/farmQueries";
import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import {
  useGetReminders,
  useCreateReminder,
  useDeleteReminder,
  type Reminder,
} from "@/fetchers/reminders/reminderQueries";
import { useI18n } from "@/i18n/useI18n";

function formatReminderDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

export function ReminderCard() {
  const { t } = useI18n();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [reminderDate, setReminderDate] = useState<string>("");
  const [reminderTime, setReminderTime] = useState("09:00");
  const [farmId, setFarmId] = useState<string>("");
  const [batchId, setBatchId] = useState<string>("");

  const { data: farmsResponse } = useGetUserFarms("all");
  const { data: batchesResponse } = useGetAllBatches();
  const farms = farmsResponse?.data || [];
  const allBatches = batchesResponse?.data || [];
  const activeBatches = allBatches.filter((b: any) => b.status === "ACTIVE");
  const batchesForFarm = farmId
    ? activeBatches.filter((b: any) => b.farmId === farmId)
    : activeBatches;

  const { data: dueData, isLoading: dueLoading } = useGetReminders("due");
  const { data: upcomingData, isLoading: upcomingLoading } = useGetReminders("upcoming");
  const dueReminders = dueData?.data || [];
  const upcomingReminders = upcomingData?.data || [];
  const isLoading = dueLoading || upcomingLoading;

  const createMutation = useCreateReminder();
  const deleteMutation = useDeleteReminder();

  const buildReminderDateTime = (): string | null => {
    const dateStr = reminderDate.includes("T") ? reminderDate.split("T")[0] : reminderDate;
    if (!dateStr) return null;
    const combined = `${dateStr}T${reminderTime}:00`;
    const d = new Date(combined);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const iso = buildReminderDateTime();
    if (!iso) return;
    createMutation.mutate(
      {
        title: title.trim(),
        reminderDate: iso,
        farmId: farmId || null,
        batchId: batchId || null,
      },
      {
        onSuccess: () => {
          setTitle("");
          setReminderDate("");
          setReminderTime("09:00");
          setFarmId("");
          setBatchId("");
          setModalOpen(false);
        },
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t("farmer.dashboard.reminder.title")}
          </CardTitle>
          <Button
            size="sm"
            variant="default"
            onClick={() => setModalOpen(true)}
            className="cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("farmer.dashboard.reminder.add")}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 flex-1 pt-0">
          {/* Due: date/time has hit – show tick to remove */}
          <div>
            <h4 className="text-sm font-medium mb-2">{t("farmer.dashboard.reminder.due")}</h4>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("farmer.dashboard.reminder.loading")}
              </div>
            ) : dueReminders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{t("farmer.dashboard.reminder.noDue")}</p>
            ) : (
              <ul className="space-y-2">
                {dueReminders.map((r: Reminder) => {
                  const { date, time } = formatReminderDateTime(r.reminderDate);
                  return (
                    <li
                      key={r.id}
                      className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {date} {time}
                          {(r.farm || r.batch) && ` • ${[r.farm?.name, r.batch?.batchNumber].filter(Boolean).join(" • ")}`}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(r.id)}
                        disabled={deleteMutation.isPending}
                        className="shrink-0 cursor-pointer border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 hover:border-green-300"
                        title={t("farmer.dashboard.reminder.doneDelete")}
                      >
                        <Check className="h-4 w-4 mr-1.5" />
                        {t("farmer.dashboard.reminder.done")}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Upcoming: within next 24h – no tick button */}
          {!isLoading && upcomingReminders.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">{t("farmer.dashboard.reminder.upcoming")}</h4>
              <ul className="space-y-2">
                {upcomingReminders.map((r: Reminder) => {
                  const { date, time } = formatReminderDateTime(r.reminderDate);
                  return (
                    <li
                      key={r.id}
                      className="flex items-start gap-2 rounded-md border p-2 bg-muted/20 border-primary/20"
                    >
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/15 text-primary">
                        {t("farmer.dashboard.reminder.upcomingTag")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{r.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {date} {time}
                          {(r.farm || r.batch) && ` • ${[r.farm?.name, r.batch?.batchNumber].filter(Boolean).join(" • ")}`}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("farmer.dashboard.reminder.addModalTitle")}
      >
        <form onSubmit={handleSubmit}>
          <ModalContent>
            <div className="space-y-3">
              <div>
                <Label htmlFor="reminder-title">{t("farmer.dashboard.reminder.what")}</Label>
                <Input
                  id="reminder-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("farmer.dashboard.reminder.placeholder")}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="reminder-farm">{t("farmer.dashboard.reminder.farm")}</Label>
                <select
                  id="reminder-farm"
                  value={farmId}
                  onChange={(e) => {
                    setFarmId(e.target.value);
                    setBatchId("");
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer mt-1"
                >
                  <option value="">{t("farmer.dashboard.reminder.none")}</option>
                  {farms.map((farm: any) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="reminder-batch">{t("farmer.dashboard.reminder.batch")}</Label>
                <select
                  id="reminder-batch"
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  disabled={!farmId}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer mt-1 disabled:opacity-50"
                >
                  <option value="">{t("farmer.dashboard.reminder.none")}</option>
                  {batchesForFarm.map((batch: any) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batchNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <DateInput
                  label={t("farmer.dashboard.reminder.date")}
                  value={reminderDate}
                  onChange={setReminderDate}
                />
              </div>
              <div>
                <Label htmlFor="reminder-time">{t("farmer.dashboard.reminder.time")}</Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </ModalContent>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="cursor-pointer"
            >
              {t("farmer.dashboard.close")}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !title.trim() || !buildReminderDateTime()}
              className="cursor-pointer"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("farmer.dashboard.reminder.add")
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
