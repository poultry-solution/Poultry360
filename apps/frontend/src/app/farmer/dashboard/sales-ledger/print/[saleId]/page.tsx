"use client";

import { useEffect, useMemo, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { AppLoadingScreen } from "@/common/components/ui/loading-screen";
import { useGetSale } from "@/fetchers/sale/saleQueries";
import { SaleBillDocument } from "../../_components/SaleBillDocument";

export default function SalePrintPage() {
  const params = useParams<{ saleId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const saleId = params?.saleId;
  const autoPrint = searchParams.get("autoPrint") === "1";
  const hasPrintedRef = useRef(false);

  const { data, isLoading, isError } = useGetSale(saleId, {
    enabled: !!saleId,
  });
  const sale = data?.data;

  useEffect(() => {
    if (!autoPrint || !sale || hasPrintedRef.current) return;
    hasPrintedRef.current = true;
    const timer = window.setTimeout(() => {
      window.print();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [autoPrint, sale]);

  const billTitle = useMemo(() => {
    return sale?.invoiceNumber ? `Invoice ${sale.invoiceNumber}` : "Print bill";
  }, [sale?.invoiceNumber]);

  if (isLoading) {
    return <AppLoadingScreen message="Loading bill..." />;
  }

  if (isError || !sale) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <Card className="mx-auto max-w-xl">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-red-500" />
              <div className="space-y-2">
                <div className="font-semibold">Bill not available</div>
                <p className="text-sm text-muted-foreground">
                  The sale could not be loaded for printing.
                </p>
                <Button variant="outline" onClick={() => router.back()}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-4 md:px-6 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto mb-4 flex max-w-5xl items-center justify-between gap-2 print:hidden">
        <div>
          <div className="text-sm text-muted-foreground">Print preview</div>
          <h1 className="text-xl font-semibold">{billTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl print:max-w-none">
        <SaleBillDocument
          sale={sale}
          onBack={() => router.back()}
          onPrint={() => window.print()}
        />
      </div>
    </div>
  );
}
