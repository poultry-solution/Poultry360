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
 * Scoped per farmer (userId who owns the farms).
 * Queries the Sale table via farm ownership.
 */
export async function generateNextFarmerInvoiceNumber(
  userId: string,
  tx?: TxClient
): Promise<string> {
  const client = tx ?? prisma;

  const result: any[] = await (client as any).$queryRawUnsafe(
    `SELECT MAX(CAST(SUBSTRING(s."invoiceNumber" FROM 5) AS INTEGER))::text as max_num
     FROM "public"."Sale" s
     JOIN "public"."Farm" f ON s."farmId" = f.id
     WHERE f."ownerId" = $1 AND s."invoiceNumber" ~ '^INV-[0-9]+$'`,
    userId
  );

  const maxNum = result[0]?.max_num ? parseInt(result[0].max_num, 10) : 0;
  const nextNum = maxNum + 1;
  const padded = String(nextNum).padStart(3, "0");
  return `INV-${padded}`;
}
