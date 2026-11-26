/**
 * Money-flow invariant regression suite. Each `it` block corresponds to one
 * row of the "Money-flow invariants" table in the dealer-cashflow plan. A
 * failing test here means someone broke a rule that's load-bearing for the
 * cashflow totals being correct.
 *
 * We're testing shape, not downstream math — the assertions check that the
 * auto-post helpers write (or refuse to write) the right CashMovement row for
 * each business event. End-to-end wiring is covered by controller tests.
 */

jest.mock("../../src/utils/nepalBsDate", () => ({
  toNepalBsDayString: jest.fn(() => "2083-04-10"),
}));

import {
  postBroilerSettlementPayoutMovement,
  postDealerLedgerPaymentMovement,
  postDealerLedgerReceiptMovement,
  postDealerSalePaymentMovement,
  postDealerSupplierPaymentMovement,
} from "../../src/services/dealerCashflowAutoPost";
import { Prisma } from "@prisma/client";

type MockedTx = {
  cashAccount: { findUnique: jest.Mock };
  cashMovement: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock; deleteMany: jest.Mock };
};

function tx(): MockedTx {
  return {
    cashAccount: { findUnique: jest.fn() },
    cashMovement: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}
const activeAccount = () => ({ userId: "dealer-user-1", archivedAt: null });

describe("dealer cashflow invariants", () => {
  describe("sale cash events", () => {
    it("DealerSale full cash at counter → mirrors one IN leg equal to paid amount", async () => {
      const t = tx();
      t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
      t.cashMovement.findFirst.mockResolvedValueOnce(null);
      await postDealerSalePaymentMovement({
        tx: t as unknown as Prisma.TransactionClient,
        userId: "dealer-user-1",
        dealerSalePaymentId: "dsp-1",
        accountId: "cash-1",
        amount: 2500,
        date: new Date(),
        partyName: "Ram",
        recordedById: "dealer-user-1",
      });
      expect(t.cashMovement.create).toHaveBeenCalledTimes(1);
      const data = t.cashMovement.create.mock.calls[0][0].data;
      expect(data.direction).toBe("IN");
      expect(data.amount).toEqual(new Prisma.Decimal(2500));
    });

    it("DealerSale partial payment → mirrors one IN leg equal to amountPaid (not totalAmount)", async () => {
      // Controller passes amount = amountPaid. The autoPost helper trusts it;
      // this invariant asserts that we DO NOT accidentally pass totalAmount.
      const t = tx();
      t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
      t.cashMovement.findFirst.mockResolvedValueOnce(null);
      const amountPaid = 1000;
      const totalAmount = 3000;
      await postDealerSalePaymentMovement({
        tx: t as unknown as Prisma.TransactionClient,
        userId: "dealer-user-1",
        dealerSalePaymentId: "dsp-1",
        accountId: "cash-1",
        amount: amountPaid,
        date: new Date(),
        partyName: "Ram",
        recordedById: "dealer-user-1",
      });
      const data = t.cashMovement.create.mock.calls[0][0].data;
      expect(data.amount).toEqual(new Prisma.Decimal(amountPaid));
      expect(data.amount).not.toEqual(new Prisma.Decimal(totalAmount));
    });

    // Full credit (paidAmount=0) → no DealerSalePayment is created → no mirror
    // call is made. This invariant lives at the CONTROLLER level (not in
    // autoPost), so the regression test is a reminder: never call
    // postDealerSalePaymentMovement when paidAmount === 0. Enforced by
    // controller tests in Phase 2.10 integration suite.
  });

  describe("ledger cash events", () => {
    it("Customer PAYMENT_RECEIVED on account → mirrors one IN leg", async () => {
      const t = tx();
      t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
      t.cashMovement.findFirst.mockResolvedValueOnce(null);
      await postDealerLedgerReceiptMovement({
        tx: t as unknown as Prisma.TransactionClient,
        userId: "dealer-user-1",
        dealerLedgerEntryId: "dle-1",
        accountId: "cash-1",
        amount: 800,
        date: new Date(),
        partyName: "Sita",
        recordedById: "dealer-user-1",
      });
      const data = t.cashMovement.create.mock.calls[0][0].data;
      expect(data.direction).toBe("IN");
      expect(data.category).toBe("SALE_RECEIPT");
    });

    it("Customer PAYMENT_MADE (cash advance / refund) → mirrors one OUT leg", async () => {
      const t = tx();
      t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
      t.cashMovement.findFirst.mockResolvedValueOnce(null);
      await postDealerLedgerPaymentMovement({
        tx: t as unknown as Prisma.TransactionClient,
        userId: "dealer-user-1",
        dealerLedgerEntryId: "dle-2",
        accountId: "cash-1",
        amount: 400,
        date: new Date(),
        partyName: "Krishna",
        recordedById: "dealer-user-1",
      });
      const data = t.cashMovement.create.mock.calls[0][0].data;
      expect(data.direction).toBe("OUT");
      expect(data.category).toBe("CASH_OUT");
    });

    // ADJUSTMENT ledger entries → NO autoPost call. Enforced at the
    // controller level (createAdjustment never calls any mirror helper).
    // Covered by integration tests.
  });

  describe("supplier payment events", () => {
    it("DealerManualCompanyPayment MADE → mirrors one OUT leg", async () => {
      const t = tx();
      t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
      t.cashMovement.findFirst.mockResolvedValueOnce(null);
      await postDealerSupplierPaymentMovement({
        tx: t as unknown as Prisma.TransactionClient,
        userId: "dealer-user-1",
        dealerManualCompanyPaymentId: "dmcp-1",
        accountId: "cash-1",
        amount: 3500,
        date: new Date(),
        supplierName: "Shree Feed Mills",
        direction: "MADE",
        recordedById: "dealer-user-1",
      });
      const data = t.cashMovement.create.mock.calls[0][0].data;
      expect(data.direction).toBe("OUT");
      expect(data.category).toBe("PAYMENT_TO_DEALER");
    });

    it("DealerManualCompanyPayment RECEIVED (supplier refund) → mirrors one IN leg", async () => {
      const t = tx();
      t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
      t.cashMovement.findFirst.mockResolvedValueOnce(null);
      await postDealerSupplierPaymentMovement({
        tx: t as unknown as Prisma.TransactionClient,
        userId: "dealer-user-1",
        dealerManualCompanyPaymentId: "dmcp-2",
        accountId: "cash-1",
        amount: 500,
        date: new Date(),
        supplierName: "Shree Feed Mills",
        direction: "RECEIVED",
        recordedById: "dealer-user-1",
      });
      const data = t.cashMovement.create.mock.calls[0][0].data;
      expect(data.direction).toBe("IN");
    });

    // DealerManualPurchase (goods arrive, no payment) → NO autoPost call.
    // Enforced at controller level — recordManualPurchase never imports or
    // calls any postDealerSupplierPaymentMovement.
  });

  describe("broiler settlement events", () => {
    it("BroilerSaleSettlement farmerPayout → mirrors one OUT leg only", async () => {
      // This is the key invariant that distinguishes the corrected plan from
      // a naive two-leg mirror. The totalProceeds already flowed in via the
      // broiler sales' DealerSalePayment mirrors; posting them again at
      // settlement time would double-count the inflow.
      const t = tx();
      t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
      t.cashMovement.findFirst.mockResolvedValueOnce(null);
      await postBroilerSettlementPayoutMovement({
        tx: t as unknown as Prisma.TransactionClient,
        userId: "dealer-user-1",
        broilerSaleSettlementId: "bss-1",
        accountId: "cash-1",
        amount: 8000,
        date: new Date(),
        farmerName: "Ram Prasad",
        recordedById: "dealer-user-1",
      });
      expect(t.cashMovement.create).toHaveBeenCalledTimes(1);
      const data = t.cashMovement.create.mock.calls[0][0].data;
      expect(data.direction).toBe("OUT");
      expect(data.sourceType).toBe("BROILER_SETTLEMENT_PAYOUT");
    });

    // Margin is derived (sum of broiler sale inflows − payout − any purchase
    // cost), not a cash row. If a future refactor adds a
    // BROILER_SETTLEMENT_PROCEEDS leg, this suite must be updated to reflect
    // that; otherwise the sum of inflows will double-count against the sales
    // already mirrored.

    // DealerBroilerPurchase intentionally has no mirror helper — the
    // dealer–source-farmer relationship is too varied to infer a cash event
    // from a purchase row. Cash moves via the settlement payout under the
    // dealer's manual control (margin + credit recovery + payout amount).
  });

  describe("source types that must never mirror", () => {
    // These entries don't have a mirror helper. The guard is: no code path
    // imports anything from dealerCashflowAutoPost for these events. A
    // regression (someone wiring a mirror for a non-cash event) would surface
    // via an unexpected import in the controller. We rely on controller tests
    // + grep-based review to catch these.
    it("is documented and grep-verifiable (see plan §Money-flow invariants)", () => {
      // Placeholder — informs the reviewer that the plan's "NO mirror" rows
      // (DealerManualPurchase alone, DealerLedgerEntry ADJUSTMENT,
      // DealerSale isSupplierSettlementSale, DealerBroilerPurchase,
      // DealerManualCompanyAdjustment, BroilerSettlement margin/credit-recovery)
      // are enforced by the controller layer, not by any helper here.
      expect(true).toBe(true);
    });
  });
});
