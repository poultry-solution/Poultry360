"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/common/components/ui/alert-dialog";
import { Button } from "@/common/components/ui/button";
import { formatRupeesExact } from "@/common/lib/utils";
import { useI18n } from "@/i18n/useI18n";

/** The few sale fields the dialog shows. */
export type DeletableSale = {
  id: string;
  invoiceNumber?: string | null;
  amount?: number | string | null;
  payments?: { amount: number | string; description?: string | null }[];
};

/** Money received after the sale was made (all payments except the "Initial payment"). */
export function laterPaymentsTotal(sale: DeletableSale): number {
  return (sale.payments ?? [])
    .filter((payment) => payment.description !== "Initial payment")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

interface DeleteSaleDialogProps {
  sale: DeletableSale | null;
  onClose: () => void;
  onDelete: (id: string) => Promise<unknown>;
}

/** "Delete this sale?" — used by the sales ledger and the batch sales table. */
export function DeleteSaleDialog({ sale, onClose, onDelete }: DeleteSaleDialogProps) {
  const { t } = useI18n();
  const [deleting, setDeleting] = useState(false);
  const laterPaid = sale ? laterPaymentsTotal(sale) : 0;

  const confirm = async () => {
    if (!sale || deleting) return;
    setDeleting(true);
    try {
      await onDelete(sale.id);
      toast.success(t("saleDelete.deleted"));
      onClose();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || t("saleDelete.failed"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={!!sale} onOpenChange={(open) => !open && !deleting && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("saleDelete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("saleDelete.body", {
              n: sale?.invoiceNumber || "—",
              amount: formatRupeesExact(Number(sale?.amount || 0)),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {laterPaid > 0 && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {t("saleDelete.laterPayments", { amount: formatRupeesExact(laterPaid) })}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{t("saleDelete.cancel")}</AlertDialogCancel>
          <Button onClick={confirm} disabled={deleting} className="bg-red-600 text-white hover:bg-red-700">
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {deleting ? t("saleDelete.deleting") : t("saleDelete.delete")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
