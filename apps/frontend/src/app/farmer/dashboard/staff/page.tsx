"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Users, Plus, Pencil, Trash2, DollarSign, Eye, Loader2 } from "lucide-react";
import {
  Modal,
  ModalContent,
  ModalFooter,
} from "@/common/components/ui/modal";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { DateInput } from "@/common/components/ui/date-input";
import { BSMonthPicker } from "@/common/components/ui/bs-month-picker";
import { ImageUpload } from "@/common/components/ui/image-upload";
import { useI18n } from "@/i18n/useI18n";
import { getTodayLocalDate } from "@/common/lib/utils";
import { formatBSMonthYear, getBSYearMonthFromAD, getFirstDayOfBSMonthAD } from "@/common/lib/nepali-date";
import {
  useStaffList,
  useCreateStaff,
  useUpdateStaff,
  useStopStaff,
  useAddStaffPayment,
  useStaffTransactions,
  type StaffItem,
} from "@/fetchers/staff/staffQueries";
import { DateDisplay } from "@/common/components/ui/date-display";

const OWNER: "farmer" | "dealer" = "farmer";

function formatCurrency(amount: number): string {
  return `रू ${Math.abs(amount).toFixed(0)}`;
}

function getDefaultStartMonthAD(): string {
  const { year, month } = getBSYearMonthFromAD(new Date());
  return getFirstDayOfBSMonthAD(year, month);
}

