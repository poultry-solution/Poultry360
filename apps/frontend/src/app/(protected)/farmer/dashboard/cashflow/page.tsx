"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  BarChart3,
  Filter,
  Settings,
  Wallet,
  X,
} from "lucide-react";
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
import { CashflowDeleteConfirmDialog } from "@/components/cashflow/CashflowDeleteConfirmDialog";

import {
  useDeleteCashflowMovement,
  useGetCashflowAccounts,
  useGetCashflowMovements,
  useGetCashflowReport,
  usePostManualMovement,
  usePostTransfer,
  type CashMovement,
} from "@/fetchers/farmer/farmerCashflowQueries";
import {
  convertADtoBS,
  toNepalDayAd,
} from "@/common/lib/nepali-date";

function todayBsRange() {
  const todayBs = convertADtoBS(toNepalDayAd(new Date()));
  // Default view is "today only". Any wider range is a user-driven filter.
  return { from: todayBs, to: todayBs };
}

/**
 * Dismissal is per-browser (localStorage). An existing farmer who already
 * set their opening balance via the account edit UI auto-clears the banner
 * because the showing condition (openingBalance === 0 && no movements) goes
 * false; we only need manual dismissal for the "I genuinely start at 0" user.
 */
const OPENING_BANNER_DISMISSED_KEY =
  "farmer-cashflow:opening-balance-banner-dismissed";

function useOpeningBalanceBannerDismissed(): [boolean, () => void] {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    try {
      setDismissed(
        window.localStorage.getItem(OPENING_BANNER_DISMISSED_KEY) === "true",
      );
    } catch {
      // Private mode or quota error — leave default (not dismissed).
    }
  }, []);
  function dismiss() {
    try {
      window.localStorage.setItem(OPENING_BANNER_DISMISSED_KEY, "true");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }
  return [dismissed, dismiss];
}

export default function FarmerCashflowPage() {
  const [range, setRange] = useState(todayBsRange);
  const [dir, setDir] = useState<"IN" | "OUT" | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const defaultRange = useMemo(todayBsRange, []);
  const isFiltered =
    range.from !== defaultRange.from || range.to !== defaultRange.to;

  const accountsQ = useGetCashflowAccounts(false);
  const reportQ = useGetCashflowReport({ from: range.from, to: range.to });
  const movementsQ = useGetCashflowMovements({
    from: range.from,
    to: range.to,
  });

  const accounts = accountsQ.data ?? [];
  const movements = movementsQ.data ?? [];
  const cashAccount = useMemo(
    () => accounts.find((a) => a.type === "CASH"),
    [accounts],
  );
  const cashId = cashAccount?.id ?? "";

  const [bannerDismissed, dismissBanner] = useOpeningBalanceBannerDismissed();
  const showOpeningBanner =
    accountsQ.isSuccess &&
    !bannerDismissed &&
    cashAccount !== undefined &&
    cashAccount.openingBalance === 0 &&
    cashAccount.hasMovements === false;

  const addMovement = usePostManualMovement();
  const transfer = usePostTransfer();
  const del = useDeleteCashflowMovement();

  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CashMovement | null>(null);

  async function confirmDelete(password: string) {
    if (!deleteTarget) return;
    setPendingDelete(deleteTarget.id);
    try {
      await del.mutateAsync({ id: deleteTarget.id, password });
      toast.success("Movement deleted");
      setDeleteTarget(null);
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

      {showOpeningBanner && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
            <Wallet className="h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">
                Set your starting Cash balance
              </p>
              <p className="text-xs text-muted-foreground">
                Enter whatever cash you had before you started using
                Poultry360. Every sale, expense and payment you record from
                now on builds on this.
              </p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button type="button" size="sm" asChild>
                <Link href="/farmer/dashboard/cashflow/accounts">Set it</Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={dismissBanner}
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AccountBalancesCard accounts={accounts} />

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={() => setDir("IN")}
              disabled={accounts.length === 0}
              className="bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
            >
              <ArrowDownLeft className="mr-1 h-4 w-4" />
              Cash in
            </Button>
            <Button
              type="button"
              variant="destructive"
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

            <div className="flex w-full items-center justify-end gap-2 sm:ml-auto sm:w-auto">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSummaryOpen(true)}
                disabled={!reportQ.data}
              >
                <BarChart3 className="mr-1 h-4 w-4" />
                Summary
              </Button>
              <Button
                type="button"
                variant={isFiltered ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterOpen((v) => !v)}
                aria-pressed={filterOpen}
              >
                <Filter className="mr-1 h-4 w-4" />
                Filter
                {isFiltered && (
                  <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-primary-foreground/80" />
                )}
              </Button>
            </div>
          </div>

          {filterOpen && (
            <div className="mt-4 flex flex-wrap items-end gap-3 border-t pt-4">
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
              {isFiltered && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setRange(defaultRange)}
                >
                  Reset to today
                </Button>
              )}
            </div>
          )}
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
          onDelete={setDeleteTarget}
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

      <CashflowDeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.transferId ? "Delete transfer?" : "Delete movement?"}
        description={
          deleteTarget?.transferId
            ? "This will permanently delete both sides of this transfer."
            : "This will permanently delete this movement."
        }
        confirmLabel={deleteTarget?.transferId ? "Delete transfer" : "Delete movement"}
        submitting={del.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
