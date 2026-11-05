"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bird, Users, Undo2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Label } from "@/common/components/ui/label";
import { Input } from "@/common/components/ui/input";
import { Textarea } from "@/common/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { DateDisplay } from "@/common/components/ui/date-display";
import { NepaliDatePicker } from "@/common/components/ui/nepali-date-picker";
import { convertADtoBS, getNepalTodayAd } from "@/common/lib/nepali-date";
import { useSearchableCustomerSelect } from "@/hooks/useSearchableCustomerSelect";
import { toast } from "sonner";
import { BroilerSettlement, ChickenSalesByFarmerRow, useCreateBroilerSettlement, useGetBroilerSettlements, useGetChickenSalesByFarmer, useReverseBroilerSettlement } from "@/fetchers/dealer/dealerSaleQueries";
import { ACCOUNT_FEATURE_KEYS, useAccountFeature } from "@/fetchers/accountFeatureQueries";
import { DealerSalesTabs } from "@/components/dealer/sales/DealerSalesTabs";
import { FarmerSalesPanel } from "./_components/FarmerSalesPanel";
import { FarmerFinancialBreakdown } from "./_components/FarmerFinancialBreakdown";
import { SettledFinancialBreakdown } from "./_components/SettledFinancialBreakdown";
import { AddPurchaseDialog } from "./_components/AddPurchaseDialog";

export default function ChickenSalesByFarmerPage() {
  const router = useRouter();
  const broilerFeature = useAccountFeature(
    ACCOUNT_FEATURE_KEYS.DEALER_BROILER_SALES_AND_SETTLEMENTS
  );

  // Do not mount the Broiler data queries when the account is not enabled.
  // A pasted or old URL simply returns the user to normal Dealer Sales.
  useEffect(() => {
    if (!broilerFeature.isLoading && !broilerFeature.isEnabled) {
      router.replace("/dealer/dashboard/sales");
    }
  }, [broilerFeature.isEnabled, broilerFeature.isLoading, router]);

  if (!broilerFeature.isEnabled) return null;

  return <ChickenSalesByFarmerContent />;
}

