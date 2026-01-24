import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";

export class CompanyDealerAccountService {
  /**
   * Get or create account for company-dealer pair
   * Uses upsert to prevent race conditions
   */
  static async getOrCreateAccount(companyId: string, dealerId: string) {
    // Use upsert to atomically get or create - prevents race conditions
    const account = await prisma.companyDealerAccount.upsert({
      where: {
        companyId_dealerId: {
          companyId,
          dealerId,
        },
      },
      update: {}, // Don't update if exists, just return it
      create: {
        companyId,
        dealerId,
        balance: new Prisma.Decimal(0),
        totalSales: new Prisma.Decimal(0),
        totalPayments: new Prisma.Decimal(0),
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        dealer: {
          select: {
            id: true,
            name: true,
            contact: true,
            address: true,
          },
        },
      },
    });

    return account;
  }

  /**
   * Record sale and update account balance
   */
  static async recordSale(
    companyId: string,
    dealerId: string,
    saleAmount: number,
    saleId: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // Use upsert to ensure account exists (prevents race conditions)
      const account = await tx.companyDealerAccount.upsert({
        where: {
          companyId_dealerId: {
            companyId,
            dealerId,
          },
        },
        update: {
          balance: { increment: new Prisma.Decimal(saleAmount) },
          totalSales: { increment: new Prisma.Decimal(saleAmount) },
          lastSaleDate: new Date(),
        },
        create: {
          companyId,
          dealerId,
          balance: new Prisma.Decimal(saleAmount),
          totalSales: new Prisma.Decimal(saleAmount),
          totalPayments: new Prisma.Decimal(0),
          lastSaleDate: new Date(),
        },
      });

      // Link the sale to the account
      await tx.companySale.update({
        where: { id: saleId },
        data: {
          accountId: account.id,
        },
      });

      return account;
    });
  }

  /**
   * Record payment and update account balance
   */
  static async recordPayment(data: {
    companyId: string;
    dealerId: string;
    amount: number;
    paymentMethod?: string;
    paymentDate?: Date;
    notes?: string;
    reference?: string;
    receiptImageUrl?: string;
    proofImageUrl?: string;
    recordedById: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      // Use upsert to ensure account exists (prevents race conditions)
      const account = await tx.companyDealerAccount.upsert({
        where: {
          companyId_dealerId: {
            companyId: data.companyId,
            dealerId: data.dealerId,
          },
        },
        update: {
          balance: { decrement: new Prisma.Decimal(data.amount) },
          totalPayments: { increment: new Prisma.Decimal(data.amount) },
          lastPaymentDate: data.paymentDate || new Date(),
        },
        create: {
          companyId: data.companyId,
          dealerId: data.dealerId,
          balance: new Prisma.Decimal(-data.amount), // Negative = advance payment
          totalSales: new Prisma.Decimal(0),
          totalPayments: new Prisma.Decimal(data.amount),
          lastPaymentDate: data.paymentDate || new Date(),
        },
      });

      // Get the updated balance after payment (already updated in upsert above)
      const newBalance = Number(account.balance);

      // Create payment record
      const payment = await tx.companyDealerPayment.create({
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

      return {
        payment,
        account,
      };
    });
  }

  /**
   * Get account balance
   */
  static async getAccountBalance(companyId: string, dealerId: string) {
    const account = await prisma.companyDealerAccount.findUnique({
      where: {
        companyId_dealerId: {
          companyId,
          dealerId,
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
   * Get account statement (sales and payments)
   */
  static async getAccountStatement(params: {
    companyId: string;
    dealerId: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const { companyId, dealerId, startDate, endDate, page = 1, limit = 50 } = params;

    const account = await this.getOrCreateAccount(companyId, dealerId);

    const skip = (page - 1) * limit;

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = startDate;
    }
    if (endDate) {
      dateFilter.lte = endDate;
    }

    // Get sales
    const salesWhere: any = {
      companyId,
      dealerId,
      accountId: account.id,
    };
    if (startDate || endDate) {
      salesWhere.date = dateFilter;
    }

    const [sales, salesCount] = await Promise.all([
      prisma.companySale.findMany({
        where: salesWhere,
        select: {
          id: true,
          invoiceNumber: true,
          date: true,
          totalAmount: true,
          notes: true,
          invoiceImageUrl: true,
        },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
      prisma.companySale.count({ where: salesWhere }),
    ]);

    // Get payments
    const paymentsWhere: any = {
      accountId: account.id,
    };
    if (startDate || endDate) {
      paymentsWhere.paymentDate = dateFilter;
    }

    const [payments, paymentsCount] = await Promise.all([
      prisma.companyDealerPayment.findMany({
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
      prisma.companyDealerPayment.count({ where: paymentsWhere }),
    ]);

    // Format sales
    const formattedSales = sales.map((sale) => ({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      date: sale.date,
      amount: Number(sale.totalAmount),
      notes: sale.notes,
      invoiceImageUrl: sale.invoiceImageUrl,
    }));

    // Format payments
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

    // Also return combined transactions for backward compatibility (if needed)
    const transactions = [
      ...formattedSales.map((sale) => ({
        type: "SALE" as const,
        id: sale.id,
        date: sale.date,
        amount: sale.amount,
        reference: sale.invoiceNumber,
        notes: sale.notes,
        imageUrl: sale.invoiceImageUrl,
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
        company: account.company,
        dealer: account.dealer,
      },
      sales: formattedSales,
      payments: formattedPayments,
      transactions, // Keep for backward compatibility
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
   * Get all accounts for a company
   */
  static async getCompanyAccounts(companyId: string) {
    const accounts = await prisma.companyDealerAccount.findMany({
      where: { companyId },
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

  /**
   * Get all accounts for a dealer
   */
  static async getDealerAccounts(dealerId: string) {
    const accounts = await prisma.companyDealerAccount.findMany({
      where: { dealerId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: { balance: "desc" },
    });

    return accounts.map((account) => ({
      id: account.id,
      companyId: account.companyId,
      companyName: account.company.name,
      companyAddress: account.company.address,
      balance: Number(account.balance),
      totalSales: Number(account.totalSales),
      totalPayments: Number(account.totalPayments),
      lastSaleDate: account.lastSaleDate,
      lastPaymentDate: account.lastPaymentDate,
    }));
  }
}
