"use client";

import type { ReactNode } from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { Textarea } from "@/common/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/common/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/common/components/ui/popover";
import { NepaliDatePicker } from "@/common/components/ui/nepali-date-picker";
import { convertADtoBS, getNepalTodayAd } from "@/common/lib/nepali-date";
import { SearchableSelect } from "@/components/common/SearchableSelect";
import { useSearchableCustomerSelect } from "@/hooks/useSearchableCustomerSelect";
import { cn } from "@/common/lib/utils";
import {
  BulkBroilerRow,
  BulkBroilerRowDerived,
  BulkRowBuyer,
  formatCurrency,
} from "./types";

interface Props {
  index: number;
  row: BulkBroilerRow;
  derived: BulkBroilerRowDerived;
  showErrors: boolean;
  serverErrors: string[];
  showCustomInvoice: boolean;
  removable: boolean;
  onChange: (patch: Partial<BulkBroilerRow>) => void;
  onRemove: () => void;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
] as const;

/** Number box with a small unit before and/or after the number, so the typed
 * value always has room and stays readable. */
function NumberBox({
  value,
  onValue,
  prefix,
  suffix,
  step = 0.01,
  min = 0,
  placeholder = "0",
}: {
  value: number | null;
  onValue: (raw: string) => void;
  prefix?: ReactNode;
  suffix?: ReactNode;
  step?: number;
  min?: number;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      {prefix ? (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {prefix}
        </span>
      ) : null}
      <Input
        type="number"
        inputMode="decimal"
        min={min}
        step={step}
        value={value ? value : ""}
        onChange={(e) => onValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "h-10 min-w-[110px] text-right tabular-nums",
          prefix ? "pl-9" : "",
          suffix ? "pr-11" : ""
        )}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

export function BroilerBulkRow({
  index,
  row,
  derived,
  showErrors,
  serverErrors,
  showCustomInvoice,
  removable,
  onChange,
  onRemove,
}: Props) {
  const buyerSelect = useSearchableCustomerSelect();
  const clientErrors = showErrors ? derived.errors : [];
  const allErrors = [...clientErrors, ...serverErrors];
  const hasErrors = allErrors.length > 0;

  const handleBuyerChange = (value: string, option?: any) => {
    const data: any = option?.data || null;
    const nextBuyer: BulkRowBuyer | null = data
      ? { id: data.id, name: data.name, phone: data.phone ?? null, address: data.address ?? null }
      : null;
    onChange({ buyerId: value, buyer: nextBuyer });
  };

  const markPaidInFull = () => {
    // Release the touched flag so paid resumes auto-syncing with line total.
    onChange({ paidAmount: derived.lineTotal, paidAmountTouched: false });
  };

  // The Paid input flips `paidAmountTouched` on edit so weight/rate changes
  // stop clobbering it. Clearing the field releases it back to auto-sync —
  // same pattern as the purchase card's totalCost.
  const handlePaidChange = (raw: string) => {
    const trimmed = raw.trim();
    const paidAmount = parseFloat(trimmed) || 0;
    const paidAmountTouched = trimmed !== "";
    onChange({ paidAmount, paidAmountTouched });
  };

  const moreMenu = (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="More options"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 bg-white p-3">
        {showCustomInvoice && (
          <div className="space-y-1.5">
            <Label className="text-xs">Invoice number (optional)</Label>
            <Input
              value={row.invoiceNumber}
              onChange={(e) => onChange({ invoiceNumber: e.target.value })}
              placeholder="Auto"
              className="h-9"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Different date for this buyer</Label>
          <NepaliDatePicker
            defaultDate={convertADtoBS(row.dateOverride || getNepalTodayAd()) as any}
            onChange={({ adDate }: { bsDate: string; adDate: string }) => {
              const ymd = adDate.includes("T") ? adDate.split("T")[0] : adDate;
              onChange({ dateOverride: ymd });
            }}
            className="w-full rounded-md border border-input"
            theme="light"
            language="en"
          />
          {row.dateOverride ? (
            <button
              type="button"
              className="text-xs text-muted-foreground underline"
              onClick={() => onChange({ dateOverride: null })}
            >
              Use shared date
            </button>
          ) : (
            <p className="text-xs text-muted-foreground">Uses the shared date above.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Notes</Label>
          <Textarea
            value={row.notes}
            onChange={(e) => onChange({ notes: e.target.value })}
            rows={2}
            placeholder="Optional"
          />
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div
      className={cn(
        "space-y-4 rounded-lg border bg-white p-4",
        hasErrors && "border-destructive/60 bg-red-50/30"
      )}
    >
      {/* Buyer */}
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Buyer {index + 1}</Label>
          <SearchableSelect
            value={row.buyerId}
            onValueChange={handleBuyerChange}
            options={buyerSelect.options}
            placeholder="Select buyer"
            searchPlaceholder="Search customers..."
            emptyText="No matching customers"
            isLoading={buyerSelect.isLoading}
            onSearch={buyerSelect.onSearch}
            displayValue={row.buyer?.name}
          />
        </div>
        {moreMenu}
        {removable && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive"
            aria-label="Remove buyer"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Weight</Label>
          <NumberBox
            value={row.weightKg}
            onValue={(v) => onChange({ weightKg: parseFloat(v) || 0 })}
            suffix="kg"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Broilers (optional)</Label>
          <NumberBox
            value={row.broilerCount}
            onValue={(v) => onChange({ broilerCount: v === "" ? null : Number(v) })}
            step={1}
            min={1}
            placeholder="—"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Rate</Label>
          <NumberBox
            value={row.ratePerKg}
            onValue={(v) => onChange({ ratePerKg: parseFloat(v) || 0 })}
            prefix="रू"
            suffix="/kg"
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs">Discount</Label>
            <div className="flex overflow-hidden rounded border text-[11px]" role="radiogroup" aria-label="Discount type">
              {([
                { type: "PERCENT", label: "%" },
                { type: "FLAT", label: "रू" },
              ] as const).map((option) => (
                <button
                  key={option.type}
                  type="button"
                  role="radio"
                  aria-checked={row.discountType === option.type}
                  onClick={() => onChange({ discountType: option.type })}
                  className={cn(
                    "px-2 py-0.5",
                    row.discountType === option.type
                      ? "bg-primary text-primary-foreground"
                      : "bg-white text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <NumberBox
            value={row.discountValue}
            onValue={(v) => onChange({ discountValue: parseFloat(v) || 0 })}
            step={row.discountType === "PERCENT" ? 1 : 0.01}
            suffix={row.discountType === "PERCENT" ? "%" : "रू"}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs">Paid</Label>
            <button
              type="button"
              className="text-[11px] font-medium text-primary underline-offset-2 hover:underline disabled:text-muted-foreground disabled:no-underline"
              onClick={markPaidInFull}
              disabled={derived.lineTotal <= 0 || row.paidAmount === derived.lineTotal}
            >
              Paid in full
            </button>
          </div>
          <NumberBox
            value={row.paidAmount}
            onValue={handlePaidChange}
            prefix="रू"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Payment</Label>
          <Select
            value={row.paymentMethod}
            onValueChange={(v: BulkBroilerRow["paymentMethod"]) => onChange({ paymentMethod: v })}
          >
            <SelectTrigger className="h-10 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white">
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Totals */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-md bg-muted/40 px-3 py-2 text-sm">
        <div className="whitespace-nowrap">
          <span className="text-muted-foreground">Line total </span>
          <span className="font-semibold tabular-nums">{formatCurrency(derived.lineTotal)}</span>
        </div>
        {derived.dueAmount > 0 && (
          <div className="whitespace-nowrap">
            <span className="text-muted-foreground">Due </span>
            <span className="font-semibold tabular-nums text-orange-600">{formatCurrency(derived.dueAmount)}</span>
          </div>
        )}
      </div>

      {hasErrors && (
        <ul className="list-disc pl-5 text-xs text-destructive">
          {allErrors.map((err, i) => <li key={i}>{err}</li>)}
        </ul>
      )}
    </div>
  );
}
