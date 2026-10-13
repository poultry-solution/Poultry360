"use client";

import { useState } from "react";
import { ArrowDownLeft, ArrowUpRight, History, Lock, Trash2, Wallet } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import { DataTable, type Column } from "@/common/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import type {
  AddMovementInput,
  CashMovement,
  HistoryDay,
  TodayLedger,
  TodayResponse,
} from "@/fetchers/dealer/dealerCashInHandQueries";
import { useI18n } from "@/i18n/useI18n";
import { toast } from "sonner";
import { HistoryDayDetailDialog } from "@/components/cash-in-hand/HistoryDayDetailDialog";
import { formatCashAmount, formatNepalTime } from "@/components/cash-in-hand/cashFormat";

type QueryLike<T> = { data?: T; isLoading: boolean; error?: unknown };
type MutationLike<TInput, TResult = unknown> = {
  mutateAsync: (input: TInput) => Promise<TResult>;
  isPending: boolean;
};

/** The data hooks of one module (dealer or farmer). Each page passes its own. */
export interface CashInHandApi {
  apiBase: "/dealer/cash-in-hand" | "/farmer/cash-in-hand";
  useToday: (options?: { enabled?: boolean }) => QueryLike<TodayResponse>;
  useHistory: (options?: { enabled?: boolean }) => QueryLike<HistoryDay[]>;
  useSetup: () => MutationLike<number>;
  useAddMovement: () => MutationLike<AddMovementInput>;
  useDeleteMovement: () => MutationLike<string>;
  useCloseDay: () => {
    mutateAsync: () => Promise<{ closing: number; alreadyClosed: boolean }>;
    isPending: boolean;
  };
}

const money = formatCashAmount;

function sumMovements(movements: CashMovement[], direction: "IN" | "OUT") {
  return movements.filter((m) => m.direction === direction).reduce((sum, m) => sum + Number(m.amount || 0), 0);
}

