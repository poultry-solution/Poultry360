import prisma from "../utils/prisma";
import { HatcheryPartyTxnType, Prisma } from "@prisma/client";
type PrismaTx = Prisma.TransactionClient;

export class HatcheryPartyService {
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
    data: { date: Date; amount: number; method?: string; note?: string }
  ) {
    const { date, amount, method, note } = data;

    const party = await prisma.hatcheryParty.findFirst({
      where: { id: partyId, hatcheryOwnerId },
    });
    if (!party) throw new Error("Party not found");

    if (amount <= 0) throw new Error("Payment amount must be positive");

    return prisma.$transaction(async (tx: PrismaTx) => {
      const payment = await tx.hatcheryPartyPayment.create({
        data: { partyId, date, amount, method, note },
      });

      const newBalance = Number(party.balance) - amount;

      await tx.hatcheryPartyTxn.create({
        data: {
          partyId,
          type: HatcheryPartyTxnType.PAYMENT,
          date,
          amount: -amount,
          balanceAfter: newBalance,
          sourceType: "payment",
          sourceId: payment.id,
          note,
        },
      });

      await tx.hatcheryParty.update({
        where: { id: partyId },
        data: { balance: newBalance },
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
      await tx.hatcheryPartyTxn.deleteMany({
        where: { sourceType: "payment", sourceId: paymentId },
      });

      const newBalance = Number(payment.party.balance) + Number(payment.amount);

      await tx.hatcheryParty.update({
        where: { id: payment.partyId },
        data: { balance: newBalance },
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
   */
  static async recordSale(
    tx: Prisma.TransactionClient,
    partyId: string,
    saleId: string,
    saleType: string,
    amount: number,
    date: Date
  ) {
    const party = await tx.hatcheryParty.findUniqueOrThrow({
      where: { id: partyId },
    });

    const newBalance = Number(party.balance) + amount;

    await tx.hatcheryPartyTxn.create({
      data: {
        partyId,
        type: HatcheryPartyTxnType.SALE,
        date,
        amount,
        balanceAfter: newBalance,
        sourceType: saleType,
        sourceId: saleId,
      },
    });

    await tx.hatcheryParty.update({
      where: { id: partyId },
      data: { balance: newBalance },
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
