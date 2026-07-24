"use client";

import { Button } from "@/common/components/ui/button";
import { Card } from "@/common/components/ui/card";
import { DateDisplay } from "@/common/components/ui/date-display";

type SaleBillLine = {
  id?: string;
  name: string;
  quantity: number;
  rate: number;
  total: number;
  note?: string;
};

type SaleBillDocumentProps = {
  sale: any;
  onPrint?: () => void;
  onBack?: () => void;
  showActions?: boolean;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

export function SaleBillDocument({
  sale,
  onPrint,
  onBack,
  showActions = true,
}: SaleBillDocumentProps) {
  const eggLines = Array.isArray(sale?.eggLines) ? sale.eggLines : [];

  const lines: SaleBillLine[] =
    eggLines.length > 0
      ? eggLines.map((line: any) => {
          const quantity = Number(line.quantity ?? 0);
          const rate = Number(line.unitPrice ?? 0);
          return {
            id: line.id,
            name: line.eggType?.name || line.eggType?.code || "Eggs",
            quantity,
            rate,
            total: quantity * rate,
          };
        })
      : [
          {
            id: sale?.id,
            name:
              sale?.eggType?.name ||
              sale?.category?.name ||
              sale?.itemType ||
              "Sale",
            quantity: Number(sale?.quantity ?? 0),
            rate: Number(sale?.unitPrice ?? 0),
            total: Number(sale?.amount ?? 0),
            note:
              sale?.weight != null
                ? `${Number(sale.weight).toFixed(2)} kg`
                : undefined,
          },
        ];

  const totalAmount = Number(sale?.amount ?? 0);
  const paidAmount = Number(sale?.paidAmount ?? 0);
  const dueAmount = Number(
    sale?.dueAmount ?? Math.max(0, totalAmount - paidAmount)
  );

  return (
    <div className="bg-white text-slate-900">
      <Card className="mx-auto w-full max-w-3xl border-0 shadow-none rounded-none print:shadow-none print:border-0">
        <div className="px-5 py-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-2xl font-semibold">
                {sale?.farm?.owner?.name || sale?.farm?.name || "Poultry360"}
              </div>
              <div className="text-sm text-slate-600">
                {sale?.farm?.name ? `Farm: ${sale.farm.name}` : "Sales bill"}
              </div>
            </div>
            <div className="text-right text-sm text-slate-600">
              <div className="font-medium text-slate-900">
                Invoice #{sale?.invoiceNumber || "—"}
              </div>
              <div>
                <DateDisplay date={sale?.date} format="short" />
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <span className="font-medium">Customer: </span>
              {sale?.customer?.name || "Walk-in"}
            </div>
            <div>
              <span className="font-medium">Phone: </span>
              {sale?.customer?.phone || "—"}
            </div>
            <div>
              <span className="font-medium">Category: </span>
              {sale?.customer?.category || sale?.category?.name || "—"}
            </div>
            <div>
              <span className="font-medium">Batch: </span>
              {sale?.batch?.batchNumber || "—"}
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Item</th>
                  <th className="px-3 py-2 text-right font-semibold">Qty</th>
                  <th className="px-3 py-2 text-right font-semibold">Rate</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.id || `${line.name}-${index}`} className="border-t">
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium">{line.name}</div>
                      {line.note ? (
                        <div className="text-xs text-slate-500">{line.note}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      {Number.isFinite(line.quantity) ? line.quantity.toLocaleString() : "0"}
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      ₹{formatCurrency(line.rate)}
                    </td>
                    <td className="px-3 py-2 text-right align-top font-medium">
                      ₹{formatCurrency(line.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:items-end">
            <div className="w-full max-w-sm rounded-lg border bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span>Total Amount</span>
                <span className="font-semibold">₹{formatCurrency(totalAmount)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>Paid</span>
                <span className="font-semibold">₹{formatCurrency(paidAmount)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span>Due</span>
                <span className="font-semibold">₹{formatCurrency(dueAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {showActions && (onPrint || onBack) ? (
          <div className="px-5 pb-5 flex items-center justify-end gap-2 no-print print:hidden">
            {onBack ? (
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>
            ) : null}
            {onPrint ? (
              <Button onClick={onPrint}>
                Print
              </Button>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
