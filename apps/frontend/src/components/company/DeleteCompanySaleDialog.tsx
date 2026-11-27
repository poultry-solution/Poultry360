"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import { Input } from "@/common/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { useDeleteCompanySale } from "@/fetchers/company/companySaleQueries";

/**
 * Password-gated delete confirmation for a company sale. Mirrors the dealer
 * sales delete dialog in `dealer/dashboard/sales/page.tsx` — same copy, same
 * flow. Backend reverses dealer balance + product stock + ledger entry
 * inside one transaction; UI invalidates the relevant query keys on success.
 */
export function DeleteCompanySaleDialog({
  saleId,
  onClose,
  onSuccess,
}: {
  saleId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [password, setPassword] = useState("");
  const mutation = useDeleteCompanySale();

  useEffect(() => {
    if (!saleId) setPassword("");
  }, [saleId]);

  const handleDelete = () => {
    if (!saleId) return;
    // Guard against double-click: a second click can land in the same React
    // tick before the button's `disabled` prop re-renders, which otherwise
    // fires the mutation twice — the second attempt finds the sale already
    // gone and surfaces a "Sale not found" toast on top of the success one.
    if (mutation.isPending) return;
    mutation.mutate(
      { saleId, password },
      {
        onSuccess: () => {
          toast.success("Sale deleted successfully");
          setPassword("");
          onClose();
          onSuccess?.();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || "Failed to delete sale");
        },
      },
    );
  };

  return (
    <Dialog
      open={!!saleId}
      onOpenChange={(open) => {
        if (!open) {
          setPassword("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-sm bg-white">
        <DialogHeader>
          <DialogTitle>Delete Sale</DialogTitle>
          <DialogDescription>
            This will permanently delete this sale, restore product stock,
            and undo the dealer&apos;s balance. Enter your password to confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <Input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPassword("");
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!password || mutation.isPending}
              onClick={handleDelete}
            >
              {mutation.isPending ? "Deleting..." : "Delete Sale"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
