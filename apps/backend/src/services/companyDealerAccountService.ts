import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import { CashflowError } from "../common/cashflow/errors";
import {
  deleteCompanyDealerPaymentMovement,
  postCompanyDealerPaymentMovement,
  resolveCompanyPaymentAccount,
} from "./companyCashflowAutoPost";

/**
 * A company may only work with its own dealers: ones it created
 * (dealer.userId = company owner) or ones already linked to it by an account.
 * Returns the dealer name for Cash & Bank entries.
 */
export async function assertCompanyDealer(
  tx: Prisma.TransactionClient | typeof prisma,
  companyId: string,
  ownerUserId: string,
  dealerId: string,
): Promise<{ name: string }> {
  const dealer = await tx.dealer.findUnique({
    where: { id: dealerId },
    select: { name: true, userId: true },
  });
  if (!dealer) throw new CashflowError("Dealer not found", 404);
  if (dealer.userId === ownerUserId) return { name: dealer.name };
  const linked = await tx.companyDealerAccount.findUnique({
    where: { companyId_dealerId: { companyId, dealerId } },
    select: { id: true },
  });
  if (!linked) throw new CashflowError("Dealer not found", 404);
  return { name: dealer.name };
}

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
    /** Company owner's User id: the Cash & Bank book is keyed by it. */
    ownerUserId: string;
    dealerId: string;
    amount: number;
    /** Cash & Bank account the money went into. Missing → Cash. */
    cashAccountId?: string | null;
    paymentDate?: Date;
    notes?: string;
    reference?: string;
    receiptImageUrl?: string;
    proofImageUrl?: string;
    recordedById: string;
    /** Staff id when a staff member saves it (for the Cash & Bank entry). */
    cashRecordedById?: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const dealer = await assertCompanyDealer(tx, data.companyId, data.ownerUserId, data.dealerId);
      // Payment method follows the account (Cash → CASH, Bank → BANK_TRANSFER).
      const { accountId: cashAccountId, paymentMethod } = await resolveCompanyPaymentAccount(
        tx,
        data.ownerUserId,
        data.cashAccountId,
      );
      const paymentDate = data.paymentDate || new Date();

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
          lastPaymentDate: paymentDate,
        },
        create: {
          companyId: data.companyId,
          dealerId: data.dealerId,
          balance: new Prisma.Decimal(-data.amount), // Negative = advance payment
          totalSales: new Prisma.Decimal(0),
          totalPayments: new Prisma.Decimal(data.amount),
          lastPaymentDate: paymentDate,
        },
      });

      // Get the updated balance after payment (already updated in upsert above)
      const newBalance = Number(account.balance);

      // Create payment record
      const payment = await tx.companyDealerPayment.create({
        data: {
          accountId: account.id,
          amount: new Prisma.Decimal(data.amount),
          paymentMethod,
          paymentDate,
          notes: data.notes,
          reference: data.reference,
          receiptImageUrl: data.receiptImageUrl,
          proofImageUrl: data.proofImageUrl,
          balanceAfter: new Prisma.Decimal(newBalance),
          recordedById: data.recordedById,
        },
      });

      await postCompanyDealerPaymentMovement({
        tx,
        userId: data.ownerUserId,
        paymentId: payment.id,
        accountId: cashAccountId,
        amount: data.amount,
        date: paymentDate,
        partyName: dealer.name,
        notes: data.notes ?? null,
        recordedById: data.cashRecordedById ?? data.recordedById,
      });

      return {
        payment,
        account,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  /**
   * Delete one dealer payment and undo it everywhere: the dealer's balance and
   * total, the "Balance" snapshot on every payment saved after it, the last
   * payment date, and the Cash & Bank entry.
   */
  static async deletePayment(data: {
    companyId: string;
    ownerUserId: string;
    dealerId: string;
    paymentId: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      await assertCompanyDealer(tx, data.companyId, data.ownerUserId, data.dealerId);
      const payment = await tx.companyDealerPayment.findUnique({
        where: { id: data.paymentId },
        select: {
          id: true,
          amount: true,
          createdAt: true,
          account: { select: { id: true, companyId: true, dealerId: true } },
        },
      });
      if (
        !payment ||
        payment.account.companyId !== data.companyId ||
        payment.account.dealerId !== data.dealerId
      ) {
        throw new CashflowError("Payment not found", 404);
      }

      const accountId = payment.account.id;
      await tx.companyDealerPayment.delete({ where: { id: payment.id } });

      // Every payment saved after this one showed a balance that already had
      // this amount taken off.
      await tx.companyDealerPayment.updateMany({
        where: { accountId, createdAt: { gt: payment.createdAt } },
        data: { balanceAfter: { increment: payment.amount } },
      });

      const latest = await tx.companyDealerPayment.findFirst({
        where: { accountId },
        orderBy: { paymentDate: "desc" },
        select: { paymentDate: true },
      });
      const account = await tx.companyDealerAccount.update({
        where: { id: accountId },
        data: {
          balance: { increment: payment.amount },
          totalPayments: { decrement: payment.amount },
          lastPaymentDate: latest?.paymentDate ?? null,
        },
      });

      await deleteCompanyDealerPaymentMovement(tx, data.ownerUserId, payment.id);

      return { paymentId: payment.id, amount: Number(payment.amount), account };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
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
          subtotalAmount: true,
          totalAmount: true,
          notes: true,
          invoiceImageUrl: true,
          discount: { select: { type: true, value: true } },
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

    // Format sales (include discount for statement UI)
    const formattedSales = sales.map((sale) => ({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      date: sale.date,
      amount: Number(sale.totalAmount),
      subtotalAmount: sale.subtotalAmount != null ? Number(sale.subtotalAmount) : null,
      discountType: sale.discount?.type ?? null,
      discountValue: sale.discount?.value != null ? Number(sale.discount.value) : null,
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
        subtotalAmount: sale.subtotalAmount,
        discountType: sale.discountType,
        discountValue: sale.discountValue,
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
            userId: true,
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
      accountType: "MANUAL",
      isManualDealer: true,
      balance: Number(account.balance),
      totalSales: Number(account.totalSales),
      totalPayments: Number(account.totalPayments),
      lastSaleDate: account.lastSaleDate,
      lastPaymentDate: account.lastPaymentDate,
    }));
  }

  /**
   * Set or update balance limit for a dealer account
   */
  static async setBalanceLimit(params: {
    companyId: string;
    dealerId: string;
    balanceLimit: number | null;
    setById: string;
  }) {
    const { companyId, dealerId, balanceLimit, setById } = params;

    const account = await prisma.companyDealerAccount.upsert({
      where: {
        companyId_dealerId: { companyId, dealerId },
      },
      update: {
        balanceLimit: balanceLimit !== null ? new Prisma.Decimal(balanceLimit) : null,
        balanceLimitSetAt: new Date(),
        balanceLimitSetBy: setById,
      },
      create: {
        companyId,
        dealerId,
        balance: new Prisma.Decimal(0),
        totalSales: new Prisma.Decimal(0),
        totalPayments: new Prisma.Decimal(0),
        balanceLimit: balanceLimit !== null ? new Prisma.Decimal(balanceLimit) : null,
        balanceLimitSetAt: new Date(),
        balanceLimitSetBy: setById,
      },
      include: {
        company: { select: { id: true, name: true, address: true } },
        dealer: { select: { id: true, name: true, contact: true, address: true } },
      },
    });

    return account;
  }

  /**
   * Check if a sale would exceed the balance limit
   * Returns { allowed: boolean, currentBalance: number, newBalance: number, limit: number | null, exceedsBy?: number }
   */
  static async checkBalanceLimit(params: {
    companyId: string;
    dealerId: string;
    saleAmount: number;
  }) {
    const { companyId, dealerId, saleAmount } = params;

    const account = await prisma.companyDealerAccount.findUnique({
      where: {
        companyId_dealerId: { companyId, dealerId },
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
  /**
   * Get all payments for a company across all dealers
   */
  static async getAllPayments(params: {
    companyId: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
    dealerId?: string;
  }) {
    const { companyId, startDate, endDate, page = 1, limit = 50, dealerId } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      account: {
        companyId,
      },
    };

    if (dealerId) {
      where.account.dealerId = dealerId;
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = startDate;
      if (endDate) where.paymentDate.lte = endDate;
    }

    const [payments, total] = await Promise.all([
      prisma.companyDealerPayment.findMany({
        where,
        include: {
          account: {
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
          },
        },
        orderBy: { paymentDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.companyDealerPayment.count({ where }),
    ]);

    const formattedPayments = payments.map((payment) => ({
      id: payment.id,
      dealerId: payment.account.dealerId,
      dealerName: payment.account.dealer.name,
      dealerContact: payment.account.dealer.contact,
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
      notes: payment.notes,
      reference: payment.reference,
      receiptImageUrl: payment.receiptImageUrl,
      proofImageUrl: payment.proofImageUrl,
      balanceAfter: Number(payment.balanceAfter),
    }));

    return {
      payments: formattedPayments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
