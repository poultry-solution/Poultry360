"use client";

import type { ReactNode } from "react";
import { Button } from "@/common/components/ui/button";
import { DateDisplay } from "@/common/components/ui/date-display";
import { formatBillMoney } from "@/common/lib/utils";

export type BillBusiness = {
  name: string;
  address?: string | null;
  phone?: string | null;
  panNumber?: string | null;
  footerNote?: string | null;
};

export type BillLine = {
  id?: string;
  name: string;
  note?: string;
  quantity: number;
  rate: number;
  total: number;
  /** Values for `extraColumns`, keyed by column key. */
  extra?: Record<string, string>;
};

export type BillTotals = {
  /** Shown with the discount row only when there is a discount. */
  subtotal?: number;
  discountLabel?: string;
  discountAmount?: number;
  total: number;
  paid?: number;
  due?: number;
  /** Replaces Paid / Due, e.g. a supplier settlement that took no cash. */
  note?: string;
};

export type BillDocumentProps = {
  business: BillBusiness;
  title: string;
  invoiceNumber: string;
  date?: string | Date | null;
  /** "Bill to" / "Supplier" block. */
  partyLabel: string;
  partyName: string;
  partyRows?: { label: string; value: string }[];
  notice?: ReactNode;
  extraColumns?: { key: string; label: string }[];
  lines: BillLine[];
  totals: BillTotals;
  mode?: "standard" | "compact";
  onPrint?: () => void;
  onBack?: () => void;
  showActions?: boolean;
};

/** Business header used on the bill and in the Settings preview. */
export function BillBusinessHeader({ business, compact = false }: { business: BillBusiness; compact?: boolean }) {
  const lines = [
    business.address,
    business.phone ? `Phone: ${business.phone}` : null,
    business.panNumber ? `PAN: ${business.panNumber}` : null,
  ].filter(Boolean) as string[];
  return (
    <div className="min-w-0">
      <div className={compact ? "text-lg font-bold leading-tight" : "text-2xl font-bold leading-tight"}>
        {business.name}
      </div>
      {lines.map((line) => (
        <div key={line} className={compact ? "text-xs text-slate-600" : "text-sm text-slate-600"}>
          {line}
        </div>
      ))}
    </div>
  );
}

/**
 * One printed sale bill for every module. Pure layout: callers map their sale
 * into these props. Prints on A4 (see the @media print rules in globals.css).
 */
