"use client";

import { useMemo, useState } from "react";
import { Archive, DollarSign, Eye, Loader2, Plus, Pencil, Trash2, Users } from "lucide-react";
import { useI18n } from "@/i18n/useI18n";
import { getTodayLocalDate } from "@/common/lib/utils";
import { formatBSMonthYear, getBSYearMonthFromAD, getFirstDayOfBSMonthAD } from "@/common/lib/nepali-date";
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
  type StaffItem,
  type StaffStatusFilter,
} from "@/fetchers/staff/staffQueries";

type Owner = "farmer" | "dealer";

interface StaffManagementPageProps {
  owner: Owner;
  titlePrefix: "dealer" | "farmer";
}

type StaffTab = "all" | "active" | "stopped" | "archived";

interface SummaryCard {
  label: string;
  value: string;
  hint: string;
  tone?: string;
}

function formatCurrency(amount: number): string {
  return `रू ${Math.abs(amount).toFixed(0)}`;
}

function getDefaultStartMonthAD(): string {
  const { year, month } = getBSYearMonthFromAD(new Date());
  return getFirstDayOfBSMonthAD(year, month);
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
  const [addOpen, setAddOpen] = useState(false);
  const [payStaffId, setPayStaffId] = useState<string | null>(null);
  const [editSalaryStaffId, setEditSalaryStaffId] = useState<string | null>(null);
  const [stopStaffId, setStopStaffId] = useState<string | null>(null);
  const [archiveStaffId, setArchiveStaffId] = useState<string | null>(null);
  const [detailsStaffId, setDetailsStaffId] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({ name: "", startDate: getDefaultStartMonthAD(), monthlySalary: "" });
  const [payForm, setPayForm] = useState({ amount: "", paidAt: getTodayLocalDate(), note: "", receiptImageUrl: "" });
  const [editSalaryForm, setEditSalaryForm] = useState({ monthlySalary: "", effectiveFrom: getTodayLocalDate() });

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
  const staffList: StaffItem[] = data?.data ?? [];
  const transactions = transactionsData?.data?.transactions ?? [];
  const detailsBalance = transactionsData?.data?.balance ?? 0;

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
    setAddForm({ name: "", startDate: getDefaultStartMonthAD(), monthlySalary: "" });
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
    await stopMutation.mutateAsync(id);
    setStopStaffId(null);
  };

  const handleArchive = async (id: string) => {
    await archiveMutation.mutateAsync(id);
    setArchiveStaffId(null);
  };

  const summaryCards: SummaryCard[] = [
    { label: "Total salary expense", value: summaryLoading ? "..." : formatCurrency(summary.totalSalaryExpense), hint: `${summary.totalStaff} staff` },
    { label: "Total salary payments", value: summaryLoading ? "..." : formatCurrency(summary.totalSalaryPayments), hint: `${summary.archivedStaff} archived` },
    {
      label: "Remaining balance",
      value: summaryLoading ? "..." : formatCurrency(summary.remainingBalance),
      hint: summary.remainingBalance > 0 ? "Due" : summary.remainingBalance < 0 ? "Advance" : "Settled",
      tone: summary.remainingBalance > 0 ? "text-red-600" : summary.remainingBalance < 0 ? "text-green-600" : "text-foreground",
    },
    { label: "Total staff", value: summaryLoading ? "..." : String(summary.totalStaff), hint: `${summary.activeStaff} active` },
  ] as const;

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
            {text("title", "Staff management")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{text("subtitle", "Track staff salary and payments.")}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {text("addStaff", "Add staff")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="rounded-xl">
            <CardHeader className="pb-3">
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className={`text-2xl ${card.tone ?? ""}`}>{card.value}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">{card.hint}</CardContent>
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
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{text("title", "Staff management")}</CardTitle>
                <CardDescription>{text("subtitle", "Track staff salary and payments.")}</CardDescription>
              </div>
              <Badge variant="outline">{staffList.length} shown</Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : staffList.length === 0 ? (
                <p className="py-12 text-center text-muted-foreground">
                  {activeTab === "archived"
                    ? "No archived staff yet"
                    : activeTab === "stopped"
                      ? "No stopped staff"
                      : activeTab === "active"
                        ? "No active staff"
                        : text("empty", "No staff yet")}
                </p>
              ) : (
                <div className="space-y-3">
                  {staffList.map((s) => {
                    const canArchive = s.status === "STOPPED" && isZeroBalance(s.balance);
                    const statusLabel =
                      s.status === "ACTIVE" ? text("statusActive", "Active") : s.status === "STOPPED" ? text("statusStopped", "Stopped") : "Archived";

                    return (
                      <div
                        key={s.id}
                        className="grid gap-4 rounded-xl border bg-background p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={s.status === "ACTIVE" ? "default" : s.status === "STOPPED" ? "secondary" : "outline"}>
                            {statusLabel}
                          </Badge>
                          <span className="font-medium">{s.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatBSMonthYear(s.startDate)} · {text("currentSalary", "Current salary")} रू {s.currentMonthlySalary.toFixed(0)}
                          </span>
                          <span
                            className={
                              s.balance > 0 ? "font-medium text-red-600" : s.balance < 0 ? "font-medium text-green-600" : "text-muted-foreground"
                            }
                          >
                            {text("balance", "Balance")}:{" "}
                            {s.balance > 0 ? text("due", "Due") : s.balance < 0 ? text("advance", "Advance") : "0"}{" "}
                            {s.balance !== 0 ? formatCurrency(s.balance) : ""}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {(s.status === "ACTIVE" || s.status === "STOPPED") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPayStaffId(s.id);
                                setPayForm({ amount: "", paidAt: getTodayLocalDate(), note: "", receiptImageUrl: "" });
                              }}
                              title={text("pay", "Pay")}
                            >
                              <DollarSign className="mr-1 h-4 w-4" />
                              {text("pay", "Pay")}
                            </Button>
                          )}
                          {s.status === "ACTIVE" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditSalaryStaffId(s.id);
                                setEditSalaryForm({ monthlySalary: String(s.currentMonthlySalary), effectiveFrom: getTodayLocalDate() });
                              }}
                              title={text("editSalary", "Edit salary")}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {s.status === "ACTIVE" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => setStopStaffId(s.id)}
                              title={text("stop", "Stop")}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          {s.status === "STOPPED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-amber-700"
                              disabled={!canArchive}
                              onClick={() => canArchive && setArchiveStaffId(s.id)}
                              title={canArchive ? "Archive" : "Settle balance before archiving"}
                            >
                              <Archive className="mr-1 h-4 w-4" />
                              Archive
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => setDetailsStaffId(s.id)} title={text("details", "Details")}>
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
            <BSMonthPicker
              label={text("startMonth", "Start month")}
              value={addForm.startDate?.split("T")[0] ?? getDefaultStartMonthAD()}
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
          <p className="text-muted-foreground">{text("stopConfirmMessage", "Salary will no longer accrue. Remaining balance will stay.")}</p>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setStopStaffId(null)}>
            {text("cancel", "Cancel")}
          </Button>
          <Button
            variant="destructive"
            className="bg-destructive text-white"
            disabled={stopMutation.isPending}
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
                      {text("accrual", "Accrual")} – {tx.bsYear}/{tx.bsMonth}
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
                    <span className="text-green-600">−{formatCurrency(tx.amount)}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </ModalContent>
      </Modal>
    </div>
  );
}
