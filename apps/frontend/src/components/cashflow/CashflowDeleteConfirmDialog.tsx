"use client";

import { useEffect, useState } from "react";

import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Input } from "@/common/components/ui/input";
import { Label } from "@/common/components/ui/label";

interface CashflowDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  submitting: boolean;
  onConfirm: (password: string) => Promise<void>;
}

/** Password-confirmed hard delete for cashflow data. */
export function CashflowDeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  submitting,
  onConfirm,
}: CashflowDeleteConfirmDialogProps) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!open) setPassword("");
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!password || submitting) return;
    await onConfirm(password);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="mt-4 space-y-2">
            <Label htmlFor="cashflow-delete-password">
              Enter your password to confirm
            </Label>
            <Input
              id="cashflow-delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={!password || submitting}>
              {submitting ? "Deleting..." : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
