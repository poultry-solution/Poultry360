import prisma from "../utils/prisma";
import { ConsignmentStatus, DiscountType as PrismaDiscountType, Prisma } from "@prisma/client";
import {
  computeDiscountAmount,
  distributeDiscountToItems,
  type DiscountType,
} from "../utils/discountHelpers";
import { generateNextInvoiceNumber } from "../utils/invoiceNumber";

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
      unit?: string;
    }>;
    paidAmount: number;
    paymentMethod?: string;
    notes?: string;
    date: Date;
    discount?: { type: DiscountType; value: number };
    invoiceNumber?: string;
  }) {
    const {
      dealerId,
      customerId,
      items,
      paidAmount,
      paymentMethod,
      notes,
      date,
      discount: discountInput,
      invoiceNumber: customInvoiceNumber,
    } = data;

    // Validate that customerId is provided
    if (!customerId) {
      throw new Error("Customer ID is required");
    }

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
    const dueAmount = totalAmount - paidAmount;
    const isCredit = dueAmount > 0;

    const itemTotals =
      discountAmount > 0
        ? distributeDiscountToItems(subtotal, discountAmount, items)
        : items.map((item) => item.quantity * item.unitPrice);

    // Use a single, optimized transaction for all side effects
    const saleId = await prisma.$transaction(async (tx) => {
      // 1. Validate stock availability for all items in parallel
      const productChecks = await Promise.all(
        items.map((item) =>
          tx.dealerProduct.findUnique({
            where: { id: item.productId },
          })
        )
      );

      for (let i = 0; i < items.length; i++) {
        const product = productChecks[i];
        if (!product) {
          throw new Error(`Product ${items[i].productId} not found`);
        }
        if (Number(product.currentStock) < items[i].quantity) {
          throw new Error(
            `Insufficient stock for product ${product.name}. Available: ${product.currentStock}, Requested: ${items[i].quantity}`
          );
        }
      }

      // 2. Generate invoice number (custom or auto-sequential)
      const invoiceNumber = customInvoiceNumber?.trim() || await generateNextInvoiceNumber(dealerId, tx);

      // 3. Create the sale
      const sale = await tx.dealerSale.create({
        data: {
          invoiceNumber,
          date,
          subtotalAmount:
            discountAmount > 0
              ? new Prisma.Decimal(subtotal)
              : undefined,
          totalAmount: new Prisma.Decimal(totalAmount),
          paidAmount: new Prisma.Decimal(paidAmount),
          dueAmount: dueAmount > 0 ? new Prisma.Decimal(dueAmount) : null,
          isCredit,
          notes,
          dealerId,
          customerId,
        },
      });

      if (discountAmount > 0 && discountInput) {
        await tx.saleDiscount.create({
          data: {
            type: discountInput.type as PrismaDiscountType,
            value: new Prisma.Decimal(discountInput.value),
            scope: "SALE",
            dealerSaleId: sale.id,
          },
        });
      }

      // 3. Prepare bulk operations — compute baseQuantity for unit conversions
      const saleItemsData = await Promise.all(items.map(async (item, i) => {
        let baseQuantity: number | null = null;
        const product = productChecks[i]!;
        if (item.unit && item.unit !== product.unit) {
          const conversions = await tx.dealerProductUnitConversion.findMany({ where: { dealerProductId: item.productId } });
          const companyConversions = product.companyProductId
            ? await tx.productUnitConversion.findMany({ where: { productId: product.companyProductId } })
            : [];
          const allConversions = [...conversions, ...companyConversions];
          const conv = allConversions.find(c => c.unitName === item.unit);
          if (conv) {
            baseQuantity = item.quantity * Number(conv.conversionFactor);
          }
        }
        return {
          saleId: sale.id,
          productId: item.productId,
          quantity: new Prisma.Decimal(item.quantity),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          totalAmount: new Prisma.Decimal(itemTotals[i]),
          unit: item.unit || null,
          baseQuantity: baseQuantity !== null ? new Prisma.Decimal(baseQuantity) : null,
        };
      }));

      const productTransactionsData = items.map((item, i) => ({
        type: "SALE" as const,
        quantity: new Prisma.Decimal(item.quantity),
        unitPrice: new Prisma.Decimal(item.unitPrice),
        totalAmount: new Prisma.Decimal(itemTotals[i]),
        date,
        description: `Sale - Invoice ${invoiceNumber}`,
        reference: invoiceNumber,
        productId: item.productId,
        dealerSaleId: sale.id,
        unit: item.unit || null,
      }));

      // 4. Execute bulk operations in parallel
      await Promise.all([
        // Create all sale items
        Promise.all(
          saleItemsData.map((data) => tx.dealerSaleItem.create({ data }))
        ),
        // Update all product stocks — use baseQuantity (in base unit) when available
        Promise.all(
          saleItemsData.map((saleItem, i) =>
            tx.dealerProduct.update({
              where: { id: items[i].productId },
              data: {
                currentStock: {
                  decrement: saleItem.baseQuantity ?? new Prisma.Decimal(items[i].quantity),
                },
              },
            })
          )
        ),
        // Create all product transactions
        Promise.all(
          productTransactionsData.map((data) =>
            tx.dealerProductTransaction.create({ data })
          )
        ),
      ]);

      // 5. Create payment record if paidAmount > 0
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

      // 6. Get current ledger balance (single query)
      const lastLedgerEntry = await tx.dealerLedgerEntry.findFirst({
        where: { dealerId },
        orderBy: { createdAt: "desc" },
      });

      const currentBalance = lastLedgerEntry
        ? Number(lastLedgerEntry.balance)
        : 0;

      // 7. Create ledger entries
      const newBalance = currentBalance + totalAmount;
      const ledgerEntries = [
        tx.dealerLedgerEntry.create({
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
        }),
      ];

      if (paidAmount > 0) {
        const balanceAfterPayment = newBalance - paidAmount;
        ledgerEntries.push(
          tx.dealerLedgerEntry.create({
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
          })
        );
      }

      await Promise.all(ledgerEntries);

      // 8. Update Customer balance and account totals
      await tx.customer.update({
        where: { id: customerId },
        data: {
          balance: { increment: new Prisma.Decimal(dueAmount) },
          totalSales: { increment: new Prisma.Decimal(totalAmount) },
          ...(paidAmount > 0
            ? { totalPayments: { increment: new Prisma.Decimal(paidAmount) } }
            : {}),
        },
      });

      // Return sale ID - fetch full details outside transaction
      return sale.id;
    }
    );

    // Fetch complete sale details outside transaction to avoid timeout
    return await prisma.dealerSale.findUnique({
      where: { id: saleId },
      include: {
        discount: true,
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
        customer: true,
      },
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
    receiptUrl?: string;
    reference?: string;
  }) {
    const { saleId, amount, date, description, paymentMethod, receiptUrl, reference } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Get the sale with customer relation to check if linked
      const sale = await tx.dealerSale.findUnique({
        where: { id: saleId },
        include: {
          customer: true,
        },
      });

      if (!sale) {
        throw new Error("Sale not found");
      }

      // Block bill-level payments for manual customers — use account-level payment instead
      if (sale.customerId && !sale.customer?.farmerId) {
        throw new Error(
          "Manual customer payments are now account-based. Use the account payment flow instead."
        );
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
          reference: reference || sale.invoiceNumber || undefined,
          dealerId: sale.dealerId,
          saleId: sale.id,
          partyId: sale.customerId || sale.farmerId,
          partyType: sale.customerId ? "CUSTOMER" : "FARMER",
          imageUrl: receiptUrl,
        },
      });

      // 6. Sync payment to farmer side if this is a linked sale
      if (sale.customer?.farmerId) {
        // This is a linked sale - find the farmer's purchase transaction
        const purchaseTxn = await tx.entityTransaction.findFirst({
          where: {
            dealerId: sale.dealerId,
            reference: sale.invoiceNumber,
            type: "PURCHASE",
          },
          orderBy: { createdAt: "desc" },
        });

        if (purchaseTxn) {
          // Create PAYMENT EntityTransaction for farmer
          await tx.entityTransaction.create({
            data: {
              type: "PAYMENT",
              amount: new Prisma.Decimal(amount),
              date,
              description: description || `Payment - Invoice ${sale.invoiceNumber}`,
              reference: reference || sale.invoiceNumber || undefined,
              dealerId: sale.dealerId,
              paymentToPurchaseId: purchaseTxn.id,
              imageUrl: receiptUrl,
            },
          });
        }
      }

      // 7. Update Customer.balance to reflect the payment
      if (sale.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: sale.customerId },
          select: { balance: true },
        });

        if (customer) {
          const currentCustomerBalance = Number(customer.balance || 0);
          // Subtract payment from customer balance
          const newCustomerBalance = currentCustomerBalance - amount;

          await tx.customer.update({
            where: { id: sale.customerId },
            data: {
              balance: new Prisma.Decimal(newCustomerBalance),
            },
          });
        }
      }

      return await tx.dealerSale.findUnique({
        where: { id: saleId },
        include: {
          payments: true,
        },
      });
    });
  }

  /**
   * Account-level payment for manual customers (replaces FIFO addGeneralPayment).
   * Payments go against the customer account balance, not individual bills.
   */
  static async addAccountPayment(data: {
    customerId: string;
    dealerId: string;
    amount: number;
    date: Date;
    description?: string;
    paymentMethod?: string;
    receiptUrl?: string;
    reference?: string;
  }) {
    const { customerId, dealerId, amount, date, description, paymentMethod, receiptUrl, reference } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Get customer
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        select: { id: true, name: true, balance: true },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      // 2. Update customer balance and totalPayments (account-level)
      const newBalance = Number(customer.balance) - amount;
      await tx.customer.update({
        where: { id: customerId },
        data: {
          balance: new Prisma.Decimal(newBalance),
          totalPayments: { increment: new Prisma.Decimal(amount) },
        },
      });

      // 3. Get current ledger balance
      const lastLedgerEntry = await tx.dealerLedgerEntry.findFirst({
        where: { dealerId },
        orderBy: { createdAt: "desc" },
      });
      const currentLedgerBalance = lastLedgerEntry ? Number(lastLedgerEntry.balance) : 0;
      const newLedgerBalance = currentLedgerBalance - amount;

      // 4. Create ledger entry (no saleId — account-level payment)
      await tx.dealerLedgerEntry.create({
        data: {
          type: "PAYMENT_RECEIVED",
          amount: new Prisma.Decimal(amount),
          balance: new Prisma.Decimal(newLedgerBalance),
          date,
          description: description || `Payment from ${customer.name}`,
          reference: reference || undefined,
          dealerId,
          partyId: customerId,
          partyType: "CUSTOMER",
          imageUrl: receiptUrl,
        },
      });

      return {
        success: true,
        totalAmount: amount,
        newCustomerBalance: newBalance,
      };
    });
  }

  /**
   * Delete a manual customer sale: revert stock, balance, ledger, and remove sale records.
   */
  static async deleteDealerSale(data: {
    saleId: string;
    dealerId: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch sale with items and customer
      const sale = await tx.dealerSale.findUnique({
        where: { id: data.saleId },
        include: {
          items: true,
          customer: { select: { id: true, farmerId: true } },
        },
      });

      if (!sale) throw new Error("Sale not found");
      if (sale.dealerId !== data.dealerId) throw new Error("Unauthorized");
      if (sale.customer?.farmerId) throw new Error("Cannot delete connected farmer sales");

      const totalAmount = Number(sale.totalAmount);
      const initialPaidAmount = Number(sale.paidAmount);
      const dueAmount = totalAmount - initialPaidAmount;

      // 2. Revert product stock (increment back)
      for (const item of sale.items) {
        const qty = item.baseQuantity ?? item.quantity;
        await tx.dealerProduct.update({
          where: { id: item.productId },
          data: { currentStock: { increment: qty }, hiddenAt: null },
        });
      }

      // 3. Revert customer balance and totals
      if (sale.customerId) {
        await tx.customer.update({
          where: { id: sale.customerId },
          data: {
            balance: { decrement: new Prisma.Decimal(dueAmount) },
            totalSales: { decrement: new Prisma.Decimal(totalAmount) },
            totalPayments: { decrement: new Prisma.Decimal(initialPaidAmount) },
          },
        });
      }

      // 4. Fix ledger: find sale-related entries, compute net effect, delete, fix running balances
      const saleLedgerEntries = await tx.dealerLedgerEntry.findMany({
        where: { saleId: data.saleId, dealerId: data.dealerId },
        orderBy: { createdAt: "asc" },
      });

      // Net effect: SALE adds to balance, PAYMENT_RECEIVED subtracts
      let netLedgerEffect = 0;
      for (const entry of saleLedgerEntries) {
        if (entry.type === "SALE") netLedgerEffect += Number(entry.amount);
        else if (entry.type === "PAYMENT_RECEIVED") netLedgerEffect -= Number(entry.amount);
      }

      const oldestEntry = saleLedgerEntries[0];

      // Delete the sale-related ledger entries
      await tx.dealerLedgerEntry.deleteMany({
        where: { saleId: data.saleId, dealerId: data.dealerId },
      });

      // Fix running balances for all subsequent ledger entries
      if (oldestEntry) {
        await tx.dealerLedgerEntry.updateMany({
          where: {
            dealerId: data.dealerId,
            OR: [
              { createdAt: { gt: oldestEntry.createdAt } },
              {
                AND: [
                  { createdAt: oldestEntry.createdAt },
                  { id: { gt: oldestEntry.id } },
                ],
              },
            ],
          },
          data: {
            balance: { decrement: new Prisma.Decimal(netLedgerEffect) },
          },
        });
      }

      // 5. Delete product transactions for this sale
      await tx.dealerProductTransaction.deleteMany({
        where: { dealerSaleId: data.saleId },
      });

      // 6. Delete the sale (cascades: DealerSaleItem, DealerSalePayment, SaleDiscount)
      await tx.dealerSale.delete({ where: { id: data.saleId } });

      return { success: true };
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

