import type { BillBusiness, BillData, BillLine } from "@/components/bills/BillDocument";
import { computeBroilerSaleAmount } from "@/fetchers/sale/broilerSaleAmount";
import { billFileName } from "./billFileName";

const formatKg = (value: number) => `${value.toFixed(2)} kg`;

/**
 * Broiler line note. With a weight discount it shows the full working, so the
 * buyer can check that the total uses the discounted weight.
 */
function broilerWeightNote(sale: any): string | undefined {
  if (sale?.weight == null) return undefined;
  const weight = Number(sale.weight);
  const percent = sale?.weightDiscountPercent == null ? null : Number(sale.weightDiscountPercent);
  if (sale?.itemType !== "Chicken_Meat" || !percent) return formatKg(weight);
  const { billedWeight } = computeBroilerSaleAmount(weight, 0, percent);
  return `Weighed ${formatKg(weight)} − ${percent}% weight discount (${formatKg(weight - billedWeight)}) = ${formatKg(billedWeight)} billed`;
}

/** Name used until Bill details load (or if they fail). */
export const farmerBillFallbackName = (sale: any) =>
  sale?.farm?.owner?.companyName || sale?.farm?.owner?.name || "Poultry360";

/** Farmer sale → printed bill. `business` comes from Settings → Bill details. */
export function farmerSaleToBill(sale: any, business: BillBusiness): BillData {
  const eggLines = Array.isArray(sale?.eggLines) ? sale.eggLines : [];
  const lines: BillLine[] =
    eggLines.length > 0
      ? eggLines.map((line: any) => {
          const quantity = Number(line.quantity ?? 0);
          const rate = Number(line.unitPrice ?? 0);
          return {
            id: line.id,
            name: line.eggType?.name || line.eggType?.code || "Eggs",
            quantity,
            rate,
            total: quantity * rate,
          };
        })
      : [
          {
            id: sale?.id,
            name: sale?.eggType?.name || sale?.category?.name || sale?.itemType || "Sale",
            quantity: Number(sale?.quantity ?? 0),
            rate: Number(sale?.unitPrice ?? 0),
            // Line shows the bill before the bill discount; the discount is listed below.
            total: Number(sale?.subtotalAmount ?? sale?.amount ?? 0),
            note: broilerWeightNote(sale),
          },
        ];

  const totalAmount = Number(sale?.amount ?? 0);
  const paidAmount = Number(sale?.paidAmount ?? 0);
  const dueAmount = Number(sale?.dueAmount ?? Math.max(0, totalAmount - paidAmount));
  const hasBillDiscount = sale?.discount != null && sale?.subtotalAmount != null;

  const customer = sale?.customer;
  const partyName = customer?.name || "Cash customer";
  const partyRows = [
    customer?.phone ? { label: "Phone", value: String(customer.phone) } : null,
    customer?.address ? { label: "Address", value: String(customer.address) } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return {
    business,
    title: "Sales bill",
    invoiceNumber: sale?.invoiceNumber || "",
    date: sale?.date,
    partyLabel: "Bill to",
    partyName,
    partyRows,
    lines,
    totals: {
      subtotal: hasBillDiscount ? Number(sale.subtotalAmount) : undefined,
      discountLabel:
        hasBillDiscount && sale.discount.type === "PERCENT" ? `Discount (${Number(sale.discount.value)}%)` : "Discount",
      discountAmount: hasBillDiscount ? Number(sale.subtotalAmount) - totalAmount : undefined,
      total: totalAmount,
      paid: paidAmount,
      due: dueAmount,
    },
    fileName: billFileName(sale?.invoiceNumber || "", partyName),
  };
}
