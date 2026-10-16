"use client";

import { FileText, Image as ImageIcon, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import { useI18n } from "@/i18n/useI18n";
import { canShareFiles, shareOrDownload, type BillFiles } from "./billExport";

interface BillActionsProps {
  files: BillFiles | null;
  preparing: boolean;
  failed: boolean;
  title: string;
  onPrint: () => void;
  className?: string;
}

/** Share image · Share PDF · Print. On computers the share buttons download instead. */
export function BillActions({ files, preparing, failed, title, onPrint, className = "" }: BillActionsProps) {
  const { t } = useI18n();
  const canShare = canShareFiles(files?.image);

  const send = async (file: File | undefined) => {
    if (!file) return;
    const result = await shareOrDownload(file, title);
    if (result === "downloaded") toast.success(t("bills.downloaded"));
  };

  const icon = (Icon: typeof FileText) =>
    preparing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Icon className="mr-1.5 h-4 w-4" />;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Button onClick={() => send(files?.image)} disabled={!files}>
        {icon(ImageIcon)}
        {preparing ? t("bills.preparing") : canShare ? t("bills.shareImage") : t("bills.downloadImage")}
      </Button>
      <Button variant="outline" onClick={() => send(files?.pdf)} disabled={!files}>
        {icon(FileText)}
        {canShare ? t("bills.sharePdf") : t("bills.downloadPdf")}
      </Button>
      <Button variant="outline" onClick={onPrint}>
        <Printer className="mr-1.5 h-4 w-4" />
        {t("bills.print")}
      </Button>
      {failed && <p className="w-full text-xs text-red-600">{t("bills.prepareFailed")}</p>}
    </div>
  );
}
