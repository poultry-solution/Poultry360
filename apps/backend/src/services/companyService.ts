import prisma from "../utils/prisma";
import {
  ConsignmentStatus,
  Prisma,
  PaymentRequestStatus,
  PaymentRequestDirection,
  LedgerEntryType,
} from "@prisma/client";
import { CompanyDealerAccountService } from "./companyDealerAccountService";

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
    }>;
    paymentMethod?: string;
    notes?: string;
    date: Date;
  }) {
    const {
      companyId,
      dealerId,
      soldById,
      items,
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
      const isCredit = paymentMethod === "CREDIT";

      // 4. Get or create account for company-dealer pair
      let account = await tx.companyDealerAccount.findUnique({
        where: {
          companyId_dealerId: {
            companyId,
            dealerId,
          },
        },
      });

      if (!account) {
        account = await tx.companyDealerAccount.create({
          data: {
            companyId,
            dealerId,
            balance: new Prisma.Decimal(0),
            totalSales: new Prisma.Decimal(0),
            totalPayments: new Prisma.Decimal(0),
          },
        });
      }

      // 5. Generate invoice number
      const invoiceNumber = `CINV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // 6. Create the sale (account-based system)
      const sale = await tx.companySale.create({
        data: {
          invoiceNumber,
          date,
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

  // addSalePayment method removed - use CompanyDealerAccountService.recordPayment instead

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
          status: ConsignmentStatus.CREATED,
          direction: "COMPANY_TO_DEALER",
          totalAmount: new Prisma.Decimal(totalAmount),
          requestedQuantity: new Prisma.Decimal(items.reduce((sum, item) => sum + item.quantity, 0)),
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

      if (consignment.status !== ConsignmentStatus.CREATED) {
        throw new Error(`Cannot approve consignment with status: ${consignment.status}`);
      }

      return await tx.consignmentRequest.update({
        where: { id: consignmentId },
        data: {
          status: ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
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

      if (consignment.status !== ConsignmentStatus.ACCEPTED_PENDING_DISPATCH) {
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

  /**
   * Create a payment request
   */
  static async createPaymentRequest(data: {
    companyId: string;
    dealerId: string;
    requestedById: string;
    amount: number;
    companySaleId?: string;
    description?: string;
    direction: PaymentRequestDirection;
  }) {
    const {
      companyId,
      dealerId,
      requestedById,
      amount,
      companySaleId,
      description,
      direction,
    } = data;

    return await prisma.$transaction(async (tx) => {
      // Generate request number
      const requestNumber = `PR-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase()}`;

      // Create payment request
      const paymentRequest = await tx.paymentRequest.create({
        data: {
          requestNumber,
          amount: new Prisma.Decimal(amount),
          direction,
          status: PaymentRequestStatus.PENDING,
          description,
          companyId,
          dealerId,
          requestedById,
          companySaleId: companySaleId ?? null,
        },
        include: {
          company: true,
          dealer: true,
          companySale: true,
          requestedBy: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      });

      return paymentRequest;
    });
  }

  /**
   * Accept payment request
   * For COMPANY_TO_DEALER: dealer accepts company's payment request
   * For DEALER_TO_COMPANY: company accepts dealer's payment request
   */
  static async acceptPaymentRequest(data: {
    requestId: string;
    dealerId?: string;
    companyId?: string;
    acceptedById: string;
  }) {
    const { requestId, dealerId, companyId, acceptedById } = data;

    return await prisma.$transaction(async (tx) => {
      const where: any = {
        id: requestId,
        status: PaymentRequestStatus.PENDING,
      };

      if (dealerId) {
        where.dealerId = dealerId;
      }
      if (companyId) {
        where.companyId = companyId;
      }

      const request = await tx.paymentRequest.findFirst({
        where,
      });

      if (!request) {
        throw new Error("Payment request not found or already processed");
      }

      const updated = await tx.paymentRequest.update({
        where: { id: requestId },
        data: {
          status: PaymentRequestStatus.ACCEPTED,
          acceptedById,
          acceptedAt: new Date(),
        },
        include: {
          company: true,
          dealer: true,
          companySale: true,
        },
      });

      return updated;
    });
  }

  /**
   * Submit payment proof (dealer submits)
   * For dealer-initiated requests (DEALER_TO_COMPANY), can submit directly from PENDING
   * For company-initiated requests (COMPANY_TO_DEALER), must be ACCEPTED first
   */
  static async submitPaymentProof(data: {
    requestId: string;
    dealerId: string;
    submittedById: string;
    paymentMethod: string;
    paymentReference?: string;
    paymentReceiptUrl?: string;
    paymentDate: Date;
  }) {
    const {
      requestId,
      dealerId,
      submittedById,
      paymentMethod,
      paymentReference,
      paymentReceiptUrl,
      paymentDate,
    } = data;

    return await prisma.$transaction(async (tx) => {
      const request = await tx.paymentRequest.findFirst({
        where: {
          id: requestId,
          dealerId,
        },
      });

      if (!request) {
        throw new Error("Payment request not found");
      }

      // For dealer-initiated requests, can submit directly from PENDING
      // For company-initiated requests, must be ACCEPTED first
      if (request.direction === PaymentRequestDirection.COMPANY_TO_DEALER) {
        if (request.status !== PaymentRequestStatus.ACCEPTED) {
          throw new Error(
            "Payment request must be accepted before submitting proof"
          );
        }
      } else if (request.direction === PaymentRequestDirection.DEALER_TO_COMPANY) {
        if (request.status !== PaymentRequestStatus.PENDING && request.status !== PaymentRequestStatus.ACCEPTED) {
          throw new Error(
            "Payment request must be in PENDING or ACCEPTED status to submit proof"
          );
        }
      }

      const updated = await tx.paymentRequest.update({
        where: { id: requestId },
        data: {
          status: PaymentRequestStatus.PAYMENT_SUBMITTED,
          paymentMethod,
          paymentReference,
          paymentReceiptUrl,
          paymentDate,
          submittedById,
          submittedAt: new Date(),
        },
        include: {
          company: true,
          dealer: true,
          companySale: true,
        },
      });

      return updated;
    });
  }

  /**
   * Cancel payment request
   */
  static async cancelPaymentRequest(data: {
    requestId: string;
    companyId?: string;
    dealerId?: string;
    cancelledById: string;
  }) {
    const { requestId, companyId, dealerId, cancelledById } = data;

    return await prisma.$transaction(async (tx) => {
      const where: any = { id: requestId };
      
      if (companyId) {
        where.companyId = companyId;
      }
      if (dealerId) {
        where.dealerId = dealerId;
      }

      const request = await tx.paymentRequest.findFirst({
        where: {
          ...where,
          status: PaymentRequestStatus.PENDING, // Only allow canceling PENDING requests
        },
      });

      if (!request) {
        throw new Error("Payment request not found or cannot be cancelled");
      }

      const updated = await tx.paymentRequest.update({
        where: { id: requestId },
        data: {
          status: PaymentRequestStatus.CANCELLED,
          reviewedById: cancelledById,
          reviewedAt: new Date(),
          reviewNotes: "Cancelled by user",
        },
        include: {
          company: true,
          dealer: true,
          companySale: true,
        },
      });

      return updated;
    });
  }

  /**
   * Apply payment to multiple sales automatically (oldest first)
   */
  // applyPaymentToSales method removed - using account-based payment system

  /**
   * Verify payment request (company verifies and approves)
   */
  static async verifyPaymentRequest(data: {
    requestId: string;
    companyId: string;
    reviewedById: string;
    isApproved: boolean;
    reviewNotes?: string;
  }) {
    const { requestId, companyId, reviewedById, isApproved, reviewNotes } =
      data;

    return await prisma.$transaction(async (tx) => {
      const request = await tx.paymentRequest.findFirst({
        where: {
          id: requestId,
          companyId,
          status: PaymentRequestStatus.PAYMENT_SUBMITTED,
        },
        include: {
          companySale: true,
        },
      });

      if (!request) {
        throw new Error(
          "Payment request not found or not in PAYMENT_SUBMITTED status"
        );
      }

      if (isApproved) {
        const paymentAmount = Number(request.amount);
        const paymentDate = request.paymentDate || new Date();
        const paymentMethod = request.paymentMethod || "CASH";

        // Get or create account for company-dealer pair
        let account = await tx.companyDealerAccount.findUnique({
          where: {
            companyId_dealerId: {
              companyId,
              dealerId: request.dealerId,
            },
          },
        });

        if (!account) {
          account = await tx.companyDealerAccount.create({
            data: {
              companyId,
              dealerId: request.dealerId,
              balance: new Prisma.Decimal(0),
              totalSales: new Prisma.Decimal(0),
              totalPayments: new Prisma.Decimal(0),
            },
          });
        }

        // Calculate new balance
        const newBalance = Number(account.balance) - paymentAmount;

        // Update account with payment
        await tx.companyDealerAccount.update({
          where: { id: account.id },
          data: {
            balance: new Prisma.Decimal(newBalance),
            totalPayments: {
              increment: paymentAmount,
            },
            lastPaymentDate: paymentDate,
          },
        });

        // Create CompanyDealerPayment record
        await tx.companyDealerPayment.create({
          data: {
            accountId: account.id,
            amount: new Prisma.Decimal(paymentAmount),
            paymentMethod,
            paymentDate,
            notes: `Payment via request ${request.requestNumber}${reviewNotes ? ` - ${reviewNotes}` : ''}`,
            reference: request.requestNumber,
            balanceAfter: new Prisma.Decimal(newBalance),
            recordedById: reviewedById,
          },
        });

        // Create ledger entry for transaction history
        const lastLedgerEntry = await tx.companyLedgerEntry.findFirst({
          where: {
            companyId,
            partyId: request.dealerId,
            partyType: "DEALER",
          },
          orderBy: { createdAt: "desc" },
        });

        const ledgerBalance = lastLedgerEntry
          ? Number(lastLedgerEntry.runningBalance)
          : 0;
        const newLedgerBalance = ledgerBalance - paymentAmount;

        await tx.companyLedgerEntry.create({
          data: {
            companyId,
            companySaleId: request.companySaleId,
            partyId: request.dealerId,
            partyType: "DEALER",
            transactionId: requestId,
            transactionType: "RECEIPT",
            type: LedgerEntryType.PAYMENT_RECEIVED,
            entryType: LedgerEntryType.PAYMENT_RECEIVED,
            amount: new Prisma.Decimal(paymentAmount),
            runningBalance: new Prisma.Decimal(newLedgerBalance),
            date: paymentDate,
            description: `Payment via request ${request.requestNumber}`,
          },
        });

        // Payment is already applied to account above - no per-sale logic needed

        // Update request status
        const updated = await tx.paymentRequest.update({
          where: { id: requestId },
          data: {
            status: PaymentRequestStatus.VERIFIED,
            reviewedById,
            reviewedAt: new Date(),
            reviewNotes,
          },
          include: {
            company: true,
            dealer: true,
            companySale: true,
          },
        });

        return updated;
      } else {
        // Reject payment
        const updated = await tx.paymentRequest.update({
          where: { id: requestId },
          data: {
            status: PaymentRequestStatus.REJECTED,
            reviewedById,
            reviewedAt: new Date(),
            reviewNotes,
          },
          include: {
            company: true,
            dealer: true,
            companySale: true,
          },
        });

        return updated;
      }
    });
  }

  /**
   * Get payment requests with filters
   */
  static async getPaymentRequests(params: {
    companyId?: string;
    dealerId?: string;
    status?: PaymentRequestStatus;
    direction?: PaymentRequestDirection;
    page?: number;
    limit?: number;
  }) {
    const {
      companyId,
      dealerId,
      status,
      direction,
      page = 1,
      limit = 50,
    } = params;

    const where: any = {};

    if (companyId) where.companyId = companyId;
    if (dealerId) where.dealerId = dealerId;
    if (status) where.status = status;
    if (direction) where.direction = direction;

    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      prisma.paymentRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          company: true,
          dealer: true,
          companySale: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
            },
          },
          requestedBy: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          acceptedBy: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          submittedBy: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      }),
      prisma.paymentRequest.count({ where }),
    ]);

    return {
      requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

