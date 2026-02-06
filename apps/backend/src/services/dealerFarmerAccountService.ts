import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";

export class DealerFarmerAccountService {
  /**
   * Get or create account for dealer-farmer pair
   * Uses upsert to prevent race conditions
   */
  static async getOrCreateAccount(dealerId: string, farmerId: string) {
    const account = await prisma.dealerFarmerAccount.upsert({
      where: {
        dealerId_farmerId: {
          dealerId,
          farmerId,
        },
      },
      update: {},
      create: {
        dealerId,
        farmerId,
        balance: new Prisma.Decimal(0),
        totalSales: new Prisma.Decimal(0),
        totalPayments: new Prisma.Decimal(0),
      },
      include: {
        dealer: {
          select: {
            id: true,
            name: true,
            contact: true,
            address: true,
          },
        },
        farmer: {
          select: {
            id: true,
            name: true,
            phone: true,
            companyName: true,
            CompanyFarmLocation: true,
          },
        },
      },
    });

    return account;
  }

  /**
   * Record sale and update account balance.
   * When tx is provided, runs inside the caller's transaction for atomicity.
   */
  static async recordSale(
    dealerId: string,
    farmerId: string,
    amount: number,
    saleId: string,
    tx?: Prisma.TransactionClient
  ) {
    const run = async (client: Prisma.TransactionClient) => {
      const account = await client.dealerFarmerAccount.upsert({
        where: {
          dealerId_farmerId: {
            dealerId,
            farmerId,
          },
        },
        update: {
          balance: { increment: new Prisma.Decimal(amount) },
          totalSales: { increment: new Prisma.Decimal(amount) },
          lastSaleDate: new Date(),
        },
        create: {
          dealerId,
          farmerId,
          balance: new Prisma.Decimal(amount),
          totalSales: new Prisma.Decimal(amount),
          totalPayments: new Prisma.Decimal(0),
          lastSaleDate: new Date(),
        },
      });

      await client.dealerSale.update({
        where: { id: saleId },
        data: {
          accountId: account.id,
        },
      });

      return account;
    };

    if (tx) {
      return run(tx);
    }
    return await prisma.$transaction(run);
  }

  /**
   * Record payment and update account balance.
   * Payments only create DealerFarmerPayment and DealerLedgerEntry; they do not update
   * any DealerSale row (account-only model; sales are history only).
   * When tx is provided, runs inside the caller's transaction for atomicity.
   */
  static async recordPayment(
    data: {
      dealerId: string;
      farmerId: string;
      amount: number;
      paymentMethod?: string;
      paymentDate?: Date;
      notes?: string;
      reference?: string;
      receiptImageUrl?: string;
      proofImageUrl?: string;
      recordedById: string;
      /** Optional; kept for reference only — never used to mutate sale amounts */
      dealerSaleId?: string | null;
    },
    tx?: Prisma.TransactionClient
  ) {
    const run = async (client: Prisma.TransactionClient) => {
      const account = await client.dealerFarmerAccount.upsert({
        where: {
          dealerId_farmerId: {
            dealerId: data.dealerId,
            farmerId: data.farmerId,
          },
        },
        update: {
          balance: { decrement: new Prisma.Decimal(data.amount) },
          totalPayments: { increment: new Prisma.Decimal(data.amount) },
          lastPaymentDate: data.paymentDate || new Date(),
        },
        create: {
          dealerId: data.dealerId,
          farmerId: data.farmerId,
          balance: new Prisma.Decimal(-data.amount),
          totalSales: new Prisma.Decimal(0),
          totalPayments: new Prisma.Decimal(data.amount),
          lastPaymentDate: data.paymentDate || new Date(),
        },
      });

      const newBalance = Number(account.balance);

      const payment = await client.dealerFarmerPayment.create({
        data: {
          accountId: account.id,
          amount: new Prisma.Decimal(data.amount),
          paymentMethod: data.paymentMethod || "CASH",
          paymentDate: data.paymentDate || new Date(),
          notes: data.notes,
          reference: data.reference,
          receiptImageUrl: data.receiptImageUrl,
          proofImageUrl: data.proofImageUrl,
          balanceAfter: new Prisma.Decimal(newBalance),
          recordedById: data.recordedById,
        },
      });

      // Dealer ledger: record payment received from farmer so ledger balance stays aligned with account movements
      const paymentDate = data.paymentDate || new Date();
      const lastLedgerEntry = await client.dealerLedgerEntry.findFirst({
        where: { dealerId: data.dealerId },
        orderBy: { createdAt: "desc" },
      });
      const currentLedgerBalance = lastLedgerEntry
        ? Number(lastLedgerEntry.balance)
        : 0;
      const newLedgerBalance = currentLedgerBalance - data.amount;
      await client.dealerLedgerEntry.create({
        data: {
          type: "PAYMENT_RECEIVED",
          amount: new Prisma.Decimal(data.amount),
          balance: new Prisma.Decimal(newLedgerBalance),
          date: paymentDate,
          description: data.notes ?? "Payment received from farmer",
          reference: data.reference ?? payment.id,
          dealerId: data.dealerId,
          partyId: data.farmerId,
          partyType: "FARMER",
          imageUrl: data.receiptImageUrl,
        },
      });

      return {
        payment,
        account,
      };
    };

    if (tx) {
      return run(tx);
    }
    return await prisma.$transaction(run);
  }

