"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, FileText, Printer, ReceiptText } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { AppLoadingScreen } from "@/common/components/ui/loading-screen";
import { useGetDealerSaleById } from "@/fetchers/dealer/dealerSaleQueries";
import { useAuthStore } from "@/common/store/store";
import { DealerSaleBillDocument } from "../../_components/DealerSaleBillDocument";

export default function DealerSalePrintPage() {
  const params = useParams<{ saleId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const saleId = params?.saleId;
  const initialLayout = searchParams.get("layout") === "compact" ? "compact" : "standard";
  const [layout, setLayout] = useState<"standard" | "compact">(initialLayout);
  const companyName = useAuthStore((state) => {
    const user = state.user;
    return user?.companyName || user?.company?.name || user?.name || "Dealer";
  });

  const { data, isLoading, isError } = useGetDealerSaleById(saleId || "");
  const sale = data?.data;

  const billTitle = useMemo(() => {
    const base = sale?.invoiceNumber ? `Invoice ${sale.invoiceNumber}` : "Print bill";
    return layout === "compact" ? `${base} • Compact` : base;
  }, [sale?.invoiceNumber, layout]);

  const layoutHint =
    layout === "compact"
      ? "Compact is better for thermal or small paper printers."
      : "Standard is better for normal paper printing.";

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
                  The dealer sale could not be loaded for printing.
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
      <div className="mx-auto mb-4 flex max-w-5xl flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Print preview</div>
          <h1 className="text-xl font-semibold">{billTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{layoutHint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border bg-background p-1">
            <Button
              variant={layout === "standard" ? "default" : "ghost"}
              size="sm"
              className="h-8 rounded-md"
              onClick={() => setLayout("standard")}
            >
              <FileText className="mr-2 h-4 w-4" />
              Standard
            </Button>
            <Button
              variant={layout === "compact" ? "default" : "ghost"}
              size="sm"
              className="h-8 rounded-md"
              onClick={() => setLayout("compact")}
            >
              <ReceiptText className="mr-2 h-4 w-4" />
              Compact
            </Button>
          </div>
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
        <DealerSaleBillDocument
          sale={sale}
          companyName={companyName}
          mode={layout}
          onBack={() => router.back()}
          onPrint={() => window.print()}
        />
      </div>
    </div>
  );
}
