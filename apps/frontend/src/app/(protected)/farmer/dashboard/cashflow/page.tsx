"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight, BarChart3, Settings } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Label } from "@/common/components/ui/label";
import { NepaliDatePicker } from "@/common/components/ui/nepali-date-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";

import { AccountBalancesCard } from "@/components/cashflow/AccountBalancesCard";
import { CashflowStatement } from "@/components/cashflow/CashflowStatement";
import { MovementsTable } from "@/components/cashflow/MovementsTable";
import { ManualMovementModal } from "@/components/cashflow/ManualMovementModal";
import { TransferModal } from "@/components/cashflow/TransferModal";

import {
  useDeleteCashflowMovement,
  useGetCashflowAccounts,
  useGetCashflowMovements,
  useGetCashflowReport,
  usePostManualMovement,
  usePostTransfer,
  type CashMovement,
} from "@/fetchers/farmer/farmerCashflowQueries";
import { convertADtoBS, toNepalDayAd } from "@/common/lib/nepali-date";

function currentBsMonthRange() {
  const todayBs = convertADtoBS(toNepalDayAd(new Date()));
  const [y, m] = todayBs.split("-");
  return { from: `${y}-${m}-01`, to: todayBs };
}

export default function FarmerCashflowPage() {
  const [range, setRange] = useState(currentBsMonthRange);
  const [dir, setDir] = useState<"IN" | "OUT" | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const accountsQ = useGetCashflowAccounts(false);
  const reportQ = useGetCashflowReport({ from: range.from, to: range.to });
  const movementsQ = useGetCashflowMovements({
    from: range.from,
    to: range.to,
  });

  const accounts = accountsQ.data ?? [];
  const movements = movementsQ.data ?? [];
  const cashId = useMemo(
    () => accounts.find((a) => a.type === "CASH")?.id ?? "",
    [accounts],
  );

  const addMovement = usePostManualMovement();
  const transfer = usePostTransfer();
  const del = useDeleteCashflowMovement();

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function handleDelete(m: CashMovement) {
    const legs = m.transferId
      ? "This transfer deletes both legs. Continue?"
      : "Delete this movement?";
    if (!window.confirm(legs)) return;
    setPendingDelete(m.id);
    try {
      await del.mutateAsync(m.id);
      toast.success("Movement deleted");
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Delete failed");
    } finally {
      setPendingDelete(null);
    }
  }

  const hasBanks = accounts.some(
    (a) => a.type === "BANK" && a.archivedAt === null,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Cashflow</h1>
        <Link
          href="/farmer/dashboard/cashflow/accounts"
          className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
        >
          <Settings className="h-4 w-4" />
          Accounts
        </Link>
      </header>

      <AccountBalancesCard accounts={accounts} />

      <Card>
        <CardContent className="py-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <Label>From (BS)</Label>
                <NepaliDatePicker
                  defaultDate={range.from}
                  onChange={(v) =>
                    setRange((prev) => ({ ...prev, from: v.bsDate }))
                  }
                />
              </div>
              <div>
                <Label>To (BS)</Label>
                <NepaliDatePicker
                  defaultDate={range.to}
                  onChange={(v) =>
                    setRange((prev) => ({ ...prev, to: v.bsDate }))
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDir("IN")}
                disabled={accounts.length === 0}
              >
                <ArrowDownLeft className="mr-1 h-4 w-4" />
                Cash in
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDir("OUT")}
                disabled={accounts.length === 0}
              >
                <ArrowUpRight className="mr-1 h-4 w-4" />
                Cash out
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTransferOpen(true)}
                disabled={!hasBanks}
                title={
                  hasBanks
                    ? undefined
                    : "Add a bank account before transferring"
                }
              >
                <ArrowRightLeft className="mr-1 h-4 w-4" />
                Transfer
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSummaryOpen(true)}
                disabled={!reportQ.data}
              >
                <BarChart3 className="mr-1 h-4 w-4" />
                Summary
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Movements
        </h2>
        <MovementsTable
          movements={movements}
          accounts={accounts}
          deleting={pendingDelete}
          onDelete={handleDelete}
        />
      </section>

      <ManualMovementModal
        open={dir !== null}
        onOpenChange={(v) => !v && setDir(null)}
        direction={dir ?? "IN"}
        accounts={accounts}
        defaultAccountId={cashId}
        submitting={addMovement.isPending}
        onSubmit={async (input) => {
          try {
            await addMovement.mutateAsync(input);
            toast.success("Movement recorded");
          } catch (e: unknown) {
            toast.error(
              (e as { response?: { data?: { message?: string } } })?.response?.data
                ?.message ?? "Could not record movement",
            );
            throw e;
          }
        }}
      />

      <TransferModal
        open={transferOpen}
        onOpenChange={setTransferOpen}
        accounts={accounts}
        submitting={transfer.isPending}
        onSubmit={async (input) => {
          try {
            await transfer.mutateAsync(input);
            toast.success("Transfer posted");
          } catch (e: unknown) {
            toast.error(
              (e as { response?: { data?: { message?: string } } })?.response?.data
                ?.message ?? "Transfer failed",
            );
            throw e;
          }
        }}
      />

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Cashflow summary</DialogTitle>
          </DialogHeader>
          {reportQ.data && <CashflowStatement report={reportQ.data} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