  /**
   * Get account balance
   */
  static async getAccountBalance(dealerId: string, farmerId: string) {
    const account = await prisma.dealerFarmerAccount.findUnique({
      where: {
        dealerId_farmerId: {
          dealerId,
          farmerId,
        },
      },
      select: {
        id: true,
        balance: true,
        totalSales: true,
        totalPayments: true,
        lastSaleDate: true,
        lastPaymentDate: true,
      },
    });

    return account;
  }

  /**
   * Get account statement (sales and payments) with pagination
   */
  static async getAccountStatement(params: {
    dealerId: string;
    farmerId: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { dealerId, farmerId, startDate, endDate, page = 1, limit = 50 } =
      params;

    const account = await this.getOrCreateAccount(dealerId, farmerId);

    const skip = (page - 1) * limit;

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) dateFilter.gte = startDate;
    if (endDate) dateFilter.lte = endDate;

    // Query by accountId only: DealerSale rows may have farmerId null (set only accountId via recordSale)
    const salesWhere: {
      accountId: string;
      date?: { gte?: Date; lte?: Date };
    } = {
      accountId: account.id,
    };
    if (startDate || endDate) salesWhere.date = dateFilter;

    const [sales, salesCount] = await Promise.all([
      prisma.dealerSale.findMany({
        where: salesWhere,
        select: {
          id: true,
          invoiceNumber: true,
          date: true,
          totalAmount: true,
          notes: true,
        },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.dealerSale.count({ where: salesWhere }),
    ]);

    const paymentsWhere: {
      accountId: string;
      paymentDate?: { gte?: Date; lte?: Date };
    } = {
      accountId: account.id,
    };
    if (startDate || endDate) paymentsWhere.paymentDate = dateFilter;

    const [payments, paymentsCount] = await Promise.all([
      prisma.dealerFarmerPayment.findMany({
        where: paymentsWhere,
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          paymentDate: true,
          notes: true,
          reference: true,
          receiptImageUrl: true,
          proofImageUrl: true,
          balanceAfter: true,
        },
        orderBy: { paymentDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.dealerFarmerPayment.count({ where: paymentsWhere }),
    ]);

    const formattedSales = sales.map((sale) => ({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      date: sale.date,
      amount: Number(sale.totalAmount),
      notes: sale.notes,
    }));

    const formattedPayments = payments.map((payment) => ({
      id: payment.id,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      notes: payment.notes,
      reference: payment.reference,
      receiptImageUrl: payment.receiptImageUrl,
      proofImageUrl: payment.proofImageUrl,
      balanceAfter: Number(payment.balanceAfter),
    }));

    const transactions = [
      ...formattedSales.map((sale) => ({
        type: "SALE" as const,
        id: sale.id,
        date: sale.date,
        amount: sale.amount,
        reference: sale.invoiceNumber,
        notes: sale.notes,
      })),
      ...formattedPayments.map((payment) => ({
        type: "PAYMENT" as const,
        id: payment.id,
        date: payment.paymentDate,
        amount: payment.amount,
        reference: payment.reference,
        notes: payment.notes,
        paymentMethod: payment.paymentMethod,
        imageUrl: payment.receiptImageUrl,
        balanceAfter: payment.balanceAfter,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      account: {
        id: account.id,
        balance: Number(account.balance),
        totalSales: Number(account.totalSales),
        totalPayments: Number(account.totalPayments),
        lastSaleDate: account.lastSaleDate,
        lastPaymentDate: account.lastPaymentDate,
        dealer: account.dealer,
        farmer: account.farmer,
      },
      sales: formattedSales,
      payments: formattedPayments,
      transactions,
      pagination: {
        page,
        limit,
        totalSales: salesCount,
        totalPayments: paymentsCount,
        totalTransactions: salesCount + paymentsCount,
        totalPages: Math.ceil((salesCount + paymentsCount) / limit),
      },
    };
  }

  /**
   * Set or update balance limit for a dealer-farmer account
   */
  static async setBalanceLimit(params: {
    dealerId: string;
    farmerId: string;
    balanceLimit: number | null;
    setById: string;
  }) {
    const { dealerId, farmerId, balanceLimit, setById } = params;

    const account = await prisma.dealerFarmerAccount.upsert({
      where: {
        dealerId_farmerId: { dealerId, farmerId },
      },
      update: {
        balanceLimit:
          balanceLimit !== null ? new Prisma.Decimal(balanceLimit) : null,
        balanceLimitSetAt: new Date(),
        balanceLimitSetBy: setById,
      },
      create: {
        dealerId,
        farmerId,
        balance: new Prisma.Decimal(0),
        totalSales: new Prisma.Decimal(0),
        totalPayments: new Prisma.Decimal(0),
        balanceLimit:
          balanceLimit !== null ? new Prisma.Decimal(balanceLimit) : null,
        balanceLimitSetAt: new Date(),
        balanceLimitSetBy: setById,
      },
      include: {
        dealer: { select: { id: true, name: true, contact: true, address: true } },
        farmer: {
          select: {
            id: true,
            name: true,
            phone: true,
            companyName: true,
            CompanyFarmLocation: true,
          },
        },
      },
    });

    return account;
  }

  /**
   * Check if a sale would exceed the balance limit
   */
  static async checkBalanceLimit(params: {
    dealerId: string;
    farmerId: string;
    saleAmount: number;
  }) {
    const { dealerId, farmerId, saleAmount } = params;

    const account = await prisma.dealerFarmerAccount.findUnique({
      where: {
        dealerId_farmerId: { dealerId, farmerId },
      },
      select: { balance: true, balanceLimit: true },
    });

    const currentBalance = account ? Number(account.balance) : 0;
    const newBalance = currentBalance + saleAmount;
    const limit = account?.balanceLimit ? Number(account.balanceLimit) : null;

    if (limit === null) {
      return { allowed: true, currentBalance, newBalance, limit: null };
    }

    const allowed = newBalance <= limit;
    const exceedsBy = !allowed ? newBalance - limit : undefined;

    return {
      allowed,
      currentBalance,
      newBalance,
      limit,
      ...(exceedsBy !== undefined && { exceedsBy }),
    };
  }

  /**
   * Get all farmer accounts for a dealer
   */
  static async getDealerAccounts(dealerId: string) {
    const accounts = await prisma.dealerFarmerAccount.findMany({
      where: { dealerId },
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            phone: true,
            companyName: true,
            CompanyFarmLocation: true,
          },
        },
      },
      orderBy: { balance: "desc" },
    });

    return accounts.map((account) => ({
      id: account.id,
      farmerId: account.farmerId,
      farmerName: account.farmer.name,
      farmerPhone: account.farmer.phone,
      farmerCompanyName: account.farmer.companyName,
      farmerLocation: account.farmer.CompanyFarmLocation,
      balance: Number(account.balance),
      totalSales: Number(account.totalSales),
      totalPayments: Number(account.totalPayments),
      lastSaleDate: account.lastSaleDate,
      lastPaymentDate: account.lastPaymentDate,
    }));
  }

  /**
   * Get all dealer accounts for a farmer
   */
  static async getFarmerAccounts(farmerId: string) {
    const accounts = await prisma.dealerFarmerAccount.findMany({
      where: { farmerId },
      include: {
        dealer: {
          select: {
            id: true,
            name: true,
            contact: true,
            address: true,
          },
        },
      },
      orderBy: { balance: "desc" },
    });

    return accounts.map((account) => ({
      id: account.id,
      dealerId: account.dealerId,
      dealerName: account.dealer.name,
      dealerContact: account.dealer.contact,
      dealerAddress: account.dealer.address,
      balance: Number(account.balance),
      totalSales: Number(account.totalSales),
      totalPayments: Number(account.totalPayments),
      lastSaleDate: account.lastSaleDate,
      lastPaymentDate: account.lastPaymentDate,
    }));
  }
}
