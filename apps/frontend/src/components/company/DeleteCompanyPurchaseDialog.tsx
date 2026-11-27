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
import { useDeleteCompanyPurchase } from "@/fetchers/company/companyPurchaseQueries";

/**
 * Password-gated delete confirmation for a company purchase. Backend atomically
 * reverses raw-material stock using an `updateMany` with `gte` guard; if any
 * material has been partially consumed since, the server returns 400 with a
 * "has been partially consumed" message — surfaced here via the error toast.
 */
export function DeleteCompanyPurchaseDialog({
  purchaseId,
  onClose,
  onSuccess,
}: {
  purchaseId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [password, setPassword] = useState("");
  const mutation = useDeleteCompanyPurchase();

  useEffect(() => {
    if (!purchaseId) setPassword("");
  }, [purchaseId]);

  const handleDelete = () => {
    if (!purchaseId) return;
    // Guard against double-click: see note in DeleteCompanySaleDialog.
    if (mutation.isPending) return;
    mutation.mutate(
      { purchaseId, password },
      {
        onSuccess: () => {
          toast.success("Purchase deleted successfully");
          setPassword("");
          onClose();
          onSuccess?.();
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || "Failed to delete purchase");
        },
      },
    );
  };

  return (
    <Dialog
      open={!!purchaseId}
      onOpenChange={(open) => {
        if (!open) {
          setPassword("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-sm bg-white">
        <DialogHeader>
          <DialogTitle>Delete Purchase</DialogTitle>
          <DialogDescription>
            This will permanently delete this purchase and reverse the
            raw-material stock it added. If the stock has been partially
            consumed, the deletion will be refused. Enter your password to
            confirm.
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
              {mutation.isPending ? "Deleting..." : "Delete Purchase"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
