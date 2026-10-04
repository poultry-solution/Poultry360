"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ArrowUpDown,
  DollarSign,
  Eye,
  Loader2,
  Plus,
  Pencil,
  Search,
  Trash2,
  UserMinus,
  Users,
} from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { getTodayLocalDate } from "@/common/lib/utils";
import { formatBSLong } from "@/common/lib/nepali-date";
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
import {
  useArchiveStaff,
  useCreateStaff,
  useStaffList,
  useStaffSummary,
  useStaffTransactions,
  useStopStaff,
  useUpdateStaff,
  useAddStaffPayment,
  useDeleteStaffPayment,
  type StaffItem,
  type StaffStatusFilter,
} from "@/fetchers/staff/staffQueries";

type Owner = "farmer" | "dealer" | "hatchery" | "company";

interface StaffManagementPageProps {
  owner: Owner;
  titlePrefix: "dealer" | "farmer" | "hatchery" | "company";
}

type StaffTab = "all" | "active" | "stopped" | "archived";

interface SummaryCard {
  label: string;
  value: string;
  hint: string;
  tone?: string;
}

function formatCurrency(amount: number): string {
  return `रू ${Math.round(Math.abs(amount)).toLocaleString("en-IN")}`;
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
  const [addOpen, setAddOpen] = useState(false);
  const [payStaffId, setPayStaffId] = useState<string | null>(null);
  const [editSalaryStaffId, setEditSalaryStaffId] = useState<string | null>(null);
  const [stopStaffId, setStopStaffId] = useState<string | null>(null);
  const [archiveStaffId, setArchiveStaffId] = useState<string | null>(null);
  const [detailsStaffId, setDetailsStaffId] = useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<{
    staffId: string;
    paymentId: string;
    amount: number;
  } | null>(null);

  const [addForm, setAddForm] = useState({ name: "", startDate: getTodayLocalDate(), monthlySalary: "" });
  const [payForm, setPayForm] = useState({ amount: "", paidAt: getTodayLocalDate(), note: "", receiptImageUrl: "" });
  const [editSalaryForm, setEditSalaryForm] = useState({ monthlySalary: "", effectiveFrom: getTodayLocalDate() });
  const [stopForm, setStopForm] = useState({ endDate: getTodayLocalDate() });

  const statusFilter = useMemo((): StaffStatusFilter => {
    if (activeTab === "all") return "ALL";
    if (activeTab === "active") return "ACTIVE";
    if (activeTab === "stopped") return "STOPPED";
    return "ARCHIVED";
  }, [activeTab]);

  const { data: summaryData, isLoading: summaryLoading } = useStaffSummary(owner);
  const { data, isLoading } = useStaffList(owner, statusFilter);
  const createMutation = useCreateStaff(owner);
  const updateMutation = useUpdateStaff(owner);
  const stopMutation = useStopStaff(owner);
  const archiveMutation = useArchiveStaff(owner);
  const addPaymentMutation = useAddStaffPayment(owner);
  const deletePaymentMutation = useDeleteStaffPayment(owner);
  const { data: transactionsData } = useStaffTransactions(owner, detailsStaffId);

  const summary = summaryData?.data ?? {
    totalStaff: 0,
    activeStaff: 0,
    stoppedStaff: 0,
    archivedStaff: 0,
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
  const detailsStaff = staffList.find((staff) => staff.id === detailsStaffId);
  const canDeleteDetailsPayments =
    detailsStaff?.status === "ACTIVE" || detailsStaff?.status === "STOPPED";

  const handleCreate = async () => {
    const name = addForm.name.trim();
    const salary = parseFloat(addForm.monthlySalary);
    if (!name || isNaN(salary) || salary < 0 || !addForm.startDate) return;
    await createMutation.mutateAsync({
      name,
      startDate: addForm.startDate.includes("T")
        ? `${addForm.startDate.split("T")[0]}T00:00:00.000Z`
        : `${addForm.startDate}T00:00:00.000Z`,
      monthlySalary: salary,
    });
    setAddOpen(false);
    setAddForm({ name: "", startDate: getTodayLocalDate(), monthlySalary: "" });
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
    const salary = parseFloat(editSalaryForm.monthlySalary);
    if (isNaN(salary) || salary < 0 || !editSalaryForm.effectiveFrom) return;
    const d = editSalaryForm.effectiveFrom.includes("T")
      ? editSalaryForm.effectiveFrom.split("T")[0]
      : editSalaryForm.effectiveFrom;
    const effectiveFrom = d.includes("-") ? `${d}T00:00:00.000Z` : `${getTodayLocalDate()}T00:00:00.000Z`;
    await updateMutation.mutateAsync({
      id: editSalaryStaffId,
      body: { monthlySalary: salary, effectiveFrom },
    });
    setEditSalaryStaffId(null);
    setEditSalaryForm({ monthlySalary: "", effectiveFrom: getTodayLocalDate() });
  };

  const handleStop = async (id: string) => {
    const endDate = stopForm.endDate.includes("T") ? stopForm.endDate : `${stopForm.endDate}T00:00:00.000Z`;
    await stopMutation.mutateAsync({ id, endDate });
    setStopStaffId(null);
    setStopForm({ endDate: getTodayLocalDate() });
  };

  const handleArchive = async (id: string) => {
    await archiveMutation.mutateAsync(id);
    setArchiveStaffId(null);
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
      hint: summaryLoading ? "" : `${summary.activeStaff} active · ${summary.archivedStaff} archived`,
    },
  ];

  const tabs: Array<{ value: StaffTab; label: string; count: number }> = [
    { value: "all", label: "All", count: summary.totalStaff },
    { value: "active", label: "Active", count: summary.activeStaff },
    { value: "stopped", label: "Stopped", count: summary.stoppedStaff },
    { value: "archived", label: "Archived", count: summary.archivedStaff },
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
                      : activeTab === "archived"
                        ? "No archived staff yet"
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
                    const canArchive = s.status === "STOPPED" && settled;
                    const tone = balanceTone(s.balance);
                    const statusLabel =
                      s.status === "ACTIVE"
                        ? text("statusActive", "Active")
                        : s.status === "STOPPED"
                          ? text("statusStopped", "Stopped")
                          : "Archived";

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
                                  s.status === "ACTIVE"
                                    ? "default"
                                    : s.status === "STOPPED"
                                      ? "secondary"
                                      : "outline"
                                }
                                className="shrink-0 text-[10px] uppercase tracking-wide"
                              >
                                {statusLabel}
                              </Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {text("joiningDate", "Joined")} {formatBSLong(s.startDate)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {text("currentSalary", "Current salary")}{" "}
                              <span className="font-medium text-foreground tabular-nums">
                                {formatCurrency(s.currentMonthlySalary)}
                              </span>
                              /mo
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
                                setEditSalaryForm({ monthlySalary: String(s.currentMonthlySalary), effectiveFrom: getTodayLocalDate() });
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
                              className="h-8 w-8 p-0 text-amber-700"
                              disabled={!canArchive}
                              onClick={() => canArchive && setArchiveStaffId(s.id)}
                              title="Archive"
                              aria-label="Archive"
                            >
                              <Archive className="h-4 w-4" />
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

                          {/* Tooltips do not open on touch, so the blocker is written out */}
                          {s.status === "STOPPED" && !canArchive && (
                            <span className="ml-auto pr-1 text-[11px] text-muted-foreground">
                              Settle balance to archive
                            </span>
                          )}
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
            <DateInput
              label={text("joiningDate", "Joining date")}
              value={addForm.startDate?.split("T")[0] ?? getTodayLocalDate()}
              onChange={(v) => setAddForm((f) => ({ ...f, startDate: v }))}
            />
            <div>
              <Label>{text("monthlySalary", "Monthly salary")}</Label>
              <Input
                type="number"
                min={0}
                value={addForm.monthlySalary}
                onChange={(e) => setAddForm((f) => ({ ...f, monthlySalary: e.target.value }))}
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
            disabled={!addForm.name.trim() || !addForm.startDate || parseFloat(addForm.monthlySalary) < 0 || createMutation.isPending}
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
              <Label>{text("amount", "Amount")}</Label>
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
              <Label>{text("monthlySalary", "Monthly salary")}</Label>
              <Input
                type="number"
                min={0}
                value={editSalaryForm.monthlySalary}
                onChange={(e) => setEditSalaryForm((f) => ({ ...f, monthlySalary: e.target.value }))}
                placeholder="0"
              />
            </div>
            <BSMonthPicker
              label={text("effectiveFrom", "Effective from")}
              value={editSalaryForm.effectiveFrom?.split("T")[0] ?? getTodayLocalDate()}
              onChange={(v) => setEditSalaryForm((f) => ({ ...f, effectiveFrom: v }))}
            />
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setEditSalaryStaffId(null)}>
            {text("cancel", "Cancel")}
          </Button>
          <Button
            disabled={
              !editSalaryForm.monthlySalary ||
              parseFloat(editSalaryForm.monthlySalary) < 0 ||
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
        isOpen={!!archiveStaffId}
        onClose={() => setArchiveStaffId(null)}
        title="Archive staff?"
      >
        <ModalContent>
          <p className="text-muted-foreground">Archive only works after the staff is stopped and the balance is zero.</p>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setArchiveStaffId(null)}>
            {text("cancel", "Cancel")}
          </Button>
          <Button
            variant="secondary"
            disabled={archiveMutation.isPending}
            onClick={() => archiveStaffId && handleArchive(archiveStaffId)}
          >
            {archiveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Archive
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={!!detailsStaffId} onClose={() => setDetailsStaffId(null)} title={text("details", "Details")} className="max-w-lg">
        <ModalContent>
          <p className="mb-2 text-sm font-medium">
            {text("balance", "Balance")}:{" "}
            <span className={detailsBalance > 0 ? "text-red-600" : detailsBalance < 0 ? "text-green-600" : ""}>
              {detailsBalance > 0 ? text("due", "Due") : detailsBalance < 0 ? text("advance", "Advance") : "0"}{" "}
              {formatCurrency(detailsBalance)}
            </span>
          </p>
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {transactions.map((tx, i) => (
              <div key={tx.type === "payment" ? tx.id : `accrual-${i}`} className="flex justify-between border-b pb-1 text-sm">
                {tx.type === "accrual" ? (
                  <>
                    <span>
                      {text("accrual", "Accrual")} – {tx.bsYear}/{tx.bsMonth} · {tx.workedDays}/{tx.daysInMonth} days
                    </span>
                    <span className="font-medium">+{formatCurrency(tx.amount)}</span>
                  </>
                ) : (
                  <>
                    <span>
                      {text("payment", "Payment")} <DateDisplay date={tx.paidAt} />
                      {tx.note ? ` · ${tx.note}` : ""}
                      {tx.receiptImageUrl && (
                        <a
                          href={tx.receiptImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-primary underline"
                        >
                          Receipt
                        </a>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">−{formatCurrency(tx.amount)}</span>
                      {canDeleteDetailsPayments && detailsStaffId && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() =>
                            setPaymentToDelete({
                              staffId: detailsStaffId,
                              paymentId: tx.id,
                              amount: tx.amount,
                            })
                          }
                          title="Delete payment"
                          aria-label="Delete payment"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </ModalContent>
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