/** Slim row of numbers, same look as the account pages. */
function SummaryStrip({ items }: { items: Array<{ label: string; value: string; className?: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="bg-white px-3 py-2.5">
          <p className="text-[11px] text-gray-500">{item.label}</p>
          <p className={`text-lg font-semibold leading-tight ${item.className ?? ""}`}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Setup ─────────────────────────────────────────────────────────────────────

function SetupScreen({ api }: { api: CashInHandApi }) {
  const { t } = useI18n();
  const [opening, setOpening] = useState("");
  const setupMutation = api.useSetup();

  const handleSetup = async () => {
    const amt = Number(opening);
    if (opening.trim() === "" || isNaN(amt) || amt < 0) {
      toast.error("Enter a valid opening balance (0 or more)");
      return;
    }
    try {
      await setupMutation.mutateAsync(amt);
      toast.success("Cash book set up successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to set up cash book");
    }
  };

  return (
    <div className="mx-auto mt-6 max-w-md rounded-xl border border-gray-200 bg-white p-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
        <Wallet className="h-5 w-5 text-primary" />
      </span>
      <h2 className="mt-4 text-lg font-semibold">{t("cashInHand.setup.title")}</h2>
      <p className="mt-1 text-sm text-gray-500">{t("cashInHand.setup.description")}</p>
      <div className="mt-5 space-y-2">
        <Label htmlFor="cash-opening">{t("cashInHand.setup.label")}</Label>
        <Input
          id="cash-opening"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder={t("cashInHand.setup.placeholder")}
          value={opening}
          onChange={(e) => setOpening(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSetup()}
          className="h-11 text-lg"
          autoFocus
        />
      </div>
      <Button className="mt-4 h-11 w-full" onClick={handleSetup} disabled={setupMutation.isPending}>
        {setupMutation.isPending ? "Setting up…" : t("cashInHand.setup.button")}
      </Button>
    </div>
  );
}

// ── Cash in / out dialog ──────────────────────────────────────────────────────

function MovementDialog({
  api,
  direction,
  closingNow,
  open,
  onOpenChange,
}: {
  api: CashInHandApi;
  direction: "IN" | "OUT";
  closingNow: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [amount, setAmount] = useState("");
  const [partyName, setPartyName] = useState("");
  const [notes, setNotes] = useState("");
  const addMutation = api.useAddMovement();
  const isIn = direction === "IN";
  const amountValue = Number(amount);
  const hasAmount = amount !== "" && Number.isFinite(amountValue) && amountValue > 0;

  const handleClose = () => {
    setAmount("");
    setPartyName("");
    setNotes("");
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!hasAmount) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!partyName.trim()) {
      toast.error("Party name is required");
      return;
    }
    try {
      await addMutation.mutateAsync({ direction, amount: amountValue, partyName, notes: notes || undefined });
      toast.success(`Cash ${isIn ? "in" : "out"} recorded`);
      handleClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to record movement");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="bg-white sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={`flex h-8 w-8 items-center justify-center rounded-full ${isIn ? "bg-green-100" : "bg-red-100"}`}>
              {isIn ? <ArrowDownLeft className="h-4 w-4 text-green-700" /> : <ArrowUpRight className="h-4 w-4 text-red-700" />}
            </span>
            {isIn ? "Cash in" : "Cash out"}
          </DialogTitle>
          <DialogDescription>{isIn ? "Money you received in cash." : "Money you paid out in cash."}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="cash-amount">{t("cashInHand.movement.amount")}</Label>
            <Input
              id="cash-amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-11 text-lg"
              autoFocus
            />
            {hasAmount ? (
              <p className="text-xs text-gray-500">
                Cash after this: <span className="font-medium text-gray-900">{money(closingNow + (isIn ? amountValue : -amountValue))}</span>
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cash-party">{t("cashInHand.movement.party")}</Label>
            <Input
              id="cash-party"
              placeholder={t("cashInHand.movement.partyPlaceholder")}
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cash-notes">{t("cashInHand.movement.notes")}</Label>
            <Textarea
              id="cash-notes"
              placeholder={t("cashInHand.movement.notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={addMutation.isPending}
              className={isIn ? "bg-green-600 text-white hover:bg-green-700" : "bg-red-600 text-white hover:bg-red-700"}
            >
              {addMutation.isPending ? "Saving…" : isIn ? "Save cash in" : "Save cash out"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Today ─────────────────────────────────────────────────────────────────────

function TodayView({ api, data }: { api: CashInHandApi; data: TodayLedger }) {
  const { t } = useI18n();
  const [movementDirection, setMovementDirection] = useState<"IN" | "OUT" | null>(null);
  const [closeDayOpen, setCloseDayOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CashMovement | null>(null);
  const closeMutation = api.useCloseDay();
  const deleteMutation = api.useDeleteMovement();

  const cashIn = sumMovements(data.movements, "IN");
  const cashOut = sumMovements(data.movements, "OUT");

  const handleCloseDay = async () => {
    try {
      const result = await closeMutation.mutateAsync();
      if (result.alreadyClosed) toast.info("Day was already closed");
      else toast.success(`Day closed. Closing balance: ${money(result.closing)}`);
      setCloseDayOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to close day");
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      toast.success(t("cashInHand.deleteMovementSuccess"));
      setPendingDelete(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("cashInHand.deleteMovementError"));
    }
  };

  const columns: Column<CashMovement>[] = [
    { key: "createdAt", label: "Time", width: "90px", render: (value) => <span className="text-sm text-gray-600">{formatNepalTime(value)}</span> },
    { key: "partyName", label: "Party", width: "150px", render: (value) => <span className="font-medium">{value}</span> },
    { key: "notes", label: "Note", width: "160px", render: (value) => <span className="text-xs text-gray-500">{value || "—"}</span> },
    {
      key: "in",
      label: "Cash in",
      align: "right",
      width: "110px",
      render: (_v, row) => row.direction === "IN" ? <span className="font-semibold text-green-700">+ {money(row.amount)}</span> : <span className="text-gray-300">—</span>,
    },
    {
      key: "out",
      label: "Cash out",
      align: "right",
      width: "110px",
      render: (_v, row) => row.direction === "OUT" ? <span className="font-semibold text-red-600">− {money(row.amount)}</span> : <span className="text-gray-300">—</span>,
    },
    ...(!data.isClosed
      ? [{
          key: "actions",
          label: "",
          align: "right" as const,
          width: "56px",
          render: (_v: unknown, row: CashMovement) => (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
              aria-label={t("cashInHand.deleteMovement")}
              title={t("cashInHand.deleteMovement")}
              onClick={() => setPendingDelete(row)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ),
        }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <SummaryStrip
        items={[
          { label: t("cashInHand.opening"), value: money(data.opening) },
          { label: "Cash in", value: `+ ${money(cashIn)}`, className: "text-green-700" },
          { label: "Cash out", value: `− ${money(cashOut)}`, className: "text-red-600" },
          {
            label: data.isClosed ? t("cashInHand.closingFinal") : "Cash now",
            value: money(data.closing),
            className: data.closing < 0 ? "text-red-600" : "text-gray-900",
          },
        ]}
      />

      {data.isClosed ? (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
          <Lock className="h-4 w-4 shrink-0" />
          <span>
            {t("cashInHand.closed")}
            {data.closedAt ? ` at ${formatNepalTime(data.closedAt)}` : ""}. New entries can be added tomorrow.
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Button className="h-11 bg-green-600 text-base text-white hover:bg-green-700" onClick={() => setMovementDirection("IN")}>
              <ArrowDownLeft className="h-5 w-5" />
              Cash in
            </Button>
            <Button className="h-11 bg-red-600 text-base text-white hover:bg-red-700" onClick={() => setMovementDirection("OUT")}>
              <ArrowUpRight className="h-5 w-5" />
              Cash out
            </Button>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setCloseDayOpen(true)}>
              <Lock className="h-4 w-4" />
              {t("cashInHand.closeDay")}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Today&apos;s entries <span className="font-normal normal-case tracking-normal">· {data.movements.length}</span>
        </p>
        <DataTable data={data.movements} columns={columns} emptyMessage={t("cashInHand.noMovements")} getRowKey={(row) => row.id} />
      </div>

      {movementDirection ? (
        <MovementDialog
          api={api}
          direction={movementDirection}
          closingNow={data.closing}
          open={!!movementDirection}
          onOpenChange={(open) => !open && setMovementDirection(null)}
        />
      ) : null}

      {/* Close day */}
      <Dialog open={closeDayOpen} onOpenChange={setCloseDayOpen}>
        <DialogContent className="bg-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("cashInHand.closeDayConfirm.title")}</DialogTitle>
            <DialogDescription>{t("cashInHand.closeDayConfirm.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Opening</span><span>{money(data.opening)}</span></div>
            <div className="flex justify-between text-green-700"><span>Cash in</span><span>+ {money(cashIn)}</span></div>
            <div className="flex justify-between text-red-600"><span>Cash out</span><span>− {money(cashOut)}</span></div>
            <div className="flex justify-between border-t border-gray-100 pt-1.5 font-semibold"><span>Closing</span><span>{money(data.closing)}</span></div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCloseDayOpen(false)}>{t("cashInHand.closeDayConfirm.cancel")}</Button>
            <Button onClick={handleCloseDay} disabled={closeMutation.isPending}>
              {closeMutation.isPending ? "Closing…" : t("cashInHand.closeDayConfirm.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete entry */}
      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent className="bg-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("cashInHand.deleteMovementConfirm.title")}</DialogTitle>
            <DialogDescription>{t("cashInHand.deleteMovementConfirm.description")}</DialogDescription>
          </DialogHeader>
          {pendingDelete ? (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm">
              <span className="font-medium">{pendingDelete.partyName}</span>
              <span className={pendingDelete.direction === "IN" ? "text-green-700" : "text-red-600"}>
                {pendingDelete.direction === "IN" ? "+" : "−"} {money(pendingDelete.amount)}
              </span>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" disabled={deleteMutation.isPending} onClick={() => setPendingDelete(null)}>
              {t("cashInHand.deleteMovementConfirm.cancel")}
            </Button>
            <Button className="bg-red-600 text-white hover:bg-red-700" disabled={deleteMutation.isPending} onClick={handleConfirmDelete}>
              {deleteMutation.isPending ? "Deleting…" : t("cashInHand.deleteMovementConfirm.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── History ───────────────────────────────────────────────────────────────────

function HistoryView({ api }: { api: CashInHandApi }) {
  const { t } = useI18n();
  const { data: history, isLoading } = api.useHistory();
  const [detailBsDate, setDetailBsDate] = useState<string | null>(null);

  const columns: Column<HistoryDay>[] = [
    { key: "bsDate", label: "Date", width: "110px", render: (value) => <span className="font-medium">{value}</span> },
    { key: "openingSnapshot", label: "Opening", align: "right", width: "120px", render: (value) => money(value) },
    {
      key: "change",
      label: "Change",
      align: "right",
      width: "110px",
      render: (_v, row) => {
        const change = Number(row.closingSnapshot) - Number(row.openingSnapshot);
        if (change === 0) return <span className="text-gray-400">0</span>;
        return <span className={change > 0 ? "text-green-700" : "text-red-600"}>{change > 0 ? "+" : "−"} {money(Math.abs(change))}</span>;
      },
    },
    {
      key: "closingSnapshot",
      label: "Closing",
      align: "right",
      width: "120px",
      render: (value) => <span className={`font-semibold ${Number(value) < 0 ? "text-red-600" : ""}`}>{money(value)}</span>,
    },
    { key: "movementsCount", label: "Entries", align: "right", width: "80px" , render: (value) => value },
    {
      key: "source",
      label: "Closed",
      width: "110px",
      render: (value) => (
        <span className={`rounded-full px-2 py-0.5 text-xs ${value === "SYSTEM" ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-800"}`}>
          {value === "SYSTEM" ? t("cashInHand.historyDetail.autoClosed") : t("cashInHand.historyDetail.closedByYou")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">{t("cashInHand.historyDetail.tapHint")}</p>
      <DataTable
        data={history ?? []}
        columns={columns}
        loading={isLoading}
        emptyMessage={t("cashInHand.historyEmpty")}
        getRowKey={(row) => row.bsDate}
        onRowClick={(row) => setDetailBsDate(row.bsDate)}
      />
      <HistoryDayDetailDialog
        open={!!detailBsDate}
        onOpenChange={(open) => !open && setDetailBsDate(null)}
        bsDate={detailBsDate}
        apiBase={api.apiBase}
      />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function CashInHandView({ api }: { api: CashInHandApi }) {
  const { t } = useI18n();
  const { data, isLoading, error } = api.useToday();
  const [tab, setTab] = useState<"today" | "history">("today");

  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <div className="flex justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  } else if (error) {
    body = (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
        Failed to load cash data. Please refresh.
      </div>
    );
  } else if (!data) {
    body = null;
  } else if (data.needsSetup) {
    body = <SetupScreen api={api} />;
  } else {
    body = (
      <div className="space-y-4">
        <div className="flex gap-1 border-b border-gray-200">
          {([
            { key: "today", label: t("cashInHand.today"), icon: Wallet },
            { key: "history", label: t("cashInHand.history"), icon: History },
          ] as const).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === item.key ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-900"}`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </div>
        {tab === "today" ? <TodayView api={api} data={data as TodayLedger} /> : <HistoryView api={api} />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("cashInHand.title")}</h1>
          <p className="text-sm text-gray-500">{t("cashInHand.subtitle")}</p>
        </div>
        {data?.todayBs ? (
          <span className="w-fit rounded-full border border-gray-200 bg-white px-3 py-1 text-sm">
            <span className="text-gray-500">{t("cashInHand.today")}:</span> <span className="font-medium">{data.todayBs}</span>
          </span>
        ) : null}
      </div>
      {body}
    </div>
  );
}
