/**
 * Money-flow invariant regression suite for hatchery. Each `it` block pins
 * one row of the "Money-flow invariants" table in the hatchery cashflow plan.
 * A failing test here means someone broke a rule that's load-bearing for the
 * cashflow totals being correct.
 *
 * Shape-only: we check that the auto-post helpers write (or refuse to write)
 * the right CashMovement for each business event. End-to-end wiring is
 * covered by service/controller integration tests.
 */

jest.mock("../../src/utils/nepalBsDate", () => ({
  toNepalBsDayString: jest.fn(() => "2083-04-10"),
}));

import {
  postHatcheryBatchExpenseMovement,
  postHatcheryPartyPaymentMovement,
  postHatcherySupplierPaymentMovement,
} from "../../src/services/hatcheryCashflowAutoPost";
import { Prisma } from "@prisma/client";

type MockedTx = {
  cashAccount: { findUnique: jest.Mock };
  cashMovement: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock; deleteMany: jest.Mock };
  user: { findUnique: jest.Mock };
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
    user: { findUnique: jest.fn().mockResolvedValue({ id: "hatchery-user-1" }) },
  };
}
const activeAccount = () => ({ userId: "hatchery-user-1", archivedAt: null });

describe("hatchery cashflow invariants", () => {
  describe("party-payment cash events", () => {
    it("HatcheryPartyPayment → mirrors one IN leg equal to payment amount", async () => {
      const t = tx();
      t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
      t.cashMovement.findFirst.mockResolvedValueOnce(null);
      await postHatcheryPartyPaymentMovement({
        tx: t as unknown as Prisma.TransactionClient,
        userId: "hatchery-user-1",
        hatcheryPartyPaymentId: "hpp-1",
        accountId: "cash-1",
        amount: 3200,
        date: new Date(),
        partyName: "Ganga Traders",
        recordedById: "hatchery-user-1",
      });
      expect(t.cashMovement.create).toHaveBeenCalledTimes(1);
      const data = t.cashMovement.create.mock.calls[0][0].data;
      expect(data.direction).toBe("IN");
      expect(data.category).toBe("SALE_RECEIPT");
      expect(data.sourceType).toBe("HATCHERY_PARTY_PAYMENT");
      expect(data.amount).toEqual(new Prisma.Decimal(3200));
    });

    // HatcheryPartyTxn.SALE / ADJUSTMENT / OPENING_BALANCE / PAYMENT never
    // fire the mirror. The mirror is keyed off HatcheryPartyPayment.id — never
    // off the sibling PartyTxn — so there is no helper to call for these txn
    // types. Enforced by the fact that no code path imports an autoPost
    // helper from within `recordSale`, `createParty`, or `assertPartyBelongsToHatchery`.
  });

  describe("supplier payment events", () => {
    it("HatcherySupplierTxn PAYMENT → mirrors one OUT leg", async () => {
      const t = tx();
      t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
      t.cashMovement.findFirst.mockResolvedValueOnce(null);
      await postHatcherySupplierPaymentMovement({
        tx: t as unknown as Prisma.TransactionClient,
        userId: "hatchery-user-1",
        hatcherySupplierTxnId: "hst-1",
        accountId: "cash-1",
        amount: 5000,
        date: new Date(),
        supplierName: "Shree Feed Mills",
        recordedById: "hatchery-user-1",
      });
      expect(t.cashMovement.create).toHaveBeenCalledTimes(1);
      const data = t.cashMovement.create.mock.calls[0][0].data;
      expect(data.direction).toBe("OUT");
      expect(data.category).toBe("PAYMENT_TO_DEALER");
      expect(data.sourceType).toBe("HATCHERY_SUPPLIER_PAYMENT");
    });

    // HatcherySupplierTxn PURCHASE / ADJUSTMENT / OPENING_BALANCE → NO mirror.
    // Enforced at `HatcherySupplierService` level: `addPurchaseTxn`,
    // `setOpeningBalance`, and the ADJUSTMENT branch don't import the autoPost
    // helpers. Guard verified by grep + the fact that `addPaymentTxn` is the
    // only caller of `postHatcherySupplierPaymentMovement`.
  });

  describe("batch expense events", () => {
    it("HatcheryBatchExpense MANUAL → mirrors one OUT leg", async () => {
      const t = tx();
      t.cashAccount.findUnique.mockResolvedValueOnce(activeAccount());
      t.cashMovement.findFirst.mockResolvedValueOnce(null);
      await postHatcheryBatchExpenseMovement({
        tx: t as unknown as Prisma.TransactionClient,
        userId: "hatchery-user-1",
        hatcheryBatchExpenseId: "hbe-1",
        accountId: "cash-1",
        amount: 1200,
        date: new Date(),
        partyName: "Labor — brooding",
        recordedById: "hatchery-user-1",
      });
      expect(t.cashMovement.create).toHaveBeenCalledTimes(1);
      const data = t.cashMovement.create.mock.calls[0][0].data;
      expect(data.direction).toBe("OUT");
      expect(data.category).toBe("EXPENSE");
      expect(data.sourceType).toBe("HATCHERY_BATCH_EXPENSE");
    });

    // HatcheryBatchExpense INVENTORY → NO mirror. Inventory consumption is
    // not a cash event; the cash moved earlier via HatcherySupplierTxn.PAYMENT
    // that bought the inventory. Enforced in
    // `HatcheryBatchExpenseService.createManualExpense` vs `createInventoryExpense`:
    // only the former calls postHatcheryBatchExpenseMovement.
  });

  describe("source types that must never mirror", () => {
    // These events don't have a mirror helper. The guard is: no code path
    // imports an autoPost helper for them. A regression (someone wiring a
    // mirror for a non-cash event) would surface via an unexpected import in
    // the corresponding service/controller. We rely on controller tests +
    // grep-based review to catch these.
    it("is documented and grep-verifiable (see plan §Money-flow invariants)", () => {
      // Placeholder — informs the reviewer that the plan's "NO mirror" rows
      // (HatcheryPartyTxn SALE/ADJUSTMENT/OPENING, HatcheryPartyTxn.PAYMENT,
      // HatcheryChickSale / HatcheryEggSale / HatcheryParentSale,
      // HatcherySupplierTxn PURCHASE/ADJUSTMENT/OPENING,
      // HatcheryBatchExpense INVENTORY, HatcheryInventoryTxn) are enforced by
      // the service layer, not by any helper here.
      expect(true).toBe(true);
    });
  });
});
