"use client";

import { useState } from "react";
import { Wallet, ArrowDownLeft, ArrowUpRight, Lock, History, Plus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Badge } from "@/common/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
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
import { Textarea } from "@/common/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs";
import {
  useGetCashToday,
  useGetCashHistory,
  useSetupCashBook,
  useAddCashMovement,
  useCloseCashDay,
  type TodayLedger,
} from "@/fetchers/dealer/dealerCashInHandQueries";
import { useI18n } from "@/i18n/useI18n";
import { toast } from "sonner";

function formatNPR(value: number) {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// ── Setup screen ──────────────────────────────────────────────────────────────

function SetupScreen() {
  const { t } = useI18n();
  const [opening, setOpening] = useState("");
  const setupMutation = useSetupCashBook();

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
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <CardTitle>{t("cashInHand.setup.title")}</CardTitle>
          </div>
          <CardDescription>{t("cashInHand.setup.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="opening">{t("cashInHand.setup.label")}</Label>
            <Input
              id="opening"
              type="number"
              min="0"
              step="0.01"
              placeholder={t("cashInHand.setup.placeholder")}
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSetup()}
            />
          </div>
          <Button
            className="w-full"
            onClick={handleSetup}
            disabled={setupMutation.isPending}
          >
            {setupMutation.isPending ? "Setting up…" : t("cashInHand.setup.button")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Movement dialog ───────────────────────────────────────────────────────────

interface MovementDialogProps {
  direction: "IN" | "OUT";
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function MovementDialog({ direction, open, onOpenChange }: MovementDialogProps) {
  const { t } = useI18n();
  const [amount, setAmount] = useState("");
  const [partyName, setPartyName] = useState("");
  const [notes, setNotes] = useState("");
  const addMutation = useAddCashMovement();

  const handleClose = () => {
    setAmount("");
    setPartyName("");
    setNotes("");
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    const amt = Number(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!partyName.trim()) {
      toast.error("Party name is required");
      return;
    }
    try {
      await addMutation.mutateAsync({ direction, amount: amt, partyName, notes: notes || undefined });
      toast.success(`Cash ${direction === "IN" ? "in" : "out"} recorded`);
      handleClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to record movement");
    }
  };

  const isIn = direction === "IN";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isIn ? (
              <ArrowDownLeft className="h-5 w-5 text-green-600" />
            ) : (
              <ArrowUpRight className="h-5 w-5 text-red-600" />
            )}
            {isIn ? t("cashInHand.addIn") : t("cashInHand.addOut")}
          </DialogTitle>
          <DialogDescription>
            {isIn ? "Record cash received" : "Record cash paid out"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t("cashInHand.movement.amount")}</Label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("cashInHand.movement.party")}</Label>
            <Input
              placeholder={t("cashInHand.movement.partyPlaceholder")}
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("cashInHand.movement.notes")}</Label>
            <Textarea
              placeholder={t("cashInHand.movement.notesPlaceholder")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={addMutation.isPending}
            className={isIn ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
          >
            {addMutation.isPending ? "Saving…" : t("cashInHand.movement.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Today ledger ──────────────────────────────────────────────────────────────

function TodayLedgerView({ data }: { data: TodayLedger }) {
  const { t } = useI18n();
  const [inOpen, setInOpen] = useState(false);
  const [outOpen, setOutOpen] = useState(false);
  const [closeDayOpen, setCloseDayOpen] = useState(false);
  const closeMutation = useCloseCashDay();

  const handleCloseDay = async () => {
    try {
      const result = await closeMutation.mutateAsync();
      if (result.alreadyClosed) {
        toast.info("Day was already closed");
      } else {
        toast.success(`Day closed. Closing balance: ${formatNPR(result.closing)}`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to close day");
    } finally {
      setCloseDayOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t("cashInHand.opening")}</CardDescription>
            <CardTitle className="text-2xl">{formatNPR(data.opening)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {data.isClosed ? t("cashInHand.closingFinal") : t("cashInHand.closing")}
            </CardDescription>
            <CardTitle
              className={`text-2xl ${data.closing < 0 ? "text-red-600" : "text-green-700"}`}
            >
              {formatNPR(data.closing)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <div className="pt-1">
              {data.isClosed ? (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" /> {t("cashInHand.closed")}
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-green-700 border-green-600">
                  Open
                </Badge>
              )}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Action buttons */}
      {!data.isClosed && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            className="gap-1.5 bg-green-600 hover:bg-green-700"
            onClick={() => setInOpen(true)}
          >
            <ArrowDownLeft className="h-4 w-4" />
            {t("cashInHand.addIn")}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1.5"
            onClick={() => setOutOpen(true)}
          >
            <ArrowUpRight className="h-4 w-4" />
            {t("cashInHand.addOut")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 ml-auto"
            onClick={() => setCloseDayOpen(true)}
          >
            <Lock className="h-4 w-4" />
            {t("cashInHand.closeDay")}
          </Button>
        </div>
      )}

      {/* Movements list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today's Movements</CardTitle>
        </CardHeader>
        <CardContent>
          {data.movements.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {t("cashInHand.noMovements")}
            </p>
          ) : (
            <div className="divide-y">
              {data.movements.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {m.direction === "IN" ? (
                      <div className="rounded-full bg-green-100 p-1.5">
                        <ArrowDownLeft className="h-4 w-4 text-green-700" />
                      </div>
                    ) : (
                      <div className="rounded-full bg-red-100 p-1.5">
                        <ArrowUpRight className="h-4 w-4 text-red-700" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{m.partyName}</p>
                      {m.notes && (
                        <p className="text-xs text-muted-foreground">{m.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold ${
                        m.direction === "IN" ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {m.direction === "IN" ? "+" : "-"}
                      {formatNPR(m.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Movement dialogs */}
      <MovementDialog direction="IN" open={inOpen} onOpenChange={setInOpen} />
      <MovementDialog direction="OUT" open={outOpen} onOpenChange={setOutOpen} />

      {/* Close day confirm */}
      <AlertDialog open={closeDayOpen} onOpenChange={setCloseDayOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cashInHand.closeDayConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("cashInHand.closeDayConfirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cashInHand.closeDayConfirm.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCloseDay}
              disabled={closeMutation.isPending}
            >
              {t("cashInHand.closeDayConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── History tab ───────────────────────────────────────────────────────────────

function HistoryView() {
  const { t } = useI18n();
  const { data: history, isLoading } = useGetCashHistory();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        {t("cashInHand.historyEmpty")}
      </p>
    );
  }

  return (
    <div className="divide-y rounded-lg border">
      {history.map((day) => (
        <div key={day.bsDate} className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">{day.bsDate}</p>
            <p className="text-xs text-muted-foreground">
              {day.movementsCount} movement{day.movementsCount !== 1 ? "s" : ""} ·{" "}
              {day.source === "SYSTEM" ? "Auto-closed" : "Closed by you"}
            </p>
          </div>
          <div className="text-right space-y-0.5">
            <p className="text-xs text-muted-foreground">
              Open: {formatNPR(day.openingSnapshot)}
            </p>
            <p
              className={`text-sm font-semibold ${
                day.closingSnapshot < 0 ? "text-red-600" : "text-green-700"
              }`}
            >
              Close: {formatNPR(day.closingSnapshot)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CashInHandPage() {
  const { t } = useI18n();
  const { data, isLoading, error } = useGetCashToday();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-sm text-destructive">Failed to load cash data. Please refresh.</p>
      </div>
    );
  }

  if (!data) return null;

  if (data.needsSetup) {
    return (
      <div className="container max-w-2xl py-6">
        <SetupScreen />
      </div>
    );
  }

  const ledger = data as TodayLedger;

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold">{t("cashInHand.title")}</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{t("cashInHand.subtitle")}</p>
      </div>

      {/* BS date badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{t("cashInHand.today")}:</span>
        <Badge variant="outline" className="font-mono text-sm">{ledger.todayBs}</Badge>
      </div>

      {/* Tabs: Today / History */}
      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Today
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-3.5 w-3.5" /> {t("cashInHand.history")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="today" className="mt-4">
          <TodayLedgerView data={ledger} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
