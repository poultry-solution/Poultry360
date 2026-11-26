import prisma from "../utils/prisma";
import { HatcheryPartyTxnType, Prisma } from "@prisma/client";
import {
  deleteHatcheryPartyPaymentMovement,
  ensureCashAccountId,
  postHatcheryPartyPaymentMovement,
} from "./hatcheryCashflowAutoPost";
import { derivePaymentMethodFromAccountType } from "../common/cashflow/paymentMethod";
type PrismaTx = Prisma.TransactionClient;

export class HatcheryPartyService {
  /**
   * Upfront ownership check used by sale controllers before entering the
   * sale-create transaction. Catches both "party does not exist" and "party
   * belongs to another tenant" with the same clean 400 "Party not found"
   * error. Without this guard, a bogus partyId would reach the FK constraint
   * on `tx.hatcheryEggSale.create()` first and leak a raw Prisma error with
   * a server file path (bug §7 MEDIUM — "database error showing server file
   * paths"). `recordSale` keeps its own ownership check as belt-and-braces
   * so a future caller cannot bypass this one.
   */
  static async assertPartyBelongsToHatchery(
    hatcheryOwnerId: string,
    partyId: string
  ): Promise<void> {
    const party = await prisma.hatcheryParty.findFirst({
      where: { id: partyId, hatcheryOwnerId },
      select: { id: true },
    });
    if (!party) {
      throw new Error("Party not found");
    }
  }

  // ─── Party CRUD ───────────────────────────────────────────────────────────

  static async createParty(
    hatcheryOwnerId: string,
    data: {
      name: string;
      phone: string;
      address?: string;
      openingBalance?: number;
    }
  ) {
    const { name, phone, address, openingBalance = 0 } = data;

    return prisma.$transaction(async (tx: PrismaTx) => {
      const party = await tx.hatcheryParty.create({
        data: {
          hatcheryOwnerId,
          name,
          phone,
          address,
          openingBalance,
          balance: openingBalance,
        },
      });

      if (openingBalance !== 0) {
        await tx.hatcheryPartyTxn.create({
          data: {
            partyId: party.id,
            type: HatcheryPartyTxnType.OPENING_BALANCE,
            date: new Date(),
            amount: openingBalance,
            balanceAfter: openingBalance,
            sourceType: "opening_balance",
            note: "Opening balance",
          },
        });
      }

      return party;
    });
  }

  static async listParties(
    hatcheryOwnerId: string,
    opts: { search?: string; page?: number; limit?: number } = {}
  ) {
    const { search, page = 1, limit = 50 } = opts;
    const where: Prisma.HatcheryPartyWhereInput = {
      hatcheryOwnerId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    };

    const [parties, total] = await prisma.$transaction([
      prisma.hatcheryParty.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.hatcheryParty.count({ where }),
    ]);

    return { parties, total, page, limit };
  }

  static async getPartyDetail(hatcheryOwnerId: string, partyId: string) {
    const party = await prisma.hatcheryParty.findFirst({
      where: { id: partyId, hatcheryOwnerId },
    });
    if (!party) throw new Error("Party not found");

    const [salesCount, salesTotal, paymentsTotal] = await prisma.$transaction([
      prisma.hatcheryPartyTxn.count({
        where: { partyId, type: HatcheryPartyTxnType.SALE },
      }),
      prisma.hatcheryPartyTxn.aggregate({
        where: { partyId, type: HatcheryPartyTxnType.SALE },
        _sum: { amount: true },
      }),
      prisma.hatcheryPartyTxn.aggregate({
        where: { partyId, type: HatcheryPartyTxnType.PAYMENT },
        _sum: { amount: true },
      }),
    ]);

    return {
      ...party,
      salesCount,
      totalSales: salesTotal._sum.amount ?? 0,
      totalPayments: Math.abs(Number(paymentsTotal._sum.amount ?? 0)),
    };
  }

  // ─── Payments ─────────────────────────────────────────────────────────────

