import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "./prisma";

type TxClient = Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;

/**
 * Generate the next sequential invoice number for a dealer.
 * Format: INV-001, INV-002, ... INV-999, INV-1000 (minimum 3 digits)
 * Only counts invoices matching the INV-\d+ pattern (ignores old timestamp-based ones).
 */
export async function generateNextInvoiceNumber(
  dealerId: string,
  tx?: TxClient
): Promise<string> {
  const client = tx ?? prisma;

  // Find the max numeric invoice number for this dealer
  const result: any[] = await (client as any).$queryRawUnsafe(
    `SELECT MAX(CAST(SUBSTRING("invoiceNumber" FROM 5) AS INTEGER))::text as max_num
     FROM "public"."DealerSale"
     WHERE "dealerId" = $1 AND "invoiceNumber" ~ '^INV-[0-9]+$'`,
    dealerId
  );

  const maxNum = result[0]?.max_num ? parseInt(result[0].max_num, 10) : 0;
  const nextNum = maxNum + 1;
  const padded = String(nextNum).padStart(3, "0");
  return `INV-${padded}`;
}

/**
 * Generate the next sequential invoice number for a farmer sale.
 * Scoped per Farmer account.
 *
 * The advisory lock is also scoped to the Farmer account. It prevents two
 * simultaneous sales for the same Farmer from receiving the same number,
 * without blocking sales created by other Farmers.
 */
export async function generateNextFarmerInvoiceNumber(
  userId: string,
  tx: TxClient
): Promise<string> {
  await (tx as any).$queryRawUnsafe(
    `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))::text AS lock_result`,
    `farmer-sale-invoice:${userId}`
  );

  const result: any[] = await (tx as any).$queryRawUnsafe(
    `SELECT MAX(CAST(SUBSTRING(s."invoiceNumber" FROM 5) AS INTEGER))::text as max_num
     FROM "public"."Sale" s
     JOIN "public"."Category" c ON s."categoryId" = c.id
     WHERE c."userId" = $1 AND s."invoiceNumber" ~ '^INV-[0-9]+$'`,
    userId
  );

  const maxNum = result[0]?.max_num ? parseInt(result[0].max_num, 10) : 0;
  const nextNum = maxNum + 1;
  const padded = String(nextNum).padStart(3, "0");
  return `INV-${padded}`;
}

/**
 * Build the database-only unique key while keeping the shown invoice number
 * short and readable for the Farmer.
 */
export function buildFarmerInvoiceKey(
  userId: string,
  invoiceNumber: string
): string {
  return `${userId}:${invoiceNumber.trim()}`;
}
