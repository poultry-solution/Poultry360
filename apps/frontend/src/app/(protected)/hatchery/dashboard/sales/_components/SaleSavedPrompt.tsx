"use client";

import { useRouter } from "next/navigation";
import { Printer, Share2 } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import type { HatcherySaleType } from "@/fetchers/hatchery/hatcherySaleQueries";
import { hatcheryBillPrintHref } from "./HatcherySaleBill";

type SavedSale = { type: HatcherySaleType; id: string };

/**
 * Post-save confirmation step shown after a hatchery sale is created.
 * Mirrors the dealer/farmer flow (Later · Print · Share bill).
 *
 * Share bill delegates upward via `onShare` so the parent can reuse its
 * existing <HatcherySaleBill> instance (added in Phase 6) instead of
 * instantiating a second modal here.
 */
export function SaleSavedPrompt({
  savedSale,
  onDismiss,
  onShare,
}: {
  savedSale: SavedSale | null;
  onDismiss: () => void;
  onShare: (sale: SavedSale) => void;
}) {
  const router = useRouter();
  return (
    <Dialog
      open={!!savedSale}
      onOpenChange={(open) => {
        if (!open) onDismiss();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sale saved</DialogTitle>
          <DialogDescription>
            Your sale is recorded. What would you like to do next?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onDismiss}>
            Later
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (savedSale) {
                router.push(
                  `${hatcheryBillPrintHref(savedSale.type, savedSale.id)}?print=1`
                );
              }
              onDismiss();
            }}
          >
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button
            onClick={() => {
              if (savedSale) onShare(savedSale);
              onDismiss();
            }}
          >
            <Share2 className="mr-2 h-4 w-4" /> Share bill
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
