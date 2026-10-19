/**
 * Customer.balance drift detector.
 *
 * Every customer has a cached `balance` field. The app updates it at write
 * time. If any code path forgets to update it (or updates it twice, or
 * updates it wrong on reversal), `balance` drifts from the ledger-truth.
 *
 * This script computes the expected balance per customer from source tables
 * (Sale, DealerSale, SalePayment, DealerSalePayment, CustomerTransaction,
 * DealerLedgerEntry) and compares to the stored value. It reports every
 * customer whose stored balance differs from the computed one.
 *
 *   pnpm --filter backend run drift:customer-balance              # dry-run (default)
 *   pnpm --filter backend run drift:customer-balance -- --apply   # writes computed balance back
 *
 * The computation (no double counting of any single event):
 *
 *   opening_balance                                          [latest CT[OPENING_BALANCE] for the customer]
 * + sum(Sale.dueAmount)       where customerId = X AND isCredit = true    [remaining farmer sale debt]
 * + sum(DealerSale.dueAmount) where customerId = X                        [remaining dealer sale debt]
 * - sum(CT[RECEIPT])          where customerId = X AND deletedAt IS NULL
 *                                  AND reference NOT IN current SalePayment ids
 *                                                                         [manual farmer payments only]
 * - sum(DLE[PAYMENT_RECEIVED]) where partyType=CUSTOMER AND partyId=X AND saleId IS NULL
 *                                  AND (affectsCustomerBalance = true OR affectsCustomerBalance IS NULL)
 *                                                                         [manual dealer-account payments that touched balance;
 *                                                                          NULL predates the flag and matches the old "always affects" convention]
 * + sum(DLE[PAYMENT_MADE])    where partyType=CUSTOMER AND partyId=X
 *                                  AND affectsCustomerBalance = true      [dealer-to-customer payouts that bumped balance (opt-in)]
 *
 * `Sale.dueAmount` / `DealerSale.dueAmount` are already decremented as sale-
 * linked payments come in, so we don't subtract those payments again — doing
 * so would double-count. Manual payments (not tied to a specific sale) are
 * the only ones we subtract explicitly.
 *
 * CT[ADJUSTMENT] is intentionally not counted: today the only writer is
 * deleteSale, and that path also removes the Sale row (so the associated
 * dueAmount drops out of the sum). Counting ADJUSTMENT on top would
 * double-reverse. If a new ADJUSTMENT writer is ever added, revisit this.
 */

import "dotenv/config";
import { Prisma, TransactionType } from "@prisma/client";
import prisma from "../utils/prisma";

interface DriftComponents {
  openingBalance: number;
  farmerSalesRemaining: number;
  dealerSalesRemaining: number;
  manualFarmerPayments: number;
  manualDealerPayments: number;
  dealerPayoutsOut: number;
}

interface DriftRow {
  customerId: string;
  customerName: string;
  storedBalance: number;
  computedBalance: number;
  drift: number;
  components: DriftComponents;
}

const EPSILON = 0.005;

