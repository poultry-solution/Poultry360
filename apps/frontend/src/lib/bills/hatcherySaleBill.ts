import type { BillBusiness, BillData, BillLine } from "@/components/bills/BillDocument";
import { billFileName } from "./billFileName";

/**
 * Hatchery sale → printed bill. One pure function per sale type.
 *
 * Shape of `sale` is the `sale` field from `GET /hatchery/sales/:type/:saleId`
 * (see `hatcherySaleController.ts`). Decimal columns arrive as strings from
 * Prisma; everything is coerced through `Number(...)`.
 *
 * Totals: `total` only. Paid/Due rows are suppressed via `totals.note` because
 * hatchery sales have no partial-payment field — every sale is binary: full
 * credit (party balance) or full cash (no party). The note carries the right
 * phrase for each case so the printed bill stays unambiguous.
 */

const WALK_IN_NAME = "Walk-in";
const CASH_RECEIVED_NOTE = "Cash received at the time of sale.";
const CREDIT_SALE_NOTE = "Credit sale — amount added to the party's account.";

/** Chick grade labels — PDF: "Day-old chicks: grade A" etc. CULL reads better
 *  without the "grade" prefix. */
function chickGradeLineName(grade: unknown): string {
  if (grade === "A" || grade === "B") return `Day-old chicks: grade ${grade}`;
  if (grade === "CULL") return "Day-old chicks: cull";
  return "Day-old chicks";
}

function toCommon(
  sale: any,
  business: BillBusiness,
  line: BillLine,
  extraColumns?: { key: string; label: string }[]
): BillData {
  const invoiceNumber = sale?.invoiceNumber || sale?.id?.slice(0, 8) || "";
  const party = sale?.party;
  const partyName = party?.name || WALK_IN_NAME;
  const partyRows = party
    ? ([
        party.phone ? { label: "Phone", value: String(party.phone) } : null,
        party.address ? { label: "Address", value: String(party.address) } : null,
      ].filter(Boolean) as { label: string; value: string }[])
    : [];

  return {
    business,
    title: "Sales bill",
    invoiceNumber,
    date: sale?.date,
    partyLabel: "Bill to",
    partyName,
    partyRows,
    extraColumns: extraColumns ?? [],
    lines: [line],
    totals: {
      total: Number(sale?.amount ?? 0),
      note: party ? CREDIT_SALE_NOTE : CASH_RECEIVED_NOTE,
    },
    // Walk-in cash sales skip the party segment so the file name reads
    // `Bill-HB-0095` instead of `Bill-HB-0095-Walk-in`.
    fileName: billFileName(invoiceNumber, party?.name),
  };
}

export function eggSaleToBill(sale: any, business: BillBusiness): BillData {
  const quantity = Number(sale?.count ?? 0);
  const rate = Number(sale?.unitPrice ?? 0);
  return toCommon(sale, business, {
    id: sale?.id,
    name: sale?.eggType?.name || "Eggs",
    quantity,
    rate,
    total: Number(sale?.amount ?? quantity * rate),
  });
}

export function parentSaleToBill(sale: any, business: BillBusiness): BillData {
  const quantity = Number(sale?.totalWeightKg ?? 0);
  const rate = Number(sale?.ratePerKg ?? 0);
  const maleCount = Number(sale?.maleCount ?? 0);
  const femaleCount = Number(sale?.femaleCount ?? 0);
  const avgWeight = Number(sale?.avgWeightKg ?? 0);
  return toCommon(
    sale,
    business,
    {
      id: sale?.id,
      name: "Parent birds",
      quantity,
      // Qty column shows weight in kg, not bird count; the bird breakdown
      // lives in the extra `Birds (M/F)` column.
      quantityUnit: "kg",
      rate,
      total: Number(sale?.amount ?? quantity * rate),
      extra: {
        birds: `${maleCount} male / ${femaleCount} female`,
        avgWeight: `${avgWeight.toFixed(2)} kg`,
      },
    },
    [
      { key: "birds", label: "Birds (M/F)" },
      { key: "avgWeight", label: "Avg weight" },
    ]
  );
}

export function chickSaleToBill(sale: any, business: BillBusiness): BillData {
  const quantity = Number(sale?.count ?? 0);
  const rate = Number(sale?.unitPrice ?? 0);
  return toCommon(sale, business, {
    id: sale?.id,
    name: chickGradeLineName(sale?.grade),
    quantity,
    rate,
    total: Number(sale?.amount ?? quantity * rate),
  });
}
