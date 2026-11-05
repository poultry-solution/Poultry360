"use client";

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
  variant: "table" | "card";
  onChange: (patch: Partial<BulkBroilerRow>) => void;
  onRemove: () => void;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "OTHER", label: "Other" },
] as const;

export function BroilerBulkRow({
  index,
  row,
  derived,
  showErrors,
  serverErrors,
  showCustomInvoice,
  removable,
  variant,
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
          className="h-8 w-8"
          aria-label="More options"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3 bg-white p-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Discount type</Label>
          <Select
            value={row.discountType}
            onValueChange={(v: "PERCENT" | "FLAT") => onChange({ discountType: v })}
          >
            <SelectTrigger className="h-8 bg-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white">
              <SelectItem value="PERCENT">Percent (%)</SelectItem>
              <SelectItem value="FLAT">Flat (रू)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showCustomInvoice && (
          <div className="space-y-1.5">
            <Label className="text-xs">Invoice number (optional)</Label>
            <Input
              value={row.invoiceNumber}
              onChange={(e) => onChange({ invoiceNumber: e.target.value })}
              placeholder="Auto"
              className="h-8"
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Date override</Label>
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={markPaidInFull}
          disabled={derived.lineTotal <= 0 || row.paidAmount === derived.lineTotal}
        >
          Mark paid in full ({formatCurrency(derived.lineTotal)})
        </Button>
      </PopoverContent>
    </Popover>
  );

  if (variant === "card") {
    return (
      <div className={cn(
        "rounded-lg border bg-white p-3 shadow-sm space-y-3",
        hasErrors && "border-destructive/60"
      )}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-medium text-muted-foreground">Buyer #{index + 1}</div>
          <div className="flex items-center gap-1">
            {moreMenu}
            {removable && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                aria-label="Remove row"
                onClick={onRemove}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Buyer</Label>
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

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Weight (kg)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={row.weightKg || ""}
              onChange={(e) => onChange({ weightKg: parseFloat(e.target.value) || 0 })}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Broilers (optional)</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={row.broilerCount ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                onChange({ broilerCount: v === "" ? null : Number(v) });
              }}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Rate/kg</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={row.ratePerKg || ""}
              onChange={(e) => onChange({ ratePerKg: parseFloat(e.target.value) || 0 })}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">
              Discount ({row.discountType === "PERCENT" ? "%" : "रू"})
            </Label>
            <Input
              type="number"
              min={0}
              step={row.discountType === "PERCENT" ? 1 : 0.01}
              value={row.discountValue || ""}
              onChange={(e) => onChange({ discountValue: parseFloat(e.target.value) || 0 })}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Paid (रू)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              max={derived.lineTotal || undefined}
              value={row.paidAmount || ""}
              onChange={(e) => handlePaidChange(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Payment</Label>
            <Select
              value={row.paymentMethod}
              onValueChange={(v: BulkBroilerRow["paymentMethod"]) => onChange({ paymentMethod: v })}
            >
              <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white">
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Line total</div>
            <div className="font-semibold">{formatCurrency(derived.lineTotal)}</div>
          </div>
          {derived.dueAmount > 0 && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Due</div>
              <div className="font-semibold text-orange-600">{formatCurrency(derived.dueAmount)}</div>
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

  // ========================= Table variant (desktop) =========================
  return (
    <tr className={cn(hasErrors && "bg-red-50/40")}>
      <td className="p-2 align-top text-sm text-muted-foreground">{index + 1}</td>
      <td className="p-2 align-top min-w-[180px]">
        <SearchableSelect
          value={row.buyerId}
          onValueChange={handleBuyerChange}
          options={buyerSelect.options}
          placeholder="Buyer"
          searchPlaceholder="Search..."
          emptyText="No match"
          isLoading={buyerSelect.isLoading}
          onSearch={buyerSelect.onSearch}
          displayValue={row.buyer?.name}
        />
      </td>
      <td className="p-2 align-top w-[90px]">
        <Input
          type="number"
          min={0}
          step={0.01}
          value={row.weightKg || ""}
          onChange={(e) => onChange({ weightKg: parseFloat(e.target.value) || 0 })}
          className="h-9"
        />
      </td>
      <td className="p-2 align-top w-[85px]">
        <Input
          type="number"
          min={1}
          step={1}
          value={row.broilerCount ?? ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange({ broilerCount: v === "" ? null : Number(v) });
          }}
          placeholder="—"
          className="h-9"
        />
      </td>
      <td className="p-2 align-top w-[100px]">
        <Input
          type="number"
          min={0}
          step={0.01}
          value={row.ratePerKg || ""}
          onChange={(e) => onChange({ ratePerKg: parseFloat(e.target.value) || 0 })}
          className="h-9"
        />
      </td>
      <td className="p-2 align-top w-[95px]">
        <div className="relative">
          <Input
            type="number"
            min={0}
            step={row.discountType === "PERCENT" ? 1 : 0.01}
            value={row.discountValue || ""}
            onChange={(e) => onChange({ discountValue: parseFloat(e.target.value) || 0 })}
            className="h-9 pr-7"
            placeholder="0"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {row.discountType === "PERCENT" ? "%" : "रू"}
          </span>
        </div>
      </td>
      <td className="p-2 align-top text-right text-sm font-medium w-[110px]">
        {formatCurrency(derived.lineTotal)}
      </td>
      <td className="p-2 align-top w-[110px]">
        <Input
          type="number"
          min={0}
          step={0.01}
          max={derived.lineTotal || undefined}
          value={row.paidAmount || ""}
          onChange={(e) => handlePaidChange(e.target.value)}
          className="h-9"
        />
      </td>
      <td className="p-2 align-top w-[110px]">
        <Select
          value={row.paymentMethod}
          onValueChange={(v: BulkBroilerRow["paymentMethod"]) => onChange({ paymentMethod: v })}
        >
          <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-white">
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="p-2 align-top w-[40px]">
        {moreMenu}
      </td>
      <td className="p-2 align-top w-[40px]">
        {removable && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            aria-label="Remove row"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </td>
    </tr>
  );
}

/** Renders a per-row inline-error strip below a row in table mode. Returned
 * separately so the parent table can span it across all columns. */
export function BroilerBulkRowErrors({ errors, columnCount }: { errors: string[]; columnCount: number }) {
  if (errors.length === 0) return null;
  return (
    <tr>
      <td colSpan={columnCount} className="px-2 pb-2">
        <ul className="list-disc pl-5 text-xs text-destructive">
          {errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      </td>
    </tr>
  );
}
