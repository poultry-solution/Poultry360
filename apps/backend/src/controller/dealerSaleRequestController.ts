import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { DealerSaleRequestService } from "../services/dealerSaleRequestService";

// ==================== CREATE SALE REQUEST ====================
export const createSaleRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;

    const {
      customerId,
      items,
      paidAmount,
      paymentMethod,
      notes,
      date,
    } = req.body;

    // Validation
    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "At least one item is required",
      });
    }

    if (!customerId) {
      return res.status(400).json({
        message: "Customer ID is required",
      });
    }

    if (paidAmount < 0) {
      return res.status(400).json({
        message: "Paid amount cannot be negative",
      });
    }

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Get customer to verify it has farmerId (connected farmer)
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (!customer.farmerId) {
      return res.status(400).json({
        message: "Sale requests are only for connected farmers. This customer is not linked to a farmer.",
      });
    }

    // Create sale request using service
    const request = await DealerSaleRequestService.createSaleRequest({
      dealerId: dealer.id,
      customerId,
      farmerId: customer.farmerId,
      items,
      paidAmount: Number(paidAmount),
      paymentMethod,
      notes,
      date: date ? new Date(date) : new Date(),
    });

    return res.status(201).json({
      success: true,
      data: request,
      message: "Sale request created successfully. Waiting for farmer approval.",
    });
  } catch (error: any) {
    console.error("Create sale request error:", error);
    return res.status(400).json({ message: error.message || "Internal server error" });
  }
};

// ==================== GET SALE REQUESTS (DEALER VIEW) ====================
export const getSaleRequests = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const {
      page = 1,
      limit = 10,
      search,
      status,
      startDate,
      endDate,
      farmerId,
    } = req.query;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      dealerId: dealer.id,
    };

    if (search) {
      where.OR = [
        { requestNumber: { contains: search as string, mode: "insensitive" } },
        { notes: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    if (farmerId) {
      where.farmerId = farmerId;
    }

    const [requests, total] = await Promise.all([
      prisma.dealerSaleRequest.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          farmer: {
            select: {
              id: true,
              name: true,
              phone: true,
              companyName: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  unit: true,
                },
              },
            },
          },
          dealerSale: {
            select: {
              id: true,
              invoiceNumber: true,
            },
          },
        },
      }),
      prisma.dealerSaleRequest.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Get sale requests error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET SALE REQUEST BY ID ====================