  static async addPayment(
    hatcheryOwnerId: string,
    partyId: string,
    data: {
      date: Date;
      amount: number;
      method?: string;
      note?: string;
      /** Cashflow v2: CashAccount the cash landed in. Omit to use system Cash. */
      accountId?: string;
      /** Cashflow v2: who recorded it (owner User.id or staff's StaffUser.id);
       * resolved to a valid User.id at the sink via resolveRecordedById. */
      recordedById?: string;
    }
  ) {
    const { date, amount, note, accountId, recordedById } = data;

    const party = await prisma.hatcheryParty.findFirst({
      where: { id: partyId, hatcheryOwnerId },
    });
    if (!party) throw new Error("Party not found");

    if (amount <= 0) throw new Error("Payment amount must be positive");

    return prisma.$transaction(async (tx: PrismaTx) => {
      // Cashflow v2: resolve the account up front so we can both store it on
      // the payment row and derive the method string from its type.
      const resolvedAccountId =
        accountId && accountId.trim()
          ? accountId.trim()
          : await ensureCashAccountId(tx, hatcheryOwnerId);
      const resolvedAccount = await tx.cashAccount.findUnique({
        where: { id: resolvedAccountId },
        select: { type: true, userId: true, archivedAt: true },
      });
      const derivedMethod = derivePaymentMethodFromAccountType(
        resolvedAccount?.type ?? null,
      );
      // Prefer the account-derived method so new writes stay consistent with
      // the picker. If a caller still passes `data.method`, respect it (lets
      // historical API clients record custom labels like "CHEQUE").
      const method = data.method && data.method.trim() ? data.method : derivedMethod;

      const payment = await tx.hatcheryPartyPayment.create({
        data: {
          partyId,
          date,
          amount,
          method,
          note,
          accountId: resolvedAccountId,
        },
      });

      // Atomic decrement so two concurrent payments cannot both read the
      // same stale balance (fixes bug §9 HIGH "party payments lost on
      // same-time saves"). Mirrors the fix already in `recordSale`.
      const updated = await tx.hatcheryParty.update({
        where: { id: partyId },
        data: { balance: { decrement: amount } },
        select: { balance: true },
      });

      await tx.hatcheryPartyTxn.create({
        data: {
          partyId,
          type: HatcheryPartyTxnType.PAYMENT,
          date,
          amount: -amount,
          balanceAfter: updated.balance,
          sourceType: "payment",
          sourceId: payment.id,
          note,
        },
      });

      // Cashflow v2 mirror: one CashMovement per payment row. Keyed off
      // HatcheryPartyPayment.id — never off the sibling PartyTxn.PAYMENT
      // (would double-count the same cash event).
      await postHatcheryPartyPaymentMovement({
        tx,
        userId: hatcheryOwnerId,
        hatcheryPartyPaymentId: payment.id,
        accountId: resolvedAccountId,
        amount,
        date,
        partyName: party.name,
        recordedById: recordedById ?? hatcheryOwnerId,
        notes: note ?? null,
      });

      return payment;
    });
  }

  static async deletePayment(hatcheryOwnerId: string, paymentId: string) {
    const payment = await prisma.hatcheryPartyPayment.findFirst({
      where: { id: paymentId },
      include: { party: true },
    });
    if (!payment) throw new Error("Payment not found");
    if (payment.party.hatcheryOwnerId !== hatcheryOwnerId)
      throw new Error("Not authorized");

    return prisma.$transaction(async (tx: PrismaTx) => {
      // Remove the cashflow v2 mirror first — the source row still exists at
      // this point so the find-then-delete has something to key off. Cleanup
      // is safe even if the mirror was never written (deleteMany returns 0).
      await deleteHatcheryPartyPaymentMovement(tx, hatcheryOwnerId, paymentId);

      await tx.hatcheryPartyTxn.deleteMany({
        where: { sourceType: "payment", sourceId: paymentId },
      });

      // Atomic reversal: a payment subtracted `amount` from balance, so
      // deleting it must add the same amount back. Independent of any
      // other concurrent write.
      await tx.hatcheryParty.update({
        where: { id: payment.partyId },
        data: { balance: { increment: Number(payment.amount) } },
      });

      await tx.hatcheryPartyPayment.delete({ where: { id: paymentId } });
    });
  }

