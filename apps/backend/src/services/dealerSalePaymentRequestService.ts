import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import { DealerService } from "./dealerService";

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

      // 2. Validate amount
      const currentDue = Number(sale.dueAmount || 0);
      if (amount <= 0) {
        throw new Error("Payment amount must be greater than zero");
      }

      if (amount > currentDue) {
        throw new Error(
          `Payment amount (${amount}) exceeds due amount (${currentDue})`
        );
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
   * Dealer approves a payment request
   * This will call addSalePayment which now auto-syncs to farmer side
   */
  static async approvePaymentRequest(data: {
    requestId: string;
    dealerId: string;
  }) {
    const { requestId, dealerId } = data;

    // 1. First transaction: validate and update request status
    await prisma.$transaction(async (tx) => {
      // Get the request
      const request = await tx.dealerSalePaymentRequest.findUnique({
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

      // Mark request as approved
      await tx.dealerSalePaymentRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          reviewedAt: new Date(),
        },
      });
    });

    // 2. Fetch the approved request to get payment details
    const request = await prisma.dealerSalePaymentRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new Error("Payment request not found after approval");
    }

    // 3. Process payment using existing addSalePayment service
    // (which now auto-syncs to farmer side for linked sales)
    // We do this OUTSIDE the transaction to avoid timeout
    await DealerService.addSalePayment({
      saleId: request.dealerSaleId,
      amount: Number(request.amount),
      date: request.paymentDate || new Date(),
      description: request.description || `Payment request approved - ${request.requestNumber}`,
      paymentMethod: request.paymentMethod || undefined,
    });

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