export const getSaleRequestById = async (
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

    const request = await prisma.dealerSaleRequest.findFirst({
      where: {
        id,
        dealerId: dealer.id,
      },
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            phone: true,
            companyName: true,
            CompanyFarmLocation: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        dealerSale: {
          select: {
            id: true,
            invoiceNumber: true,
            date: true,
            totalAmount: true,
            paidAmount: true,
            dueAmount: true,
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

    if (!request) {
      return res.status(404).json({ message: "Sale request not found" });
    }

    return res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error: any) {
    console.error("Get sale request by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET SALE REQUEST STATISTICS ====================
export const getSaleRequestStatistics = async (
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

    const [pending, approved, rejected, totalRequests] = await Promise.all([
      prisma.dealerSaleRequest.count({
        where: { dealerId: dealer.id, status: "PENDING" },
      }),
      prisma.dealerSaleRequest.count({
        where: { dealerId: dealer.id, status: "APPROVED" },
      }),
      prisma.dealerSaleRequest.count({
        where: { dealerId: dealer.id, status: "REJECTED" },
      }),
      prisma.dealerSaleRequest.count({
        where: { dealerId: dealer.id },
      }),
    ]);

    // Get total amount of pending requests
    const pendingRequests = await prisma.dealerSaleRequest.findMany({
      where: { dealerId: dealer.id, status: "PENDING" },
      select: { totalAmount: true },
    });

    const pendingAmount = pendingRequests.reduce(
      (sum, req) => sum + Number(req.totalAmount),
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        pending,
        approved,
        rejected,
        total: totalRequests,
        pendingAmount,
      },
    });
  } catch (error: any) {
    console.error("Get sale request statistics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== FARMER-SIDE ENDPOINTS ====================

// ==================== GET FARMER SALE REQUESTS ====================
export const getFarmerSaleRequests = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId; // This is the farmer's user ID
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
      dealerId,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      farmerId: userId,
    };

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    if (dealerId) {
      where.dealerId = dealerId;
    }

    const [requests, total] = await Promise.all([
      prisma.dealerSaleRequest.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          dealer: {
            select: {
              id: true,
              name: true,
              contact: true,
              address: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                  unit: true,
                },
              },
            },
          },
          dealerSale: {
            select: {
              id: true,
              invoiceNumber: true,
            },
          },
        },
      }),
      prisma.dealerSaleRequest.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Get farmer sale requests error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET FARMER SALE REQUEST BY ID ====================
export const getFarmerSaleRequestById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId; // Farmer's user ID
    const { id } = req.params;

    const request = await prisma.dealerSaleRequest.findFirst({
      where: {
        id,
        farmerId: userId,
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
        items: {
          include: {
            product: true,
          },
        },
        dealerSale: {
          select: {
            id: true,
            invoiceNumber: true,
            date: true,
            totalAmount: true,
            paidAmount: true,
            dueAmount: true,
          },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ message: "Sale request not found" });
    }

    return res.status(200).json({
      success: true,
      data: request,
    });
  } catch (error: any) {
    console.error("Get farmer sale request by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== APPROVE SALE REQUEST ====================
export const approveSaleRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId; // Farmer's user ID
    const { id } = req.params;

    // Approve using service
    const sale = await DealerSaleRequestService.approveSaleRequest({
      requestId: id,
      farmerId: userId as string,
    });

    return res.status(200).json({
      success: true,
      data: sale,
      message: "Sale request approved successfully. Purchase has been added to your account.",
    });
  } catch (error: any) {
    console.error("Approve sale request error:", error);
    return res.status(400).json({ message: error.message || "Internal server error" });
  }
};

// ==================== REJECT SALE REQUEST ====================
export const rejectSaleRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId; // Farmer's user ID
    const { id } = req.params;
    const { rejectionReason } = req.body;

    // Reject using service
    const request = await DealerSaleRequestService.rejectSaleRequest({
      requestId: id,
      farmerId: userId as string,
      rejectionReason,
    });

    return res.status(200).json({
      success: true,
      data: request,
      message: "Sale request rejected successfully.",
    });
  } catch (error: any) {
    console.error("Reject sale request error:", error);
    return res.status(400).json({ message: error.message || "Internal server error" });
  }
};

// ==================== GET FARMER SALE REQUEST STATISTICS ====================
export const getFarmerSaleRequestStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId; // Farmer's user ID

    const [pending, approved, rejected, totalRequests] = await Promise.all([
      prisma.dealerSaleRequest.count({
        where: { farmerId: userId, status: "PENDING" },
      }),
      prisma.dealerSaleRequest.count({
        where: { farmerId: userId, status: "APPROVED" },
      }),
      prisma.dealerSaleRequest.count({
        where: { farmerId: userId, status: "REJECTED" },
      }),
      prisma.dealerSaleRequest.count({
        where: { farmerId: userId },
      }),
    ]);

    // Get total amount of pending requests
    const pendingRequests = await prisma.dealerSaleRequest.findMany({
      where: { farmerId: userId, status: "PENDING" },
      select: { totalAmount: true },
    });

    const pendingAmount = pendingRequests.reduce(
      (sum, req) => sum + Number(req.totalAmount),
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        pending,
        approved,
        rejected,
        total: totalRequests,
        pendingAmount,
      },
    });
  } catch (error: any) {
    console.error("Get farmer sale request statistics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
