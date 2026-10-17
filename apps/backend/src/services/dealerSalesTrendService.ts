/**
 * Sales vs money collected per Nepal day, for the dealer Home graph.
 *
 * Sales: product sales to customers. Broiler sales (farmer's money) and
 * supplier settlement sales (no cash) are left out.
 * Collected: every payment received from customers (at sale and later),
 * except payments tied to a Broiler sale.
 *
 * Days are Nepal days (UTC+5:45). Read only.
 */

import { Prisma } from "@prisma/client";
import prisma from "../utils/prisma";

export type SalesTrendDay = { day: string; sales: number; collected: number };

const NEPAL_DAY = Prisma.sql`to_char(("date" + interval '5 hours 45 minutes'), 'YYYY-MM-DD')`;

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/** Join the two daily lists into one, sorted by day. */
export function mergeTrendDays(
  salesRows: Array<{ day: string; amount: unknown }>,
  collectedRows: Array<{ day: string; amount: unknown }>
): SalesTrendDay[] {
  const byDay = new Map<string, SalesTrendDay>();
  const get = (day: string) => {
    let row = byDay.get(day);
    if (!row) {
      row = { day, sales: 0, collected: 0 };
      byDay.set(day, row);
    }
    return row;
  };
  for (const row of salesRows) get(row.day).sales = round2(Number(row.amount) || 0);
  for (const row of collectedRows) get(row.day).collected = round2(Number(row.amount) || 0);
  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export async function getDealerSalesTrend(
  dealerId: string,
  range: { gte: Date; lte: Date } | null
): Promise<SalesTrendDay[]> {
  const saleRange = range ? Prisma.sql`AND "date" >= ${range.gte} AND "date" <= ${range.lte}` : Prisma.empty;
  const entryRange = range ? Prisma.sql`AND e."date" >= ${range.gte} AND e."date" <= ${range.lte}` : Prisma.empty;

  const [salesRows, collectedRows] = await Promise.all([
    prisma.$queryRaw<Array<{ day: string; amount: unknown }>>`
      SELECT ${NEPAL_DAY} AS day, SUM("totalAmount") AS amount
      FROM "public"."DealerSale"
      WHERE "dealerId" = ${dealerId}
        AND "farmerId" IS NULL
        AND "accountId" IS NULL
        AND "isChickenSale" = false
        AND "isSupplierSettlementSale" = false
        ${saleRange}
      GROUP BY 1`,
    prisma.$queryRaw<Array<{ day: string; amount: unknown }>>`
      SELECT to_char((e."date" + interval '5 hours 45 minutes'), 'YYYY-MM-DD') AS day, SUM(e."amount") AS amount
      FROM "public"."DealerLedgerEntry" e
      LEFT JOIN "public"."DealerSale" s ON s."id" = e."saleId"
      WHERE e."dealerId" = ${dealerId}
        AND e."type" = 'PAYMENT_RECEIVED'
        AND e."partyType" = 'CUSTOMER'
        AND (s."id" IS NULL OR s."isChickenSale" = false)
        ${entryRange}
      GROUP BY 1`,
  ]);

  return mergeTrendDays(salesRows, collectedRows);
}
