"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bell,
  Check,
  ChevronDown,
  Loader2,
  MoreVertical,
  Phone,
  Plus,
  Repeat,
  Users,
  User as UserIcon,
  UserCheck,
} from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/common/components/ui/popover";
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
import { cn } from "@/common/lib/utils";
import { useAuthStore } from "@/common/store/store";
import {
  reminderErrorText,
  useActiveReminders,
  useDeleteReminder,
  useDoneReminders,
  useMarkReminderDone,
  useSnoozeReminder,
  useUndoReminderDone,
  type Reminder,
} from "@/fetchers/reminders/reminderQueries";
import { ReminderFormDialog, type ReminderLinkDefaults } from "./ReminderFormDialog";
import { useReminderText, type ReminderModuleProp } from "./reminderCopy";
import { GROUP_ORDER, formatWhen, groupOf, snoozeChoices, type ReminderGroup } from "./reminderTime";

const DONE_PAGE = 10;

const GROUP_KEY = {
  LATE: "late",
  TODAY: "today",
  TOMORROW: "tomorrow",
  WEEK: "week",
  LATER: "later",
} as const;

type Tr = ReturnType<typeof useReminderText>;

/** Link chip text and page for a reminder's linked record. */
function linkOf(r: Reminder): { label: string; href: string } | null {
  if (r.batch) {
    return {
      label: [r.farm?.name, r.batch.batchNumber].filter(Boolean).join(" · "),
      href: `/farmer/dashboard/batches/${r.batch.id}`,
    };
  }
  if (r.farm) return { label: r.farm.name, href: "/farmer/dashboard/farms" };
  if (r.hatcheryBatch) return { label: r.hatcheryBatch.code, href: `/hatchery/dashboard/batches/${r.hatcheryBatch.id}` };
  if (r.incubation) return { label: r.incubation.code, href: `/hatchery/dashboard/incubations/${r.incubation.id}` };
  if (r.hatcheryParty) return { label: r.hatcheryParty.name, href: `/hatchery/dashboard/parties/${r.hatcheryParty.id}` };
  if (r.dealerCustomer) {
    return {
      label: `${r.dealerCustomer.name}${r.dealerCustomer.archivedAt ? " (archived)" : ""}`,
      href: `/dealer/dashboard/customers/${r.dealerCustomer.id}/account`,
    };
  }
  if (r.dealerManualCompany) {
    return {
      label: `${r.dealerManualCompany.name}${r.dealerManualCompany.archivedAt ? " (archived)" : ""}`,
      href: `/dealer/dashboard/company/manual/${r.dealerManualCompany.id}`,
    };
  }
  return null;
}

const money = (value: number) => `रू ${Math.round(value).toLocaleString("en-IN")}`;

/** Dealer reminders with a customer/company link or an amount come first in each group. */
const isPayment = (r: Reminder) => Boolean(r.dealerCustomerId || r.dealerManualCompanyId || r.amount);

function repeatText(r: Reminder, tr: Tr): string | null {
  switch (r.repeat) {
    case "DAILY":
      return tr("repeatDaily");
    case "WEEKLY":
      return tr("repeatWeekly");
    case "MONTHLY":
      return tr("repeatMonthly");
    case "EVERY_N_DAYS":
      return tr("repeatEveryN", { n: r.repeatEveryDays ?? 1 });
    default:
      return null;
  }
}

function audienceText(r: Reminder, tr: Tr, myStaffId: string | null): { icon: typeof Users; text: string } {
  if (r.audience === "EVERYONE") return { icon: Users, text: tr("everyone") };
  if (r.audience === "ONLY_ME") {
    // "Only me" means only the person who made it.
    const madeByMe = r.createdByStaffId ? r.createdByStaffId === myStaffId : !myStaffId;
    if (madeByMe) return { icon: UserIcon, text: tr("onlyMe") };
    return { icon: UserIcon, text: r.createdByStaff?.name ?? tr("owner") };
  }
  const names = r.recipients.map((x) => (x.staffUser.id === myStaffId ? tr("you") : x.staffUser.name));
  if (r.notifyOwner) names.unshift(myStaffId ? tr("owner") : tr("you"));
  return { icon: UserCheck, text: names.join(", ") };
}

