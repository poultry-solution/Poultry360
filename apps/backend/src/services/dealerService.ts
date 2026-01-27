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

    // Calculate totals before transaction
    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const dueAmount = totalAmount - paidAmount;
    const isCredit = dueAmount > 0;
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

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

        // 2. Create the sale
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

        // 3. Prepare bulk operations
        const saleItemsData = items.map((item) => ({
          saleId: sale.id,
          productId: item.productId,
          quantity: new Prisma.Decimal(item.quantity),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          totalAmount: new Prisma.Decimal(item.quantity * item.unitPrice),
        }));

        const productTransactionsData = items.map((item) => ({
          type: "SALE" as const,
          quantity: new Prisma.Decimal(item.quantity),
          unitPrice: new Prisma.Decimal(item.unitPrice),
          totalAmount: new Prisma.Decimal(item.quantity * item.unitPrice),
          date,
          description: `Sale - Invoice ${invoiceNumber}`,
          reference: invoiceNumber,
          productId: item.productId,
          dealerSaleId: sale.id,
        }));

        // 4. Execute bulk operations in parallel
        await Promise.all([
          // Create all sale items
          Promise.all(
            saleItemsData.map((data) => tx.dealerSaleItem.create({ data }))
          ),
          // Update all product stocks in parallel
          Promise.all(
            items.map((item) =>
              tx.dealerProduct.update({
                where: { id: item.productId },
                data: {
                  currentStock: {
                    decrement: new Prisma.Decimal(item.quantity),
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

        // 8. Update Customer.balance
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
          select: { balance: true },
        });

        if (customer) {
          const currentCustomerBalance = Number(customer.balance || 0);
          const newCustomerBalance = currentCustomerBalance + dueAmount;

          await tx.customer.update({
            where: { id: customerId },
            data: {
              balance: new Prisma.Decimal(newCustomerBalance),
            },
          });
        }

        // Return sale ID - fetch full details outside transaction
        return sale.id;
      }
    );

    // Fetch complete sale details outside transaction to avoid timeout
    return await prisma.dealerSale.findUnique({
      where: { id: saleId },
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
              reference: sale.invoiceNumber || undefined,
              dealerId: sale.dealerId,
              paymentToPurchaseId: purchaseTxn.id,
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
   * Add general payment without specific sale - auto-allocates to oldest unpaid sales using FIFO
   */
  static async addGeneralPayment(data: {
    customerId: string;
    dealerId: string;
    amount: number;
    date: Date;
    description?: string;
    paymentMethod?: string;
  }) {
    const { customerId, dealerId, amount, date, description, paymentMethod } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Get customer with current balance
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        select: { id: true, name: true, balance: true, farmerId: true },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      // 2. Fetch all unpaid sales for this customer, ordered by date (FIFO)
      const unpaidSales = await tx.dealerSale.findMany({
        where: {
          dealerId,
          customerId,
          dueAmount: { gt: 0 },
        },
        orderBy: { date: "asc" }, // Oldest first (FIFO)
        include: {
          customer: true,
        },
      });

      let remainingPayment = amount;
      const allocations: Array<{ saleId: string; amount: number; invoiceNumber: string | null }> = [];

      // 3. Allocate payment to sales using FIFO
      for (const sale of unpaidSales) {
        if (remainingPayment <= 0) break;

        const saleDue = Number(sale.dueAmount || 0);
        const allocationAmount = Math.min(remainingPayment, saleDue);

        // Create payment record for this sale
        await tx.dealerSalePayment.create({
          data: {
            amount: new Prisma.Decimal(allocationAmount),
            date,
            description: description || `General payment allocation - Invoice ${sale.invoiceNumber}`,
            paymentMethod,
            saleId: sale.id,
          },
        });

        // Update sale amounts
        const newPaidAmount = Number(sale.paidAmount) + allocationAmount;
        const newDueAmount = Number(sale.totalAmount) - newPaidAmount;

        await tx.dealerSale.update({
          where: { id: sale.id },
          data: {
            paidAmount: new Prisma.Decimal(newPaidAmount),
            dueAmount: newDueAmount > 0 ? new Prisma.Decimal(newDueAmount) : null,
          },
        });

        // Track allocation for ledger entry
        allocations.push({
          saleId: sale.id,
          amount: allocationAmount,
          invoiceNumber: sale.invoiceNumber,
        });

        // Sync to farmer side if this is a linked sale
        if (sale.customer?.farmerId) {
          const purchaseTxn = await tx.entityTransaction.findFirst({
            where: {
              dealerId,
              reference: sale.invoiceNumber,
              type: "PURCHASE",
            },
            orderBy: { createdAt: "desc" },
          });

          if (purchaseTxn) {
            await tx.entityTransaction.create({
              data: {
                type: "PAYMENT",
                amount: new Prisma.Decimal(allocationAmount),
                date,
                description: description || `Payment - Invoice ${sale.invoiceNumber}`,
                reference: sale.invoiceNumber || undefined,
                dealerId,
                paymentToPurchaseId: purchaseTxn.id,
              },
            });
          }
        }

        remainingPayment -= allocationAmount;
      }

      // 3b. If there's remaining payment (advance), sync it to EntityTransaction
      if (remainingPayment > 0 && customer.farmerId) {
        await tx.entityTransaction.create({
          data: {
            type: "PAYMENT",
            amount: new Prisma.Decimal(remainingPayment),
            date,
            description: description || `Advance payment - रू ${remainingPayment.toFixed(2)} credit`,
            dealerId,
            reference: "ADVANCE",
          },
        });
      }

      // 4. Update Customer.balance with the full payment
      // Positive balance = customer owes dealer
      // Negative balance = dealer owes customer (advance)
      const currentBalance = Number(customer.balance);
      const newBalance = currentBalance - amount; // Subtract FULL payment amount

      await tx.customer.update({
        where: { id: customerId },
        data: {
          balance: new Prisma.Decimal(newBalance),
        },
      });

      // 5. Get current ledger balance
      const lastLedgerEntry = await tx.dealerLedgerEntry.findFirst({
        where: { dealerId },
        orderBy: { createdAt: "desc" },
      });

      const currentLedgerBalance = lastLedgerEntry ? Number(lastLedgerEntry.balance) : 0;

      // 6. Create ledger entry for the overall payment
      const ledgerBalance = currentLedgerBalance - amount;
      const allocationSummary = allocations.length > 0
        ? `Allocated to ${allocations.length} sale(s)` + 
          (remainingPayment > 0 ? ` + रू ${remainingPayment.toFixed(2)} advance` : "")
        : `Advance payment: रू ${amount.toFixed(2)}`;

      await tx.dealerLedgerEntry.create({
        data: {
          type: "PAYMENT_RECEIVED",
          amount: new Prisma.Decimal(amount),
          balance: new Prisma.Decimal(ledgerBalance),
          date,
          description: description || `General payment from ${customer.name} - ${allocationSummary}`,
          reference: allocations.map(a => a.invoiceNumber).filter(Boolean).join(", ") || undefined,
          dealerId,
          partyId: customerId,
          partyType: "CUSTOMER",
        },
      });

      return {
        success: true,
        totalAmount: amount,
        allocatedToSales: amount - remainingPayment,
        advanceAmount: remainingPayment,
        newCustomerBalance: newBalance,
        allocations,
      };
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

