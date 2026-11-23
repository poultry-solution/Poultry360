"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";
import { NepaliDatePicker } from "@/common/components/ui/nepali-date-picker";
import { toNepalDayAd, convertADtoBS } from "@/common/lib/nepali-date";
import { toast } from "sonner";

function todayBs(): string {
  return convertADtoBS(toNepalDayAd(new Date()));
}

interface AccountFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  initial?: { name: string; openingBalance: number; openingBsDate: string };
  /** When editing an existing account, opening balance field becomes read-only unless hasMovements=false (handled by caller). */
  editingAccountId?: string;
  allowOpeningEdit?: boolean;
  /**
   * Editing the Cash account: only "cash you have right now" is shown. The
   * server moves the Cash start to today when it is saved.
   */
  isCashAccount?: boolean;
  onSubmit: (input: {
    name: string;
    openingBalance: number;
    openingBsDate: string;
  }) => Promise<void> | void;
}

export function AccountFormModal({
  open,
  onOpenChange,
  submitting,
  initial,
  editingAccountId,
  allowOpeningEdit = true,
  isCashAccount = false,
  onSubmit,
}: AccountFormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [openingStr, setOpeningStr] = useState(
    initial ? String(initial.openingBalance) : "0",
  );
  const [bsDate, setBsDate] = useState(initial?.openingBsDate ?? todayBs());

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setOpeningStr(initial ? String(initial.openingBalance) : "0");
      setBsDate(initial?.openingBsDate ?? todayBs());
    }
  }, [open, initial]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    const opening = Number(openingStr);
    if (!trimmed) return toast.error("Account name is required");
    // "Cash" is reserved for the system account on BANK add/edit paths. When
    // we're editing THE system Cash account itself, the name is pre-filled
    // and locked so the reserve check doesn't apply.
    if (!isCashAccount && trimmed.toLowerCase() === "cash")
      return toast.error(`"Cash" is reserved for the system account`);
    if (!Number.isFinite(opening) || opening < 0)
      return toast.error(
        isCashAccount ? "Cash must be 0 or more" : "Opening balance must be 0 or more",
      );

    await onSubmit({
      name: trimmed,
      openingBalance: opening,
      openingBsDate: bsDate,
    });
    onOpenChange(false);
  }

  const isEditing = Boolean(editingAccountId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isCashAccount
              ? "Cash in hand right now"
              : isEditing
                ? "Edit bank account"
                : "Add bank account"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isCashAccount && (
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. NIC Asia Main"
              />
            </div>
          )}

          <div>
            <Label>
              {isCashAccount ? "Cash you have right now (रू)" : "Opening balance (रू)"}
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={openingStr}
              onChange={(e) => setOpeningStr(e.target.value)}
              disabled={isEditing && !allowOpeningEdit}
            />
            {isCashAccount && (
              <p className="mt-1 text-xs text-muted-foreground">
                Count the cash you have now. Today&apos;s entries already saved
                are included in this count, so they won&apos;t be added again.
              </p>
            )}
            {isEditing && !allowOpeningEdit && (
              <p className="mt-1 text-xs text-muted-foreground">
                This account already has movements. Record a Cash in or Cash
                out on the main page instead.
              </p>
            )}
          </div>

          {!isCashAccount && (
          <div>
            <Label>Opening date (BS)</Label>
            {isEditing ? (
              <>
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                  {bsDate}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Opening date is set once when the account is created and
                  can&apos;t be changed later.
                </p>
              </>
            ) : (
              <>
                <NepaliDatePicker
                  defaultDate={bsDate}
                  onChange={(v) => setBsDate(v.bsDate)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Balances for dates before this won&apos;t include this
                  account.
                </p>
              </>
            )}
          </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
