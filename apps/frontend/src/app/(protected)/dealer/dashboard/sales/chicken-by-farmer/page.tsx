"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bird, CircleDollarSign, Users } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Label } from "@/common/components/ui/label";
import { Input } from "@/common/components/ui/input";
import { Textarea } from "@/common/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { DateDisplay } from "@/common/components/ui/date-display";
import { useSearchableCustomerSelect } from "@/hooks/useSearchableCustomerSelect";
import { toast } from "sonner";
import { ChickenSalesByFarmerRow, useCreateBroilerSettlement, useGetBroilerSettlements, useGetChickenSalesByFarmer } from "@/fetchers/dealer/dealerSaleQueries";
import { ACCOUNT_FEATURE_KEYS, useAccountFeature } from "@/fetchers/accountFeatureQueries";

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
  const [settlementDate, setSettlementDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
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
  const rows = data?.data ?? [];
  const settlements = settlementsData?.data ?? [];

  // Covers the narrow race where Admin turns the feature off after this page
  // has mounted but before one of its background requests completes.
  useEffect(() => {
    const errors = [chickenSalesError, settlementsError] as any[];
    if (errors.some((error) => error?.response?.data?.code === "ACCOUNT_FEATURE_DISABLED")) {
      router.replace("/dealer/dashboard/sales");
    }
  }, [chickenSalesError, router, settlementsError]);

  const formatCurrency = (amount: number) => `रू ${Math.abs(Number(amount) || 0).toFixed(2)}`;
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
    setSettlementDate(new Date().toISOString().slice(0, 10));
    setNotes("");
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dealer/dashboard/sales")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Broiler Settlement</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Check Broiler money and pay each farmer.
            </p>
          </div>
        </div>
      </div>

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
              {rows.map((row) => {
                const due = Number(row.existingDueAmount);
                return (
                  <div key={row.sourceFarmerId} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-semibold">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{row.sourceFarmer.name}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {row.saleCount} Broiler sale{row.saleCount === 1 ? "" : "s"}
                          {row.latestSaleDate && <> · latest <DateDisplay date={row.latestSaleDate} /></>}
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 md:min-w-[410px]">
                        <div className="rounded-md bg-slate-50 p-3">
                          <div className="text-xs font-medium text-muted-foreground">Farmer owes you</div>
                          <div className={`mt-1 text-lg font-bold ${due > 0 ? "text-red-600" : due < 0 ? "text-green-600" : ""}`}>
                            {formatCurrency(due)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {due > 0 ? "Unpaid feed or other credit" : due < 0 ? "Farmer has advance" : "Nothing to collect"}
                          </div>
                        </div>
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                          <div className="flex items-center gap-1 text-xs font-medium text-amber-900">
                            <CircleDollarSign className="h-3.5 w-3.5" /> Broiler money received
                          </div>
                          <div className="mt-1 text-lg font-bold text-amber-800">{formatCurrency(row.tentativeRevenue)}</div>
                          <div className="text-xs text-amber-800">Waiting for settlement</div>
                        </div>
                      </div>
                      <Button className="w-full md:w-auto" onClick={() => openSettlement(row)}>
                        Settle
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!settlementTarget} onOpenChange={(open) => !open && setSettlementTarget(null)}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>Settle Broiler payment</DialogTitle>
            <DialogDescription>
              Settle all Broiler sales waiting for payment for {settlementTarget?.sourceFarmer.name || "this farmer"}.
            </DialogDescription>
          </DialogHeader>
          {settlementAmounts && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-muted p-3"><div className="text-muted-foreground">Broiler money received</div><div className="mt-1 font-semibold">{formatCurrency(settlementAmounts.proceeds)}</div></div>
                <div className="rounded-md bg-muted p-3"><div className="text-muted-foreground">Farmer owes you</div><div className="mt-1 font-semibold">{formatCurrency(Math.max(Number(settlementTarget?.existingDueAmount) || 0, 0))}</div></div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="marginAmount">Your margin</Label>
                <Input id="marginAmount" type="number" min="0" max={settlementAmounts.proceeds} step="0.01" value={marginAmount} onChange={(event) => setMarginAmount(event.target.value)} placeholder="0.00" />
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2 text-sm">
                <div className="flex justify-between"><span>Used to clear farmer due</span><span className="font-semibold">{formatCurrency(settlementAmounts.creditRecovered)}</span></div>
                <div className="flex justify-between"><span>Pay farmer</span><span className="font-semibold">{formatCurrency(settlementAmounts.farmerPayout)}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label htmlFor="settlementDate">Settlement Date</Label><Input id="settlementDate" type="date" value={settlementDate} onChange={(event) => setSettlementDate(event.target.value)} /></div>
                <div className="space-y-2"><Label>Payment Method</Label><Select value={paymentMethod} onValueChange={setPaymentMethod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="CASH">Cash</SelectItem><SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem><SelectItem value="CHEQUE">Cheque</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-2"><Label htmlFor="settlementNotes">Notes (optional)</Label><Textarea id="settlementNotes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></div>
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
              {settlements.map((settlement) => (
                <div key={settlement.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-semibold">{settlement.farmer.name}</div>
                      <p className="text-sm text-muted-foreground">
                        <DateDisplay date={settlement.date} /> · {settlement.saleCount} Broiler sale{settlement.saleCount === 1 ? "" : "s"}
                      </p>
                      {settlement.notes && <p className="mt-1 text-sm text-muted-foreground">{settlement.notes}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:text-right">
                      <div><div className="text-muted-foreground">Broiler money</div><div className="font-semibold">{formatCurrency(settlement.totalProceeds)}</div></div>
                      <div><div className="text-muted-foreground">Farmer due cleared</div><div className="font-semibold">{formatCurrency(settlement.creditRecovered)}</div></div>
                      <div><div className="text-muted-foreground">Paid to farmer</div><div className="font-semibold">{formatCurrency(settlement.farmerPayout)}</div></div>
                      <div><div className="text-muted-foreground">Your margin</div><div className="font-semibold text-green-700">{formatCurrency(settlement.marginAmount)}</div></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