  // ─── Ledger entries ───────────────────────────────────────────────────────

  static async listTxns(
    hatcheryOwnerId: string,
    partyId: string,
    opts: { page?: number; limit?: number } = {}
  ) {
    const { page = 1, limit = 50 } = opts;
    const party = await prisma.hatcheryParty.findFirst({
      where: { id: partyId, hatcheryOwnerId },
    });
    if (!party) throw new Error("Party not found");

    const [txns, total] = await prisma.$transaction([
      prisma.hatcheryPartyTxn.findMany({
        where: { partyId },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.hatcheryPartyTxn.count({ where: { partyId } }),
    ]);

    return { txns, total, page, limit };
  }

  static async listPayments(
    hatcheryOwnerId: string,
    partyId: string,
    opts: { page?: number; limit?: number } = {}
  ) {
    const { page = 1, limit = 50 } = opts;
    const party = await prisma.hatcheryParty.findFirst({
      where: { id: partyId, hatcheryOwnerId },
    });
    if (!party) throw new Error("Party not found");

    const [payments, total] = await prisma.$transaction([
      prisma.hatcheryPartyPayment.findMany({
        where: { partyId },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.hatcheryPartyPayment.count({ where: { partyId } }),
    ]);

    return { payments, total, page, limit };
  }

  // ─── Sales ledger integration ─────────────────────────────────────────────

  /**
   * Write a SALE txn and increment party balance.
   * Called inside a transaction from sale create handlers.
   *
   * `hatcheryOwnerId` is required so the party lookup is scoped to this
   * hatchery — fixes bug §5 CRITICAL (sales could be posted to another
   * hatchery's party when the client supplied a partyId from another tenant).
   * Rejecting as "Party not found" matches the convention used elsewhere and
   * does not reveal whether the id exists in a different tenant.
   */
  static async recordSale(
    tx: Prisma.TransactionClient,
    hatcheryOwnerId: string,
    partyId: string,
    saleId: string,
    saleType: string,
    amount: number,
    date: Date
  ) {
    const party = await tx.hatcheryParty.findFirst({
      where: { id: partyId, hatcheryOwnerId },
      select: { id: true },
    });
    if (!party) {
      throw new Error("Party not found");
    }

    // Atomic balance update. { increment } compiles to
    // `UPDATE "HatcheryParty" SET balance = balance + :amount` which Postgres
    // serialises per-row — fixes bug §9 HIGH ("party payments lost on
    // same-time saves") in the sale write path. `reverseSale` already uses
    // the matching { decrement } idiom.
    const updated = await tx.hatcheryParty.update({
      where: { id: partyId },
      data: { balance: { increment: amount } },
      select: { balance: true },
    });

    await tx.hatcheryPartyTxn.create({
      data: {
        partyId,
        type: HatcheryPartyTxnType.SALE,
        date,
        amount,
        balanceAfter: updated.balance,
        sourceType: saleType,
        sourceId: saleId,
      },
    });
  }

  /**
   * Reverse a SALE txn and decrement party balance.
   * Called inside a transaction from sale delete handlers.
   */
  static async reverseSale(
    tx: Prisma.TransactionClient,
    saleId: string,
    saleType: string
  ) {
    const txn = await tx.hatcheryPartyTxn.findFirst({
      where: { sourceId: saleId, sourceType: saleType, type: HatcheryPartyTxnType.SALE },
    });
    if (!txn) return; // cash sale, nothing to reverse

    const reversal = Number(txn.amount);

    await tx.hatcheryPartyTxn.delete({ where: { id: txn.id } });

    await tx.hatcheryParty.update({
      where: { id: txn.partyId },
      data: { balance: { decrement: reversal } },
    });
  }
}