function num(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return Number(value);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

async function computeExpectedBalance(
  customerId: string
): Promise<{ computed: number; components: DriftComponents }> {
  const [
    latestOpening,
    farmerSales,
    dealerSales,
    salePaymentIds,
    receipts,
    dealerManualPayments,
    dealerPayouts,
  ] = await Promise.all([
    // Opening balance: latest CT[OPENING_BALANCE] by date desc, createdAt desc (matches
    // the convention used by setCustomerOpeningBalance and the sales ledger readers).
    prisma.customerTransaction.findFirst({
      where: { customerId, type: TransactionType.OPENING_BALANCE },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { amount: true },
    }),

    prisma.sale.aggregate({
      where: { customerId, isCredit: true },
      _sum: { dueAmount: true },
    }),

    prisma.dealerSale.aggregate({
      where: { customerId },
      _sum: { dueAmount: true },
    }),

    // All sale-linked payment ids for this customer. CT[RECEIPT] rows whose
    // `reference` matches one of these were created by the old pay-per-bill
    // route (removed; old data only) and
    // are already reflected in Sale.dueAmount — skip them to avoid double
    // subtraction. CT[RECEIPT]s whose reference is not in this set are
    // addCustomerPayment / addAccountPayment manual payments.
    prisma.salePayment.findMany({
      where: { sale: { customerId } },
      select: { id: true },
    }),

    prisma.customerTransaction.findMany({
      where: {
        customerId,
        type: TransactionType.RECEIPT,
        deletedAt: null,
      },
      select: { amount: true, reference: true },
    }),

    // Manual dealer-account PAYMENT_RECEIVED that actually touched balance.
    // NULL affectsCustomerBalance predates the opt-out flag — in that old code
    // path, PAYMENT_RECEIVED always decremented balance, so NULL counts as true.
    prisma.dealerLedgerEntry.findMany({
      where: {
        partyType: "CUSTOMER",
        partyId: customerId,
        type: "PAYMENT_RECEIVED",
        saleId: null,
        OR: [{ affectsCustomerBalance: true }, { affectsCustomerBalance: null }],
      },
      select: { amount: true },
    }),

    // PAYMENT_MADE = dealer paying customer. INCREMENTS customer balance when
    // affectsCustomerBalance is explicitly true (opt-in — most PAYMENT_MADE
    // entries are internal inventory purchases that shouldn't touch balance).
    prisma.dealerLedgerEntry.findMany({
      where: {
        partyType: "CUSTOMER",
        partyId: customerId,
        type: "PAYMENT_MADE",
        affectsCustomerBalance: true,
      },
      select: { amount: true },
    }),
  ]);

  const salePaymentIdSet = new Set(salePaymentIds.map((row) => row.id));
  const manualFarmerPayments = receipts.reduce((sum, receipt) => {
    const ref = receipt.reference ?? "";
    if (ref && salePaymentIdSet.has(ref)) return sum;
    return sum + num(receipt.amount);
  }, 0);
  const manualDealerPayments = dealerManualPayments.reduce(
    (sum, row) => sum + num(row.amount),
    0
  );
  const dealerPayoutsOut = dealerPayouts.reduce(
    (sum, row) => sum + num(row.amount),
    0
  );

  const components: DriftComponents = {
    openingBalance: num(latestOpening?.amount),
    farmerSalesRemaining: num(farmerSales._sum.dueAmount),
    dealerSalesRemaining: num(dealerSales._sum.dueAmount),
    manualFarmerPayments,
    manualDealerPayments,
    dealerPayoutsOut,
  };

  const computed = round2(
    components.openingBalance +
      components.farmerSalesRemaining +
      components.dealerSalesRemaining -
      components.manualFarmerPayments -
      components.manualDealerPayments +
      components.dealerPayoutsOut
  );

  return { computed, components };
}

export async function runDriftDetector(
  options: { apply?: boolean; limit?: number } = {}
): Promise<{ scanned: number; drifted: DriftRow[]; applied: number }> {
  const apply = options.apply === true;
  const drifted: DriftRow[] = [];
  let scanned = 0;
  let applied = 0;

  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, balance: true },
    orderBy: { createdAt: "asc" },
    ...(options.limit ? { take: options.limit } : {}),
  });

  for (const customer of customers) {
    scanned += 1;
    const { computed, components } = await computeExpectedBalance(customer.id);
    const stored = round2(num(customer.balance));
    const drift = round2(stored - computed);

    if (Math.abs(drift) < EPSILON) continue;

    drifted.push({
      customerId: customer.id,
      customerName: customer.name,
      storedBalance: stored,
      computedBalance: computed,
      drift,
      components,
    });

    if (apply) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { balance: new Prisma.Decimal(computed) },
      });
      applied += 1;
    }
  }

  return { scanned, drifted, applied };
}

function formatRow(row: DriftRow): string {
  const sign = row.drift > 0 ? "+" : "";
  return (
    `[drift] ${row.customerId}  ${row.customerName}` +
    `  stored=${row.storedBalance.toFixed(2)}  computed=${row.computedBalance.toFixed(2)}  diff=${sign}${row.drift.toFixed(2)}\n` +
    `         opening=${row.components.openingBalance.toFixed(2)}` +
    `  farmerDue=${row.components.farmerSalesRemaining.toFixed(2)}` +
    `  dealerDue=${row.components.dealerSalesRemaining.toFixed(2)}` +
    `  farmerPay=${row.components.manualFarmerPayments.toFixed(2)}` +
    `  dealerPay=${row.components.manualDealerPayments.toFixed(2)}` +
    `  dealerOut=${row.components.dealerPayoutsOut.toFixed(2)}`
  );
}

async function main() {
  const apply = process.argv.includes("--apply");
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;

  console.log(
    `Scanning customer.balance drift${apply ? " (APPLY MODE — writes enabled)" : " (dry-run)"}...`
  );

  const { scanned, drifted, applied } = await runDriftDetector({ apply, limit });

  if (drifted.length === 0) {
    console.log(`\nScanned ${scanned} customers. No drift found.`);
  } else {
    console.log("");
    for (const row of drifted) console.log(formatRow(row));
    const totalPositive = drifted
      .filter((row) => row.drift > 0)
      .reduce((sum, row) => sum + row.drift, 0);
    const totalNegative = drifted
      .filter((row) => row.drift < 0)
      .reduce((sum, row) => sum + Math.abs(row.drift), 0);
    console.log(
      `\nScanned ${scanned} customers. Drifted: ${drifted.length}.` +
        ` Stored > computed by ${totalPositive.toFixed(2)} in ${drifted.filter((r) => r.drift > 0).length} customers;` +
        ` stored < computed by ${totalNegative.toFixed(2)} in ${drifted.filter((r) => r.drift < 0).length} customers.`
    );
    if (apply) console.log(`Applied ${applied} corrections.`);
    else console.log("Re-run with --apply to write the computed values back.");
  }

  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
}
