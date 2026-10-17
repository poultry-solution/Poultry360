"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { AppLoadingScreen } from "@/common/components/ui/loading-screen";
import { useI18n } from "@/i18n/useI18n";
import type { BillData } from "./BillDocument";
import { BillPreview } from "./BillPreview";
import { BillActions } from "./BillActions";
import { useBillFiles } from "./useBillFiles";

interface BillPrintPageProps {
  bill?: BillData;
  loading: boolean;
  error: boolean;
  backHref: string;
}

/** Shared A4 print page for every module: toolbar (Back, Share image / PDF, Print) + the bill. */
export function BillPrintPage({ bill, loading, error, backHref }: BillPrintPageProps) {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const billRef = useRef<HTMLDivElement>(null);
  const { files, preparing, failed } = useBillFiles(billRef, bill);
  const autoPrint = searchParams.get("print") === "1";
  const printed = useRef(false);

  useEffect(() => {
    if (!autoPrint || !bill || printed.current) return;
    // Mark as printed only when it runs: `bill` is a new object each render, so this effect
    // re-runs and clears a pending timer.
    const timer = setTimeout(() => {
      printed.current = true;
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, [autoPrint, bill]);

  if (loading) return <AppLoadingScreen message={t("bills.loading")} />;

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <Card className="mx-auto max-w-xl">
          <CardContent className="flex items-start gap-3 p-6">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-500" />
            <div className="space-y-2">
              <p className="font-semibold">{t("bills.notFound")}</p>
              <Button variant="outline" asChild>
                <Link href={backHref}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {t("bills.back")}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const title = bill.invoiceNumber ? t("bills.titleWithNumber", { n: bill.invoiceNumber }) : t("bills.title");

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-4 md:px-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[794px] flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref} aria-label={t("bills.back")}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        <BillActions files={files} preparing={preparing} failed={failed} title={title} onPrint={() => window.print()} />
      </div>
      <div className="mx-auto max-w-[794px] bg-white shadow-sm print:max-w-none print:shadow-none">
        <BillPreview ref={billRef} bill={bill} />
      </div>
    </div>
  );
}