function ChickenSalesByFarmerContent() {
  const router = useRouter();
  const [sourceFarmerId, setSourceFarmerId] = useState("");
  const [settlementTarget, setSettlementTarget] = useState<ChickenSalesByFarmerRow | null>(null);
  const [marginAmount, setMarginAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  // Today in Nepal (toISOString gave yesterday before 5:45 AM).
  const [settlementDate, setSettlementDate] = useState(() => getNepalTodayAd());
  const [notes, setNotes] = useState("");
  const [reference, setReference] = useState("");
  const sourceFarmerSelect = useSearchableCustomerSelect();
  const {
    data,
    isLoading,
    error: chickenSalesError,
  } = useGetChickenSalesByFarmer(sourceFarmerId || undefined);
  const {
    data: settlementsData,
    isLoading: settlementsLoading,
    error: settlementsError,
  } = useGetBroilerSettlements(sourceFarmerId || undefined);
  const createSettlement = useCreateBroilerSettlement();
  const reverseSettlement = useReverseBroilerSettlement();
  const [reverseTarget, setReverseTarget] = useState<BroilerSettlement | null>(null);
  // Per-farmer "Show sales" expand state. Keyed by sourceFarmerId so each
  // card's toggle is independent and survives re-renders.
  const [expandedSales, setExpandedSales] = useState<Record<string, boolean>>({});
  const toggleExpanded = (id: string) =>
    setExpandedSales((prev) => ({ ...prev, [id]: !prev[id] }));
  // Standalone-purchase dialog target. Holds the farmer id + name so the
  // dialog knows which bucket to attribute to.
  const [purchaseTarget, setPurchaseTarget] = useState<{
    id: string;
    name: string;
    hasExistingPurchase: boolean;
  } | null>(null);
  // Collapsed-by-default state for settled payment cards. Default closed.
  const [expandedSettlements, setExpandedSettlements] = useState<Record<string, boolean>>({});
  const toggleSettlement = (id: string) =>
    setExpandedSettlements((prev) => ({ ...prev, [id]: !prev[id] }));
  const rows = data?.data ?? [];
  const settlements = settlementsData?.data ?? [];
  // Purchase summary for the currently-open settlement target. Drawn from
  // the same chicken-by-farmer response so the numbers match the card.
  const settlementPurchase = settlementTarget
    ? rows.find((r) => r.sourceFarmerId === settlementTarget.sourceFarmerId)?.purchase ?? null
    : null;

  // Covers the narrow race where Admin turns the feature off after this page
  // has mounted but before one of its background requests completes.
  useEffect(() => {
    const errors = [chickenSalesError, settlementsError] as any[];
    if (errors.some((error) => error?.response?.data?.code === "ACCOUNT_FEATURE_DISABLED")) {
      router.replace("/dealer/dashboard/sales");
    }
  }, [chickenSalesError, router, settlementsError]);

  const formatCurrency = (amount: number) => `रू ${(Math.round(Math.abs(Number(amount) || 0) * 100) / 100).toFixed(2)}`;
  const settlementAmounts = settlementTarget ? (() => {
    const proceeds = Number(settlementTarget.tentativeRevenue) || 0;
    const margin = Number(marginAmount) || 0;
    const availableProceeds = Math.max(proceeds - margin, 0);
    const creditRecovered = Math.min(Math.max(Number(settlementTarget.existingDueAmount) || 0, 0), availableProceeds);
    return { proceeds, margin, availableProceeds, creditRecovered, farmerPayout: availableProceeds - creditRecovered };
  })() : null;

  const openSettlement = (row: ChickenSalesByFarmerRow) => {
    setSettlementTarget(row);
    setMarginAmount("");
    setPaymentMethod("CASH");
    setSettlementDate(getNepalTodayAd());
    setNotes("");
    setReference("");
  };

  const submitReverse = async () => {
    if (!reverseTarget) return;
    try {
      await reverseSettlement.mutateAsync(reverseTarget.id);
      toast.success("Settlement reversed");
      setReverseTarget(null);
    } catch (error: any) {
      if (error.response?.data?.code === "ACCOUNT_FEATURE_DISABLED") {
        router.replace("/dealer/dashboard/sales");
        return;
      }
      toast.error(error.response?.data?.message || "Unable to reverse settlement");
    }
  };

  const submitSettlement = async () => {
    if (!settlementTarget || !settlementAmounts) return;
    if (settlementAmounts.margin < 0 || settlementAmounts.margin > settlementAmounts.proceeds) {
      toast.error("Margin must be between zero and the unsettled Broiler proceeds");
      return;
    }
    try {
      await createSettlement.mutateAsync({
        sourceFarmerId: settlementTarget.sourceFarmerId,
        marginAmount: settlementAmounts.margin,
        paymentMethod,
        date: settlementDate,
        notes: notes.trim() || undefined,
        reference: reference.trim() || undefined,
      });
      toast.success("Broiler sales settled successfully");
      setSettlementTarget(null);
    } catch (error: any) {
      if (error.response?.data?.code === "ACCOUNT_FEATURE_DISABLED") {
        router.replace("/dealer/dashboard/sales");
        return;
      }
      toast.error(error.response?.data?.message || "Unable to settle Broiler sales");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Broiler settlements</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Check Broiler money and pay each farmer.
        </p>
      </div>

      <DealerSalesTabs />

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="flex gap-3 p-4 text-sm text-amber-900">
          <Bird className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <span className="font-semibold">Waiting for settlement.</span>{" "}
            This money belongs to the farmer until you settle it. It is not your normal sale income.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Choose farmer</CardTitle>
          <CardDescription>See one farmer’s Broiler money and payments.</CardDescription>
        </CardHeader>
        <CardContent className="max-w-xl space-y-2">
          <Label>Farmer</Label>
          <SearchableSelect
            value={sourceFarmerId}
            onValueChange={(value) => setSourceFarmerId(value)}
            options={sourceFarmerSelect.options}
            placeholder="All farmers"
            searchPlaceholder="Search farmers..."
            emptyText="No matching farmers found"
            isLoading={sourceFarmerSelect.isLoading}
            onSearch={sourceFarmerSelect.onSearch}
          />
          {sourceFarmerId && (
            <Button variant="ghost" size="sm" className="px-0" onClick={() => setSourceFarmerId("")}>
              Clear filter
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Waiting for settlement</CardTitle>
          <CardDescription>Use Broiler money first to clear the farmer’s unpaid balance, then pay the remaining amount.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Loading Broiler sales…</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No Broiler sales waiting for settlement.</div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.sourceFarmerId} className="rounded-lg border bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-semibold">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{row.sourceFarmer.name}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {row.saleCount === 0
                          ? "Purchase recorded · no sales yet"
                          : (
                            <>
                              {row.saleCount} Broiler sale{row.saleCount === 1 ? "" : "s"}
                              {row.latestSaleDate && <> · latest <DateDisplay date={row.latestSaleDate} /></>}
                            </>
                          )}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => openSettlement(row)}
                      disabled={row.saleCount === 0}
                      title={row.saleCount === 0 ? "Record at least one broiler sale before settling" : undefined}
                    >
                      Settle broiler
                    </Button>
                  </div>
                  <div className="mt-3">
                    <FarmerFinancialBreakdown
                      tentativeRevenue={Number(row.tentativeRevenue)}
                      existingDueAmount={Number(row.existingDueAmount)}
                      // Tolerate stale TanStack caches from pre-Phase-4 deploys
                      // where the response has no `purchase` field at all.
                      purchase={row.purchase ?? null}
                      manageContext={{
                        farmerId: row.sourceFarmerId,
                        farmerName: row.sourceFarmer.name,
                      }}
                      onAddPurchase={() =>
                        setPurchaseTarget({
                          id: row.sourceFarmerId,
                          name: row.sourceFarmer.name,
                          hasExistingPurchase: !!row.purchase,
                        })
                      }
                    />
                  </div>
                  {row.saleCount > 0 && (
                    <FarmerSalesPanel
                      sales={row.sales ?? []}
                      saleCount={row.saleCount}
                      expanded={!!expandedSales[row.sourceFarmerId]}
                      onToggle={() => toggleExpanded(row.sourceFarmerId)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!settlementTarget} onOpenChange={(open) => !open && setSettlementTarget(null)}>
        <DialogContent className="max-w-xl bg-white">
          <DialogHeader>
            <DialogTitle>Settle broiler payment</DialogTitle>
            <DialogDescription>
              Settle all broiler sales waiting for payment for {settlementTarget?.sourceFarmer.name || "this farmer"}.
            </DialogDescription>
          </DialogHeader>
          {settlementAmounts && settlementTarget && (
            <div className="space-y-4 py-2">
              {/* Shared financial breakdown so the numbers match the card. */}
              <FarmerFinancialBreakdown
                tentativeRevenue={settlementAmounts.proceeds}
                existingDueAmount={Number(settlementTarget.existingDueAmount) || 0}
                purchase={settlementPurchase}
                dense
              />

              {/* Margin — one input, quick-pick percentages, live % readout. */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="marginAmount" className="text-sm font-medium">Your margin</Label>
                  <div className="flex gap-1">
                    {[5, 10, 15].map((pct) => {
                      const suggested = Math.round(settlementAmounts.proceeds * pct) / 100;
                      return (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setMarginAmount(String(suggested))}
                          className="rounded-full border border-input bg-background px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                          title={`${pct}% of broiler revenue`}
                        >
                          {pct}%
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Input
                  id="marginAmount"
                  type="number"
                  min="0"
                  max={settlementAmounts.proceeds}
                  step="0.01"
                  value={marginAmount}
                  onChange={(event) => setMarginAmount(event.target.value)}
                  placeholder="0.00"
                  className="tabular-nums"
                />
                {settlementAmounts.margin > 0 && settlementAmounts.proceeds > 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    = {((settlementAmounts.margin / settlementAmounts.proceeds) * 100).toFixed(1)}% of broiler revenue
                  </div>
                )}
              </div>

              {/* What happens to the money — live */}
              <div className="rounded-md border bg-white text-sm divide-y tabular-nums">
                <div className="flex items-start justify-between gap-4 px-3 py-2">
                  <div>
                    <div className="font-medium">You keep (margin)</div>
                    <div className="text-[11px] text-muted-foreground">
                      moves from pending to your account
                    </div>
                  </div>
                  <div className="font-semibold text-green-700">
                    रू {settlementAmounts.margin.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-start justify-between gap-4 px-3 py-2">
                  <div>
                    <div className="font-medium">Clears farmer credit</div>
                    <div className="text-[11px] text-muted-foreground">
                      reduces what the farmer owes you
                    </div>
                  </div>
                  <div className="font-semibold">
                    रू {settlementAmounts.creditRecovered.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-start justify-between gap-4 bg-muted/30 px-3 py-2">
                  <div>
                    <div className="font-semibold">Pay to farmer</div>
                    <div className="text-[11px] text-muted-foreground">
                      the remainder goes to the farmer today
                    </div>
                  </div>
                  <div className="text-base font-bold text-amber-800">
                    रू {settlementAmounts.farmerPayout.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Settlement date</Label>
                  <NepaliDatePicker
                    defaultDate={convertADtoBS(settlementDate)}
                    onChange={({ adDate }) => setSettlementDate(adDate.split("T")[0])}
                    className="w-full rounded-md border border-input"
                    theme="light"
                    language="en"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="settlementReference">Reference (optional)</Label>
                <Input id="settlementReference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Receipt or bank reference" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settlementNotes">Notes (optional)</Label>
                <Textarea id="settlementNotes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettlementTarget(null)}>Cancel</Button>
            <Button onClick={submitSettlement} disabled={createSettlement.isPending || !settlementAmounts || settlementAmounts.margin < 0 || settlementAmounts.margin > settlementAmounts.proceeds}>
              {createSettlement.isPending ? "Saving…" : "Save settlement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {purchaseTarget && (
        <AddPurchaseDialog
          open={!!purchaseTarget}
          onOpenChange={(v) => !v && setPurchaseTarget(null)}
          farmerId={purchaseTarget.id}
          farmerName={purchaseTarget.name}
          hasExistingPurchase={purchaseTarget.hasExistingPurchase}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Settled payments</CardTitle>
          <CardDescription>Past Broiler payments. This money is separate from your normal product sales.</CardDescription>
        </CardHeader>
        <CardContent>
          {settlementsLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading settled payments…</div>
          ) : settlements.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No settled Broiler payments yet.</div>
          ) : (
            <div className="space-y-3">
              {settlements.map((settlement) => {
                const expanded = !!expandedSettlements[settlement.id];
                return (
                  <div key={settlement.id} className="rounded-lg border bg-muted/20">
                    {/* Collapsed-row: chevron + farmer name + one-line financial
                        summary + Reverse. Click anywhere on the clickable
                        area toggles expand. */}
                    <div className="flex items-center justify-between gap-3 p-3">
                      <button
                        type="button"
                        onClick={() => toggleSettlement(settlement.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        aria-expanded={expanded}
                      >
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 font-medium">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{settlement.farmer.name}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                            Settled <DateDisplay date={settlement.date} /> ·
                            {" "}Paid <span className="font-medium text-foreground">{formatCurrency(settlement.farmerPayout)}</span>
                            {" "}· margin <span className="font-medium text-green-700">{formatCurrency(settlement.marginAmount)}</span>
                          </p>
                        </div>
                      </button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReverseTarget(settlement)}
                        disabled={reverseSettlement.isPending}
                      >
                        <Undo2 className="mr-2 h-4 w-4" />
                        Reverse
                      </Button>
                    </div>
                    {expanded && (
                      <div className="space-y-3 border-t p-3">
                        {(settlement.reference || settlement.notes) && (
                          <div className="space-y-0.5 text-xs text-muted-foreground">
                            {settlement.reference && <p>Reference: {settlement.reference}</p>}
                            {settlement.notes && <p>{settlement.notes}</p>}
                          </div>
                        )}
                        <SettledFinancialBreakdown
                          totalProceeds={Number(settlement.totalProceeds)}
                          marginAmount={Number(settlement.marginAmount)}
                          creditRecovered={Number(settlement.creditRecovered)}
                          farmerPayout={Number(settlement.farmerPayout)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!reverseTarget} onOpenChange={(open) => !open && setReverseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse this settlement?</AlertDialogTitle>
            <AlertDialogDescription>
              This undoes the settlement for {reverseTarget?.farmer.name}: the {reverseTarget?.saleCount} Broiler sale{reverseTarget?.saleCount === 1 ? "" : "s"} will go back to waiting-for-settlement, the farmer&apos;s balance is restored, and your margin + payout are rolled back. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reverseSettlement.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void submitReverse();
              }}
              disabled={reverseSettlement.isPending}
            >
              {reverseSettlement.isPending ? "Reversing…" : "Reverse settlement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
