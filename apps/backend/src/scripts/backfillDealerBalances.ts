/**
 * One-time backfill script to compute dealer.balance, dealer.totalPurchases,
 * dealer.totalPayments from existing EntityTransaction records.
 *
 * Run: npx ts-node src/scripts/backfillDealerBalances.ts
 */
import prisma from "../utils/prisma";

async function backfillDealerBalances() {
  console.log("Starting dealer balance backfill...");

  // Get all dealers that are self-created (manual)
  const dealers = await prisma.dealer.findMany({
    where: { classification: "SELF_CREATED" },
    select: { id: true, name: true },
  });

  console.log(`Found ${dealers.length} manual dealers to backfill`);

  let updated = 0;
  for (const dealer of dealers) {
    const transactions = await prisma.entityTransaction.findMany({
      where: { dealerId: dealer.id },
      select: { type: true, amount: true },
    });

    if (transactions.length === 0) continue;

    let balance = 0;
    let totalPurchases = 0;
    let totalPayments = 0;

    for (const txn of transactions) {
      const amt = Number(txn.amount);
      if (txn.type === "PURCHASE" || txn.type === "ADJUSTMENT") {
        balance += amt;
        totalPurchases += amt;
      } else if (txn.type === "PAYMENT" || txn.type === "RECEIPT") {
        balance -= amt;
        totalPayments += amt;
      }
    }

    await prisma.dealer.update({
      where: { id: dealer.id },
      data: { balance, totalPurchases, totalPayments },
    });

    updated++;
    console.log(
      `  Updated ${dealer.name}: balance=${balance}, purchases=${totalPurchases}, payments=${totalPayments}`
    );
  }

  console.log(`Backfill complete. Updated ${updated} dealers.`);
}

backfillDealerBalances()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
