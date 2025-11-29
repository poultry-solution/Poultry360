import prisma from "../utils/prisma";
import { ConsignmentStatus, Prisma } from "@prisma/client";

export class CompanyService {
  /**
   * Create a company sale with inventory updates and ledger entries
   */
  static async createCompanySale(data: {
    companyId: string;
    dealerId: string;
    soldById: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
    paidAmount: number;
    paymentMethod?: string;
    notes?: string;
    date: Date;
  }) {
    const {
      companyId,
      dealerId,
      soldById,
      items,
      paidAmount,
      paymentMethod,
      notes,
      date,
    } = data;

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

      // 3. Calculate totals
      const totalAmount = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const dueAmount = totalAmount - paidAmount;
      const isCredit = dueAmount > 0;

      // 4. Generate invoice number
      const invoiceNumber = `CINV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // 5. Create the sale
      const sale = await tx.companySale.create({
        data: {
          invoiceNumber,
          date,
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(paidAmount),
          dueAmount: dueAmount > 0 ? new Prisma.Decimal(dueAmount) : null,
          isCredit,
          paymentMethod: paymentMethod || "CASH",
          notes,
          companyId,
          dealerId,
          soldById,
        },
      });

      // 6. Create sale items and update stock
      for (const item of items) {
        await tx.companySaleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalAmount: new Prisma.Decimal(item.quantity * item.unitPrice),
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

      // 7. Create payment record if paidAmount > 0
      if (paidAmount > 0) {
        await tx.companySalePayment.create({
          data: {
            companySaleId: sale.id,
            amount: new Prisma.Decimal(paidAmount),
            method: paymentMethod || "CASH",
            paymentDate: date,
          },
        });
      }

      // 8. Get current ledger balance for this dealer
      const lastLedgerEntry = await tx.companyLedgerEntry.findFirst({
        where: {
          companyId,
          partyId: dealerId,
          partyType: "DEALER",
        },
        orderBy: { createdAt: "desc" },
      });

      const currentBalance = lastLedgerEntry
        ? Number(lastLedgerEntry.runningBalance)
        : 0;

      // 9. Create ledger entry for sale (increases dealer's debt to company)
      const newBalance = currentBalance + dueAmount;
      await tx.companyLedgerEntry.create({
        data: {
          type: "SALE",
          entryType: "SALE",
          amount: new Prisma.Decimal(totalAmount),
          runningBalance: new Prisma.Decimal(newBalance),
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

      // 10. Create ledger entry for payment if paidAmount > 0
      if (paidAmount > 0) {
        const balanceAfterPayment = newBalance - paidAmount;
        await tx.companyLedgerEntry.create({
          data: {
            type: "PAYMENT_RECEIVED",
            entryType: "PAYMENT_RECEIVED",
            amount: new Prisma.Decimal(paidAmount),
            runningBalance: new Prisma.Decimal(balanceAfterPayment),
            date,
            description: `Payment received from ${dealer.name} - Invoice ${invoiceNumber}`,
            companyId,
            companySaleId: sale.id,
            partyId: dealerId,
            partyType: "DEALER",
            transactionId: sale.id,
            transactionType: "RECEIPT",
          },
        });
      }

      // 11. Return sale with all relations
      return await tx.companySale.findUnique({
        where: { id: sale.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          payments: true,
          dealer: true,
        },
      });
    });
  }

  /**
   * Add payment to an existing company sale
   */
  static async addSalePayment(data: {
    saleId: string;
    companyId: string;
    amount: number;
    date: Date;
    description?: string;
    paymentMethod?: string;
  }) {
    const { saleId, companyId, amount, date, description, paymentMethod } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Get the sale
      const sale = await tx.companySale.findFirst({
        where: {
          id: saleId,
          companyId,
        },
        include: {
          dealer: true,
        },
      });

      if (!sale) {
        throw new Error("Sale not found");
      }

      const currentDue = Number(sale.dueAmount || 0);

      if (amount > currentDue) {
        throw new Error(
          `Payment amount (${amount}) exceeds due amount (${currentDue})`
        );
      }

      // 2. Create payment record
      await tx.companySalePayment.create({
        data: {
          companySaleId: saleId,
          amount: new Prisma.Decimal(amount),
          method: paymentMethod || "CASH",
          paymentDate: date,
          notes: description,
        },
      });

      // 3. Update sale
      const newPaidAmount = Number(sale.paidAmount) + amount;
      const newDueAmount = Number(sale.totalAmount) - newPaidAmount;

      await tx.companySale.update({
        where: { id: saleId },
        data: {
          paidAmount: new Prisma.Decimal(newPaidAmount),
          dueAmount: newDueAmount > 0 ? new Prisma.Decimal(newDueAmount) : null,
        },
      });

      // 4. Get current ledger balance
      const lastLedgerEntry = await tx.companyLedgerEntry.findFirst({
        where: {
          companyId,
          partyId: sale.dealerId,
          partyType: "DEALER",
        },
        orderBy: { createdAt: "desc" },
      });

      const currentBalance = lastLedgerEntry
        ? Number(lastLedgerEntry.runningBalance)
        : 0;

      // 5. Create ledger entry for payment
      const newBalance = currentBalance - amount;
      await tx.companyLedgerEntry.create({
        data: {
          type: "PAYMENT_RECEIVED",
          entryType: "PAYMENT_RECEIVED",
          amount: new Prisma.Decimal(amount),
          runningBalance: new Prisma.Decimal(newBalance),
          date,
          description: description || `Payment received from ${sale.dealer.name} - Invoice ${sale.invoiceNumber}`,
          companyId,
          companySaleId: sale.id,
          partyId: sale.dealerId,
          partyType: "DEALER",
          transactionId: saleId,
          transactionType: "RECEIPT",
        },
      });

      return await tx.companySale.findUnique({
        where: { id: saleId },
        include: {
          payments: true,
        },
      });
    });
  }

  /**
   * Create consignment request from company to dealer
   */
  static async createConsignmentRequest(data: {
    companyId: string;
    dealerId: string;
    items: Array<{
      productId: string;
      quantity: number;
      unitPrice: number;
    }>;
    notes?: string;
  }) {
    const { companyId, dealerId, items, notes } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Validate products
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

      // 2. Calculate total amount
      const totalAmount = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );

      // 3. Generate request number
      const requestNumber = `CONS-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // 4. Create consignment request
      const consignment = await tx.consignmentRequest.create({
        data: {
          requestNumber,
          status: "PENDING",
          direction: "COMPANY_TO_DEALER",
          totalAmount: new Prisma.Decimal(totalAmount),
          notes,
          fromCompanyId: companyId,
          toDealerId: dealerId,
        },
      });

      // 5. Create consignment items
      for (const item of items) {
        await tx.consignmentItem.create({
          data: {
            consignmentId: consignment.id,
            companyProductId: item.productId,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalAmount: new Prisma.Decimal(item.quantity * item.unitPrice),
          },
        });
      }

      return await tx.consignmentRequest.findUnique({
        where: { id: consignment.id },
        include: {
          items: {
            include: {
              companyProduct: true,
            },
          },
          fromCompany: true,
          toDealer: true,
        },
      });
    });
  }

  /**
   * Approve consignment request (company approves dealer's request)
   */
  static async approveConsignmentRequest(data: {
    consignmentId: string;
    companyId: string;
  }) {
    const { consignmentId, companyId } = data;

    return await prisma.$transaction(async (tx) => {
      const consignment = await tx.consignmentRequest.findFirst({
        where: {
          id: consignmentId,
          fromCompanyId: companyId,
        },
      });

      if (!consignment) {
        throw new Error("Consignment not found");
      }

      if (consignment.status !== "PENDING") {
        throw new Error(`Cannot approve consignment with status: ${consignment.status}`);
      }

      return await tx.consignmentRequest.update({
        where: { id: consignmentId },
        data: {
          status: "APPROVED",
        },
        include: {
          items: {
            include: {
              companyProduct: true,
            },
          },
          fromCompany: true,
          toDealer: true,
        },
      });
    });
  }

  /**
   * Dispatch consignment (company sends goods)
   */
  static async dispatchConsignment(data: {
    consignmentId: string;
    companyId: string;
    notes?: string;
  }) {
    const { consignmentId, companyId, notes } = data;

    return await prisma.$transaction(async (tx) => {
      const consignment = await tx.consignmentRequest.findFirst({
        where: {
          id: consignmentId,
          fromCompanyId: companyId,
        },
        include: {
          items: true,
        },
      });

      if (!consignment) {
        throw new Error("Consignment not found");
      }

      if (consignment.status !== "APPROVED") {
        throw new Error(`Cannot dispatch consignment with status: ${consignment.status}`);
      }

      // Update product stock for dispatched items
      for (const item of consignment.items) {
        if (item.companyProductId) {
          await tx.product.update({
            where: { id: item.companyProductId },
            data: {
              currentStock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      return await tx.consignmentRequest.update({
        where: { id: consignmentId },
        data: {
          status: "DISPATCHED",
          notes: notes ? `${consignment.notes || ''}\nDispatch notes: ${notes}` : consignment.notes,
        },
        include: {
          items: {
            include: {
              companyProduct: true,
            },
          },
          fromCompany: true,
          toDealer: true,
        },
      });
    });
  }

  /**
   * Calculate company balance with a specific dealer
   */
  static async calculateDealerBalance(companyId: string, dealerId: string): Promise<number> {
    const lastEntry = await prisma.companyLedgerEntry.findFirst({
      where: {
        companyId,
        partyId: dealerId,
        partyType: "DEALER",
      },
      orderBy: { createdAt: "desc" },
    });

    return lastEntry ? Number(lastEntry.runningBalance) : 0;
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

    const [sales, totalRevenue, totalDue, activeConsignments] = await Promise.all([
      prisma.companySale.count({ where }),
      prisma.companySale.aggregate({
        where,
        _sum: { totalAmount: true },
      }),
      prisma.companySale.aggregate({
        where: {
          ...where,
          dueAmount: { gt: 0 },
        },
        _sum: { dueAmount: true },
      }),
      prisma.consignmentRequest.count({
        where: {
          fromCompanyId: companyId,
          status: { in: ["PENDING", "APPROVED", "DISPATCHED"] },
        },
      }),
    ]);

    return {
      totalSales: sales,
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      totalDue: Number(totalDue._sum.dueAmount || 0),
      activeConsignments,
    };
  }
}

