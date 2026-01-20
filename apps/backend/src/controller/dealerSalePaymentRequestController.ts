import { Request, Response } from "express";
import { DealerSalePaymentRequestService } from "../services/dealerSalePaymentRequestService";
import prisma from "../utils/prisma";

// ==================== DEALER ENDPOINTS ====================

/**
 * Get all payment requests for a dealer
 */
export const getDealerPaymentRequests = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { status, page, limit } = req.query;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const result = await DealerSalePaymentRequestService.getDealerPaymentRequests({
      dealerId: dealer.id,
      status: status as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return res.json({
      success: true,
      data: result.requests,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Get dealer payment requests error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

/**
 * Get single payment request by ID (dealer side)
 */
export const getDealerPaymentRequestById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const request = await DealerSalePaymentRequestService.getPaymentRequestById(id);

    // Verify this request belongs to this dealer
    if (request.dealerId !== dealer.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.json({
      success: true,
      data: request,
    });
  } catch (error: any) {
    console.error("Get dealer payment request error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

/**
 * Approve a payment request (dealer side)
 */
export const approvePaymentRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const result = await DealerSalePaymentRequestService.approvePaymentRequest({
      requestId: id,
      dealerId: dealer.id,
    });

    return res.json({
      success: true,
      data: result,
      message: "Payment request approved successfully",
    });
  } catch (error: any) {
    console.error("Approve payment request error:", error);
    return res.status(400).json({ message: error.message || "Internal server error" });
  }
};

/**
 * Reject a payment request (dealer side)
 */
export const rejectPaymentRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const result = await DealerSalePaymentRequestService.rejectPaymentRequest({
      requestId: id,
      dealerId: dealer.id,
      rejectionReason,
    });

    return res.json({
      success: true,
      data: result,
      message: "Payment request rejected",
    });
  } catch (error: any) {
    console.error("Reject payment request error:", error);
    return res.status(400).json({ message: error.message || "Internal server error" });
  }
};

/**
 * Get payment request statistics (dealer side)
 */
export const getDealerPaymentRequestStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const [pending, approved, rejected, total, pendingAmount] = await Promise.all([
      prisma.dealerSalePaymentRequest.count({
        where: { dealerId: dealer.id, status: "PENDING" },
      }),
      prisma.dealerSalePaymentRequest.count({
        where: { dealerId: dealer.id, status: "APPROVED" },
      }),
      prisma.dealerSalePaymentRequest.count({
        where: { dealerId: dealer.id, status: "REJECTED" },
      }),
      prisma.dealerSalePaymentRequest.count({
        where: { dealerId: dealer.id },
      }),
      prisma.dealerSalePaymentRequest.aggregate({
        _sum: { amount: true },
        where: { dealerId: dealer.id, status: "PENDING" },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        pending,
        approved,
        rejected,
        total,
        pendingAmount: Number(pendingAmount._sum.amount || 0),
      },
    });
  } catch (error: any) {
    console.error("Get dealer payment request statistics error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// ==================== FARMER ENDPOINTS ====================

/**
 * Get all payment requests for a farmer
 */
export const getFarmerPaymentRequests = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const farmerId = req.userId;
    const { status, page, limit } = req.query;

    const result = await DealerSalePaymentRequestService.getFarmerPaymentRequests({
      farmerId: farmerId!,
      status: status as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return res.json({
      success: true,
      data: result.requests,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Get farmer payment requests error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

/**
 * Get single payment request by ID (farmer side)
 */
export const getFarmerPaymentRequestById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const farmerId = req.userId;
    const { id } = req.params;

    const request = await DealerSalePaymentRequestService.getPaymentRequestById(id);

    // Verify this request belongs to this farmer
    if (request.farmerId !== farmerId) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.json({
      success: true,
      data: request,
    });
  } catch (error: any) {
    console.error("Get farmer payment request error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

/**
 * Create a payment request (farmer side)
 */
export const createPaymentRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const farmerId = req.userId;
    const {
      dealerSaleId,
      amount,
      paymentDate,
      paymentReference,
      paymentMethod,
      description,
    } = req.body;

    // Validation
    if (!dealerSaleId || !amount || amount <= 0) {
      return res.status(400).json({
        message: "Dealer sale ID and valid amount are required",
      });
    }

    const result = await DealerSalePaymentRequestService.createPaymentRequest({
      dealerSaleId,
      farmerId: farmerId!,
      amount: Number(amount),
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentReference,
      paymentMethod,
      description,
    });

    return res.status(201).json({
      success: true,
      data: result,
      message: "Payment request created successfully",
    });
  } catch (error: any) {
    console.error("Create payment request error:", error);
    return res.status(400).json({ message: error.message || "Internal server error" });
  }
};

/**
 * Get payment request statistics (farmer side)
 */
export const getFarmerPaymentRequestStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const farmerId = req.userId;

    const [pending, approved, rejected, total, pendingAmount] = await Promise.all([
      prisma.dealerSalePaymentRequest.count({
        where: { farmerId, status: "PENDING" },
      }),
      prisma.dealerSalePaymentRequest.count({
        where: { farmerId, status: "APPROVED" },
      }),
      prisma.dealerSalePaymentRequest.count({
        where: { farmerId, status: "REJECTED" },
      }),
      prisma.dealerSalePaymentRequest.count({
        where: { farmerId },
      }),
      prisma.dealerSalePaymentRequest.aggregate({
        _sum: { amount: true },
        where: { farmerId, status: "PENDING" },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        pending,
        approved,
        rejected,
        total,
        pendingAmount: Number(pendingAmount._sum.amount || 0),
      },
    });
  } catch (error: any) {
    console.error("Get farmer payment request statistics error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};
