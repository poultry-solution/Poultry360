"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Bird, CircleDollarSign, Users } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/common/components/ui/card";
import { Label } from "@/common/components/ui/label";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { DateDisplay } from "@/common/components/ui/date-display";
import { useSearchableCustomerSelect } from "@/hooks/useSearchableCustomerSelect";
import { useGetChickenSalesByFarmer } from "@/fetchers/dealer/dealerSaleQueries";

export default function ChickenSalesByFarmerPage() {
  const router = useRouter();
  const [sourceFarmerId, setSourceFarmerId] = useState("");
  const sourceFarmerSelect = useSearchableCustomerSelect();
  const { data, isLoading } = useGetChickenSalesByFarmer(sourceFarmerId || undefined);
  const rows = data?.data ?? [];

  const formatCurrency = (amount: number) => `रू ${Math.abs(Number(amount) || 0).toFixed(2)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dealer/dashboard/sales")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Broiler Sales by Farmer</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Tentative broiler-sale revenue to review before manual farmer settlement.
            </p>
          </div>
        </div>
      </div>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="flex gap-3 p-4 text-sm text-amber-900">
          <Bird className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <span className="font-semibold">Tentative — not yet settled.</span>{" "}
            Broiler-sale revenue is shown for reconciliation only. It is not a farmer balance or due amount, and no settlement is applied automatically.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter by source farmer</CardTitle>
          <CardDescription>Choose a farmer to view only their tentative broiler sales.</CardDescription>
        </CardHeader>
        <CardContent className="max-w-xl space-y-2">
          <Label>Source Farmer</Label>
          <SearchableSelect
            value={sourceFarmerId}
            onValueChange={(value) => setSourceFarmerId(value)}
            options={sourceFarmerSelect.options}
            placeholder="All source farmers"
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
          <CardTitle>Farmer reconciliation overview</CardTitle>
          <CardDescription>
            Existing feed/credit due and broiler revenue are deliberately displayed as separate values.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">Loading broiler sales…</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">No broiler sales recorded for this farmer.</div>
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
                          {row.saleCount} broiler sale{row.saleCount === 1 ? "" : "s"}
                          {row.latestSaleDate && <> · latest <DateDisplay date={row.latestSaleDate} /></>}
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 md:min-w-[410px]">
                        <div className="rounded-md bg-slate-50 p-3">
                          <div className="text-xs font-medium text-muted-foreground">Existing feed / credit due</div>
                          <div className={`mt-1 text-lg font-bold ${due > 0 ? "text-red-600" : due < 0 ? "text-green-600" : ""}`}>
                            {formatCurrency(due)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {due > 0 ? "Farmer owes dealer" : due < 0 ? "Farmer has advance/credit" : "No current due"}
                          </div>
                        </div>
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                          <div className="flex items-center gap-1 text-xs font-medium text-amber-900">
                            <CircleDollarSign className="h-3.5 w-3.5" /> Tentative broiler-sale revenue
                          </div>
                          <div className="mt-1 text-lg font-bold text-amber-800">{formatCurrency(row.tentativeRevenue)}</div>
                          <div className="text-xs text-amber-800">Not yet settled</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
