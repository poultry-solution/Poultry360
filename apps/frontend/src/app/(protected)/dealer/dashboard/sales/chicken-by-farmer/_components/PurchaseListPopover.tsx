"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/common/components/ui/popover";
import { Button } from "@/common/components/ui/button";
import { DateDisplay } from "@/common/components/ui/date-display";
import {
  useBroilerPurchasesForFarmer,
  useDeleteBroilerPurchase,
} from "@/fetchers/dealer/dealerSaleQueries";

/** Popover anchored on the "Your purchase cost" row. Lists the individual
 * lots that make up the aggregate and lets the dealer delete one — the
 * recovery path for the "I re-entered sales so now the cost double-counts"
 * scenario. Only current-lot (open) purchases are listed; the server
 * refuses to delete a settlement-locked row so this is safe. */
export function PurchaseListPopover({
  farmerId,
  farmerName,
  children,
}: {
  farmerId: string;
  farmerName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useBroilerPurchasesForFarmer(farmerId, {
    enabled: open,
  });
  const del = useDeleteBroilerPurchase();
  const rows = data?.data ?? [];

  const doDelete = async (id: string) => {
    if (!confirm("Delete this purchase record?")) return;
    try {
      await del.mutateAsync(id);
      toast.success("Purchase deleted");
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || "Could not delete this purchase";
      toast.error(msg);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="border-b px-3 py-2">
          <div className="text-xs font-semibold">Purchase lots — {farmerName}</div>
          <p className="text-[11px] text-muted-foreground">
            Only open (unsettled) lots are listed. Delete removes the lot from
            the current rough-margin calculation.
          </p>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {isLoading && !data ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No open purchase lots for this farmer.
            </div>
          ) : (
            <ul className="divide-y">
              {rows.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-xs tabular-nums"
                >
                  <div className="min-w-0">
                    <div className="font-medium">
                      {fmt(p.totalCost)} · {Number(p.weightKg).toFixed(2)} kg
                      {p.broilerCount ? ` · ${p.broilerCount} birds` : ""}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      <DateDisplay date={p.date} />
                      {p.notes && <> · {p.notes}</>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => doDelete(p.id)}
                    disabled={del.isPending}
                    aria-label="Delete this lot"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function fmt(amount: number): string {
  return `रू ${(Math.round(amount * 100) / 100).toFixed(2)}`;
}
