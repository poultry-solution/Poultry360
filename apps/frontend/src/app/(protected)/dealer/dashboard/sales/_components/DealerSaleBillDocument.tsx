"use client";

import { BillDocument, type BillLine } from "@/components/bills/BillDocument";
import { useGetBillSettings } from "@/fetchers/billSettings/billSettingsQueries";

type DealerSaleBillDocumentProps = {
  sale: any;
  /** Used only until bill settings load (or if they fail). */
  companyName?: string;
  mode?: "standard" | "compact";
  onPrint?: () => void;
  onBack?: () => void;
  showActions?: boolean;
};

/** Dealer sale bill: maps the dealer sale into the shared BillDocument. */
export function DealerSaleBillDocument({
  sale,
  companyName,
  mode = "standard",
  onPrint,
  onBack,
  showActions = true,
}: DealerSaleBillDocumentProps) {
  const { data: billSettings } = useGetBillSettings();
  const details = billSettings?.effective;
  const isSettlement = Boolean(sale?.isSupplierSettlementSale);
  const isChicken = Boolean(sale?.isChickenSale);

  const saleItems = Array.isArray(sale?.items) ? sale.items : [];
  const lines: BillLine[] =
    saleItems.length > 0
      ? saleItems.map((line: any) => {
          const quantity = Number(line.quantity ?? 0);
          const rate = Number(line.unitPrice ?? 0);
          const broilers = line.broilerCount == null ? null : Number(line.broilerCount);
          return {
            id: line.id,
            name: line.product?.name || line.dealerProduct?.name || (isChicken ? "Broiler" : "Product"),
            quantity,
            rate,
            total: Number(line.totalAmount ?? quantity * rate),
            note: line.unit || line.product?.unit || undefined,
            extra: isChicken
              ? {
                  broilers: broilers == null ? "—" : broilers.toLocaleString("en-IN"),
                  avgWeight: broilers && broilers > 0 ? `${(quantity / broilers).toFixed(3)} kg` : "—",
                }
              : undefined,
          };
        })
      : [
          {
            id: sale?.id,
            name: sale?.notes || "Sale",
            quantity: 0,
            rate: Number(sale?.totalAmount ?? 0),
            total: Number(sale?.totalAmount ?? 0),
          },
        ];

  const totalAmount = Number(sale?.totalAmount ?? 0);
  const subtotalAmount = Number(sale?.subtotalAmount ?? totalAmount);
  const discountAmount = Math.max(0, subtotalAmount - totalAmount);
  const hasDiscount = sale?.subtotalAmount != null && discountAmount > 0;
  const paidAmount = Number(sale?.paidAmount ?? 0);
  const dueAmount = Number(sale?.dueAmount ?? Math.max(0, totalAmount - paidAmount));
  const paymentLabel = isSettlement
    ? "Supplier balance settlement (no cash)"
    : sale?.paymentMethod || (sale?.isCredit ? "Credit" : "Cash");

  const partyName = isSettlement
    ? sale?.manualCompany?.name || "Manual Company supplier"
    : sale?.customer?.name || "Walk-in";
  const partyAddress = isSettlement ? sale?.manualCompany?.address : sale?.customer?.address;
  const partyRows = [
    !isSettlement && sale?.customer?.phone ? { label: "Phone", value: String(sale.customer.phone) } : null,
    partyAddress ? { label: "Address", value: String(partyAddress) } : null,
    { label: "Payment", value: String(paymentLabel) },
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <BillDocument
      business={{
        name: details?.businessName || companyName || "Dealer",
        address: details?.address,
        phone: details?.phone,
        panNumber: details?.panNumber,
        footerNote: details?.footerNote,
      }}
      title={isSettlement ? "Supplier settlement sale" : "Sales bill"}
      invoiceNumber={sale?.invoiceNumber || sale?.id?.slice(0, 8) || ""}
      date={sale?.date}
      partyLabel={isSettlement ? "Supplier" : isChicken ? "Buyer" : "Bill to"}
      partyName={partyName}
      partyRows={partyRows}
      notice={
        isChicken ? (
          <div className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
            <span className="font-medium">Source farmer (tentative, not settled): </span>
            {sale?.sourceFarmer?.name || "—"}
          </div>
        ) : undefined
      }
      extraColumns={
        isChicken
          ? [
              { key: "broilers", label: "Broilers" },
              { key: "avgWeight", label: "Avg. Wt." },
            ]
          : []
      }
      lines={lines}
      totals={{
        subtotal: hasDiscount ? subtotalAmount : undefined,
        discountAmount: hasDiscount ? discountAmount : undefined,
        total: totalAmount,
        paid: paidAmount,
        due: dueAmount,
        note: isSettlement ? "Applied to the supplier balance; no cash was received." : undefined,
      }}
      mode={mode}
      onPrint={onPrint}
      onBack={onBack}
      showActions={showActions}
    />
  );
}
