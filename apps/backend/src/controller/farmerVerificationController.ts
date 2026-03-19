import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole } from "@prisma/client";
import { DealerFarmerAccountService } from "../services/dealerFarmerAccountService";

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
    const { openingBalance, openingBalanceNotes } = req.body;

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

    let numericOpeningBalance: number | null = null;
    if (openingBalance !== undefined && openingBalance !== null && openingBalance !== "") {
      const n = Number(openingBalance);
      if (!Number.isFinite(n)) {
        return res.status(400).json({
          success: false,
          message: "openingBalance must be a valid number",
        });
      }
      numericOpeningBalance = n;
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

      // Create or update connected account ledger (DealerFarmerAccount)
      // Opening balance is stored as an account-level adjustment and applied to the running balance.
      if (numericOpeningBalance !== null && numericOpeningBalance !== 0) {
        const account = await tx.dealerFarmerAccount.upsert({
          where: {
            dealerId_farmerId: {
              dealerId: verificationRequest.dealerId,
              farmerId: verificationRequest.farmerId,
            },
          },
          create: {
            dealerId: verificationRequest.dealerId,
            farmerId: verificationRequest.farmerId,
            // Always apply opening via delta below to avoid double-counting on first create.
            balance: 0,
            totalSales: 0,
            totalPayments: 0,
            openingBalanceCurrent: numericOpeningBalance,
            openingBalanceStatus: "PENDING_ACK",
          },
          update: {
            // We'll apply delta below based on previous opening snapshot.
          },
          select: { id: true },
        });

        const prev = await tx.dealerFarmerAccountAdjustment.findFirst({
          where: { accountId: account.id, type: "OPENING_BALANCE" },
          orderBy: { createdAt: "desc" },
          select: { amount: true },
        });
        const prevAmount = prev ? Number(prev.amount) : 0;
        const delta = numericOpeningBalance - prevAmount;

        await tx.dealerFarmerAccount.update({
          where: { id: account.id },
          data: {
            balance: { increment: delta },
            openingBalanceCurrent: numericOpeningBalance,
            openingBalanceStatus: "PENDING_ACK",
          },
        });

        await tx.dealerFarmerAccountAdjustment.create({
          data: {
            accountId: account.id,
            type: "OPENING_BALANCE",
            amount: numericOpeningBalance,
            notes: openingBalanceNotes ? String(openingBalanceNotes) : "Opening balance",
            createdByRole: "DEALER",
            createdById: currentUserId,
            status: "PENDING_ACK",
          },
        });
      } else {
        // Ensure account exists (even if no opening balance provided)
        await tx.dealerFarmerAccount.upsert({
          where: {
            dealerId_farmerId: {
              dealerId: verificationRequest.dealerId,
              farmerId: verificationRequest.farmerId,
            },
          },
          create: {
            dealerId: verificationRequest.dealerId,
            farmerId: verificationRequest.farmerId,
            balance: 0,
            totalSales: 0,
            totalPayments: 0,
          },
          update: {},
        });
      }

      // Auto-create Customer for connected farmer
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

// ==================== DEALER: SET/EDIT CONNECTED OPENING BALANCE ====================
export const setConnectedOpeningBalanceByDealer = async (req: Request, res: Response): Promise<any> => {
  try {
    const { connectionId } = req.params;
    const { openingBalance, notes } = req.body;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    if (currentUserRole !== UserRole.DEALER) {
      return res.status(403).json({ success: false, message: "Only dealers can set opening balance" });
    }

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: currentUserId },
      select: { id: true },
    });
    if (!dealer) {
      return res.status(404).json({ success: false, message: "Dealer account not found" });
    }

    const numericOpening = Number(openingBalance);
    if (!Number.isFinite(numericOpening)) {
      return res.status(400).json({ success: false, message: "openingBalance must be a valid number" });
    }

    const connection = await prismaWithVerification.dealerFarmer.findUnique({
      where: { id: connectionId },
      select: { id: true, dealerId: true, farmerId: true },
    });
    if (!connection || connection.dealerId !== dealer.id) {
      return res.status(404).json({ success: false, message: "Connection not found" });
    }

    const prismaAny = prisma as any;

    const result = await prismaAny.$transaction(async (tx: any) => {
      const account = await tx.dealerFarmerAccount.upsert({
        where: {
          dealerId_farmerId: { dealerId: connection.dealerId, farmerId: connection.farmerId },
        },
        create: {
          dealerId: connection.dealerId,
          farmerId: connection.farmerId,
          balance: 0,
          totalSales: 0,
          totalPayments: 0,
        },
        update: {},
        select: { id: true },
      });

      const prev = await tx.dealerFarmerAccountAdjustment.findFirst({
        where: { accountId: account.id, type: "OPENING_BALANCE" },
        orderBy: { createdAt: "desc" },
        select: { amount: true },
      });
      const prevAmount = prev ? Number(prev.amount) : 0;
      const delta = numericOpening - prevAmount;

      await tx.dealerFarmerAccount.update({
        where: { id: account.id },
        data: {
          balance: { increment: delta },
          openingBalanceCurrent: numericOpening,
          openingBalanceStatus: "PENDING_ACK",
        },
      });

      const adj = await tx.dealerFarmerAccountAdjustment.create({
        data: {
          accountId: account.id,
          type: "OPENING_BALANCE",
          amount: numericOpening,
          notes: notes ? String(notes) : "Opening balance",
          createdByRole: "DEALER",
          createdById: currentUserId,
          status: "PENDING_ACK",
        },
      });

      return { accountId: account.id, adjustment: adj };
    });

    return res.status(200).json({
      success: true,
      data: {
        accountId: result.accountId,
        openingBalance: {
          id: result.adjustment.id,
          amount: Number(result.adjustment.amount),
          status: result.adjustment.status,
          notes: result.adjustment.notes,
          createdAt: result.adjustment.createdAt,
        },
      },
      message: "Opening balance set. Farmer acknowledgement required.",
    });
  } catch (error: any) {
    console.error("Set connected opening balance error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

// ==================== FARMER: ACKNOWLEDGE CONNECTED OPENING BALANCE ====================
export const acknowledgeConnectedOpeningBalance = async (req: Request, res: Response): Promise<any> => {
  try {
    const { connectionId } = req.params;
    const { note } = req.body;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    if (currentUserRole !== UserRole.OWNER) {
      return res.status(403).json({ success: false, message: "Only farmers can acknowledge opening balance" });
    }

    const connection = await prismaWithVerification.dealerFarmer.findUnique({
      where: { id: connectionId },
      select: { dealerId: true, farmerId: true },
    });
    if (!connection || connection.farmerId !== currentUserId) {
      return res.status(404).json({ success: false, message: "Connection not found" });
    }

    const prismaAny = prisma as any;
    const result = await prismaAny.$transaction(async (tx: any) => {
      const account = await tx.dealerFarmerAccount.findUnique({
        where: { dealerId_farmerId: { dealerId: connection.dealerId, farmerId: connection.farmerId } },
        select: { id: true },
      });
      if (!account) throw new Error("Account not found");

      const pending = await tx.dealerFarmerAccountAdjustment.findFirst({
        where: { accountId: account.id, type: "OPENING_BALANCE", status: "PENDING_ACK" },
        orderBy: { createdAt: "desc" },
      });
      if (!pending) {
        return { ok: false, message: "No pending opening balance to acknowledge" };
      }

      const updated = await tx.dealerFarmerAccountAdjustment.update({
        where: { id: pending.id },
        data: {
          status: "ACKNOWLEDGED",
          farmerResponseNote: note ? String(note) : null,
          respondedAt: new Date(),
        },
      });

      await tx.dealerFarmerAccount.update({
        where: { id: account.id },
        data: { openingBalanceStatus: "ACKNOWLEDGED" },
      });

      return { ok: true, adjustment: updated };
    });

    if (result.ok === false) {
      return res.status(400).json({ success: false, message: (result as any).message });
    }

    return res.status(200).json({
      success: true,
      data: {
        openingBalance: {
          id: (result as any).adjustment.id,
          amount: Number((result as any).adjustment.amount),
          status: (result as any).adjustment.status,
          respondedAt: (result as any).adjustment.respondedAt,
        },
      },
      message: "Opening balance acknowledged",
    });
  } catch (error: any) {
    console.error("Acknowledge connected opening balance error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

// ==================== FARMER: DISPUTE CONNECTED OPENING BALANCE ====================
export const disputeConnectedOpeningBalance = async (req: Request, res: Response): Promise<any> => {
  try {
    const { connectionId } = req.params;
    const { note } = req.body;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    if (currentUserRole !== UserRole.OWNER) {
      return res.status(403).json({ success: false, message: "Only farmers can dispute opening balance" });
    }

    const connection = await prismaWithVerification.dealerFarmer.findUnique({
      where: { id: connectionId },
      select: { dealerId: true, farmerId: true },
    });
    if (!connection || connection.farmerId !== currentUserId) {
      return res.status(404).json({ success: false, message: "Connection not found" });
    }

    const prismaAny = prisma as any;
    const result = await prismaAny.$transaction(async (tx: any) => {
      const account = await tx.dealerFarmerAccount.findUnique({
        where: { dealerId_farmerId: { dealerId: connection.dealerId, farmerId: connection.farmerId } },
        select: { id: true },
      });
      if (!account) throw new Error("Account not found");

      const pending = await tx.dealerFarmerAccountAdjustment.findFirst({
        where: { accountId: account.id, type: "OPENING_BALANCE", status: "PENDING_ACK" },
        orderBy: { createdAt: "desc" },
      });
      if (!pending) {
        return { ok: false, message: "No pending opening balance to dispute" };
      }

      const updated = await tx.dealerFarmerAccountAdjustment.update({
        where: { id: pending.id },
        data: {
          status: "DISPUTED",
          farmerResponseNote: note ? String(note) : null,
          respondedAt: new Date(),
        },
      });

      await tx.dealerFarmerAccount.update({
        where: { id: account.id },
        data: { openingBalanceStatus: "DISPUTED" },
      });

      return { ok: true, adjustment: updated };
    });

    if (result.ok === false) {
      return res.status(400).json({ success: false, message: (result as any).message });
    }

    return res.status(200).json({
      success: true,
      data: {
        openingBalance: {
          id: (result as any).adjustment.id,
          amount: Number((result as any).adjustment.amount),
          status: (result as any).adjustment.status,
          respondedAt: (result as any).adjustment.respondedAt,
        },
      },
      message: "Opening balance disputed",
    });
  } catch (error: any) {
    console.error("Dispute connected opening balance error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error" });
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

    // Get account balances for this farmer (dealerId -> balance)
    const accounts = await DealerFarmerAccountService.getFarmerAccounts(currentUserId as string);
    const balanceByDealerId = new Map(accounts.map((a) => [a.dealerId, a.balance]));

    // Extract dealers with connection info and balance
    const dealers = dealerFarmers.map((df: any) => ({
      ...df.dealer,
      connectedAt: df.connectedAt,
      connectedVia: df.connectedVia,
      dealerFarmerId: df.id,
      balance: balanceByDealerId.get(df.dealer.id) ?? 0,
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
/**
 * Single route returning everything about a dealer to the authenticated farmer:
 * dealer info, account (balance/totals), sales to this dealer, and payment/statement (transactions).
 */
export const getDealerDetailsForFarmer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const dealerId = req.params.dealerId;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    if (!dealerId || !currentUserId) {
      return res.status(400).json({
        success: false,
        message: "Dealer ID is required",
      });
    }

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
            id: true,
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

    // Get dealer-farmer account (balance, totals)
    const accountRecord = await DealerFarmerAccountService.getOrCreateAccount(
      dealerId as string,
      currentUserId as string
    );

    const account = {
      id: accountRecord.id,
      balance: Number(accountRecord.balance),
      totalSales: Number(accountRecord.totalSales),
      totalPayments: Number(accountRecord.totalPayments),
      lastSaleDate: accountRecord.lastSaleDate,
      lastPaymentDate: accountRecord.lastPaymentDate,
      balanceLimit:
        accountRecord.balanceLimit != null
          ? Number(accountRecord.balanceLimit)
          : null,
    };

    const prismaAny = prisma as any;
    const openingAdjustments = await prismaAny.dealerFarmerAccountAdjustment.findMany({
      where: { accountId: accountRecord.id, type: "OPENING_BALANCE" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const latestOpening = openingAdjustments[0] || null;

    // Get full statement (sales + payments, merged as transactions) - one call
    const statement = await DealerFarmerAccountService.getAccountStatement({
      dealerId: dealerId as string,
      farmerId: currentUserId as string,
      page: 1,
      limit: 500,
    });

    return res.json({
      success: true,
      data: {
        dealer,
        connection: {
          id: dealerFarmerLink.id,
        },
        account: {
          ...account,
          openingBalance: latestOpening
            ? {
                id: latestOpening.id,
                amount: Number(latestOpening.amount),
                status: latestOpening.status,
                notes: latestOpening.notes,
                createdAt: latestOpening.createdAt,
                createdByRole: latestOpening.createdByRole,
                respondedAt: latestOpening.respondedAt,
                farmerResponseNote: latestOpening.farmerResponseNote,
              }
            : null,
          openingBalanceHistory: openingAdjustments.map((a: any) => ({
            id: a.id,
            amount: Number(a.amount),
            status: a.status,
            notes: a.notes,
            createdAt: a.createdAt,
            createdByRole: a.createdByRole,
            respondedAt: a.respondedAt,
            farmerResponseNote: a.farmerResponseNote,
          })),
        },
        sales: statement.sales,
        payments: statement.payments,
        transactions: statement.transactions,
        statementPagination: statement.pagination,
      },
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
