import type { BillBusiness, BillData, BillLine } from "@/components/bills/BillDocument";
import { billFileName } from "./billFileName";

/**
 * Hatchery sale → printed bill. One pure function per sale type.
 *
 * Shape of `sale` is the `sale` field from `GET /hatchery/sales/:type/:saleId`
 * (see `hatcherySaleController.ts`). Decimal columns arrive as strings from
 * Prisma; everything is coerced through `Number(...)`.
 *
 * Totals: `total` only. If a party is attached, `totals.note` carries the
 * running party balance so the buyer sees it on the printed bill — this is
 * what the owner asked for instead of Paid/Due rows.
 */

const WALK_IN_NAME = "Walk-in";

/** PDF explicitly uses `रू` (Nepali rupee) for the balance-now note. */
function partyBalanceNote(balance: number): string {
  return `Party balance now: रू ${balance.toLocaleString("en-IN")}`;
}

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
      note: party ? partyBalanceNote(Number(party.balance ?? 0)) : undefined,
    },
    fileName: billFileName(invoiceNumber, partyName),
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
