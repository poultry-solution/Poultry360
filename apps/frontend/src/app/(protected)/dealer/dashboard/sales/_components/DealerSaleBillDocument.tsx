"use client";

import { Button } from "@/common/components/ui/button";
import { Card } from "@/common/components/ui/card";
import { DateDisplay } from "@/common/components/ui/date-display";

type DealerSaleBillLine = {
  id?: string;
  name: string;
  quantity: number;
  rate: number;
  total: number;
  note?: string;
};

type DealerSaleBillDocumentProps = {
  sale: any;
  companyName?: string;
  mode?: "standard" | "compact";
  onPrint?: () => void;
  onBack?: () => void;
  showActions?: boolean;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-NP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);

export function DealerSaleBillDocument({
  sale,
  companyName,
  mode = "standard",
  onPrint,
  onBack,
  showActions = true,
}: DealerSaleBillDocumentProps) {
  const isCompact = mode === "compact";
  const saleItems = Array.isArray(sale?.items) ? sale.items : [];

  const lines: DealerSaleBillLine[] =
    saleItems.length > 0
      ? saleItems.map((line: any) => {
          const quantity = Number(line.quantity ?? 0);
          const rate = Number(line.unitPrice ?? 0);
          return {
            id: line.id,
            name: line.product?.name || line.dealerProduct?.name || "Product",
            quantity,
            rate,
            total: Number(line.totalAmount ?? quantity * rate),
            note: line.unit || line.product?.unit || undefined,
          };
        })
      : [
          {
            id: sale?.id,
            name: sale?.notes || "Sale",
            quantity: 0,
            rate: Number(sale?.totalAmount ?? 0),
            total: Number(sale?.totalAmount ?? 0),
          },
        ];

  const totalAmount = Number(sale?.totalAmount ?? 0);
  const subtotalAmount = Number(sale?.subtotalAmount ?? totalAmount);
  const discountAmount = Math.max(0, subtotalAmount - totalAmount);
  const paidAmount = Number(sale?.paidAmount ?? 0);
  const dueAmount = Number(
    sale?.dueAmount ?? Math.max(0, totalAmount - paidAmount)
  );
  const paymentLabel = sale?.paymentMethod || (sale?.isCredit ? "Credit" : "Cash");

  return (
    <div className="bg-white text-slate-900">
      <Card
        className={[
          "mx-auto w-full border-0 shadow-none rounded-none print:shadow-none print:border-0",
          isCompact ? "max-w-xl" : "max-w-3xl",
        ].join(" ")}
      >
        <div className={isCompact ? "px-4 py-3 border-b" : "px-5 py-4 border-b"}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={isCompact ? "text-lg font-semibold" : "text-2xl font-semibold"}>
                {companyName || "Dealer"}
              </div>
              <div className={isCompact ? "text-xs text-slate-600" : "text-sm text-slate-600"}>
                Sales bill
              </div>
            </div>
            <div className={isCompact ? "text-right text-xs text-slate-600" : "text-right text-sm text-slate-600"}>
              <div className="font-medium text-slate-900">
                Invoice #{sale?.invoiceNumber || sale?.id?.slice(0, 8) || "—"}
              </div>
              <div>
                <DateDisplay date={sale?.date} format="short" />
              </div>
            </div>
          </div>

          <div
            className={[
              "mt-3 grid gap-2 text-slate-700",
              isCompact ? "grid-cols-1 text-xs sm:grid-cols-2" : "text-sm sm:grid-cols-2",
            ].join(" ")}
          >
            <div>
              <span className="font-medium">Customer: </span>
              {sale?.customer?.name || "Walk-in"}
            </div>
            <div>
              <span className="font-medium">Phone: </span>
              {sale?.customer?.phone || "—"}
            </div>
            <div>
              <span className="font-medium">Payment: </span>
              {paymentLabel}
            </div>
            <div>
              <span className="font-medium">Address: </span>
              {sale?.customer?.address || "—"}
            </div>
          </div>
        </div>

        <div className={isCompact ? "px-4 py-3" : "px-5 py-4"}>
          <div className="overflow-hidden rounded-lg border">
            <table className={["w-full border-collapse", isCompact ? "text-xs" : "text-sm"].join(" ")}>
              <thead className="bg-slate-50">
                <tr>
                  <th className={["text-left font-semibold", isCompact ? "px-2 py-2" : "px-3 py-2"].join(" ")}>Item</th>
                  <th className={["text-right font-semibold", isCompact ? "px-2 py-2" : "px-3 py-2"].join(" ")}>Qty</th>
                  <th className={["text-right font-semibold", isCompact ? "px-2 py-2" : "px-3 py-2"].join(" ")}>Rate</th>
                  <th className={["text-right font-semibold", isCompact ? "px-2 py-2" : "px-3 py-2"].join(" ")}>Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.id || `${line.name}-${index}`} className="border-t">
                    <td className={["align-top", isCompact ? "px-2 py-2" : "px-3 py-2"].join(" ")}>
                      <div className="font-medium">{line.name}</div>
                      {line.note ? (
                        <div className={isCompact ? "text-[10px] text-slate-500" : "text-xs text-slate-500"}>{line.note}</div>
                      ) : null}
                    </td>
                    <td className={["text-right align-top", isCompact ? "px-2 py-2" : "px-3 py-2"].join(" ")}>
                      {Number.isFinite(line.quantity) ? line.quantity.toLocaleString() : "0"}
                    </td>
                    <td className={["text-right align-top", isCompact ? "px-2 py-2" : "px-3 py-2"].join(" ")}>
                      ₹{formatCurrency(line.rate)}
                    </td>
                    <td className={["text-right align-top font-medium", isCompact ? "px-2 py-2" : "px-3 py-2"].join(" ")}>
                      ₹{formatCurrency(line.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={isCompact ? "mt-3 flex flex-col gap-2" : "mt-4 flex flex-col gap-2 sm:items-end"}>
            <div className={["w-full rounded-lg border bg-slate-50", isCompact ? "max-w-md p-3" : "max-w-sm p-4"].join(" ")}>
              {sale?.subtotalAmount != null && discountAmount > 0 ? (
                <div className={isCompact ? "space-y-1 text-xs" : "space-y-1 text-sm"}>
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold">₹{formatCurrency(subtotalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Discount</span>
                    <span className="font-semibold text-green-600">- ₹{formatCurrency(discountAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t">
                    <span>Total Amount</span>
                    <span className="font-semibold">₹{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Paid</span>
                    <span className="font-semibold">₹{formatCurrency(paidAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Due</span>
                    <span className="font-semibold">₹{formatCurrency(dueAmount)}</span>
                  </div>
                </div>
              ) : (
                <div>
                  <div className={isCompact ? "flex items-center justify-between text-xs" : "flex items-center justify-between text-sm"}>
                    <span>Total Amount</span>
                    <span className="font-semibold">₹{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className={isCompact ? "mt-1.5 flex items-center justify-between text-xs" : "mt-2 flex items-center justify-between text-sm"}>
                    <span>Paid</span>
                    <span className="font-semibold">₹{formatCurrency(paidAmount)}</span>
                  </div>
                  <div className={isCompact ? "mt-1.5 flex items-center justify-between text-xs" : "mt-2 flex items-center justify-between text-sm"}>
                    <span>Due</span>
                    <span className="font-semibold">₹{formatCurrency(dueAmount)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {showActions && (onPrint || onBack) ? (
          <div className={["flex items-center justify-end gap-2 no-print print:hidden", isCompact ? "px-4 pb-4" : "px-5 pb-5"].join(" ")}>
            {onBack ? (
              <Button variant="outline" size="sm" onClick={onBack}>
                Back
              </Button>
            ) : null}
            {onPrint ? (
              <Button size="sm" onClick={onPrint}>
                Print
              </Button>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
