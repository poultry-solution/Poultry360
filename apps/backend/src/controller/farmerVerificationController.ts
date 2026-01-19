import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole } from "@prisma/client";

// Use type assertion for Prisma client until Prisma client is regenerated
const prismaWithVerification = prisma as any;

// ==================== CREATE FARMER VERIFICATION REQUEST ====================
// Used by farmers to request connection to a dealer
export const createFarmerVerificationRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { dealerId } = req.body;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Validation
    if (!dealerId) {
      return res.status(400).json({
        success: false,
        message: "Dealer ID is required",
      });
    }

    // Only farmers (OWNER role) can create verification requests
    if (currentUserRole !== UserRole.OWNER) {
      return res.status(403).json({
        success: false,
        message: "Only farmers can create verification requests",
      });
    }

    // Verify dealer exists
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
    });

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    // Check if farmer already has a connection to this dealer
    const existingConnection = await prismaWithVerification.dealerFarmer.findUnique({
      where: {
        dealerId_farmerId: {
          dealerId: dealerId,
          farmerId: currentUserId,
        },
      },
    });

    if (existingConnection) {
      return res.status(400).json({
        success: false,
        message: "You are already connected to this dealer",
      });
    }

    // Check if there's a pending request
    const pendingRequest = await prismaWithVerification.farmerVerificationRequest.findFirst({
      where: {
        farmerId: currentUserId,
        dealerId: dealerId,
        status: "PENDING" as any,
      },
    });

    if (pendingRequest) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending request for this dealer",
      });
    }

    // Check for existing rejected request
    const rejectedRequest = await prismaWithVerification.farmerVerificationRequest.findFirst({
      where: {
        farmerId: currentUserId,
        dealerId: dealerId,
        status: "REJECTED" as any,
      },
      orderBy: { updatedAt: "desc" },
    });

    // If there's a rejected request, check restrictions and update it instead of creating new
    if (rejectedRequest) {
      // Check 3 rejection limit
      if (rejectedRequest.rejectedCount >= 3) {
        return res.status(400).json({
          success: false,
          message: "You have been rejected 3 times by this dealer and cannot apply again",
        });
      }

      // Check 1-hour cooldown
      if (rejectedRequest.lastRejectedAt) {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (rejectedRequest.lastRejectedAt > oneHourAgo) {
          const minutesRemaining = Math.ceil(
            (rejectedRequest.lastRejectedAt.getTime() - oneHourAgo.getTime()) /
              (60 * 1000)
          );
          return res.status(400).json({
            success: false,
            message: `Please wait ${minutesRemaining} more minutes before retrying`,
          });
        }
      }

      // Update the rejected request to pending (retry)
      const verificationRequest = await prismaWithVerification.farmerVerificationRequest.update({
        where: { id: rejectedRequest.id },
        data: {
          status: "PENDING" as any,
          // Keep the rejectedCount for tracking purposes
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
        },
      });

      return res.status(201).json({
        success: true,
        data: verificationRequest,
        message: "Verification request retry sent successfully",
      });
    }

    // Create new verification request (first time)
    const verificationRequest = await prismaWithVerification.farmerVerificationRequest.create({
      data: {
        farmerId: currentUserId,
        dealerId: dealerId,
        status: "PENDING" as any,
        rejectedCount: 0,
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
      },
    });

    return res.status(201).json({
      success: true,
      data: verificationRequest,
      message: "Verification request created successfully",
    });
  } catch (error: any) {
    console.error("Create farmer verification request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== GET FARMER'S VERIFICATION REQUESTS ====================
export const getFarmerVerificationRequests = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only farmers can view their own requests
    if (currentUserRole !== UserRole.OWNER) {
      return res.status(403).json({
        success: false,
        message: "Only farmers can view their verification requests",
      });
    }

    // Get all verification requests for this farmer
    const requests = await prismaWithVerification.farmerVerificationRequest.findMany({
      where: {
        farmerId: currentUserId,
      },
      include: {
        dealer: {
          select: {
            id: true,
            name: true,
            contact: true,
            address: true,
            owner: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      success: true,
      data: requests,
    });
  } catch (error: any) {
    console.error("Get farmer verification requests error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== GET DEALER'S FARMER VERIFICATION REQUESTS ====================
export const getDealerFarmerRequests = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only dealers can view farmer verification requests
    if (currentUserRole !== UserRole.DEALER) {
      return res.status(403).json({
        success: false,
        message: "Only dealers can view farmer verification requests",
      });
    }

    // Get dealer for current user
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: currentUserId },
    });

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer account not found",
      });
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      dealerId: dealer.id,
    };

    // Filter by status if provided
    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status as string)) {
      where.status = status as any;
    }

    // Search by farmer name or phone
    if (search) {
      where.farmer = {
        OR: [
          {
            name: {
              contains: search as string,
              mode: "insensitive",
            },
          },
          {
            phone: {
              contains: search as string,
              mode: "insensitive",
            },
          },
        ],
      };
    }

    const [requests, total] = await Promise.all([
      prismaWithVerification.farmerVerificationRequest.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          farmer: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prismaWithVerification.farmerVerificationRequest.count({ where }),
    ]);

    return res.json({
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
    console.error("Get dealer farmer requests error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== APPROVE FARMER VERIFICATION REQUEST ====================
export const approveFarmerRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only dealers can approve
    if (currentUserRole !== UserRole.DEALER) {
      return res.status(403).json({
        success: false,
        message: "Only dealers can approve verification requests",
      });
    }

    // Get dealer for current user
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: currentUserId },
    });

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer account not found",
      });
    }

    // Get verification request
    const verificationRequest = await prismaWithVerification.farmerVerificationRequest.findUnique({
      where: { id },
      include: {
        dealer: true,
        farmer: true,
      },
    });

    if (!verificationRequest) {
      return res.status(404).json({
        success: false,
        message: "Verification request not found",
      });
    }

    // Verify request belongs to this dealer
    if (verificationRequest.dealerId !== dealer.id) {
      return res.status(403).json({
        success: false,
        message: "You can only approve requests for your own dealership",
      });
    }

    // Check if already approved
    if (verificationRequest.status === "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Request is already approved",
      });
    }

    // Update request to APPROVED and create DealerFarmer relationship
    const updatedRequest = await prismaWithVerification.$transaction(async (tx: any) => {
      // Update verification status
      const request = await tx.farmerVerificationRequest.update({
        where: { id },
        data: {
          status: "APPROVED" as any,
          rejectedCount: 0, // Clear rejection count on approval
          lastRejectedAt: null,
        },
      });

      // Create or update DealerFarmer relationship
      const existingLink = await tx.dealerFarmer.findUnique({
        where: {
          dealerId_farmerId: {
            dealerId: verificationRequest.dealerId,
            farmerId: verificationRequest.farmerId,
          },
        },
      });

      if (!existingLink) {
        await tx.dealerFarmer.create({
          data: {
            dealerId: verificationRequest.dealerId,
            farmerId: verificationRequest.farmerId,
            connectedVia: "VERIFICATION",
            connectedAt: new Date(),
          },
        });
      }

3      // Auto-create Customer for connected farmer
      const existingCustomer = await tx.customer.findFirst({
        where: {
          userId: dealer.ownerId,
          farmerId: verificationRequest.farmerId,
        },
      });

      if (!existingCustomer) {
        await tx.customer.create({
          data: {
            userId: dealer.ownerId, // Link to dealer owner
            farmerId: verificationRequest.farmerId, // Link to farmer
            name: verificationRequest.farmer.name,
            phone: verificationRequest.farmer.phone,
            source: "CONNECTED",
            balance: 0,
          },
        });
      }

      return request;
    });

    return res.json({
      success: true,
      data: updatedRequest,
      message: "Verification request approved successfully",
    });
  } catch (error: any) {
    console.error("Approve farmer verification request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== REJECT FARMER VERIFICATION REQUEST ====================
export const rejectFarmerRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only dealers can reject
    if (currentUserRole !== UserRole.DEALER) {
      return res.status(403).json({
        success: false,
        message: "Only dealers can reject verification requests",
      });
    }

    // Get dealer for current user
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: currentUserId },
    });

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer account not found",
      });
    }

    // Get verification request
    const verificationRequest = await prismaWithVerification.farmerVerificationRequest.findUnique({
      where: { id },
    });

    if (!verificationRequest) {
      return res.status(404).json({
        success: false,
        message: "Verification request not found",
      });
    }

    // Verify request belongs to this dealer
    if (verificationRequest.dealerId !== dealer.id) {
      return res.status(403).json({
        success: false,
        message: "You can only reject requests for your own dealership",
      });
    }

    // Check if already rejected
    if (verificationRequest.status === "REJECTED") {
      return res.status(400).json({
        success: false,
        message: "Request is already rejected",
      });
    }

    // Update request to REJECTED
    const updatedRequest = await prismaWithVerification.farmerVerificationRequest.update({
      where: { id },
      data: {
        status: "REJECTED" as any,
        rejectedCount: verificationRequest.rejectedCount + 1,
        lastRejectedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      data: updatedRequest,
      message: "Verification request rejected",
    });
  } catch (error: any) {
    console.error("Reject farmer verification request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== ACKNOWLEDGE FARMER VERIFICATION REQUEST ====================
export const acknowledgeFarmerRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only farmers can acknowledge their own requests
    if (currentUserRole !== UserRole.OWNER) {
      return res.status(403).json({
        success: false,
        message: "Only farmers can acknowledge verification requests",
      });
    }

    // Get verification request
    const verificationRequest = await prismaWithVerification.farmerVerificationRequest.findUnique({
      where: { id },
    });

    if (!verificationRequest) {
      return res.status(404).json({
        success: false,
        message: "Verification request not found",
      });
    }

    // Verify request belongs to this farmer
    if (verificationRequest.farmerId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "You can only acknowledge your own requests",
      });
    }

    // Update acknowledgedAt timestamp
    const updatedRequest = await prismaWithVerification.farmerVerificationRequest.update({
      where: { id },
      data: {
        acknowledgedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      data: updatedRequest,
      message: "Request acknowledged",
    });
  } catch (error: any) {
    console.error("Acknowledge farmer verification request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== GET FARMER'S CONNECTED DEALERS ====================
export const getFarmerDealers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only farmers can view their dealers
    if (currentUserRole !== UserRole.OWNER) {
      return res.status(403).json({
        success: false,
        message: "Only farmers can view their connected dealers",
      });
    }

    // Get all active (non-archived) dealers connected to this farmer via DealerFarmer relationship
    const dealerFarmers = await prismaWithVerification.dealerFarmer.findMany({
      where: {
        farmerId: currentUserId,
        archivedByFarmer: false, // Only show active connections
      },
      include: {
        dealer: {
          select: {
            id: true,
            name: true,
            contact: true,
            address: true,
            owner: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { connectedAt: "desc" },
    });

    // Extract dealers with connection info
    const dealers = dealerFarmers.map((df: any) => ({
      ...df.dealer,
      connectedAt: df.connectedAt,
      connectedVia: df.connectedVia,
      dealerFarmerId: df.id,
    }));

    return res.json({
      success: true,
      data: dealers,
    });
  } catch (error: any) {
    console.error("Get farmer dealers error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== GET DEALER'S CONNECTED FARMERS ====================
export const getDealerFarmers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only dealers can view their farmers
    if (currentUserRole !== UserRole.DEALER) {
      return res.status(403).json({
        success: false,
        message: "Only dealers can view their connected farmers",
      });
    }

    // Get dealer for current user
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: currentUserId },
    });

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer account not found",
      });
    }

    // Get all active (non-archived) farmers connected to this dealer via DealerFarmer relationship
    const dealerFarmers = await prismaWithVerification.dealerFarmer.findMany({
      where: {
        dealerId: dealer.id,
        archivedByDealer: false, // Only show active connections
      },
      include: {
        farmer: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
          },
        },
      },
      orderBy: { connectedAt: "desc" },
    });

    // Extract farmers with connection info
    const farmers = dealerFarmers.map((df: any) => ({
      ...df.farmer,
      connectedAt: df.connectedAt,
      connectedVia: df.connectedVia,
      dealerFarmerId: df.id,
    }));

    return res.json({
      success: true,
      data: farmers,
    });
  } catch (error: any) {
    console.error("Get dealer farmers error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== GET DEALER DETAILS FOR FARMER ====================
export const getDealerDetailsForFarmer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { dealerId } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only farmers can access
    if (currentUserRole !== UserRole.OWNER) {
      return res.status(403).json({
        success: false,
        message: "Only farmers can view dealer details",
      });
    }

    // Verify farmer has connection to this dealer via DealerFarmer relationship
    const dealerFarmerLink = await prismaWithVerification.dealerFarmer.findUnique({
      where: {
        dealerId_farmerId: {
          dealerId: dealerId,
          farmerId: currentUserId,
        },
      },
    });

    if (!dealerFarmerLink) {
      return res.status(403).json({
        success: false,
        message: "You are not connected to this dealer",
      });
    }

    // Get dealer details
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
      select: {
        id: true,
        name: true,
        contact: true,
        address: true,
        owner: {
          select: {
            name: true,
            phone: true,
          },
        },
        _count: {
          select: {
            products: true,
            sales: true,
          },
        },
      },
    });

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer not found",
      });
    }

    return res.json({
      success: true,
      data: dealer,
    });
  } catch (error: any) {
    console.error("Get dealer details for farmer error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== CANCEL FARMER VERIFICATION REQUEST ====================
export const cancelFarmerVerificationRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { requestId } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only farmers can cancel their own requests
    if (currentUserRole !== UserRole.OWNER) {
      return res.status(403).json({
        success: false,
        message: "Only farmers can cancel verification requests",
      });
    }

    // Get the request
    const request = await prismaWithVerification.farmerVerificationRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Verification request not found",
      });
    }

    // Check ownership
    if (request.farmerId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "You can only cancel your own verification requests",
      });
    }

    // Only pending requests can be cancelled
    if (request.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Only pending requests can be cancelled",
      });
    }

    // Delete the request
    await prismaWithVerification.farmerVerificationRequest.delete({
      where: { id: requestId },
    });

    return res.json({
      success: true,
      message: "Verification request cancelled successfully",
    });
  } catch (error: any) {
    console.error("Cancel farmer verification request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== ARCHIVE FARMER-DEALER CONNECTION ====================
export const archiveFarmerDealerConnection = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { connectionId } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only farmers can archive from their side
    if (currentUserRole !== UserRole.OWNER) {
      return res.status(403).json({
        success: false,
        message: "Only farmers can archive dealer connections",
      });
    }

    // Get the connection
    const connection = await prismaWithVerification.dealerFarmer.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection not found",
      });
    }

    // Check ownership
    if (connection.farmerId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "You can only archive your own connections",
      });
    }

    // Archive the connection
    await prismaWithVerification.dealerFarmer.update({
      where: { id: connectionId },
      data: { archivedByFarmer: true },
    });

    return res.json({
      success: true,
      message: "Connection archived successfully",
    });
  } catch (error: any) {
    console.error("Archive farmer-dealer connection error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== UNARCHIVE FARMER-DEALER CONNECTION ====================
export const unarchiveFarmerDealerConnection = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { connectionId } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only farmers can unarchive from their side
    if (currentUserRole !== UserRole.OWNER) {
      return res.status(403).json({
        success: false,
        message: "Only farmers can unarchive dealer connections",
      });
    }

    // Get the connection
    const connection = await prismaWithVerification.dealerFarmer.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection not found",
      });
    }

    // Check ownership
    if (connection.farmerId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "You can only unarchive your own connections",
      });
    }

    // Unarchive the connection
    await prismaWithVerification.dealerFarmer.update({
      where: { id: connectionId },
      data: { archivedByFarmer: false },
    });

    return res.json({
      success: true,
      message: "Connection restored successfully",
    });
  } catch (error: any) {
    console.error("Unarchive farmer-dealer connection error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== ARCHIVE DEALER-FARMER CONNECTION ====================
export const archiveDealerFarmerConnection = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { connectionId } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only dealers can archive from their side
    if (currentUserRole !== UserRole.DEALER) {
      return res.status(403).json({
        success: false,
        message: "Only dealers can archive farmer connections",
      });
    }

    // Get dealer for current user
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: currentUserId },
    });

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer account not found",
      });
    }

    // Get the connection
    const connection = await prismaWithVerification.dealerFarmer.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection not found",
      });
    }

    // Check ownership
    if (connection.dealerId !== dealer.id) {
      return res.status(403).json({
        success: false,
        message: "You can only archive your own connections",
      });
    }

    // Archive the connection
    await prismaWithVerification.dealerFarmer.update({
      where: { id: connectionId },
      data: { archivedByDealer: true },
    });

    return res.json({
      success: true,
      message: "Connection archived successfully",
    });
  } catch (error: any) {
    console.error("Archive dealer-farmer connection error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== UNARCHIVE DEALER-FARMER CONNECTION ====================
export const unarchiveDealerFarmerConnection = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { connectionId } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only dealers can unarchive from their side
    if (currentUserRole !== UserRole.DEALER) {
      return res.status(403).json({
        success: false,
        message: "Only dealers can unarchive farmer connections",
      });
    }

    // Get dealer for current user
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: currentUserId },
    });

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer account not found",
      });
    }

    // Get the connection
    const connection = await prismaWithVerification.dealerFarmer.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection not found",
      });
    }

    // Check ownership
    if (connection.dealerId !== dealer.id) {
      return res.status(403).json({
        success: false,
        message: "You can only unarchive your own connections",
      });
    }

    // Unarchive the connection
    await prismaWithVerification.dealerFarmer.update({
      where: { id: connectionId },
      data: { archivedByDealer: false },
    });

    return res.json({
      success: true,
      message: "Connection restored successfully",
    });
  } catch (error: any) {
    console.error("Unarchive dealer-farmer connection error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== GET ARCHIVED FARMER DEALERS ====================
export const getArchivedFarmerDealers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only farmers can access
    if (currentUserRole !== UserRole.OWNER) {
      return res.status(403).json({
        success: false,
        message: "Only farmers can view archived dealers",
      });
    }

    // Get archived dealers
    const archivedConnections = await prismaWithVerification.dealerFarmer.findMany({
      where: {
        farmerId: currentUserId,
        archivedByFarmer: true,
      },
      include: {
        dealer: {
          select: {
            id: true,
            name: true,
            contact: true,
            address: true,
            owner: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Format the response
    const dealers = archivedConnections.map((connection: any) => ({
      id: connection.dealer.id,
      name: connection.dealer.name,
      contact: connection.dealer.contact,
      address: connection.dealer.address,
      connectedAt: connection.connectedAt,
      connectedVia: connection.connectedVia,
      dealerFarmerId: connection.id,
      owner: connection.dealer.owner,
    }));

    return res.json({
      success: true,
      data: dealers,
    });
  } catch (error: any) {
    console.error("Get archived farmer dealers error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== GET ARCHIVED DEALER FARMERS ====================
export const getArchivedDealerFarmers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only dealers can access
    if (currentUserRole !== UserRole.DEALER) {
      return res.status(403).json({
        success: false,
        message: "Only dealers can view archived farmers",
      });
    }

    // Get dealer for current user
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: currentUserId },
    });

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer account not found",
      });
    }

    // Get archived farmers
    const archivedConnections = await prismaWithVerification.dealerFarmer.findMany({
      where: {
        dealerId: dealer.id,
        archivedByDealer: true,
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
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Format the response
    const farmers = archivedConnections.map((connection: any) => ({
      id: connection.farmer.id,
      name: connection.farmer.name,
      phone: connection.farmer.phone,
      farmName: connection.farmer.companyName,
      location: connection.farmer.CompanyFarmLocation,
      connectedAt: connection.connectedAt,
      connectedVia: connection.connectedVia,
      dealerFarmerId: connection.id,
    }));

    return res.json({
      success: true,
      data: farmers,
    });
  } catch (error: any) {
    console.error("Get archived dealer farmers error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
