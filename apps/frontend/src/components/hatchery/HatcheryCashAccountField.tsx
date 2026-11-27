"use client";

import { useEffect } from "react";
import { Label } from "@/common/components/ui/label";
import { AccountPicker } from "@/components/cashflow/AccountPicker";
import { useGetCashflowAccountOptions } from "@/fetchers/hatchery/hatcheryCashflowQueries";

interface HatcheryCashAccountFieldProps {
  /** "Received into" for money in, "Paid from" for money out. */
  label: string;
  value: string;
  onChange: (id: string) => void;
}

/**
 * Cash / Bank picker for hatchery payment and no-party sale forms. Uses the
 * names-only account list so staff without the Cash & Bank permission can
 * still submit. Defaults to the Cash account on first render and hides itself
 * when the hatchery has no bank account yet (CASH-only setup).
 */
export function HatcheryCashAccountField({ label, value, onChange }: HatcheryCashAccountFieldProps) {
  const accounts = useGetCashflowAccountOptions().data ?? [];

  useEffect(() => {
    if (value) return;
    const cash = accounts.find((a) => a.type === "CASH" && a.archivedAt === null);
    if (cash) onChange(cash.id);
  }, [value, accounts, onChange]);

  if (!accounts.some((a) => a.type === "BANK" && a.archivedAt === null)) return null;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <AccountPicker accounts={accounts} value={value} onChange={onChange} autoHideSingleCash />
    </div>
  );
}
