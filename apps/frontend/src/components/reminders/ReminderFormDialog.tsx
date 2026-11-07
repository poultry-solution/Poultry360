"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { DateInput } from "@/common/components/ui/date-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";
import { cn } from "@/common/lib/utils";
import { useAuthStore } from "@/common/store/store";
import { useGetUserFarms } from "@/fetchers/farms/farmQueries";
import { useGetAllBatches } from "@/fetchers/batches/batchQueries";
import { useHatcheryBatches } from "@/fetchers/hatchery/hatcheryBatchQueries";
import { useIncubationBatches } from "@/fetchers/hatchery/hatcheryIncubationQueries";
import { useHatcheryParties } from "@/fetchers/hatchery/hatcheryPartyQueries";
import { useGetDealerCustomers } from "@/fetchers/dealer/dealerSaleQueries";
import { useGetManualCompanies } from "@/fetchers/dealer/dealerManualCompanyQueries";
import {
  reminderErrorText,
  useCreateReminder,
  useReminderPeople,
  useUpdateReminder,
  type Reminder,
  type ReminderAudience,
  type ReminderInput,
  type ReminderRepeat,
} from "@/fetchers/reminders/reminderQueries";
import { useReminderText, type ReminderModuleProp } from "./reminderCopy";
import { addDaysYmd, nepalParts, quickChoices, toNepalIso } from "./reminderTime";
import { getNepalTodayAd } from "@/common/lib/nepali-date";

const NONE = "none";

export type ReminderLinkDefaults = {
  farmId?: string | null;
  batchId?: string | null;
  hatcheryBatchId?: string | null;
  incubationId?: string | null;
  hatcheryPartyId?: string | null;
  dealerCustomerId?: string | null;
  dealerManualCompanyId?: string | null;
};

type HatcheryLinkType = "none" | "batch" | "incubation" | "party";
type DealerLinkType = "none" | "customer" | "company";

interface Props {
  module: ReminderModuleProp;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set to change an existing reminder. */
  reminder?: Reminder | null;
  /** Pre-filled values for a new reminder (e.g. from a "Remind me" button). */
  defaults?: ReminderLinkDefaults & { title?: string; amount?: number | null; linkName?: string };
}

function initialWhen(reminder?: Reminder | null) {
  if (reminder) return nepalParts(reminder.reminderDate);
  return { ymd: addDaysYmd(getNepalTodayAd(), 1), time: "09:00" };
}