export function BillDocument({
  business,
  title,
  invoiceNumber,
  date,
  partyLabel,
  partyName,
  partyRows = [],
  notice,
  extraColumns = [],
  lines,
  totals,
  mode = "standard",
  onPrint,
  onBack,
  showActions = true,
}: BillDocumentProps) {
  const compact = mode === "compact";
  const text = compact ? "text-xs" : "text-sm";
  const cell = compact ? "px-2 py-1.5" : "px-3 py-2";
  const hasDiscount = totals.subtotal != null && (totals.discountAmount ?? 0) > 0;
  const due = totals.due ?? 0;

  return (
    <div className="bill-document bg-white text-slate-900">
      <div className={["mx-auto w-full", compact ? "max-w-xl" : "max-w-3xl"].join(" ")}>
        {/* Header: business on the left, bill details on the right */}
        <div className={["flex items-start justify-between gap-4 border-b-2 border-slate-800", compact ? "px-4 py-3" : "px-6 py-5"].join(" ")}>
          <BillBusinessHeader business={business} compact={compact} />
          <div className={["shrink-0 text-right", text].join(" ")}>
            <div className={compact ? "text-sm font-semibold uppercase tracking-wide" : "text-base font-semibold uppercase tracking-wide"}>
              {title}
            </div>
            <div className="mt-1 font-medium">Invoice #{invoiceNumber || "—"}</div>
            <div className="text-slate-600">
              <DateDisplay date={date as any} format="short" />
            </div>
          </div>
        </div>

        {/* Bill to */}
        <div className={[compact ? "px-4 py-3" : "px-6 py-4", text].join(" ")}>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{partyLabel}</div>
          <div className={compact ? "text-sm font-semibold" : "text-base font-semibold"}>{partyName}</div>
          {partyRows.length > 0 && (
            <div className="mt-1 grid gap-x-6 gap-y-0.5 text-slate-700 sm:grid-cols-2">
              {partyRows.map((row) => (
                <div key={row.label}>
                  <span className="text-slate-500">{row.label}: </span>
                  {row.value}
                </div>
              ))}
            </div>
          )}
          {notice ? <div className="mt-2">{notice}</div> : null}
        </div>

        {/* Items */}
        <div className={compact ? "px-4" : "px-6"}>
          <table className={["bill-table w-full border-collapse", text].join(" ")}>
            <thead>
              <tr className="border-y border-slate-300 bg-slate-50 text-slate-700">
                <th className={["text-left font-semibold", cell].join(" ")}>Item</th>
                <th className={["text-right font-semibold", cell].join(" ")}>Qty</th>
                {extraColumns.map((column) => (
                  <th key={column.key} className={["text-right font-semibold", cell].join(" ")}>{column.label}</th>
                ))}
                <th className={["text-right font-semibold", cell].join(" ")}>Rate</th>
                <th className={["text-right font-semibold", cell].join(" ")}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={line.id || `${line.name}-${index}`} className="border-b border-slate-200">
                  <td className={["align-top", cell].join(" ")}>
                    <div className="font-medium">{line.name}</div>
                    {line.note ? <div className="text-[11px] text-slate-500">{line.note}</div> : null}
                  </td>
                  <td className={["text-right align-top", cell].join(" ")}>
                    {Number.isFinite(line.quantity) ? line.quantity.toLocaleString("en-IN") : "0"}
                  </td>
                  {extraColumns.map((column) => (
                    <td key={column.key} className={["text-right align-top", cell].join(" ")}>
                      {line.extra?.[column.key] ?? "—"}
                    </td>
                  ))}
                  <td className={["text-right align-top whitespace-nowrap", cell].join(" ")}>{formatBillMoney(line.rate)}</td>
                  <td className={["text-right align-top whitespace-nowrap font-medium", cell].join(" ")}>{formatBillMoney(line.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className={["flex", compact ? "px-4 py-3" : "px-6 py-4", compact ? "" : "justify-end"].join(" ")}>
          <div className={["w-full space-y-1", compact ? "" : "max-w-xs", text].join(" ")}>
            {hasDiscount && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="whitespace-nowrap">{formatBillMoney(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">{totals.discountLabel || "Discount"}</span>
                  <span className="whitespace-nowrap">− {formatBillMoney(totals.discountAmount)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between border-t border-slate-800 pt-1.5 font-bold">
              <span>Total</span>
              <span className="whitespace-nowrap">{formatBillMoney(totals.total)}</span>
            </div>
            {totals.note ? (
              <div className="pt-1 text-xs text-slate-600">{totals.note}</div>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">Paid</span>
                  <span className="whitespace-nowrap">{formatBillMoney(totals.paid)}</span>
                </div>
                <div className={["flex justify-between", due > 0 ? "font-semibold" : ""].join(" ")}>
                  <span className={due > 0 ? "" : "text-slate-600"}>Due</span>
                  <span className="whitespace-nowrap">{formatBillMoney(due)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer: note, signatures */}
        <div className={[compact ? "px-4 pb-4" : "px-6 pb-6", text].join(" ")}>
          {business.footerNote ? (
            <div className="mb-4 text-center text-slate-600">{business.footerNote}</div>
          ) : null}
          <div className={["flex justify-between gap-6", compact ? "mt-6" : "mt-12"].join(" ")}>
            <div className="w-40 border-t border-slate-400 pt-1 text-center text-slate-600">Received by</div>
            <div className="min-w-48 max-w-[60%] border-t border-slate-400 px-2 pt-1 text-center text-slate-600">For {business.name}</div>
          </div>
          <div className="mt-4 text-center text-[10px] text-slate-400">Printed from Poultry360</div>
        </div>

        {showActions && (onPrint || onBack) ? (
          <div className={["no-print flex items-center justify-end gap-2 print:hidden", compact ? "px-4 pb-4" : "px-6 pb-6"].join(" ")}>
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
      </div>
    </div>
  );
}
