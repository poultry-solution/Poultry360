import prisma from "../utils/prisma";
import {
  ConsignmentStatus,
  DiscountType as PrismaDiscountType,
  Prisma,
  PaymentRequestStatus,
  PaymentRequestDirection,
  LedgerEntryType,
} from "@prisma/client";
import {
  computeDiscountAmount,
  distributeDiscountToItems,
  type DiscountType,
} from "../utils/discountHelpers";

export class CompanyService {
  /**
   * Create a company sale with inventory updates and account balance updates
   */
  static async createCompanySale(data: {
    companyId: string;
    dealerId: string;
    soldById: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
      unit?: string;
    }>;
    paymentMethod?: string;
    notes?: string;
    date: Date;
    overrideBalanceLimit?: boolean;
    discount?: { type: DiscountType; value: number };
  }) {
    const {
      companyId,
      dealerId,
      soldById,
      items,
      paymentMethod,
      notes,
      date,
      overrideBalanceLimit,
      discount: discountInput,
    } = data;

    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    if (discountInput && discountInput.value > 0) {
      if (discountInput.type === "PERCENT" && discountInput.value > 100) {
        throw new Error("Discount percent cannot exceed 100");
      }
      if (discountInput.type === "FLAT" && discountInput.value > subtotal) {
        throw new Error("Flat discount cannot exceed subtotal");
      }
    }

    const discountAmount =
      discountInput && discountInput.value > 0
        ? computeDiscountAmount(
            subtotal,
            discountInput.type,
            discountInput.value
          )
        : 0;
    const totalAmount = Math.round((subtotal - discountAmount) * 100) / 100;
    const itemTotals =
      discountAmount > 0
        ? distributeDiscountToItems(subtotal, discountAmount, items)
        : items.map((item) => item.quantity * item.unitPrice);

    return await prisma.$transaction(async (tx) => {
      // 1. Validate stock availability for all items
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product ${item.productId} not found`);
        }

        if (Number(product.currentStock) < item.quantity) {
          throw new Error(
            `Insufficient stock for product ${product.name}. Available: ${product.currentStock}, Requested: ${item.quantity}`
          );
        }
      }

      // 2. Get dealer info
      const dealer = await tx.dealer.findUnique({
        where: { id: dealerId },
      });

      if (!dealer) {
        throw new Error("Dealer not found");
      }

      const isCredit = paymentMethod === "CREDIT";

      // 4. Get or create account for company-dealer pair
      let account = await tx.companyDealerAccount.findUnique({
        where: {
          companyId_dealerId: {
            companyId,
            dealerId,
          },
        },
        select: {
          id: true,
          balance: true,
          balanceLimit: true,
        },
      });

      if (!account) {
        const created = await tx.companyDealerAccount.create({
          data: {
            companyId,
            dealerId,
            balance: new Prisma.Decimal(0),
            totalSales: new Prisma.Decimal(0),
            totalPayments: new Prisma.Decimal(0),
          },
        });
        account = {
          id: created.id,
          balance: created.balance,
          balanceLimit: created.balanceLimit,
        };
      }

      // Check balance limit before creating sale
      if (account.balanceLimit) {
        const currentBalance = Number(account.balance);
        const newBalance = currentBalance + totalAmount;
        const limit = Number(account.balanceLimit);

        if (newBalance > limit && !overrideBalanceLimit) {
          throw new Error(
            `Balance limit exceeded. Current: ${currentBalance}, New: ${newBalance}, Limit: ${limit}. ` +
            `Exceeds by: ${(newBalance - limit).toFixed(2)}`
          );
        }
      }

      // 5. Generate invoice number
      const invoiceNumber = `CINV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // 6. Create the sale (account-based system)
      const sale = await tx.companySale.create({
        data: {
          invoiceNumber,
          date,
          subtotalAmount:
            discountAmount > 0
              ? new Prisma.Decimal(subtotal)
              : undefined,
          totalAmount: new Prisma.Decimal(totalAmount),
          isCredit,
          paymentMethod: paymentMethod || "CASH",
          notes,
          companyId,
          dealerId,
          soldById,
          accountId: account.id,
        },
      });

      if (discountAmount > 0 && discountInput) {
        await tx.saleDiscount.create({
          data: {
            type: discountInput.type as PrismaDiscountType,
            value: new Prisma.Decimal(discountInput.value),
            scope: "SALE",
            companySaleId: sale.id,
          },
        });
      }

      // 6b. Create sale items and update stock
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await tx.companySaleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalAmount: new Prisma.Decimal(itemTotals[i]),
            unit: item.unit || null,
          },
        });

        // Update product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              decrement: new Prisma.Decimal(item.quantity),
            },
          },
        });
      }

      // 7. Update CompanyDealerAccount with sale amount
      await tx.companyDealerAccount.update({
        where: { id: account.id },
        data: {
          balance: {
            increment: new Prisma.Decimal(totalAmount),
          },
          totalSales: {
            increment: new Prisma.Decimal(totalAmount),
          },
          lastSaleDate: date,
        },
      });

      // 8. Get current ledger balance for this dealer
      const lastLedgerEntry = await tx.companyLedgerEntry.findFirst({
        where: {
          companyId,
          partyId: dealerId,
          partyType: "DEALER",
        },
        orderBy: { createdAt: "desc" },
      });

      const currentLedgerBalance = lastLedgerEntry
        ? Number(lastLedgerEntry.runningBalance)
        : 0;

      // 9. Create ledger entry for sale (for transaction history)
      const newLedgerBalance = currentLedgerBalance + totalAmount;
      await tx.companyLedgerEntry.create({
        data: {
          type: "SALE",
          entryType: "SALE",
          amount: new Prisma.Decimal(totalAmount),
          runningBalance: new Prisma.Decimal(newLedgerBalance),
          date,
          description: `Sale to ${dealer.name} - Invoice ${invoiceNumber}`,
          companyId,
          companySaleId: sale.id,
          partyId: dealerId,
          partyType: "DEALER",
          transactionId: sale.id,
          transactionType: "SALE",
        },
      });

      // 10. Return sale with all relations
      return await tx.companySale.findUnique({
        where: { id: sale.id },
        include: {
          discount: true,
          items: {
            include: {
              product: true,
            },
          },
          account: true,
          dealer: true,
        },
      });
    });
  }


  /**
   * Get ledger entries with filters
   */
  static async getLedgerEntries(params: {
    companyId: string;
    type?: string;
    partyId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      companyId,
      type,
      partyId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = params;

    const where: any = { companyId };

    if (type) {
      where.type = type;
    }

    if (partyId) {
      where.partyId = partyId;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      prisma.companyLedgerEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          companySale: {
            include: {
              dealer: true,
            },
          },
        },
      }),
      prisma.companyLedgerEntry.count({ where }),
    ]);

    return {
      entries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get company statistics
   */
  static async getStatistics(companyId: string, startDate?: Date, endDate?: Date) {
    const where: any = { companyId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const [sales, totalRevenue, activeConsignments] = await Promise.all([
      prisma.companySale.count({ where }),
      prisma.companySale.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
      prisma.consignmentRequest.count({
        where: {
          fromCompanyId: companyId,
          status: { in: [ConsignmentStatus.CREATED, ConsignmentStatus.ACCEPTED_PENDING_DISPATCH, ConsignmentStatus.DISPATCHED] },
        },
      }),
    ]);

    return {
      totalSales: sales,
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      activeConsignments,
    };
  }

}

