"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * One-time backfill script to compute dealer.balance, dealer.totalPurchases,
 * dealer.totalPayments from existing EntityTransaction records.
 *
 * Run: npx ts-node src/scripts/backfillDealerBalances.ts
 */
const prisma_1 = __importDefault(require("../utils/prisma"));
function backfillDealerBalances() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Starting dealer balance backfill...");
        // Get all dealers that are self-created (manual)
        const dealers = yield prisma_1.default.dealer.findMany({
            where: { classification: "SELF_CREATED" },
            select: { id: true, name: true },
        });
        console.log(`Found ${dealers.length} manual dealers to backfill`);
        let updated = 0;
        for (const dealer of dealers) {
            const transactions = yield prisma_1.default.entityTransaction.findMany({
                where: { dealerId: dealer.id },
                select: { type: true, amount: true },
            });
            if (transactions.length === 0)
                continue;
            let balance = 0;
            let totalPurchases = 0;
            let totalPayments = 0;
            for (const txn of transactions) {
                const amt = Number(txn.amount);
                if (txn.type === "PURCHASE" || txn.type === "ADJUSTMENT") {
                    balance += amt;
                    totalPurchases += amt;
                }
                else if (txn.type === "PAYMENT" || txn.type === "RECEIPT") {
                    balance -= amt;
                    totalPayments += amt;
                }
            }
            yield prisma_1.default.dealer.update({
                where: { id: dealer.id },
                data: { balance, totalPurchases, totalPayments },
            });
            updated++;
            console.log(`  Updated ${dealer.name}: balance=${balance}, purchases=${totalPurchases}, payments=${totalPayments}`);
        }
        console.log(`Backfill complete. Updated ${updated} dealers.`);
    });
}
backfillDealerBalances()
    .catch(console.error)
    .finally(() => prisma_1.default.$disconnect());
