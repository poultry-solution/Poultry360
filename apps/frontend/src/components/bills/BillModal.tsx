"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Modal } from "@/common/components/ui/modal";
import { useI18n } from "@/i18n/useI18n";
import type { BillData } from "./BillDocument";
import { BillActions } from "./BillActions";
import { BillPreview } from "./BillPreview";
import { useBillFiles } from "./useBillFiles";

interface BillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill?: BillData;
  loading?: boolean;
  error?: boolean;
  /** Print page of this bill; opened with ?print=1 so it prints straight away. */
  printHref: string;
}

/** Bill pop-up used from sales lists, sale pages and "Sale saved": preview + Share image / PDF / Print. */
export function BillModal({ isOpen, onClose, bill, loading = false, error = false, printHref }: BillModalProps) {
  const { t } = useI18n();
  const router = useRouter();
  const billRef = useRef<HTMLDivElement>(null);
  const { files, preparing, failed } = useBillFiles(billRef, bill, isOpen);

  const title = bill?.invoiceNumber ? t("bills.titleWithNumber", { n: bill.invoiceNumber }) : t("bills.title");

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} className="max-w-3xl">
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("bills.loading")}
        </div>
      ) : error || !bill ? (
        <p className="py-12 text-center text-sm text-muted-foreground">{t("bills.notFound")}</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border bg-slate-50 p-2">
            <BillPreview ref={billRef} bill={bill} />
          </div>
          <BillActions
            files={files}
            preparing={preparing}
            failed={failed}
            title={title}
            onPrint={() => router.push(`${printHref}?print=1`)}
            className="sticky -bottom-4 justify-end border-t bg-white pb-4 pt-3"
          />
        </div>
      )}
    </Modal>
  );
}