export function ReminderFormDialog({ module, open, onOpenChange, reminder, defaults }: Props) {
  const tr = useReminderText(module);
  const user = useAuthStore((s) => s.user);
  const isStaff = Boolean(user?.isStaff);
  const myStaffId = isStaff ? user?.id ?? null : null;
  const isEdit = Boolean(reminder);
  // The person who made the reminder is always included in its alert.
  const creatorStaffId = reminder ? reminder.createdByStaffId : myStaffId;

  const createMutation = useCreateReminder();
  const updateMutation = useUpdateReminder();
  const saving = createMutation.isPending || updateMutation.isPending;
  const peopleQuery = useReminderPeople({ enabled: open });

  const [title, setTitle] = useState("");
  const [dateYmd, setDateYmd] = useState("");
  const [time, setTime] = useState("09:00");
  const [links, setLinks] = useState<ReminderLinkDefaults>({});
  const [hatcheryType, setHatcheryType] = useState<HatcheryLinkType>("none");
  const [dealerType, setDealerType] = useState<DealerLinkType>("none");
  const [amount, setAmount] = useState("");
  const [audience, setAudience] = useState<ReminderAudience>("ONLY_ME");
  const [notifyOwner, setNotifyOwner] = useState(false);
  const [staffIds, setStaffIds] = useState<string[]>([]);
  const [repeat, setRepeat] = useState<ReminderRepeat>("NONE");
  const [everyDays, setEveryDays] = useState("7");
  const [untilYmd, setUntilYmd] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Reset the form each time it opens.
  useEffect(() => {
    if (!open) return;
    const when = initialWhen(reminder);
    setTitle(reminder?.title ?? defaults?.title ?? "");
    setDateYmd(when.ymd);
    setTime(when.time);
    const l: ReminderLinkDefaults = reminder
      ? {
          farmId: reminder.farmId,
          batchId: reminder.batchId,
          hatcheryBatchId: reminder.hatcheryBatchId,
          incubationId: reminder.incubationId,
          hatcheryPartyId: reminder.hatcheryPartyId,
          dealerCustomerId: reminder.dealerCustomerId ?? null,
          dealerManualCompanyId: reminder.dealerManualCompanyId ?? null,
        }
      : {
          farmId: defaults?.farmId,
          batchId: defaults?.batchId,
          hatcheryBatchId: defaults?.hatcheryBatchId,
          incubationId: defaults?.incubationId,
          hatcheryPartyId: defaults?.hatcheryPartyId,
          dealerCustomerId: defaults?.dealerCustomerId,
          dealerManualCompanyId: defaults?.dealerManualCompanyId,
        };
    setLinks(l);
    setDealerType(l.dealerCustomerId ? "customer" : l.dealerManualCompanyId ? "company" : "none");
    const startAmount = reminder ? reminder.amount : defaults?.amount;
    setAmount(startAmount != null && Number(startAmount) > 0 ? String(Number(startAmount)) : "");
    setHatcheryType(
      l.hatcheryBatchId ? "batch" : l.incubationId ? "incubation" : l.hatcheryPartyId ? "party" : "none"
    );
    setAudience(reminder?.audience ?? "ONLY_ME");
    setNotifyOwner(reminder ? reminder.notifyOwner : !isStaff);
    setStaffIds(reminder ? reminder.recipients.map((r) => r.staffUser.id) : myStaffId ? [myStaffId] : []);
    setRepeat(reminder?.repeat ?? "NONE");
    setEveryDays(String(reminder?.repeatEveryDays ?? 7));
    setUntilYmd(reminder?.repeatUntil ? nepalParts(reminder.repeatUntil).ymd : "");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reminder?.id]);

  // Hide an old error as soon as the form is changed.
  useEffect(() => {
    setError(null);
  }, [title, dateYmd, time, links, hatcheryType, dealerType, amount, audience, notifyOwner, staffIds, repeat, everyDays, untilYmd]);

  const people = peopleQuery.data;
  // Staff tagged earlier but now switched off still show, so they can be removed.
  const pickList = useMemo(() => {
    const list = (people?.staff ?? []).map((s) => ({ id: s.id, name: s.name, inactive: false }));
    for (const r of reminder?.recipients ?? []) {
      if (!list.some((p) => p.id === r.staffUser.id)) {
        list.push({ id: r.staffUser.id, name: r.staffUser.name, inactive: true });
      }
    }
    return list;
  }, [people?.staff, reminder?.recipients]);

  // An owner with no staff only has "Only me".
  const showWho = isStaff || pickList.length > 0;

  const togglePerson = (id: string) => {
    if (id === creatorStaffId) return;
    setStaffIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setError(null);

    if (!title.trim()) return setError(tr("needWhat"));
    const iso = toNepalIso(dateYmd, time);
    if (!iso) return setError(tr("needWhen"));
    const dateChanged = !reminder || new Date(iso).getTime() !== new Date(reminder.reminderDate).getTime();
    if (dateChanged && new Date(iso).getTime() < Date.now() - 60_000) return setError(tr("pastWhen"));

    const finalAudience: ReminderAudience = showWho ? audience : "ONLY_ME";
    const pickedStaff = staffIds.filter((id) => id !== creatorStaffId);
    // Besides the maker, at least one more person: a staff, or the owner when staff made it.
    const hasSomeone = pickedStaff.length > 0 || (Boolean(creatorStaffId) && notifyOwner);
    if (finalAudience === "SELECTED" && !hasSomeone) return setError(tr("needPeople"));

    let amountValue: number | null = null;
    if (module === "dealer" && amount.trim()) {
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) return setError(tr("needAmount"));
      amountValue = Math.round(n * 100) / 100;
    }

    let repeatEveryDays: number | null = null;
    if (repeat === "EVERY_N_DAYS") {
      const n = Number(everyDays);
      if (!Number.isInteger(n) || n < 1 || n > 365) return setError(tr("needDays"));
      repeatEveryDays = n;
    }

    const body: ReminderInput = {
      title: title.trim(),
      reminderDate: iso,
      farmId: module === "farmer" ? links.farmId || null : null,
      batchId: module === "farmer" ? links.batchId || null : null,
      hatcheryBatchId: module === "hatchery" && hatcheryType === "batch" ? links.hatcheryBatchId || null : null,
      incubationId: module === "hatchery" && hatcheryType === "incubation" ? links.incubationId || null : null,
      hatcheryPartyId: module === "hatchery" && hatcheryType === "party" ? links.hatcheryPartyId || null : null,
      ...(module === "dealer"
        ? {
            dealerCustomerId: dealerType === "customer" ? links.dealerCustomerId || null : null,
            dealerManualCompanyId: dealerType === "company" ? links.dealerManualCompanyId || null : null,
            amount: amountValue,
          }
        : {}),
      audience: finalAudience,
      notifyOwner: finalAudience === "SELECTED" ? (creatorStaffId ? notifyOwner : true) : undefined,
      staffIds: finalAudience === "SELECTED" ? pickedStaff : undefined,
      repeat,
      repeatEveryDays,
      repeatUntil: repeat !== "NONE" && untilYmd ? toNepalIso(untilYmd, "23:59") : null,
    };

    try {
      if (reminder) await updateMutation.mutateAsync({ id: reminder.id, body });
      else await createMutation.mutateAsync(body);
      onOpenChange(false);
    } catch (err) {
      setError(reminderErrorText(err));
    }
  };

  const chips = quickChoices();

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? tr("editTitle") : tr("addTitle")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reminder-title">{tr("what")} *</Label>
            <Input
              id="reminder-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={module === "dealer" ? tr("dealerPlaceholder") : tr("placeholder")}
              maxLength={200}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>{tr("when")} *</Label>
            {chips.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {chips.map((c) => {
                  const parts = nepalParts(c.iso);
                  const active = parts.ymd === dateYmd && parts.time === time;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => {
                        setDateYmd(parts.ymd);
                        setTime(parts.time);
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium",
                        active ? "border-primary bg-primary/10 text-primary" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {tr(c.key)}
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <DateInput
                value={dateYmd}
                onChange={(v) => setDateYmd(v ? v.split("T")[0] : "")}
                min={getNepalTodayAd()}
              />
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-[120px]"
                aria-label={tr("time")}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{tr("linkTo")}</Label>
            {module === "farmer" ? (
              <FarmerLinkFields tr={tr} links={links} setLinks={setLinks} />
            ) : module === "dealer" ? (
              <DealerLinkFields
                tr={tr}
                links={links}
                setLinks={setLinks}
                type={dealerType}
                setType={setDealerType}
                fixedName={
                  reminder
                    ? reminder.dealerCustomer?.name ?? reminder.dealerManualCompany?.name
                    : defaults?.linkName
                }
                onPicked={(picked) => {
                  // Fill the amount and title from who was picked, unless already typed.
                  if (!amount && picked.owes > 0) setAmount(String(Math.round(picked.owes * 100) / 100));
                  if (!title.trim()) {
                    setTitle(picked.kind === "customer" ? tr("collectFrom", { name: picked.name }) : tr("payTo", { name: picked.name }));
                  }
                }}
              />
            ) : (
              <HatcheryLinkFields
                tr={tr}
                links={links}
                setLinks={setLinks}
                type={hatcheryType}
                setType={setHatcheryType}
              />
            )}
          </div>

          {module === "dealer" ? (
            <div className="space-y-1.5">
              <Label htmlFor="reminder-amount">{tr("amount")}</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">रू</span>
                <Input
                  id="reminder-amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          ) : null}

          {showWho ? (
            <div className="space-y-1.5">
              <Label>{tr("who")}</Label>
              <div className="grid grid-cols-3 overflow-hidden rounded-md border text-sm" role="radiogroup">
                {(["ONLY_ME", "EVERYONE", "SELECTED"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    role="radio"
                    aria-checked={audience === a}
                    onClick={() => setAudience(a)}
                    className={cn(
                      "px-2 py-2 font-medium",
                      audience === a ? "bg-primary text-primary-foreground" : "bg-white text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {a === "ONLY_ME" ? tr("onlyMe") : a === "EVERYONE" ? tr("everyone") : tr("pick")}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {audience === "ONLY_ME" ? tr("hintOnlyMe") : audience === "EVERYONE" ? tr("hintEveryone") : tr("hintPick")}
              </p>
              {audience === "SELECTED" ? (
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border p-2">
                  <PersonCheck
                    label={`${tr("owner")}${people?.owner?.name ? ` · ${people.owner.name}` : ""}`}
                    suffix={!creatorStaffId ? `(${tr("you")})` : undefined}
                    checked={!creatorStaffId || notifyOwner}
                    disabled={!creatorStaffId}
                    onChange={() => setNotifyOwner((v) => !v)}
                  />
                  {pickList.map((p) => (
                    <PersonCheck
                      key={p.id}
                      label={p.name}
                      suffix={p.id === creatorStaffId ? `(${p.id === myStaffId ? tr("you") : tr("by", { name: p.name })})` : p.inactive ? tr("inactive") : undefined}
                      checked={staffIds.includes(p.id) || p.id === creatorStaffId}
                      disabled={p.id === creatorStaffId}
                      onChange={() => togglePerson(p.id)}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label>{tr("repeat")}</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_auto]">
              <Select value={repeat} onValueChange={(v) => setRepeat(v as ReminderRepeat)}>
                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="NONE">{tr("never")}</SelectItem>
                  <SelectItem value="DAILY">{tr("repeatDaily")}</SelectItem>
                  <SelectItem value="WEEKLY">{tr("repeatWeekly")}</SelectItem>
                  <SelectItem value="MONTHLY">{tr("repeatMonthly")}</SelectItem>
                  <SelectItem value="EVERY_N_DAYS">{tr("everyNDays")}</SelectItem>
                </SelectContent>
              </Select>
              {repeat === "EVERY_N_DAYS" ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={365}
                    value={everyDays}
                    onChange={(e) => setEveryDays(e.target.value)}
                    className="w-20 text-right"
                  />
                  <span className="text-sm text-muted-foreground">{tr("days")}</span>
                </div>
              ) : null}
            </div>
            {repeat !== "NONE" ? (
              <div className="space-y-1 pt-1">
                <Label className="text-xs text-muted-foreground">{tr("until")}</Label>
                <DateInput value={untilYmd} onChange={(v) => setUntilYmd(v ? v.split("T")[0] : "")} min={dateYmd || undefined} />
              </div>
            ) : null}
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {tr("cancel")}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {tr("saving")}
                </>
              ) : (
                tr("save")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PersonCheck({
  label,
  suffix,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  suffix?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label className={cn("flex items-center gap-2 rounded px-1 py-1 text-sm", disabled ? "opacity-70" : "cursor-pointer hover:bg-gray-50")}>
      <input type="checkbox" className="h-4 w-4" checked={checked} disabled={disabled} onChange={onChange} />
      <span className="truncate">{label}</span>
      {suffix ? <span className="text-xs text-muted-foreground">{suffix}</span> : null}
    </label>
  );
}

type Tr = ReturnType<typeof useReminderText>;

function FarmerLinkFields({
  tr,
  links,
  setLinks,
}: {
  tr: Tr;
  links: ReminderLinkDefaults;
  setLinks: (l: ReminderLinkDefaults) => void;
}) {
  const { data: farmsResponse } = useGetUserFarms("all");
  const { data: batchesResponse } = useGetAllBatches();
  const farms: any[] = farmsResponse?.data || [];
  const batches: any[] = (batchesResponse?.data || []).filter(
    (b: any) => (b.status === "ACTIVE" || b.id === links.batchId) && (!links.farmId || b.farmId === links.farmId)
  );

  return (
    <div className="grid grid-cols-2 gap-2">
      <Select
        value={links.farmId || NONE}
        onValueChange={(v) => setLinks({ farmId: v === NONE ? null : v, batchId: null })}
      >
        <SelectTrigger className="bg-white"><SelectValue placeholder={tr("farm")} /></SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value={NONE}>{tr("farm")}: {tr("none")}</SelectItem>
          {farms.map((f) => (
            <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={links.batchId || NONE}
        onValueChange={(v) => {
          const batch = batches.find((b) => b.id === v);
          setLinks({ farmId: batch?.farmId ?? links.farmId ?? null, batchId: v === NONE ? null : v });
        }}
      >
        <SelectTrigger className="bg-white"><SelectValue placeholder={tr("batch")} /></SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value={NONE}>{tr("batch")}: {tr("none")}</SelectItem>
          {batches.map((b) => (
            <SelectItem key={b.id} value={b.id}>{b.batchNumber}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function HatcheryLinkFields({
  tr,
  links,
  setLinks,
  type,
  setType,
}: {
  tr: Tr;
  links: ReminderLinkDefaults;
  setLinks: (l: ReminderLinkDefaults) => void;
  type: HatcheryLinkType;
  setType: (t: HatcheryLinkType) => void;
}) {
  const { data: batchData } = useHatcheryBatches({ type: "PARENT_FLOCK", limit: 200 });
  const { data: incubationData } = useIncubationBatches({ limit: 200 });
  const { data: partyData } = useHatcheryParties(undefined, 1, 200);

  const options = useMemo(() => {
    if (type === "batch") {
      return (batchData?.batches ?? [])
        .filter((b: any) => b.status === "ACTIVE" || b.id === links.hatcheryBatchId)
        .map((b: any) => ({ id: b.id, label: b.name ? `${b.code} · ${b.name}` : b.code }));
    }
    if (type === "incubation") {
      return (incubationData?.batches ?? [])
        .filter((b: any) => b.stage !== "COMPLETED" || b.id === links.incubationId)
        .map((b: any) => ({ id: b.id, label: b.name ? `${b.code} · ${b.name}` : b.code }));
    }
    if (type === "party") {
      return (partyData?.parties ?? []).map((p: any) => ({ id: p.id, label: p.name }));
    }
    return [];
  }, [type, batchData, incubationData, partyData, links.hatcheryBatchId, links.incubationId]);

  const current =
    type === "batch" ? links.hatcheryBatchId : type === "incubation" ? links.incubationId : type === "party" ? links.hatcheryPartyId : null;

  const pick = (id: string | null) => {
    setLinks({
      hatcheryBatchId: type === "batch" ? id : null,
      incubationId: type === "incubation" ? id : null,
      hatcheryPartyId: type === "party" ? id : null,
    });
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <Select
        value={type}
        onValueChange={(v) => {
          setType(v as HatcheryLinkType);
          setLinks({});
        }}
      >
        <SelectTrigger className="bg-white"><SelectValue placeholder={tr("linkType")} /></SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="none">{tr("none")}</SelectItem>
          <SelectItem value="batch">{tr("parentBatch")}</SelectItem>
          <SelectItem value="incubation">{tr("incubation")}</SelectItem>
          <SelectItem value="party">{tr("party")}</SelectItem>
        </SelectContent>
      </Select>
      {type !== "none" ? (
        <Select value={current || NONE} onValueChange={(v) => pick(v === NONE ? null : v)}>
          <SelectTrigger className="bg-white"><SelectValue placeholder={tr("pickOne")} /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value={NONE}>{tr("pickOne")}</SelectItem>
            {options.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}

/** Feed dealer: link to a customer (money to collect) or a company (money to pay). */
function DealerLinkFields({
  tr,
  links,
  setLinks,
  type,
  setType,
  fixedName,
  onPicked,
}: {
  tr: Tr;
  links: ReminderLinkDefaults;
  setLinks: (l: ReminderLinkDefaults) => void;
  type: DealerLinkType;
  setType: (t: DealerLinkType) => void;
  /** Name shown when the form was opened from that customer's / company's page. */
  fixedName?: string;
  onPicked: (picked: { kind: "customer" | "company"; name: string; owes: number }) => void;
}) {
  const [search, setSearch] = useState("");
  const { data: customerData } = useGetDealerCustomers({ limit: 50, search: search.trim() || undefined });
  const { data: companies } = useGetManualCompanies();

  const options = useMemo(() => {
    if (type === "customer") {
      return (customerData?.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        owes: Number(c.balance) || 0,
        label: `${c.name}${c.phone ? ` · ${c.phone}` : ""}`,
      }));
    }
    if (type === "company") {
      return (companies ?? []).map((c) => ({ id: c.id, name: c.name, owes: Number(c.balance) || 0, label: c.name }));
    }
    return [];
  }, [type, customerData, companies]);

  const current = type === "customer" ? links.dealerCustomerId : type === "company" ? links.dealerManualCompanyId : null;
  // Keep a picked or page-given link visible even when it is not in the current list.
  const showFixed = Boolean(current && fixedName && !options.some((o) => o.id === current));

  const pick = (id: string | null) => {
    setLinks({
      dealerCustomerId: type === "customer" ? id : null,
      dealerManualCompanyId: type === "company" ? id : null,
    });
    const found = options.find((o) => o.id === id);
    if (found) onPicked({ kind: type === "company" ? "company" : "customer", name: found.name, owes: found.owes });
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v as DealerLinkType);
            setLinks({});
            setSearch("");
          }}
        >
          <SelectTrigger className="bg-white"><SelectValue placeholder={tr("linkType")} /></SelectTrigger>
          <SelectContent className="bg-white">
            <SelectItem value="none">{tr("none")}</SelectItem>
            <SelectItem value="customer">{tr("customer")}</SelectItem>
            <SelectItem value="company">{tr("company")}</SelectItem>
          </SelectContent>
        </Select>
        {type !== "none" ? (
          <Select value={current || NONE} onValueChange={(v) => pick(v === NONE ? null : v)}>
            <SelectTrigger className="bg-white"><SelectValue placeholder={tr("pickOne")} /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value={NONE}>{tr("pickOne")}</SelectItem>
              {showFixed ? <SelectItem value={current!}>{fixedName}</SelectItem> : null}
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
      {/* Search only while no customer is picked yet; clear the pick to search again. */}
      {type === "customer" && !current ? (
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer name or phone"
          className="h-9"
        />
      ) : null}
    </div>
  );
}