export default function FarmerStaffPage() {
  const { t } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  const [payStaffId, setPayStaffId] = useState<string | null>(null);
  const [editSalaryStaffId, setEditSalaryStaffId] = useState<string | null>(null);
  const [stopStaffId, setStopStaffId] = useState<string | null>(null);
  const [detailsStaffId, setDetailsStaffId] = useState<string | null>(null);

  const [addForm, setAddForm] = useState({ name: "", startDate: getDefaultStartMonthAD(), monthlySalary: "" });
  const [payForm, setPayForm] = useState({ amount: "", paidAt: getTodayLocalDate(), note: "", receiptImageUrl: "" });
  const [editSalaryForm, setEditSalaryForm] = useState({ monthlySalary: "", effectiveFrom: getTodayLocalDate() });

  const { data, isLoading } = useStaffList(OWNER);
  const createMutation = useCreateStaff(OWNER);
  const updateMutation = useUpdateStaff(OWNER);
  const stopMutation = useStopStaff(OWNER);
  const addPaymentMutation = useAddStaffPayment(OWNER);
  const { data: transactionsData } = useStaffTransactions(OWNER, detailsStaffId);

  const staffList: StaffItem[] = data?.data ?? [];
  const transactions = transactionsData?.data?.transactions ?? [];
  const detailsBalance = transactionsData?.data?.balance ?? 0;

  const handleCreate = async () => {
    const name = addForm.name.trim();
    const salary = parseFloat(addForm.monthlySalary);
    if (!name || isNaN(salary) || salary < 0 || !addForm.startDate) return;
    await createMutation.mutateAsync({
      name,
      startDate: addForm.startDate.includes("T") ? addForm.startDate.split("T")[0] + "T00:00:00.000Z" : addForm.startDate + "T00:00:00.000Z",
      monthlySalary: salary,
    });
    setAddOpen(false);
    setAddForm({ name: "", startDate: getDefaultStartMonthAD(), monthlySalary: "" });
  };

  const handlePay = async () => {
    if (!payStaffId) return;
    const amount = parseFloat(payForm.amount);
    if (isNaN(amount) || amount <= 0 || !payForm.paidAt) return;
    const paidAt = payForm.paidAt.includes("T") ? payForm.paidAt : payForm.paidAt + "T12:00:00.000Z";
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
    const d = editSalaryForm.effectiveFrom.includes("T") ? editSalaryForm.effectiveFrom.split("T")[0] : editSalaryForm.effectiveFrom;
    const effectiveFrom = d.includes("-") ? d + "T00:00:00.000Z" : getTodayLocalDate() + "T00:00:00.000Z";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            {t("farmer.staff.title")}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{t("farmer.staff.subtitle")}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("farmer.staff.addStaff")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("farmer.staff.title")}</CardTitle>
          <CardDescription>{t("farmer.staff.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : staffList.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">{t("farmer.staff.empty")}</p>
          ) : (
            <div className="space-y-3">
              {staffList.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={s.status === "ACTIVE" ? "default" : "secondary"}>
                      {s.status === "ACTIVE" ? t("farmer.staff.statusActive") : t("farmer.staff.statusStopped")}
                    </Badge>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground text-sm">
                      {formatBSMonthYear(s.startDate)} · {t("farmer.staff.currentSalary")} रू {s.currentMonthlySalary.toFixed(0)}
                    </span>
                    <span
                      className={
                        s.balance > 0
                          ? "text-red-600 font-medium"
                          : s.balance < 0
                            ? "text-green-600 font-medium"
                            : "text-muted-foreground"
                      }
                    >
                      {t("farmer.staff.balance")}: {s.balance > 0 ? t("farmer.staff.due") : s.balance < 0 ? t("farmer.staff.advance") : "0"}{" "}
                      {s.balance !== 0 ? formatCurrency(s.balance) : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setPayStaffId(s.id);
                        setPayForm({ amount: "", paidAt: getTodayLocalDate(), note: "", receiptImageUrl: "" });
                      }}
                      title={t("farmer.staff.pay")}
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      {t("farmer.staff.pay")}
                    </Button>
                    {s.status === "ACTIVE" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditSalaryStaffId(s.id);
                          setEditSalaryForm({ monthlySalary: String(s.currentMonthlySalary), effectiveFrom: getTodayLocalDate() });
                        }}
                        title={t("farmer.staff.editSalary")}
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
                        title={t("farmer.staff.stop")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDetailsStaffId(s.id)}
                      title={t("farmer.staff.details")}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add staff modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title={t("farmer.staff.addStaff")}>
        <ModalContent>
          <div className="space-y-4">
            <div>
              <Label>{t("farmer.staff.name")}</Label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t("farmer.staff.name")}
              />
            </div>
            <BSMonthPicker
              label={t("farmer.staff.startMonth")}
              value={addForm.startDate?.split("T")[0] ?? getDefaultStartMonthAD()}
              onChange={(v) => setAddForm((f) => ({ ...f, startDate: v }))}
            />
            <div>
              <Label>{t("farmer.staff.monthlySalary")}</Label>
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
            {t("farmer.staff.cancel")}
          </Button>
          <Button
            disabled={!addForm.name.trim() || !addForm.startDate || parseFloat(addForm.monthlySalary) < 0 || createMutation.isPending}
            onClick={handleCreate}
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("farmer.staff.save")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Pay modal */}
      <Modal isOpen={!!payStaffId} onClose={() => setPayStaffId(null)} title={t("farmer.staff.addPayment")}>
        <ModalContent>
          <div className="space-y-4">
            <div>
              <Label>{t("farmer.staff.amount")}</Label>
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
              <Label>{t("farmer.staff.date")}</Label>
              <DateInput
                value={payForm.paidAt}
                onChange={(v) => setPayForm((f) => ({ ...f, paidAt: v?.split("T")[0] ?? getTodayLocalDate() }))}
              />
            </div>
            <div>
              <Label>{t("farmer.staff.note")}</Label>
              <Input
                value={payForm.note}
                onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))}
                placeholder={t("farmer.staff.note")}
              />
            </div>
            <div>
              <Label>{t("farmer.staff.receiptImage")}</Label>
              <ImageUpload
                folder="payment-receipts"
                value={payForm.receiptImageUrl}
                onChange={(url) => setPayForm((f) => ({ ...f, receiptImageUrl: url }))}
                placeholder={t("farmer.staff.receiptImage")}
              />
            </div>
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setPayStaffId(null)}>
            {t("farmer.staff.cancel")}
          </Button>
          <Button
            disabled={!payForm.amount || parseFloat(payForm.amount) <= 0 || addPaymentMutation.isPending}
            onClick={handlePay}
          >
            {addPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("farmer.staff.save")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit salary modal */}
      <Modal isOpen={!!editSalaryStaffId} onClose={() => setEditSalaryStaffId(null)} title={t("farmer.staff.editSalary")}>
        <ModalContent>
          <div className="space-y-4">
            <div>
              <Label>{t("farmer.staff.monthlySalary")}</Label>
              <Input
                type="number"
                min={0}
                value={editSalaryForm.monthlySalary}
                onChange={(e) => setEditSalaryForm((f) => ({ ...f, monthlySalary: e.target.value }))}
                placeholder="0"
              />
            </div>
            <BSMonthPicker
              label={t("farmer.staff.effectiveFrom")}
              value={editSalaryForm.effectiveFrom?.split("T")[0] ?? getTodayLocalDate()}
              onChange={(v) => setEditSalaryForm((f) => ({ ...f, effectiveFrom: v }))}
            />
          </div>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setEditSalaryStaffId(null)}>
            {t("farmer.staff.cancel")}
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
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("farmer.staff.save")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Stop confirm */}
      <Modal
        isOpen={!!stopStaffId}
        onClose={() => setStopStaffId(null)}
        title={t("farmer.staff.stopConfirmTitle")}
      >
        <ModalContent>
          <p className="text-muted-foreground">{t("farmer.staff.stopConfirmMessage")}</p>
        </ModalContent>
        <ModalFooter>
          <Button variant="outline" onClick={() => setStopStaffId(null)}>
            {t("farmer.staff.cancel")}
          </Button>
          <Button
            variant="destructive"
            className="bg-destructive text-white"
            disabled={stopMutation.isPending}
            onClick={() => stopStaffId && handleStop(stopStaffId)}
          >
            {stopMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {t("farmer.staff.stop")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Details / Transactions */}
      <Modal
        isOpen={!!detailsStaffId}
        onClose={() => setDetailsStaffId(null)}
        title={t("farmer.staff.details")}
        className="max-w-lg"
      >
        <ModalContent>
          <p className="text-sm font-medium mb-2">
            {t("farmer.staff.balance")}:{" "}
            <span className={detailsBalance > 0 ? "text-red-600" : detailsBalance < 0 ? "text-green-600" : ""}>
              {detailsBalance > 0 ? t("farmer.staff.due") : detailsBalance < 0 ? t("farmer.staff.advance") : "0"}{" "}
              {formatCurrency(detailsBalance)}
            </span>
          </p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {transactions.map((tx, i) => (
              <div key={tx.type === "payment" ? tx.id : `accrual-${i}`} className="flex justify-between text-sm border-b pb-1">
                {tx.type === "accrual" ? (
                  <>
                    <span>
                      {t("farmer.staff.accrual")} – {tx.bsYear}/{tx.bsMonth}
                    </span>
                    <span className="font-medium">+{formatCurrency(tx.amount)}</span>
                  </>
                ) : (
                  <>
                    <span>
                      {t("farmer.staff.payment")} <DateDisplay date={tx.paidAt} />
                      {tx.note ? ` · ${tx.note}` : ""}
                      {tx.receiptImageUrl && (
                        <a href={tx.receiptImageUrl} target="_blank" rel="noopener noreferrer" className="ml-1 text-primary underline">
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
