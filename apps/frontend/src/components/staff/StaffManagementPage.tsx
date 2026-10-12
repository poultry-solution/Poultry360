"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  DollarSign,
  Eye,
  Loader2,
  Plus,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { getTodayLocalDate } from "@/common/lib/utils";
import { BS_MONTH_NAMES, formatBSLong, formatBSMonthYear } from "@/common/lib/nepali-date";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Modal, ModalContent, ModalFooter } from "@/common/components/ui/modal";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { DateInput } from "@/common/components/ui/date-input";
import { BSMonthPicker } from "@/common/components/ui/bs-month-picker";
import { ImageUpload } from "@/common/components/ui/image-upload";
import { DateDisplay } from "@/common/components/ui/date-display";
import { StaffAttendanceCalendar } from "@/components/staff/StaffAttendanceCalendar";
import {
  useDeleteStaff,
  useCreateStaff,
  useStaffById,
  useStaffList,
  useResumeStaff,
  useUpdateSalaryRate,
  useDeleteSalaryRate,
  useStaffSummary,
  useStaffTransactions,
  useStopStaff,
  useUpdateStaff,
  useAddStaffPayment,
  useDeleteStaffPayment,
  type StaffItem,
  type StaffPayType,
  type StaffPayTypeFilter,
  type StaffSalary,
  type StaffStatusFilter,
} from "@/fetchers/staff/staffQueries";

type Owner = "farmer" | "dealer" | "hatchery" | "company";

interface StaffManagementPageProps {
  owner: Owner;
  titlePrefix: "dealer" | "farmer" | "hatchery" | "company";
}

type StaffTab = "all" | "active" | "stopped";

interface SummaryCard {
  label: string;
  value: string;
  hint: string;
  tone?: string;
}

