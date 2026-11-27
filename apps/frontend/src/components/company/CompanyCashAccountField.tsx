"use client";

import { useEffect } from "react";
import { Label } from "@/common/components/ui/label";
import { AccountPicker } from "@/components/cashflow/AccountPicker";
import { useGetCashflowAccountOptions } from "@/fetchers/company/companyCashflowQueries";

interface CompanyCashAccountFieldProps {
  /** "Received into" for money from dealers, "Paid from" for money out. */
  label: string;
  value: string;
  onChange: (id: string) => void;
}

/**
 * Cash / Bank choice for company payment forms. Uses the names-only list, so
 * staff without the Cash & Bank permission can still pick. Falls back to Cash
 * whenever the value is empty (first open, and after the form is reset), and
 * stays hidden until the company has a bank account.
 */
export function CompanyCashAccountField({ label, value, onChange }: CompanyCashAccountFieldProps) {
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
