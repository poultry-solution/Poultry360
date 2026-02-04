import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import { DealerFarmerAccountService } from "./dealerFarmerAccountService";

export class DealerSalePaymentRequestService {
  /**
   * Farmer creates a payment request for a linked sale
   */
  static async createPaymentRequest(data: {
    dealerSaleId: string;
    farmerId: string;
    amount: number;
    paymentDate: Date;
    paymentReference?: string;
    paymentMethod?: string;
    description?: string;
  }) {
    const {
      dealerSaleId,
      farmerId,
      amount,
      paymentDate,
      paymentReference,
      paymentMethod,
      description,
    } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Validate the sale exists and is linked to this farmer
      const sale = await tx.dealerSale.findUnique({
        where: { id: dealerSaleId },
        include: {
          customer: true,
          dealer: true,
        },
      });

      if (!sale) {
        throw new Error("Sale not found");
      }

      if (!sale.customer?.farmerId || sale.customer.farmerId !== farmerId) {
        throw new Error(
          "This sale is not linked to you or does not exist"
        );
      }

      // 2. Validate amount (no cap on sale.dueAmount — account-linked sales use
      // dealer-farmer account balance; amounts above balance allow advances)
      if (amount <= 0) {
        throw new Error("Payment amount must be greater than zero");
      }

      // 3. Generate request number
      const requestNumber = `PR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // 4. Create payment request
      const paymentRequest = await tx.dealerSalePaymentRequest.create({
        data: {
          requestNumber,
          amount: new Prisma.Decimal(amount),
          description,
          paymentMethod,
          paymentReference,
          paymentDate,
          dealerSaleId,
          dealerId: sale.dealerId,
          farmerId,
          customerId: sale.customerId!,
          status: "PENDING",
        },
        include: {
          dealerSale: true,
          dealer: true,
          farmer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          customer: {
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
   * Farmer creates a ledger-level payment request (not tied to specific sale)
   */
  static async createLedgerLevelPaymentRequest(data: {
    dealerId: string;
    farmerId: string;
    customerId: string;
    amount: number;
    paymentDate: Date;
    paymentReference?: string;
    paymentMethod?: string;
    description?: string;
  }) {
    const {
      dealerId,
      farmerId,
      customerId,
      amount,
      paymentDate,
      paymentReference,
      paymentMethod,
      description,
    } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Validate dealer-farmer connection exists
      const dealerFarmerConnection = await tx.dealerFarmer.findFirst({
        where: {
          dealerId,
          farmerId,
          archivedByFarmer: false,
          archivedByDealer: false,
        },
      });

      if (!dealerFarmerConnection) {
        throw new Error(
          "No active connection found between you and this dealer"
        );
      }

      // 2. Validate customer belongs to this dealer
      const dealer = await tx.dealer.findUnique({
        where: { id: dealerId },
      });

      if (!dealer || !dealer.ownerId) {
        throw new Error("Invalid dealer or dealer not registered");
      }

      const customer = await tx.customer.findUnique({
        where: { id: customerId },
      });

      if (!customer || customer.userId !== dealer.ownerId || customer.farmerId !== farmerId) {
        throw new Error("Invalid customer record or customer not linked to this dealer-farmer pair");
      }

      // 3. Validate amount
      if (amount <= 0) {
        throw new Error("Payment amount must be greater than zero");
      }

      // 4. Generate request number
      const requestNumber = `LPR-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      // 5. Create ledger-level payment request
      const paymentRequest = await tx.dealerSalePaymentRequest.create({
        data: {
          requestNumber,
          amount: new Prisma.Decimal(amount),
          description: description || "General payment",
          paymentMethod,
          paymentReference,
          paymentDate,
          dealerId,
          farmerId,
          customerId,
          status: "PENDING",
          isLedgerLevel: true,
          dealerSaleId: null, // No specific sale
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
            },
          },
          customer: {
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
   * Dealer approves a payment request.
   * Always records the payment via DealerFarmerAccountService.recordPayment (no FIFO or bill-wise allocation).
   */
  static async approvePaymentRequest(data: {
    requestId: string;
    dealerId: string;
    recordedById: string;
  }) {
    const { requestId, dealerId, recordedById } = data;

    // 1. Validate and fetch the request (no transaction yet)
    const request = await prisma.dealerSalePaymentRequest.findUnique({
      where: { id: requestId },
      include: {
        dealerSale: true,
      },
    });

    if (!request) {
      throw new Error("Payment request not found");
    }

    // Verify this request belongs to the dealer
    if (request.dealerId !== dealerId) {
      throw new Error("You can only approve requests sent to you");
    }

    // Check if already processed
    if (request.status !== "PENDING") {
      throw new Error(
        `Request is already ${request.status.toLowerCase()}`
      );
    }

    // 2. Mark request as approved
    await prisma.dealerSalePaymentRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
      },
    });

    // 3. Record payment on dealer-farmer account (account-only; no sale allocation).
    try {
      await DealerFarmerAccountService.recordPayment({
        dealerId,
        farmerId: request.farmerId,
        amount: Number(request.amount),
        paymentMethod: request.paymentMethod || undefined,
        paymentDate: request.paymentDate || new Date(),
        notes: request.description || `Payment request approved - ${request.requestNumber}`,
        reference: request.requestNumber,
        recordedById,
      });
    } catch (error) {
      // If payment processing fails, revert the approval status
      await prisma.dealerSalePaymentRequest.update({
        where: { id: requestId },
        data: {
          status: "PENDING",
          reviewedAt: null,
        },
      });
      throw error;
    }

    // 4. Return the updated request with all details
    return await prisma.dealerSalePaymentRequest.findUnique({
      where: { id: requestId },
      include: {
        dealerSale: {
          include: {
            payments: true,
          },
        },
        dealer: true,
        farmer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });
  }

  /**
   * Dealer rejects a payment request
   */
  static async rejectPaymentRequest(data: {
    requestId: string;
    dealerId: string;
    rejectionReason: string;
  }) {
    const { requestId, dealerId, rejectionReason } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. Get the request
      const request = await tx.dealerSalePaymentRequest.findUnique({
        where: { id: requestId },
      });

      if (!request) {
        throw new Error("Payment request not found");
      }

      // 2. Verify this request belongs to the dealer
      if (request.dealerId !== dealerId) {
        throw new Error("You can only reject requests sent to you");
      }

      // 3. Check if already processed
      if (request.status !== "PENDING") {
        throw new Error(
          `Request is already ${request.status.toLowerCase()}`
        );
      }

      // 4. Mark request as rejected
      const updatedRequest = await tx.dealerSalePaymentRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          reviewedAt: new Date(),
          rejectionReason,
        },
        include: {
          dealerSale: true,
          dealer: true,
          farmer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      });

