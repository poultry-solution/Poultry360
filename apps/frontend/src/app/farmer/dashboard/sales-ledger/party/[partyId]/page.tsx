"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Receipt, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Badge } from "@/common/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/common/components/ui/tabs";
import { DateDisplay } from "@/common/components/ui/date-display";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/common/components/ui/dialog";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select";
import { toast } from "sonner";
import { useI18n } from "@/i18n/useI18n";
import {
  useGetCustomer,
  useGetSalePayments,
  useGetSales,
  useSetCustomerOpeningBalance,
} from "@/fetchers/sale/saleQueries";

export default function PartyDetailsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useParams();
  const partyId = params.partyId as string;

  const [activeTab, setActiveTab] = useState<"sales" | "payments">("sales");
  const [isEditOpeningOpen, setIsEditOpeningOpen] = useState(false);
  const [openingAmount, setOpeningAmount] = useState("");
  const [openingDirection, setOpeningDirection] = useState<"OWED" | "ADVANCE">("OWED");
  const [openingNotes, setOpeningNotes] = useState("");

  const { data: partyDetail, isLoading: partyLoading } = useGetCustomer(partyId, {
    enabled: !!partyId,
  });
  const party = partyDetail?.data;

  const { data: salesResponse, isLoading: salesLoading } = useGetSales(
    { customerId: partyId, page: 1, limit: 200 },
    { enabled: !!partyId }
  );
  const sales = salesResponse?.data ?? [];

  const { data: paymentsResponse, isLoading: paymentsLoading } = useGetSalePayments(
    { customerId: partyId, page: 1, limit: 200 },
    { enabled: !!partyId }
  );
  const payments = paymentsResponse?.data ?? [];

  const setOpeningBalance = useSetCustomerOpeningBalance();

  const formatCurrency = (amount: number) => `₹${Number(amount || 0).toLocaleString()}`;

  const openingSnapshot = party?.openingBalance;
  const openingHistory = Array.isArray(party?.openingBalanceHistory)
    ? party.openingBalanceHistory
    : [];

  const openEditOpening = () => {
    const amt = Number(openingSnapshot?.amount ?? 0);
    setOpeningDirection(amt < 0 ? "ADVANCE" : "OWED");
    setOpeningAmount(String(Math.abs(amt || 0)));
    setOpeningNotes(openingSnapshot?.notes ?? "");
    setIsEditOpeningOpen(true);
  };

  const saveOpening = async () => {
    const amt = Number(openingAmount || 0);
    if (!Number.isFinite(amt) || amt < 0) {
      toast.error("Opening balance must be a non-negative number");
      return;
    }
    const signed = amt === 0 ? 0 : openingDirection === "ADVANCE" ? -amt : amt;
    try {
      await setOpeningBalance.mutateAsync({
        customerId: partyId,
        openingBalance: signed,
        notes: openingNotes.trim() || undefined,
      });
      toast.success("Opening balance updated");
      setIsEditOpeningOpen(false);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update opening balance");
    }
  };

  const totals = useMemo(() => {
    const totalSales = sales.reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0);
    const totalPayments = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
    return { totalSales, totalPayments };
  }, [sales, payments]);

  if (partyLoading) {
    return (
      <div className="py-10 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  if (!party) {
    return (
      <div className="py-10 space-y-3">
        <Button variant="ghost" onClick={() => router.push("/farmer/dashboard/sales-ledger")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <p className="text-sm text-muted-foreground">Party not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" onClick={() => router.push("/farmer/dashboard/sales-ledger")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sales ledger
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{party.name}</h1>
          <div className="text-sm text-muted-foreground flex gap-2 flex-wrap">
            {party.phone ? <span>{party.phone}</span> : null}
            {party.category ? (
              <Badge variant="outline">{party.category}</Badge>
            ) : null}
            <span className="font-medium text-foreground">
              Balance: {formatCurrency(Number(party.balance || 0))}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total sales</CardTitle>
            <CardDescription className="text-xs">All sales for this party</CardDescription>
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatCurrency(totals.totalSales)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total payments</CardTitle>
            <CardDescription className="text-xs">All receipts/payments recorded</CardDescription>
          </CardHeader>
          <CardContent className="text-xl font-bold">{formatCurrency(totals.totalPayments)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-sm">Opening balance</CardTitle>
              <CardDescription className="text-xs">Editable with history</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={openEditOpening}>
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-lg font-semibold">
              {formatCurrency(Math.abs(Number(openingSnapshot?.amount ?? 0)))}
            </div>
            <div className="text-xs text-muted-foreground">
              {Number(openingSnapshot?.amount ?? 0) > 0
                ? "Party owes me"
                : Number(openingSnapshot?.amount ?? 0) < 0
                  ? "I owe party (credit/advance)"
                  : "Not set"}
            </div>
            {openingSnapshot?.notes ? (
              <div className="text-xs text-muted-foreground">{openingSnapshot.notes}</div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Opening balance adjustments</CardDescription>
        </CardHeader>
        <CardContent>
          {openingHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No opening balance history yet.</p>
          ) : (
            <div className="space-y-2">
              {openingHistory.map((h: any) => (
                <div key={h.id} className="flex items-start justify-between gap-3 border rounded-md p-3">
                  <div className="text-xs text-muted-foreground">
                    <div><DateDisplay date={h.date} format="long" /></div>
                    {h.notes ? <div className="mt-1">{h.notes}</div> : null}
                  </div>
                  <div className={Number(h.amount) >= 0 ? "text-red-600 font-medium" : "text-green-600 font-medium"}>
                    {Number(h.amount) >= 0 ? "+" : "-"}
                    {formatCurrency(Math.abs(Number(h.amount)))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Party statement</CardTitle>
          <CardDescription>View sales and payments separately</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="sales">Sales ({sales.length})</TabsTrigger>
              <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="sales" className="mt-4">
              {salesLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading sales...</span>
                </div>
              ) : sales.length === 0 ? (
                <div className="text-sm text-muted-foreground">No sales for this party yet.</div>
              ) : (
                <div className="space-y-2">
                  {sales.map((s: any) => (
                    <div key={s.id} className="flex items-start justify-between gap-3 border rounded-md p-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium flex gap-2 flex-wrap items-center">
                          <span>{s.itemType || "Sale"}</span>
                          {s.isCredit ? (
                            <Badge variant="secondary" className="text-xs">Credit</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Cash</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <DateDisplay date={s.date} format="long" />
                        </div>
                        {s.description ? (
                          <div className="text-xs text-muted-foreground">{s.description}</div>
                        ) : null}
                      </div>
                      <div className="text-sm font-semibold text-right text-red-600">
                        +{formatCurrency(Number(s.amount))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-4">
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading payments...</span>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-sm text-muted-foreground">No payments recorded yet.</div>
              ) : (
                <div className="space-y-2">
                  {payments.map((p: any) => (
                    <div key={p.id} className="flex items-start justify-between gap-3 border rounded-md p-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-md bg-green-50">
                          <Wallet className="h-4 w-4 text-green-700" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-sm font-medium flex gap-2 items-center flex-wrap">
                            <span>{p.description || "Payment"}</span>
                            {p.reference ? <Badge variant="outline" className="text-xs">{p.reference}</Badge> : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <DateDisplay date={p.date} format="long" />
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-semibold text-right text-green-700">
                        -{formatCurrency(Number(p.amount))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isEditOpeningOpen} onOpenChange={setIsEditOpeningOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>Edit opening balance</DialogTitle>
            <DialogDescription>
              This will create a new opening balance entry (history preserved) and update the running balance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Direction</Label>
                <Select
                  value={openingDirection}
                  onValueChange={(v) => setOpeningDirection(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("common.select") || "Select"} />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="OWED">Party owes me</SelectItem>
                    <SelectItem value="ADVANCE">I owe party (credit/advance)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                placeholder="Reason / notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpeningOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveOpening} disabled={setOpeningBalance.isPending}>
              {setOpeningBalance.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

