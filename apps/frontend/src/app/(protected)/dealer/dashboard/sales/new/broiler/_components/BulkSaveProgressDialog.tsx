"use client";

import Link from "next/link";
import { CheckCircle2, Loader2, Printer, Receipt } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dealerBillPrintHref } from "@/app/(protected)/dealer/dashboard/sales/_components/DealerSaleBill";
import { BulkBroilerSaleResult } from "@/fetchers/dealer/dealerSaleQueries";
import { BulkBroilerRow, formatCurrency } from "./types";

interface Props {
  open: boolean;
  saving: boolean;
  rows: BulkBroilerRow[];
  savedSales: BulkBroilerSaleResult[];
  onClose: () => void;
}

export function BulkSaveProgressDialog({ open, saving, rows, savedSales, onClose }: Props) {
  const total = rows.length;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        if (!next) onClose();
      }}
    >
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving {total} broiler {total === 1 ? "sale" : "sales"}...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Saved {savedSales.length} broiler {savedSales.length === 1 ? "sale" : "sales"}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {saving
              ? "All rows commit together — hold on."
              : "Open each bill to print or share, or close to review them in the sales list."}
          </DialogDescription>
        </DialogHeader>

        {!saving && savedSales.length > 0 && (
          <div className="max-h-[60vh] overflow-y-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="p-2 text-left font-medium">#</th>
                  <th className="p-2 text-left font-medium">Invoice</th>
                  <th className="p-2 text-left font-medium">Buyer</th>
                  <th className="p-2 text-right font-medium">Total</th>
                  <th className="p-2 text-left font-medium" />
                </tr>
              </thead>
              <tbody>
                {savedSales.map((sale, idx) => {
                  const row = rows[sale.rowIndex];
                  return (
                    <tr key={sale.id} className="border-t">
                      <td className="p-2 text-muted-foreground">{idx + 1}</td>
                      <td className="p-2 font-medium">{sale.invoiceNumber}</td>
                      <td className="p-2">{row?.buyer?.name || "—"}</td>
                      <td className="p-2 text-right">{formatCurrency(sale.totalAmount)}</td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <Link
                            href={`${dealerBillPrintHref(sale.id)}?print=1`}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"
                          >
                            <Printer className="h-3 w-3" />
                            Print
                          </Link>
                          <Link
                            href={dealerBillPrintHref(sale.id)}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs hover:bg-muted"
                          >
                            <Receipt className="h-3 w-3" />
                            Bill
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <DialogFooter>
          <Button type="button" onClick={onClose} disabled={saving}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