      return updatedRequest;
    });
  }

  /**
   * Get payment requests for a dealer
   */
  static async getDealerPaymentRequests(data: {
    dealerId: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { dealerId, status, page = 1, limit = 50 } = data;
    const skip = (page - 1) * limit;

    const where: any = { dealerId };
    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      prisma.dealerSalePaymentRequest.findMany({
        where,
        include: {
          dealerSale: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              paidAmount: true,
              dueAmount: true,
              date: true,
            },
          },
          farmer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.dealerSalePaymentRequest.count({ where }),
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get payment requests for a farmer
   */
  static async getFarmerPaymentRequests(data: {
    farmerId: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { farmerId, status, page = 1, limit = 50 } = data;
    const skip = (page - 1) * limit;

    const where: any = { farmerId };
    if (status) {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      prisma.dealerSalePaymentRequest.findMany({
        where,
        include: {
          dealerSale: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
              paidAmount: true,
              dueAmount: true,
              date: true,
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
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.dealerSalePaymentRequest.count({ where }),
    ]);

    return {
      requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single payment request by ID
   */
  static async getPaymentRequestById(requestId: string) {
    const request = await prisma.dealerSalePaymentRequest.findUnique({
      where: { id: requestId },
      include: {
        dealerSale: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
            payments: true,
          },
        },
        dealer: true,
        farmer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!request) {
      throw new Error("Payment request not found");
    }

    return request;
  }
}