export function ReminderCard({
  module,
  className,
  title,
  emptyText,
  filter,
  addDefaults,
}: {
  module: ReminderModuleProp;
  className?: string;
  /** Card heading; "Reminders" when not given. */
  title?: string;
  emptyText?: string;
  /** Show only some reminders (e.g. one customer's, on their page). */
  filter?: (r: Reminder) => boolean;
  /** Pre-filled values for the Add button (e.g. that customer). */
  addDefaults?: ReminderLinkDefaults & { title?: string; amount?: number | null; linkName?: string };
}) {
  const tr = useReminderText(module);
  const user = useAuthStore((s) => s.user);
  const myStaffId = user?.isStaff ? user.id : null;
  const dayWords = { today: tr("today"), tomorrow: tr("tomorrow"), yesterday: tr("yesterday") };

  const active = useActiveReminders();
  const [showDone, setShowDone] = useState(false);
  const [doneLimit, setDoneLimit] = useState(DONE_PAGE);
  const done = useDoneReminders(doneLimit, { enabled: showDone });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [deleting, setDeleting] = useState<Reminder | null>(null);

  const doneMutation = useMarkReminderDone();
  const undoMutation = useUndoReminderDone();
  const snoozeMutation = useSnoozeReminder();
  const deleteMutation = useDeleteReminder();
  const [busyId, setBusyId] = useState<string | null>(null);

  const groups = useMemo(() => {
    const out: Record<ReminderGroup, Reminder[]> = { LATE: [], TODAY: [], TOMORROW: [], WEEK: [], LATER: [] };
    const now = Date.now();
    for (const r of active.data ?? []) {
      if (filter && !filter(r)) continue;
      out[groupOf(r.reminderDate, now)].push(r);
    }
    // Dealer: money follow-ups first within each group (the list is already in time order).
    if (module === "dealer") {
      for (const g of GROUP_ORDER) out[g] = [...out[g].filter(isPayment), ...out[g].filter((r) => !isPayment(r))];
    }
    return out;
    // dataUpdatedAt makes groups move as time passes (list refetches every minute).
  }, [active.data, active.dataUpdatedAt, filter, module]); // eslint-disable-line react-hooks/exhaustive-deps

  const canChange = (r: Reminder) => !myStaffId || r.createdByStaffId === myStaffId;

  const run = async (id: string, job: () => Promise<void>) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await job();
    } catch (err) {
      toast.error(reminderErrorText(err));
    } finally {
      setBusyId(null);
    }
  };

  const markDone = (r: Reminder) =>
    run(r.id, async () => {
      const res = await doneMutation.mutateAsync(r.id);
      if (res.alreadyDone) {
        toast.info(tr("alreadyDone", { name: res.data.doneByStaff?.name ?? tr("owner") }));
        return;
      }
      const nextLine = res.next ? tr("nextMade", { when: formatWhen(res.next.reminderDate, dayWords) }) : undefined;
      toast.success(tr("doneToast"), {
        description: nextLine,
        duration: 8000,
        action: {
          label: tr("undo"),
          onClick: () =>
            undoMutation.mutate(r.id, {
              onSuccess: (u) => {
                if (u.nextAlreadyMade) toast.info(tr("nextAlready"));
              },
            }),
        },
      });
    });

  const snooze = (r: Reminder, iso: string) =>
    run(r.id, async () => {
      await snoozeMutation.mutateAsync({ id: r.id, until: iso });
      toast.success(tr("snoozed", { when: formatWhen(iso, dayWords) }));
    });

  const confirmDelete = () => {
    const r = deleting;
    if (!r) return;
    run(r.id, async () => {
      await deleteMutation.mutateAsync(r.id);
      toast.success(tr("deleted"));
      setDeleting(null);
    });
  };

  const total = GROUP_ORDER.reduce((sum, g) => sum + groups[g].length, 0);

  return (
    <>
      <Card className={cn("gap-0 rounded-lg border-gray-200 py-0", className)}>
        <CardContent className="px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Bell className="h-4 w-4 text-gray-500" />
              {title ?? tr("title")}
            </h2>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 border-green-200 hover:bg-green-50 hover:text-green-700"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              {tr("add")}
            </Button>
          </div>

          {active.isLoading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tr("loading")}
            </div>
          ) : active.isError ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {tr("loadError")}
              <Button size="sm" variant="ghost" onClick={() => active.refetch()}>
                {tr("tryAgain")}
              </Button>
            </div>
          ) : total === 0 ? (
            <p className="rounded-md border bg-muted/30 px-3 py-3 text-sm text-muted-foreground">{emptyText ?? tr("empty")}</p>
          ) : (
            <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
              {GROUP_ORDER.map((g) =>
                groups[g].length === 0 ? null : (
                  <section key={g}>
                    <h3
                      className={cn(
                        "mb-1 text-xs font-semibold uppercase tracking-wide",
                        g === "LATE" ? "text-red-600" : "text-gray-500"
                      )}
                    >
                      {tr(GROUP_KEY[g])} · {groups[g].length}
                    </h3>
                    <ul className="divide-y rounded-md border">
                      {groups[g].map((r) => (
                        <ReminderRow
                          key={r.id}
                          r={r}
                          tr={tr}
                          late={g === "LATE"}
                          busy={busyId === r.id}
                          myStaffId={myStaffId}
                          dayWords={dayWords}
                          canChange={canChange(r)}
                          onDone={() => markDone(r)}
                          onSnooze={(iso) => snooze(r, iso)}
                          onEdit={() => {
                            setEditing(r);
                            setFormOpen(true);
                          }}
                          onDelete={() => setDeleting(r)}
                        />
                      ))}
                    </ul>
                  </section>
                )
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", showDone && "rotate-180")} />
            {showDone ? tr("hideDone") : tr("showDone")}
          </button>

          {showDone ? (
            <div className="mt-2">
              {done.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (done.data?.data.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">{tr("noDone")}</p>
              ) : (
                <ul className="divide-y rounded-md border">
                  {done.data!.data.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-gray-500 line-through">{r.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {tr("doneBy", {
                            name: r.doneByStaff ? (r.doneByStaff.id === myStaffId ? tr("you") : r.doneByStaff.name) : myStaffId ? tr("owner") : tr("you"),
                          })}
                          {r.doneAt ? ` · ${formatWhen(r.doneAt, dayWords)}` : ""}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busyId === r.id}
                        onClick={() => run(r.id, async () => void (await undoMutation.mutateAsync(r.id)))}
                      >
                        {tr("undo")}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {(done.data?.total ?? 0) > doneLimit ? (
                <Button size="sm" variant="ghost" className="mt-1" onClick={() => setDoneLimit((n) => n + DONE_PAGE)}>
                  {tr("loadMore")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ReminderFormDialog
        module={module}
        open={formOpen}
        onOpenChange={setFormOpen}
        reminder={editing}
        defaults={editing ? undefined : addDefaults}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent className="bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{tr("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{tr("deleteBody")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busyId)}>{tr("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={Boolean(busyId)}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {busyId ? <Loader2 className="h-4 w-4 animate-spin" /> : tr("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ReminderRow({
  r,
  tr,
  late,
  busy,
  myStaffId,
  dayWords,
  canChange,
  onDone,
  onSnooze,
  onEdit,
  onDelete,
}: {
  r: Reminder;
  tr: Tr;
  late: boolean;
  busy: boolean;
  myStaffId: string | null;
  dayWords: { today: string; tomorrow: string; yesterday: string };
  canChange: boolean;
  onDone: () => void;
  onSnooze: (iso: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pick = (action: () => void) => {
    setMenuOpen(false);
    action();
  };
  const link = linkOf(r);
  // Dealer: call the customer or company straight from the reminder.
  const party = r.dealerCustomer ?? r.dealerManualCompany;
  const callTo = party?.phone ? { phone: party.phone, name: party.name } : null;
  const who = audienceText(r, tr, myStaffId);
  const WhoIcon = who.icon;
  const repeat = repeatText(r, tr);
  const madeByOther =
    r.audience === "ONLY_ME"
      ? null
      : r.createdByStaff && r.createdByStaff.id !== myStaffId
      ? r.createdByStaff.name
      : !r.createdByStaffId && myStaffId
        ? tr("owner")
        : null;

  return (
    <li className="flex items-start gap-2 px-3 py-2.5">
      <button
        type="button"
        onClick={onDone}
        disabled={busy}
        aria-label={tr("markDone")}
        title={tr("markDone")}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          late ? "border-red-400 hover:bg-red-50" : "border-gray-300 hover:border-green-600 hover:bg-green-50"
        )}
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-transparent hover:text-green-700" />}
      </button>

      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium">{r.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className={cn(late && "font-medium text-red-600")}>{formatWhen(r.reminderDate, dayWords)}</span>
          {link ? (
            <Link href={link.href} className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-700 hover:bg-gray-200">
              {link.label}
            </Link>
          ) : null}
          <span className="inline-flex items-center gap-1">
            <WhoIcon className="h-3 w-3" />
            <span className="max-w-[160px] truncate">{who.text}</span>
          </span>
          {repeat ? (
            <span className="inline-flex items-center gap-1">
              <Repeat className="h-3 w-3" />
              {repeat}
            </span>
          ) : null}
          {madeByOther ? <span>{tr("by", { name: madeByOther })}</span> : null}
        </div>
        <MoneyLine r={r} tr={tr} />
      </div>
      {callTo ? (
        <a
          href={`tel:${callTo.phone}`}
          className="mt-0.5 inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2 text-xs text-gray-700 hover:bg-gray-50"
          aria-label={`${tr("call")} ${callTo.name}`}
        >
          <Phone className="h-3 w-3" />
          {tr("call")}
        </a>
      ) : null}

      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="More" disabled={busy}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 bg-white p-1">
          <p className="px-2 py-1 text-xs text-muted-foreground">{tr("snooze")}</p>
          {snoozeChoices().map((c) => (
            <MenuButton key={c.key} onClick={() => pick(() => onSnooze(c.iso))}>
              {tr(c.key)}
            </MenuButton>
          ))}
          {canChange ? (
            <>
              <div className="my-1 h-px bg-gray-100" />
              <MenuButton onClick={() => pick(onEdit)}>{tr("edit")}</MenuButton>
              <MenuButton className="text-destructive" onClick={() => pick(onDelete)}>
                {tr("delete")}
              </MenuButton>
            </>
          ) : null}
        </PopoverContent>
      </Popover>
    </li>
  );
}

function MenuButton({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100", className)}
    >
      {children}
    </button>
  );
}

/** Dealer: amount to collect/pay, what they owe now, and what was paid since the reminder. */
function MoneyLine({ r, tr }: { r: Reminder; tr: Tr }) {
  const amount = r.amount != null ? Number(r.amount) : null;
  const m = r.money;
  if (amount == null && !m) return null;
  const isCompany = Boolean(r.dealerManualCompanyId);
  const owes = m?.owesNow;
  const parts: React.ReactNode[] = [];
  if (amount != null) parts.push(<span key="a" className="font-medium text-gray-900">{money(amount)}</span>);
  if (owes != null) {
    parts.push(
      <span key="o">
        {isCompany ? tr("weOweNow") : tr("owesNow")} {money(Math.max(0, owes))}
      </span>
    );
  }
  if (m && m.paidSince > 0) {
    parts.push(
      <span key="p" className="text-green-700">
        {tr("paidSince")} {money(m.paidSince)}
      </span>
    );
  }
  return (
    <div className="mt-1 space-y-0.5 text-xs text-gray-600">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        {parts.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-2">
            {i > 0 ? <span className="text-gray-300">·</span> : null}
            {p}
          </span>
        ))}
      </div>
      {owes != null && owes <= 0 ? <p className="font-medium text-green-700">{tr("fullyPaid")}</p> : null}
    </div>
  );
}
