"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bird, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Label } from "@/common/components/ui/label";
import { AppLoadingScreen } from "@/common/components/ui/loading-screen";
import { NepaliDatePicker } from "@/common/components/ui/nepali-date-picker";
import { convertADtoBS, getNepalTodayAd } from "@/common/lib/nepali-date";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { useSearchableCustomerSelect } from "@/hooks/useSearchableCustomerSelect";
import { ACCOUNT_FEATURE_KEYS, useAccountFeature } from "@/fetchers/accountFeatureQueries";
import { useAuthStore } from "@/common/store/store";
import {
  BulkBroilerRowInput,
  BulkBroilerSaleResult,
  useCreateBulkBroilerSales,
} from "@/fetchers/dealer/dealerSaleQueries";
import { BroilerBulkTable } from "./_components/BroilerBulkTable";
import { BroilerBulkSummary } from "./_components/BroilerBulkSummary";
import { BroilerPurchaseCard } from "./_components/BroilerPurchaseCard";
import { BulkSaveProgressDialog } from "./_components/BulkSaveProgressDialog";
import {
  BulkBroilerPurchase,
  BulkBroilerRow,
  BulkRowBuyer,
  derivePurchase,
  deriveRow,
  hasPurchaseData,
  isRowTouched,
  makeEmptyPurchase,
  makeEmptyRow,
} from "./_components/types";

export default function NewBroilerBulkSalePage() {
  const router = useRouter();
  const feature = useAccountFeature(ACCOUNT_FEATURE_KEYS.DEALER_BROILER_SALES_AND_SETTLEMENTS);

  useEffect(() => {
    if (!feature.isLoading && !feature.isEnabled) {
      router.replace("/dealer/dashboard/sales");
    }
  }, [feature.isEnabled, feature.isLoading, router]);

  if (feature.isLoading) return <AppLoadingScreen message="Loading..." />;
  if (!feature.isEnabled) return null;

  return <NewBroilerBulkSaleContent />;
}

// EOD entry is slow and painful — if the save fails for any reason the user's
// typed data must survive. Two layers of protection:
//   1. Every error path in `handleSave` returns WITHOUT touching the rows
//      state (verified below).
//   2. A draft is written to sessionStorage on every state change and
//      restored on mount, so even a hard refresh / accidental tab close
//      doesn't lose the half-filled form. The draft is wiped only after a
//      successful save navigates away.
// Key is scoped by the authenticated user id so swapping accounts in the same
// browser tab doesn't leak one dealer's half-filled form to another.
const draftKeyFor = (userId: string | undefined) =>
  userId ? `dealer-broiler-bulk-draft-v1:${userId}` : null;

interface DraftPayload {
  sourceFarmerId: string;
  sourceFarmer: BulkRowBuyer | null;
  sharedDate: string;
  showCustomInvoice: boolean;
  rows: BulkBroilerRow[];
  purchase?: BulkBroilerPurchase;
}

function readDraft(key: string | null): DraftPayload | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.rows)) return null;
    return parsed as DraftPayload;
  } catch {
    return null;
  }
}

function writeDraft(key: string | null, payload: DraftPayload): void {
  if (!key || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore quota / disabled sessionStorage — this is best-effort.
  }
}