function formatCurrency(amount: number): string {
  // Paisa only appears from half days, so whole rupees stay clean.
  return `Rs ${Math.abs(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function rateUnit(payType: StaffPayType): string {
  return payType === "DAILY" ? "/day" : "/mo";
}

function payTypeLabel(payType: StaffPayType): string {
  return payType === "DAILY" ? "Daily wage" : "Monthly";
}

/** Rates and pay type are added in one place so add-staff and edit-salary agree. */
function rateLabel(payType: StaffPayType): string {
  return payType === "DAILY" ? "Daily wage" : "Monthly salary";
}

/** One place decides what a balance means, so colour and wording never disagree. */
function balanceTone(balance: number): { label: string; className: string } {
  if (isZeroBalance(balance)) return { label: "Settled", className: "text-muted-foreground" };
  if (balance > 0) return { label: "Due", className: "text-red-600" };
  return { label: "Advance", className: "text-emerald-600" };
}

function isZeroBalance(balance: number): boolean {
  return Math.abs(balance) < 0.0001;
}

export default function StaffManagementPage({ owner, titlePrefix }: StaffManagementPageProps) {
  const { t } = useI18n();
  const scope = `${titlePrefix}.staff`;
  const text = (key: string, fallback: string) => {
    const value = t(`${scope}.${key}`);
    return value === `${scope}.${key}` ? fallback : value;
  };

  const [activeTab, setActiveTab] = useState<StaffTab>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "balance" | "joined">("name");
  const [payTypeFilter, setPayTypeFilter] = useState<StaffPayTypeFilter>("ALL");
  const [addOpen, setAddOpen] = useState(false);
  const [payStaffId, setPayStaffId] = useState<string | null>(null);
  const [editSalaryStaffId, setEditSalaryStaffId] = useState<string | null>(null);
  const [stopStaffId, setStopStaffId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", startDate: "" });
  const [detailsStaffId, setDetailsStaffId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<{ id: string; rate: string; effectiveFrom: string } | null>(null);
  const [rateToDelete, setRateToDelete] = useState<StaffSalary | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<{
    staffId: string;
    paymentId: string;
    amount: number;
  } | null>(null);

  const emptyAddForm = { name: "", payType: "MONTHLY" as StaffPayType, startDate: getTodayLocalDate(), rate: "" };
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [payForm, setPayForm] = useState({ amount: "", paidAt: getTodayLocalDate(), note: "", receiptImageUrl: "" });
  const [editSalaryForm, setEditSalaryForm] = useState({ rate: "", effectiveFrom: getTodayLocalDate() });
  const [stopForm, setStopForm] = useState({ endDate: getTodayLocalDate() });

  const statusFilter = useMemo((): StaffStatusFilter => {
    if (activeTab === "all") return "ALL";
    if (activeTab === "active") return "ACTIVE";
    return "STOPPED";
  }, [activeTab]);

  const { data: summaryData, isLoading: summaryLoading } = useStaffSummary(owner);
  const { data, isLoading } = useStaffList(owner, statusFilter, payTypeFilter);
  const createMutation = useCreateStaff(owner);
  const updateMutation = useUpdateStaff(owner);
  const stopMutation = useStopStaff(owner);
  const deleteStaffMutation = useDeleteStaff(owner);
  const addPaymentMutation = useAddStaffPayment(owner);
  const deletePaymentMutation = useDeleteStaffPayment(owner);
  const resumeMutation = useResumeStaff(owner);
  const updateRateMutation = useUpdateSalaryRate(owner);
  const deleteRateMutation = useDeleteSalaryRate(owner);
  const { data: detailsData } = useStaffById(owner, detailsStaffId);
  const { data: transactionsData } = useStaffTransactions(owner, detailsStaffId);
  const { data: deleteTargetData } = useStaffTransactions(owner, deleteTarget?.id ?? null);

  const summary = summaryData?.data ?? {
    totalStaff: 0,
    activeStaff: 0,
    stoppedStaff: 0,
    monthlyStaff: 0,
    dailyStaff: 0,
    totalSalaryExpense: 0,
    totalSalaryPayments: 0,
    remainingBalance: 0,
  };
  const allStaff: StaffItem[] = data?.data ?? [];
  const staffList: StaffItem[] = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = term
      ? allStaff.filter((item) => item.name.toLowerCase().includes(term))
      : allStaff;
    return [...filtered].sort((a, b) => {
      if (sortBy === "balance") return Math.abs(b.balance) - Math.abs(a.balance);
      if (sortBy === "joined") {
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      }
      return a.name.localeCompare(b.name);
    });
  }, [allStaff, search, sortBy]);
  const transactions = transactionsData?.data?.transactions ?? [];
  const detailsBalance = transactionsData?.data?.balance ?? 0;
  const detailsStaff = allStaff.find((staff) => staff.id === detailsStaffId);
  const detailsFull = detailsData?.data;
  const payStaff = allStaff.find((staff) => staff.id === payStaffId);
  const editSalaryStaff = allStaff.find((staff) => staff.id === editSalaryStaffId);
  const deletePayments = (deleteTargetData?.data?.transactions ?? []).filter(
    (tx) => tx.type === "payment"
  );
  const deletePaymentTotal = deletePayments.reduce((sum, tx) => sum + tx.amount, 0);
  const detailsEarned = transactions
    .filter((tx) => tx.type === "accrual")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const detailsPaid = transactions
    .filter((tx) => tx.type === "payment")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const canDeleteDetailsPayments =
    detailsStaff?.status === "ACTIVE" || detailsStaff?.status === "STOPPED";

  const handleCreate = async () => {
    const name = addForm.name.trim();
    const rate = parseFloat(addForm.rate);
    if (!name || isNaN(rate) || rate < 0 || !addForm.startDate) return;
    await createMutation.mutateAsync({
      name,
      payType: addForm.payType,
      startDate: addForm.startDate.includes("T")
        ? `${addForm.startDate.split("T")[0]}T00:00:00.000Z`
        : `${addForm.startDate}T00:00:00.000Z`,
      rate,
    });
    setAddOpen(false);
    setAddForm(emptyAddForm);
  };

  const handlePay = async () => {
    if (!payStaffId) return;
    const amount = parseFloat(payForm.amount);
    if (isNaN(amount) || amount <= 0 || !payForm.paidAt) return;
    const paidAt = payForm.paidAt.includes("T") ? payForm.paidAt : `${payForm.paidAt}T12:00:00.000Z`;
    await addPaymentMutation.mutateAsync({
      staffId: payStaffId,
      body: {
        amount,
        paidAt,
        note: payForm.note.trim() || undefined,
        receiptImageUrl: payForm.receiptImageUrl.trim() || undefined,
      },
    });
    setPayStaffId(null);
    setPayForm({ amount: "", paidAt: getTodayLocalDate(), note: "", receiptImageUrl: "" });
  };

  const handleEditSalary = async () => {
    if (!editSalaryStaffId) return;
    const salary = parseFloat(editSalaryForm.rate);
    if (isNaN(salary) || salary < 0 || !editSalaryForm.effectiveFrom) return;
    const d = editSalaryForm.effectiveFrom.includes("T")
      ? editSalaryForm.effectiveFrom.split("T")[0]
      : editSalaryForm.effectiveFrom;
    const effectiveFrom = d.includes("-") ? `${d}T00:00:00.000Z` : `${getTodayLocalDate()}T00:00:00.000Z`;
    await updateMutation.mutateAsync({
      id: editSalaryStaffId,
      body: { rate: salary, effectiveFrom },
    });
    setEditSalaryStaffId(null);
    setEditSalaryForm({ rate: "", effectiveFrom: getTodayLocalDate() });
  };

  const handleSaveProfile = async () => {
    if (!detailsStaffId || !profileForm.name.trim() || !profileForm.startDate) return;
    const day = profileForm.startDate.split("T")[0];
    await updateMutation.mutateAsync({
      id: detailsStaffId,
      body: { name: profileForm.name.trim(), startDate: `${day}T00:00:00.000Z` },
    });
    setEditingProfile(false);
  };

  const handleStop = async (id: string) => {
    const endDate = stopForm.endDate.includes("T") ? stopForm.endDate : `${stopForm.endDate}T00:00:00.000Z`;
    await stopMutation.mutateAsync({ id, endDate });
    setStopStaffId(null);
    setStopForm({ endDate: getTodayLocalDate() });
  };

  const handleDeleteStaff = async () => {
    if (!deleteTarget || !deletePassword) return;
    try {
      await deleteStaffMutation.mutateAsync({ id: deleteTarget.id, password: deletePassword });
      setDeleteTarget(null);
      setDeletePassword("");
    } catch {
      // The mutation's onError already surfaces the message; keep the modal
      // open so a wrong password can simply be retyped.
    }
  };

  const handleSaveRate = async () => {
    if (!editingRate || !detailsStaffId) return;
    const rate = parseFloat(editingRate.rate);
    if (isNaN(rate) || rate < 0 || !editingRate.effectiveFrom) return;
    await updateRateMutation.mutateAsync({
      staffId: detailsStaffId,
      salaryId: editingRate.id,
      body: { rate, effectiveFrom: `${editingRate.effectiveFrom.split("T")[0]}T00:00:00.000Z` },
    });
    setEditingRate(null);
  };

  const handleDeleteRate = async () => {
    if (!rateToDelete || !detailsStaffId) return;
    await deleteRateMutation.mutateAsync({ staffId: detailsStaffId, salaryId: rateToDelete.id });
    setRateToDelete(null);
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    await deletePaymentMutation.mutateAsync({
      staffId: paymentToDelete.staffId,
      paymentId: paymentToDelete.paymentId,
    });
    setPaymentToDelete(null);
  };

  const summaryTone = balanceTone(summary.remainingBalance);
  const summaryCards: Array<SummaryCard & { accent?: boolean }> = [
    {
      label: text("balance", "Remaining balance"),
      value: summaryLoading ? "—" : formatCurrency(summary.remainingBalance),
      hint: summaryLoading ? "" : summaryTone.label,
      tone: summaryTone.className,
      accent: true,
    },
    {
      label: "Salary expense",
      value: summaryLoading ? "—" : formatCurrency(summary.totalSalaryExpense),
      hint: "Accrued to date",
    },
    {
      label: "Paid out",
      value: summaryLoading ? "—" : formatCurrency(summary.totalSalaryPayments),
      hint: "All payments",
    },
    {
      label: "Staff",
      value: summaryLoading ? "—" : String(summary.totalStaff),
      hint: summaryLoading
        ? ""
        : `${summary.activeStaff} active · ${summary.monthlyStaff} monthly · ${summary.dailyStaff} daily`,
    },
  ];

  const tabs: Array<{ value: StaffTab; label: string; count: number }> = [
    { value: "all", label: "All", count: summary.totalStaff },
    { value: "active", label: "Active", count: summary.activeStaff },
    { value: "stopped", label: "Stopped", count: summary.stoppedStaff },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="h-6 w-6" />
            {text("title", "Staff Payroll")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{text("subtitle", "Track staff salary and payments.")}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {text("addStaff", "Add staff")}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card
            key={card.label}
            className={
              card.accent
                ? "rounded-xl border-primary/30 bg-primary/5"
                : "rounded-xl"
            }
          >
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {card.label}
              </p>
              <p className={`mt-1.5 text-2xl font-bold tabular-nums ${card.tone ?? "text-foreground"}`}>
                {card.value}
              </p>
              {card.hint ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{card.hint}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as StaffTab)} className="space-y-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-2xl bg-muted/30 p-2">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2 rounded-xl px-4 py-2">
              {tab.label}
              <Badge variant="secondary" className="rounded-full px-2 py-0 text-xs">
                {tab.count}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={text("searchPlaceholder", "Search staff by name")}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={payTypeFilter}
                  onChange={(event) => setPayTypeFilter(event.target.value as StaffPayTypeFilter)}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  aria-label="Pay type"
                >
                  <option value="ALL">All pay types</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="DAILY">Daily wage</option>
                </select>
                <ArrowUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value as "name" | "balance" | "joined")
                  }
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="name">Name (A–Z)</option>
                  <option value="balance">Largest balance</option>
                  <option value="joined">Newest joined</option>
                </select>
                <Badge variant="outline" className="shrink-0">
                  {staffList.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : staffList.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <div className="rounded-full bg-muted p-3">
                    {search.trim() ? (
                      <Search className="h-6 w-6 text-muted-foreground" />
                    ) : (
                      <Users className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {search.trim()
                      ? `No staff matching "${search.trim()}"`
                      : activeTab === "stopped"
                        ? "No stopped staff"
                        : activeTab === "active"
                          ? "No active staff"
                          : text("empty", "No staff yet")}
                  </p>
                  {/* Only offer the action that actually resolves this empty state */}
                  {search.trim() ? (
                    <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                      Clear search
                    </Button>
                  ) : activeTab === "all" || activeTab === "active" ? (
                    <Button size="sm" onClick={() => setAddOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      {text("addStaff", "Add staff")}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {staffList.map((s) => {
                    const settled = isZeroBalance(s.balance);
                    // Deleting requires Stopped only. The old archive gate also
                    // demanded a zero balance, which accrual could never reach.
                    const canDelete = s.status === "STOPPED";
                    const tone = balanceTone(s.balance);
                    const statusLabel =
                      s.status === "ACTIVE"
                        ? text("statusActive", "Active")
                        : text("statusStopped", "Stopped");

                    return (
                      <div
                        key={s.id}
                        className="flex flex-col rounded-xl border bg-background transition-colors hover:border-primary/40"
                      >
                        {/* Identity + balance: the two things scanned first */}
                        <div className="flex items-start justify-between gap-3 p-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-semibold">{s.name}</span>
                              <Badge
                                variant={
                                  s.status === "ACTIVE" ? "default" : "secondary"
                                }
                                className="shrink-0 text-[10px] uppercase tracking-wide"
                              >
                                {statusLabel}
                              </Badge>
                              <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-wide">
                                {payTypeLabel(s.payType)}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {text("joiningDate", "Joined")} {formatBSLong(s.startDate)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {s.payType === "DAILY" ? "Daily wage" : text("currentSalary", "Current salary")}{" "}
                              <span className="font-medium text-foreground tabular-nums">
                                {formatCurrency(s.currentRate)}
                              </span>
                              {rateUnit(s.payType)}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className={`text-lg font-bold tabular-nums ${tone.className}`}>
                              {settled ? formatCurrency(0) : formatCurrency(s.balance)}
                            </p>
                            <p className={`text-[11px] font-medium ${tone.className}`}>
                              {tone.label}
                            </p>
                          </div>
                        </div>

                        {/* Actions sit on their own row so they never wrap into the text */}
                        <div className="mt-auto flex items-center gap-1 border-t px-3 py-2">
                          {(s.status === "ACTIVE" || s.status === "STOPPED") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-primary"
                              onClick={() => {
                                setPayStaffId(s.id);
                                setPayForm({ amount: "", paidAt: getTodayLocalDate(), note: "", receiptImageUrl: "" });
                              }}
                            >
                              <DollarSign className="mr-1 h-4 w-4" />
                              {text("pay", "Pay")}
                            </Button>
                          )}
                          {s.status === "ACTIVE" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setEditSalaryStaffId(s.id);
                                setEditSalaryForm({ rate: String(s.currentRate), effectiveFrom: getTodayLocalDate() });
                              }}
                              title={text("editSalary", "Edit salary")}
                              aria-label={text("editSalary", "Edit salary")}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {s.status === "ACTIVE" && (
                            /* Stop halts salary accrual - it deletes nothing, so no trash icon */
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive"
                              onClick={() => {
                                setStopStaffId(s.id);
                                setStopForm({ endDate: getTodayLocalDate() });
                              }}
                              title={text("stop", "Stop")}
                              aria-label={text("stop", "Stop")}
                            >
                              <UserMinus className="h-4 w-4" />
                            </Button>
                          )}
                          {s.status === "STOPPED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              disabled={resumeMutation.isPending}
                              onClick={() => resumeMutation.mutate(s.id)}
                              title="Restart (stopped by mistake)"
                              aria-label="Restart"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-destructive"
                              onClick={() => {
                                setDeleteTarget({ id: s.id, name: s.name });
                                setDeletePassword("");
                              }}
                              title="Delete"
                              aria-label="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setDetailsStaffId(s.id)}
                            title={text("details", "Details")}
                            aria-label={text("details", "Details")}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title={text("addStaff", "Add staff")}>
        <ModalContent>
          <div className="space-y-4">
            <div>
              <Label>{text("name", "Name")}</Label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={text("name", "Name")}
              />
            </div>
            <div>
              <Label>Pay type</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {(["MONTHLY", "DAILY"] as StaffPayType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setAddForm((f) => ({ ...f, payType: type }))}
                    className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      addForm.payType === type ? "border-primary bg-primary/5 font-medium" : "hover:bg-muted"
                    }`}
                  >
                    {payTypeLabel(type)}
                    <span className="block text-xs font-normal text-muted-foreground">
                      {type === "DAILY" ? "Paid per day worked" : "Fixed salary each month"}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Pay type cannot be changed later.</p>
            </div>
            <DateInput
              label={text("joiningDate", "Joining date")}
              value={addForm.startDate?.split("T")[0] ?? getTodayLocalDate()}
              onChange={(v) => setAddForm((f) => ({ ...f, startDate: v }))}
            />
            <div>
              <Label>{addForm.payType === "DAILY" ? "Daily wage" : text("monthlySalary", "Monthly salary")}</Label>
              <Input
                type="number"
                min={0}
                value={addForm.rate}
                onChange={(e) => setAddForm((f) => ({ ...f, rate: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setAddOpen(false)}>
            {text("cancel", "Cancel")}
          </Button>
          <Button
            disabled={!addForm.name.trim() || !addForm.startDate || !addForm.rate || parseFloat(addForm.rate) < 0 || createMutation.isPending}
            onClick={handleCreate}
          >
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {text("save", "Save")}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={!!payStaffId} onClose={() => setPayStaffId(null)} title={text("addPayment", "Add payment")}>
        <ModalContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label>{text("amount", "Amount")}</Label>
                {payStaff && payStaff.balance > 0 && (
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => setPayForm((f) => ({ ...f, amount: String(payStaff.balance) }))}
                  >
                    Pay full due {formatCurrency(payStaff.balance)}
                  </button>
                )}
              </div>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={payForm.amount}
                onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <Label>{text("date", "Date")}</Label>
              <DateInput
                value={payForm.paidAt}
                onChange={(v) => setPayForm((f) => ({ ...f, paidAt: v?.split("T")[0] ?? getTodayLocalDate() }))}
              />
            </div>
            <div>
              <Label>{text("note", "Note")}</Label>
              <Input
                value={payForm.note}
                onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))}
                placeholder={text("note", "Note")}
              />
            </div>
            <div>
              <Label>{text("receiptImage", "Receipt image")}</Label>
              <ImageUpload
                folder="payment-receipts"
                value={payForm.receiptImageUrl}
                onChange={(url) => setPayForm((f) => ({ ...f, receiptImageUrl: url }))}
                placeholder={text("receiptImage", "Receipt image")}
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setPayStaffId(null)}>
            {text("cancel", "Cancel")}
          </Button>
          <Button
            disabled={!payForm.amount || parseFloat(payForm.amount) <= 0 || addPaymentMutation.isPending}
            onClick={handlePay}
          >
            {addPaymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {text("save", "Save")}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={!!editSalaryStaffId} onClose={() => setEditSalaryStaffId(null)} title={text("editSalary", "Edit salary")}>
        <ModalContent>
          <div className="space-y-4">
            <div>
              <Label>
                {editSalaryStaff?.payType === "DAILY" ? "Daily wage" : text("monthlySalary", "Monthly salary")}
              </Label>
              <Input
                type="number"
                min={0}
                value={editSalaryForm.rate}
                onChange={(e) => setEditSalaryForm((f) => ({ ...f, rate: e.target.value }))}
                placeholder="0"
              />
            </div>
            {editSalaryStaff?.payType === "DAILY" ? (
              <DateInput
                label={text("effectiveFrom", "Effective from")}
                value={editSalaryForm.effectiveFrom?.split("T")[0] ?? getTodayLocalDate()}
                onChange={(v) => setEditSalaryForm((f) => ({ ...f, effectiveFrom: v?.split("T")[0] ?? getTodayLocalDate() }))}
              />
            ) : (
              <BSMonthPicker
                label={text("effectiveFrom", "Effective from")}
                value={editSalaryForm.effectiveFrom?.split("T")[0] ?? getTodayLocalDate()}
                onChange={(v) => setEditSalaryForm((f) => ({ ...f, effectiveFrom: v }))}
              />
            )}
            <p className="text-xs text-muted-foreground">
              If a salary already starts on this date, it is replaced.
            </p>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setEditSalaryStaffId(null)}>
            {text("cancel", "Cancel")}
          </Button>
          <Button
            disabled={
              !editSalaryForm.rate ||
              parseFloat(editSalaryForm.rate) < 0 ||
              !editSalaryForm.effectiveFrom ||
              updateMutation.isPending
            }
            onClick={handleEditSalary}
          >
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {text("save", "Save")}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={!!stopStaffId} onClose={() => setStopStaffId(null)} title={text("stopConfirmTitle", "Stop staff?")}>
        <ModalContent>
          <div className="space-y-4">
            <p className="text-muted-foreground">{text("stopConfirmMessage", "Salary will accrue until the selected last working date. Remaining balance will stay.")}</p>
            <DateInput
              label={text("lastWorkingDate", "Last working date")}
              max={getTodayLocalDate()}
              value={stopForm.endDate}
              onChange={(v) => setStopForm({ endDate: v })}
            />
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setStopStaffId(null)}>
            {text("cancel", "Cancel")}
          </Button>
          <Button
            variant="destructive"
            className="bg-destructive text-white"
            disabled={stopMutation.isPending || !stopForm.endDate}
            onClick={() => stopStaffId && handleStop(stopStaffId)}
          >
            {stopMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {text("stop", "Stop")}
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setDeletePassword("");
        }}
        title={`Delete ${deleteTarget?.name ?? "staff"}?`}
      >
        <ModalContent>
          <div className="space-y-3">
            {/* Say what is actually being destroyed, so the password is an
                informed decision rather than friction. */}
            <p className="text-sm">
              {deletePayments.length > 0 ? (
                <>
                  This permanently removes{" "}
                  <span className="font-semibold text-destructive">
                    {deletePayments.length} payment{deletePayments.length === 1 ? "" : "s"} totalling{" "}
                    {formatCurrency(deletePaymentTotal)}
                  </span>{" "}
                  and all salary history.
                </>
              ) : (
                "No payments were recorded for this staff member. This removes the record and its salary history."
              )}
            </p>
            <p className="text-sm font-medium text-destructive">This cannot be undone.</p>
            <div>
              <Label htmlFor="deleteStaffPassword">Enter your password to confirm</Label>
              <Input
                id="deleteStaffPassword"
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                placeholder="Password"
                className="mt-1"
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setDeleteTarget(null);
              setDeletePassword("");
            }}
          >
            {text("cancel", "Cancel")}
          </Button>
          <Button
            variant="destructive"
            disabled={deleteStaffMutation.isPending || !deletePassword}
            onClick={handleDeleteStaff}
          >
            {deleteStaffMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete permanently
          </Button>
        </ModalFooter>
      </Modal>
      <Modal
        isOpen={!!detailsStaffId}
        onClose={() => {
          setDetailsStaffId(null);
          setEditingProfile(false);
          setEditingRate(null);
        }}
        title={detailsStaff?.name ?? text("details", "Details")}
        className="max-w-2xl"
      >
        <ModalContent>
          {/* Profile: read-only by default, editable on demand. A wrong joining
              date would otherwise accrue salary from the wrong day forever. */}
          {detailsStaff && (
            <div className="mb-4 rounded-lg border bg-muted/30 p-3">
              {editingProfile ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="profileName">{text("name", "Name")}</Label>
                    <Input
                      id="profileName"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <DateInput
                    label={text("joiningDate", "Joining date")}
                    value={profileForm.startDate}
                    onChange={(value) => setProfileForm((f) => ({ ...f, startDate: value }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={updateMutation.isPending || !profileForm.name.trim() || !profileForm.startDate}
                      onClick={handleSaveProfile}
                    >
                      {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {text("save", "Save")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingProfile(false)}>
                      {text("cancel", "Cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">{detailsStaff.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {text("joiningDate", "Joined")} {formatBSLong(detailsStaff.startDate)} ·{" "}
                      {formatCurrency(detailsStaff.currentRate)}
                      {rateUnit(detailsStaff.payType)} · {payTypeLabel(detailsStaff.payType)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setProfileForm({
                        name: detailsStaff.name,
                        startDate: detailsStaff.startDate.split("T")[0],
                      });
                      setEditingProfile(true);
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    {text("edit", "Edit")}
                  </Button>
                </div>
              )}
            </div>
          )}

          {detailsStaff && detailsFull && (
            <div className="mb-4 rounded-lg border p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {rateLabel(detailsStaff.payType)} history
              </p>
              <div className="space-y-1.5">
                {detailsFull.salaries.map((salary) =>
                  editingRate?.id === salary.id ? (
                    <div key={salary.id} className="space-y-2 rounded-md border bg-muted/30 p-2">
                      <Input
                        type="number"
                        min={0}
                        value={editingRate.rate}
                        onChange={(e) => setEditingRate((r) => (r ? { ...r, rate: e.target.value } : r))}
                      />
                      {detailsStaff.payType === "DAILY" ? (
                        <DateInput
                          label={text("effectiveFrom", "Effective from")}
                          value={editingRate.effectiveFrom}
                          onChange={(v) =>
                            setEditingRate((r) => (r ? { ...r, effectiveFrom: v?.split("T")[0] ?? r.effectiveFrom } : r))
                          }
                        />
                      ) : (
                        <BSMonthPicker
                          label={text("effectiveFrom", "Effective from")}
                          value={editingRate.effectiveFrom}
                          onChange={(v) => setEditingRate((r) => (r ? { ...r, effectiveFrom: v } : r))}
                        />
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={updateRateMutation.isPending || !editingRate.rate}
                          onClick={handleSaveRate}
                        >
                          {updateRateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {text("save", "Save")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingRate(null)}>
                          {text("cancel", "Cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div key={salary.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">
                        From{" "}
                        {detailsStaff.payType === "DAILY"
                          ? formatBSLong(salary.effectiveFrom)
                          : formatBSMonthYear(salary.effectiveFrom)}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(salary.rate)}
                          {rateUnit(detailsStaff.payType)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() =>
                            setEditingRate({
                              id: salary.id,
                              rate: String(salary.rate),
                              effectiveFrom: salary.effectiveFrom.split("T")[0],
                            })
                          }
                          aria-label="Edit salary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {detailsFull.salaries.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => setRateToDelete(salary)}
                            aria-label="Remove salary"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {detailsStaff?.payType === "DAILY" && detailsFull && (
            <div className="mb-4">
              <StaffAttendanceCalendar
                owner={owner}
                staffId={detailsStaff.id}
                startDate={detailsFull.startDate}
                endDate={detailsFull.endDate}
                attendance={detailsFull.attendance}
              />
            </div>
          )}

          {/* Earned / Paid / Balance, using the same tone helper as the cards so
              this can never contradict the list behind the modal. */}
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            {[
              { label: text("earned", "Earned"), value: formatCurrency(detailsEarned), tone: "text-foreground" },
              { label: text("paid", "Paid"), value: formatCurrency(detailsPaid), tone: "text-foreground" },
              {
                label: text("balance", "Balance"),
                value: formatCurrency(detailsBalance),
                tone: balanceTone(detailsBalance).className,
                hint: balanceTone(detailsBalance).label,
              },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border p-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <p className={`text-base font-bold tabular-nums ${item.tone}`}>{item.value}</p>
                {item.hint ? <p className={`text-[10px] ${item.tone}`}>{item.hint}</p> : null}
              </div>
            ))}
          </div>

          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {text("noTransactions", "No salary or payment records yet")}
            </p>
          ) : (
            <div className="max-h-[45vh] space-y-1.5 overflow-y-auto pr-1">
              {transactions.map((tx, i) => (
                <div
                  key={tx.type === "payment" ? tx.id : `accrual-${i}`}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm"
                >
                  {tx.type === "accrual" ? (
                    <>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                          {text("accrual", "Salary")}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {BS_MONTH_NAMES[tx.bsMonth - 1]} {tx.bsYear} ·{" "}
                          {detailsStaff?.payType === "DAILY"
                            ? `${tx.workedDays} days × ${formatCurrency(tx.dailyRate)}${
                                tx.absentDays ? ` · ${tx.absentDays} absent` : ""
                              }${tx.halfDays ? ` · ${tx.halfDays} half` : ""}`
                            : `${tx.workedDays}/${tx.daysInMonth} days`}
                        </span>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">
                        + {formatCurrency(tx.amount)}
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-emerald-700">
                          {text("payment", "Paid")}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          <DateDisplay date={tx.paidAt} />
                          {tx.note ? ` · ${tx.note}` : ""}
                        </span>
                        {tx.receiptImageUrl && (
                          <a
                            href={tx.receiptImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 rounded border px-1.5 py-0.5 text-[10px] text-primary hover:bg-muted"
                          >
                            {text("receipt", "Receipt")}
                          </a>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="font-semibold tabular-nums">− {formatCurrency(tx.amount)}</span>
                        {canDeleteDetailsPayments && detailsStaffId && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive"
                            onClick={() =>
                              setPaymentToDelete({
                                staffId: detailsStaffId,
                                paymentId: tx.id,
                                amount: tx.amount,
                              })
                            }
                            title={text("deletePayment", "Delete payment")}
                            aria-label={text("deletePayment", "Delete payment")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </ModalContent>
      </Modal>

      <Modal isOpen={!!rateToDelete} onClose={() => setRateToDelete(null)} title="Remove salary?">
        <ModalContent>
          <p className="text-sm text-muted-foreground">
            Remove {formatCurrency(rateToDelete?.rate ?? 0)}
            {detailsStaff ? rateUnit(detailsStaff.payType) : ""}? Earnings will use the salary before it.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setRateToDelete(null)}>
            {text("cancel", "Cancel")}
          </Button>
          <Button
            variant="destructive"
            className="bg-destructive text-white"
            disabled={deleteRateMutation.isPending}
            onClick={handleDeleteRate}
          >
            {deleteRateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Remove
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={!!paymentToDelete}
        onClose={() => setPaymentToDelete(null)}
        title="Delete payment?"
      >
        <ModalContent>
          <p className="text-sm text-muted-foreground">
            Delete the payment of {formatCurrency(paymentToDelete?.amount ?? 0)}? The staff balance and payment total will be updated.
          </p>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setPaymentToDelete(null)}>
            {text("cancel", "Cancel")}
          </Button>
          <Button
            variant="destructive"
            className="bg-destructive text-white"
            disabled={deletePaymentMutation.isPending}
            onClick={handleDeletePayment}
          >
            {deletePaymentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete payment
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
