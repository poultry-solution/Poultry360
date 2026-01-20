import prisma from "../utils/prisma";
import { ConsignmentStatus, Prisma } from "@prisma/client";

export class DealerService {
  /**
   * Create a dealer sale with inventory updates and ledger entries
   */
  static async createDealerSale(data: {
    dealerId: string;
    customerId: string;
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
      dealerId,
      customerId,
      items,
      paidAmount,
      paymentMethod,
      notes,
      date,
    } = data;

    // Validate that customerId is provided
    if (!customerId) {
      throw new Error("Customer ID is required");
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Validate stock availability for all items
      for (const item of items) {
        const product = await tx.dealerProduct.findUnique({
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

      // 2. Calculate totals
      const totalAmount = items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const dueAmount = totalAmount - paidAmount;
      const isCredit = dueAmount > 0;

      // 3. Generate invoice number
      const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // 4. Create the sale
      const sale = await tx.dealerSale.create({
        data: {
          invoiceNumber,
          date,
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(paidAmount),
          dueAmount: dueAmount > 0 ? new Prisma.Decimal(dueAmount) : null,
          isCredit,
          notes,
          dealerId,
          customerId,
        },
      });

      // 5. Create sale items
      for (const item of items) {
        await tx.dealerSaleItem.create({
          data: {
            saleId: sale.id,
            productId: item.productId,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalAmount: new Prisma.Decimal(item.quantity * item.unitPrice),
          },
        });

        // 6. Update product stock
        await tx.dealerProduct.update({
          where: { id: item.productId },
          data: {
            currentStock: {
              decrement: new Prisma.Decimal(item.quantity),
            },
          },
        });

        // 7. Create product transaction
        await tx.dealerProductTransaction.create({
          data: {
            type: "SALE",
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalAmount: new Prisma.Decimal(item.quantity * item.unitPrice),
            date,
            description: `Sale - Invoice ${invoiceNumber}`,
            reference: invoiceNumber,
            productId: item.productId,
            dealerSaleId: sale.id,
          },
        });
      }

      // 8. Create payment record if paidAmount > 0
      if (paidAmount > 0) {
        await tx.dealerSalePayment.create({
          data: {
            amount: new Prisma.Decimal(paidAmount),
            date,
            description: "Initial payment",
            paymentMethod,
            saleId: sale.id,
          },
        });
      }

      // 9. Get current ledger balance
      const lastLedgerEntry = await tx.dealerLedgerEntry.findFirst({
        where: { dealerId },
        orderBy: { createdAt: "desc" },
      });

      const currentBalance = lastLedgerEntry
        ? Number(lastLedgerEntry.balance)
        : 0;

      // 10. Create ledger entry for sale
      const newBalance = currentBalance + totalAmount;
      await tx.dealerLedgerEntry.create({
        data: {
          type: "SALE",
          amount: new Prisma.Decimal(totalAmount),
          balance: new Prisma.Decimal(newBalance),
          date,
          description: `Sale - Invoice ${invoiceNumber}`,
          reference: invoiceNumber,
          dealerId,
          saleId: sale.id,
          partyId: customerId,
          partyType: "CUSTOMER",
        },
      });

      // 11. Create ledger entry for payment if paidAmount > 0
      if (paidAmount > 0) {
        const balanceAfterPayment = newBalance - paidAmount;
        await tx.dealerLedgerEntry.create({
          data: {
            type: "PAYMENT_RECEIVED",
            amount: new Prisma.Decimal(paidAmount),
            balance: new Prisma.Decimal(balanceAfterPayment),
            date,
            description: `Payment received - Invoice ${invoiceNumber}`,
            reference: invoiceNumber,
            dealerId,
            saleId: sale.id,
            partyId: customerId,
            partyType: "CUSTOMER",
          },
        });
      }

      // 12. Return sale with items
      return await tx.dealerSale.findUnique({
        where: { id: sale.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          payments: true,
          customer: true,
        },
      });
    });
  }

  /**
   * Add payment to an existing sale
   */
  static async addSalePayment(data: {
    saleId: string;
    amount: number;
    date: Date;
    description?: string;
    paymentMethod?: string;
  }) {
    const { saleId, amount, date, description, paymentMethod } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Get the sale
      const sale = await tx.dealerSale.findUnique({
        where: { id: saleId },
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
      await tx.dealerSalePayment.create({
        data: {
          amount: new Prisma.Decimal(amount),
          date,
          description: description || "Payment received",
          paymentMethod,
          saleId,
        },
      });

      // 3. Update sale
      const newPaidAmount = Number(sale.paidAmount) + amount;
      const newDueAmount = Number(sale.totalAmount) - newPaidAmount;

      await tx.dealerSale.update({
        where: { id: saleId },
        data: {
          paidAmount: new Prisma.Decimal(newPaidAmount),
          dueAmount: newDueAmount > 0 ? new Prisma.Decimal(newDueAmount) : null,
        },
      });

      // 4. Get current ledger balance
      const lastLedgerEntry = await tx.dealerLedgerEntry.findFirst({
        where: { dealerId: sale.dealerId },
        orderBy: { createdAt: "desc" },
      });

      const currentBalance = lastLedgerEntry
        ? Number(lastLedgerEntry.balance)
        : 0;

      // 5. Create ledger entry
      const newBalance = currentBalance - amount;
      await tx.dealerLedgerEntry.create({
        data: {
          type: "PAYMENT_RECEIVED",
          amount: new Prisma.Decimal(amount),
          balance: new Prisma.Decimal(newBalance),
          date,
          description: description || `Payment received - Invoice ${sale.invoiceNumber}`,
          reference: sale.invoiceNumber || undefined,
          dealerId: sale.dealerId,
          saleId: sale.id,
          partyId: sale.customerId || sale.farmerId,
          partyType: sale.customerId ? "CUSTOMER" : "FARMER",
        },
      });

      return await tx.dealerSale.findUnique({
        where: { id: saleId },
        include: {
          payments: true,
        },
      });
    });
  }

  /**
   * Process consignment acceptance with partial support
   */
  static async processConsignmentAcceptance(data: {
    consignmentId: string;
    dealerId: string;
    items: Array<{
      itemId: string;
      acceptedQuantity: number;
      isAccepted: boolean;
      rejectionReason?: string;
    }>;
  }) {
    const { consignmentId, dealerId, items } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Get consignment
      const consignment = await tx.consignmentRequest.findUnique({
        where: { id: consignmentId },
        include: {
          items: true,
        },
      });

      if (!consignment) {
        throw new Error("Consignment not found");
      }

      if (consignment.toDealerId !== dealerId) {
        throw new Error("Unauthorized to accept this consignment");
      }

      let totalAcceptedAmount = 0;
      let hasPartialAcceptance = false;
      let hasFullRejection = true;

      // 2. Process each item
      for (const item of items) {
        const consignmentItem = consignment.items.find((ci) => ci.id === item.itemId);

        if (!consignmentItem) {
          throw new Error(`Consignment item ${item.itemId} not found`);
        }

        // Update consignment item
        await tx.consignmentItem.update({
          where: { id: item.itemId },
          data: {
            isAccepted: item.isAccepted,
            acceptedQuantity: item.isAccepted
              ? new Prisma.Decimal(item.acceptedQuantity)
              : null,
            rejectionReason: item.rejectionReason,
          },
        });

        if (item.isAccepted) {
          hasFullRejection = false;
          const acceptedAmount = item.acceptedQuantity * Number(consignmentItem.unitPrice);
          totalAcceptedAmount += acceptedAmount;

          // Check if partial acceptance
          if (item.acceptedQuantity < Number(consignmentItem.quantity)) {
            hasPartialAcceptance = true;
          }

          // 3. Create or update dealer product
          const companyProductId = consignmentItem.companyProductId;
          
          if (companyProductId) {
            // Get company product details
            const companyProduct = await tx.product.findUnique({
              where: { id: companyProductId },
            });

            if (!companyProduct) {
              throw new Error(`Company product ${companyProductId} not found`);
            }

            // Check if dealer already has this product
            let dealerProduct = await tx.dealerProduct.findFirst({
              where: {
                dealerId,
                companyProductId,
              },
            });

            if (dealerProduct) {
              // Update existing product
              await tx.dealerProduct.update({
                where: { id: dealerProduct.id },
                data: {
                  currentStock: {
                    increment: new Prisma.Decimal(item.acceptedQuantity),
                  },
                },
              });
            } else {
              // Create new product
              dealerProduct = await tx.dealerProduct.create({
                data: {
                  name: companyProduct.name,
                  description: companyProduct.description,
                  type: companyProduct.type,
                  unit: companyProduct.unit,
                  costPrice: consignmentItem.unitPrice,
                  sellingPrice: consignmentItem.unitPrice, // Can be adjusted later
                  currentStock: new Prisma.Decimal(item.acceptedQuantity),
                  dealerId,
                  companyProductId,
                },
              });
            }

            // 4. Create product transaction
            await tx.dealerProductTransaction.create({
              data: {
                type: "PURCHASE",
                quantity: new Prisma.Decimal(item.acceptedQuantity),
                unitPrice: consignmentItem.unitPrice,
                totalAmount: new Prisma.Decimal(acceptedAmount),
                date: new Date(),
                description: `Consignment ${consignment.requestNumber}`,
                reference: consignment.requestNumber,
                productId: dealerProduct.id,
              },
            });
          }
        }
      }

      // 5. Update consignment status
      let newStatus;
      if (hasFullRejection) {
        newStatus = "REJECTED";
      } else if (hasPartialAcceptance) {
        newStatus = "PARTIALLY_ACCEPTED";
      } else {
        newStatus = "COMPLETED";
      }

      await tx.consignmentRequest.update({
        where: { id: consignmentId },
        data: { status: newStatus as ConsignmentStatus },
      });

      // 6. Create ledger entry if any items were accepted
      if (totalAcceptedAmount > 0) {
        const lastLedgerEntry = await tx.dealerLedgerEntry.findFirst({
          where: { dealerId },
          orderBy: { createdAt: "desc" },
        });

        const currentBalance = lastLedgerEntry
          ? Number(lastLedgerEntry.balance)
          : 0;
        const newBalance = currentBalance + totalAcceptedAmount;

        await tx.dealerLedgerEntry.create({
          data: {
            type: "PURCHASE",
            amount: new Prisma.Decimal(totalAcceptedAmount),
            balance: new Prisma.Decimal(newBalance),
            date: new Date(),
            description: `Consignment ${consignment.requestNumber}`,
            reference: consignment.requestNumber,
            dealerId,
            consignmentId: consignment.id,
            partyId: consignment.fromCompanyId || undefined,
            partyType: "COMPANY",
          },
        });
      }

      return await tx.consignmentRequest.findUnique({
        where: { id: consignmentId },
        include: {
          items: {
            include: {
              companyProduct: true,
              dealerProduct: true,
            },
          },
        },
      });
    });
  }

  /**
   * Calculate dealer balance
   */
  static async calculateBalance(dealerId: string): Promise<number> {
    const lastEntry = await prisma.dealerLedgerEntry.findFirst({
      where: { dealerId },
      orderBy: { createdAt: "desc" },
    });

    return lastEntry ? Number(lastEntry.balance) : 0;
  }

  /**
   * Get ledger entries with filters
   */
  static async getLedgerEntries(params: {
    dealerId: string;
    type?: string;
    partyId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      dealerId,
      type,
      partyId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = params;

    const where: any = { dealerId };

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
      prisma.dealerLedgerEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: "desc" },
        include: {
          sale: {
            include: {
              customer: true,
              farmer: true,
            },
          },
          consignment: true,
        },
      }),
      prisma.dealerLedgerEntry.count({ where }),
    ]);

    return {
      entries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