function clearDraft(key: string | null): void {
  if (!key || typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

function NewBroilerBulkSaleContent() {
  const router = useRouter();
  const sourceFarmerSelect = useSearchableCustomerSelect();
  const bulkCreate = useCreateBulkBroilerSales();
  const userId = useAuthStore((state) => state.user?.id);
  const draftKey = draftKeyFor(userId);

  const initial = useMemo(() => readDraft(draftKey), [draftKey]);

  const [sourceFarmerId, setSourceFarmerId] = useState(initial?.sourceFarmerId ?? "");
  const [sourceFarmer, setSourceFarmer] = useState<BulkRowBuyer | null>(initial?.sourceFarmer ?? null);
  const [sharedDate, setSharedDate] = useState(initial?.sharedDate || getNepalTodayAd());
  const [showCustomInvoice, setShowCustomInvoice] = useState(initial?.showCustomInvoice ?? false);
  const [rows, setRows] = useState<BulkBroilerRow[]>(
    () => (initial?.rows && initial.rows.length > 0 ? initial.rows : [makeEmptyRow()])
  );
  // Preview-only purchase block. Not sent to the backend yet; lives in draft
  // so a refresh preserves it.
  const [purchase, setPurchase] = useState<BulkBroilerPurchase>(
    () => initial?.purchase ?? makeEmptyPurchase()
  );

  const [attemptedSave, setAttemptedSave] = useState(false);
  // Keyed by rowId so the mapping survives row reorderings / removals.
  const [serverRowErrors, setServerRowErrors] = useState<Record<string, string[]>>({});
  const [serverPurchaseErrors, setServerPurchaseErrors] = useState<string[]>([]);
  const [progressOpen, setProgressOpen] = useState(false);
  const [savedSales, setSavedSales] = useState<BulkBroilerSaleResult[]>([]);

  // Persist draft on every form-state change (not progress / save flags).
  useEffect(() => {
    writeDraft(draftKey, { sourceFarmerId, sourceFarmer, sharedDate, showCustomInvoice, rows, purchase });
  }, [draftKey, sourceFarmerId, sourceFarmer, sharedDate, showCustomInvoice, rows, purchase]);

  const derived = useMemo(
    () => rows.map((row) => deriveRow(row, sourceFarmerId)),
    [rows, sourceFarmerId]
  );
  const purchaseDerived = useMemo(() => derivePurchase(purchase), [purchase]);

  const anyClientRowErrors = derived.some((d) => d.errors.length > 0);
  const canSave =
    !!sourceFarmerId &&
    rows.length > 0 &&
    !anyClientRowErrors &&
    purchaseDerived.errors.length === 0;
  const saving = bulkCreate.isPending;

  const changePurchase = (patch: Partial<BulkBroilerPurchase>) => {
    setPurchase((prev) => ({ ...prev, ...patch }));
    // Clear server-reported purchase errors on any edit so they don't linger
    // after the dealer has already corrected the field.
    if (serverPurchaseErrors.length > 0) setServerPurchaseErrors([]);
  };

  const handleSourceFarmerChange = (value: string, option?: any) => {
    const data: any = option?.data || null;
    setSourceFarmerId(value);
    setSourceFarmer(
      data ? { id: data.id, name: data.name, phone: data.phone ?? null, address: data.address ?? null } : null
    );
  };

  const changeRow = (rowId: string, patch: Partial<BulkBroilerRow>) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const next: BulkBroilerRow = { ...r, ...patch };
        // Auto-track paidAmount to the new line total so the default row
        // reads "fully paid". Once the dealer types into paid themselves,
        // `paidAmountTouched` flips and we stop clobbering it.
        if (
          !next.paidAmountTouched &&
          !Object.prototype.hasOwnProperty.call(patch, "paidAmount") &&
          !Object.prototype.hasOwnProperty.call(patch, "paidAmountTouched")
        ) {
          const d = deriveRow(next, sourceFarmerId);
          next.paidAmount = d.lineTotal;
        }
        return next;
      })
    );
    // Clear this row's server errors on any edit so they don't linger.
    setServerRowErrors((prev) => {
      if (!prev[rowId]) return prev;
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };
  const removeRow = (rowId: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== rowId)));
    setServerRowErrors((prev) => {
      if (!prev[rowId]) return prev;
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };
  const addRow = () => {
    setRows((prev) => [...prev, makeEmptyRow()]);
  };

  const buildPayload = (): BulkBroilerRowInput[] =>
    rows.map((row) => ({
      buyerId: row.buyerId,
      weightKg: row.weightKg,
      broilerCount: row.broilerCount,
      ratePerKg: row.ratePerKg,
      discount: row.discountValue > 0
        ? { type: row.discountType, value: row.discountValue }
        : null,
      paidAmount: row.paidAmount,
      paymentMethod: row.paymentMethod,
      notes: row.notes.trim() || undefined,
      // Only send custom invoice numbers when the "Set custom invoice numbers
      // per row" toggle is on; otherwise let the backend auto-generate. The
      // row still remembers its typed value so toggling back on restores it.
      invoiceNumber: showCustomInvoice && row.invoiceNumber.trim()
        ? row.invoiceNumber.trim()
        : undefined,
      date: row.dateOverride || sharedDate,
    }));

  const handleSave = async () => {
    if (!canSave) {
      setAttemptedSave(true);
      toast.error("Fix the highlighted rows before saving.");
      return;
    }

    // Snapshot rowIndex → rowId before we send; the server returns per-row
    // errors by index and we need to re-map them back to row ids.
    const indexToId = rows.map((r) => r.id);

    try {
      setServerRowErrors({});
      setServerPurchaseErrors([]);
      const result = await bulkCreate.mutateAsync({
        sourceFarmerId,
        rows: buildPayload(),
        // Only include the purchase block when the dealer actually entered
        // something — keeps the audit cleaner and the backend skips validation.
        ...(hasPurchaseData(purchase)
          ? {
              purchase: {
                weightKg: purchase.weightKg,
                ratePerKg: purchase.ratePerKg,
                totalCost: purchase.totalCost,
                broilerCount: purchase.broilerCount,
                notes: purchase.notes.trim() || undefined,
              },
            }
          : {}),
      });
      // Only on real success do we clear the draft and open the success
      // dialog. Nothing above or below this line touches `rows`, so every
      // error path below leaves the form intact for the user to fix + retry.
      clearDraft(draftKey);
      setSavedSales(result.data.sales);
      setProgressOpen(true);
    } catch (err: any) {
      const resp = err?.response?.data;
      const code = resp?.code;
      const status = err?.response?.status;

      if (code === "ACCOUNT_FEATURE_DISABLED") {
        // Admin turned the feature off mid-session. Keep the draft so if
        // the feature comes back the user doesn't lose their entries.
        toast.error("Broiler sales were turned off for this account.");
        router.replace("/dealer/dashboard/sales");
        return;
      }

      if (status === 400 && (resp?.errors?.rows || resp?.errors?.purchase)) {
        if (resp.errors.rows) {
          const mapped: Record<string, string[]> = {};
          for (const [i, msgs] of Object.entries(resp.errors.rows)) {
            const rowId = indexToId[Number(i)];
            if (rowId && Array.isArray(msgs)) mapped[rowId] = msgs as string[];
          }
          setServerRowErrors(mapped);
        }
        if (Array.isArray(resp.errors.purchase)) {
          setServerPurchaseErrors(resp.errors.purchase as string[]);
        }
        setAttemptedSave(true);
        toast.error(resp.message || "Fix the highlighted fields — your entries are kept.");
        return;
      }

      if (code === "INVOICE_CONFLICT") {
        toast.error(`${resp.message || "Invoice number conflict."} Your entries are kept.`);
        return;
      }

      if (code === "SERIALIZATION_FAILURE") {
        toast.error(`${resp.message || "Please try again."} Your entries are kept.`);
        return;
      }

      toast.error(
        `${resp?.message || err?.message || "Failed to save broiler sales."} Your entries are kept — fix and retry.`
      );
    }
  };

  const handleCloseProgress = () => {
    setProgressOpen(false);
    if (savedSales.length > 0) {
      // Successful save already cleared the draft; navigate away.
      router.push("/dealer/dashboard/sales");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Bird className="h-6 w-6 text-amber-600" />
              New broiler sales
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Enter one row per buyer. All rows share this source farmer.
            </p>
          </div>
        </div>
        <Link
          href="/dealer/dashboard/sales/new"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <Package className="h-4 w-4" />
          Switch to feed / product sale
        </Link>
      </div>

      {/* Main layout */}
      <div className="grid gap-6 2xl:grid-cols-3">
        <div className="space-y-6 2xl:col-span-2">
          {/* Shared card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shared across all buyers</CardTitle>
              <CardDescription>Farmer whose chickens are being sold, plus the default date.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Source farmer</Label>
                <SearchableSelect
                  value={sourceFarmerId}
                  onValueChange={handleSourceFarmerChange}
                  options={sourceFarmerSelect.options}
                  placeholder="Select source farmer"
                  searchPlaceholder="Search farmers..."
                  emptyText="No matching customers"
                  isLoading={sourceFarmerSelect.isLoading}
                  onSearch={sourceFarmerSelect.onSearch}
                  displayValue={sourceFarmer?.name}
                />
                {sourceFarmer && (
                  <p className="text-xs text-muted-foreground">
                    {sourceFarmer.phone || "No phone"} · {sourceFarmer.address || "No address"}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Date (default for all rows)</Label>
                <NepaliDatePicker
                  defaultDate={convertADtoBS(sharedDate) as any}
                  onChange={({ adDate }: { bsDate: string; adDate: string }) => {
                    const ymd = adDate.includes("T") ? adDate.split("T")[0] : adDate;
                    setSharedDate(ymd);
                  }}
                  className="w-full rounded-md border border-input"
                  theme="light"
                  language="en"
                />
                <p className="text-xs text-muted-foreground">
                  Each row can override this date from its ⋮ menu.
                </p>
              </div>
              <div className="md:col-span-2">
                <button
                  type="button"
                  onClick={() => {
                    // Any lingering "Invoice already exists" row errors
                    // reference values we may no longer be sending — clear
                    // them so the user sees a fresh state.
                    setServerRowErrors({});
                    setShowCustomInvoice((v) => !v);
                  }}
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs ${
                    showCustomInvoice
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-dashed border-muted-foreground/30 text-muted-foreground hover:border-muted-foreground/50"
                  }`}
                >
                  <span className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${
                    showCustomInvoice ? "bg-primary border-primary" : "border-muted-foreground/50"
                  }`}>
                    {showCustomInvoice && <span className="text-[10px] leading-none text-white">✓</span>}
                  </span>
                  Set custom invoice numbers per row
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Optional: what you paid the source farmer */}
          <BroilerPurchaseCard
            purchase={purchase}
            derived={purchaseDerived}
            serverErrors={serverPurchaseErrors}
            showErrors={attemptedSave || hasPurchaseData(purchase)}
            onChange={changePurchase}
          />

          {/* The table / card stack */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Buyers</CardTitle>
              <CardDescription>
                Each row is one sale with its own weight, rate, discount and payment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BroilerBulkTable
                rows={rows}
                derived={derived}
                showErrorsForRow={(rowId) => {
                  if (attemptedSave) return true;
                  const r = rows.find((x) => x.id === rowId);
                  return r ? isRowTouched(r) : false;
                }}
                serverErrorsForRow={(rowId) => serverRowErrors[rowId] || []}
                showCustomInvoice={showCustomInvoice}
                onChangeRow={changeRow}
                onRemoveRow={removeRow}
                onAddRow={addRow}
              />
            </CardContent>
          </Card>

          {!sourceFarmerId && (
            <p className="text-sm text-amber-800">
              Pick a source farmer above to enable saving.
            </p>
          )}
        </div>

        {/* Sticky summary */}
        <div className="2xl:col-span-1">
          <div className="2xl:sticky 2xl:top-6">
            <BroilerBulkSummary
              rows={rows}
              derived={derived}
              purchase={purchase}
              disabled={!canSave}
              saving={saving}
              onSave={handleSave}
              onCancel={() => {
                // Explicit cancel = user abandoning the draft on purpose.
                clearDraft(draftKey);
                router.push("/dealer/dashboard/sales");
              }}
            />
          </div>
        </div>
      </div>

      <BulkSaveProgressDialog
        open={progressOpen || saving}
        saving={saving}
        rows={rows}
        savedSales={savedSales}
        onClose={handleCloseProgress}
      />
    </div>
  );
}
