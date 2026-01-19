import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole } from "@prisma/client";

// Use type assertion for Prisma client until Prisma client is regenerated
const prismaWithVerification = prisma as any;

// ==================== CREATE VERIFICATION REQUEST ====================
// Used during dealer signup and retry
export const createVerificationRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { companyId } = req.body;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Validation
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
    }

    // Get dealer for current user
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: currentUserId },
      include: {
        owner: true,
      },
    });

    if (!dealer) {
      return res.status(404).json({
        success: false,
        message: "Dealer account not found",
      });
    }

    // Only dealers can create verification requests
    if (currentUserRole !== UserRole.DEALER) {
      return res.status(403).json({
        success: false,
        message: "Only dealers can create verification requests",
      });
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // Check if dealer already has an approved request for this company
    const approvedRequest = await prismaWithVerification.dealerVerificationRequest.findFirst({
      where: {
        dealerId: dealer.id,
        companyId: companyId,
        status: "APPROVED",
      },
    });

    if (approvedRequest) {
      return res.status(400).json({
        success: false,
        message: "You are already approved and connected to this company",
      });
    }

    // Check if there's a pending request
    const pendingRequest = await prismaWithVerification.dealerVerificationRequest.findFirst({
      where: {
        dealerId: dealer.id,
        companyId: companyId,
        status: "PENDING" as any,
      },
    });

    if (pendingRequest) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending request for this company",
      });
    }

    // Check for existing rejected request
    const rejectedRequest = await prismaWithVerification.dealerVerificationRequest.findFirst({
      where: {
        dealerId: dealer.id,
        companyId: companyId,
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
          message: "You have been rejected 3 times by this company and cannot apply again",
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
      const verificationRequest = await prismaWithVerification.dealerVerificationRequest.update({
        where: { id: rejectedRequest.id },
        data: {
          status: "PENDING" as any,
          // Keep the rejectedCount for tracking purposes
        },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          dealer: {
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
    const verificationRequest = await prismaWithVerification.dealerVerificationRequest.create({
      data: {
        dealerId: dealer.id,
        companyId: companyId,
        status: "PENDING" as any,
        rejectedCount: 0,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        dealer: {
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
    console.error("Create verification request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== GET DEALER'S VERIFICATION REQUESTS ====================
export const getDealerVerificationRequests = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only dealers can view their own requests
    if (currentUserRole !== UserRole.DEALER) {
      return res.status(403).json({
        success: false,
        message: "Only dealers can view their verification requests",
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

    // Get all verification requests for this dealer
    const requests = await prismaWithVerification.dealerVerificationRequest.findMany({
      where: {
        dealerId: dealer.id,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
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
    console.error("Get dealer verification requests error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== GET COMPANY'S VERIFICATION REQUESTS ====================
export const getCompanyVerificationRequests = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { status, page = 1, limit = 10, search } = req.query;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only company admins can view verification requests
    if (currentUserRole !== UserRole.COMPANY) {
      return res.status(403).json({
        success: false,
        message: "Only company admins can view verification requests",
      });
    }

    // Get company for current user
    const company = await prisma.company.findUnique({
      where: { ownerId: currentUserId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company account not found",
      });
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      companyId: company.id,
    };

    // Filter by status if provided
    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status as string)) {
      where.status = status as any;
    }

    // Search by dealer name or owner name
    if (search) {
      where.OR = [
        {
          dealer: {
            name: {
              contains: search as string,
              mode: "insensitive",
            },
          },
        },
        {
          dealer: {
            owner: {
              name: {
                contains: search as string,
                mode: "insensitive",
              },
            },
          },
        },
        {
          dealer: {
            contact: {
              contains: search as string,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const [requests, total] = await Promise.all([
      prismaWithVerification.dealerVerificationRequest.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          dealer: {
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
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prismaWithVerification.dealerVerificationRequest.count({ where }),
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
    console.error("Get company verification requests error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== APPROVE VERIFICATION REQUEST ====================
export const approveVerificationRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only company admins can approve
    if (currentUserRole !== UserRole.COMPANY) {
      return res.status(403).json({
        success: false,
        message: "Only company admins can approve verification requests",
      });
    }

    // Get company for current user
    const company = await prisma.company.findUnique({
      where: { ownerId: currentUserId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company account not found",
      });
    }

    // Get verification request
    const verificationRequest = await prismaWithVerification.dealerVerificationRequest.findUnique({
      where: { id },
      include: {
        dealer: true,
        company: true,
      },
    });

    if (!verificationRequest) {
      return res.status(404).json({
        success: false,
        message: "Verification request not found",
      });
    }

    // Verify request belongs to this company
    if (verificationRequest.companyId !== company.id) {
      return res.status(403).json({
        success: false,
        message: "You can only approve requests for your own company",
      });
    }

    // Check if already approved
    if (verificationRequest.status === "APPROVED") {
      return res.status(400).json({
        success: false,
        message: "Request is already approved",
      });
    }

    // Update request to APPROVED and create DealerCompany relationship
    const updatedRequest = await prismaWithVerification.$transaction(async (tx: any) => {
      // Update verification status
      const request = await tx.dealerVerificationRequest.update({
        where: { id },
        data: {
          status: "APPROVED" as any,
          rejectedCount: 0, // Clear rejection count on approval
          lastRejectedAt: null,
        },
      });

      // Create or update DealerCompany relationship
      const existingLink = await tx.dealerCompany.findUnique({
        where: {
          dealerId_companyId: {
            dealerId: verificationRequest.dealerId,
            companyId: verificationRequest.companyId,
          },
        },
      });

      if (!existingLink) {
        await tx.dealerCompany.create({
          data: {
            dealerId: verificationRequest.dealerId,
            companyId: verificationRequest.companyId,
            connectedVia: "VERIFICATION",
            connectedAt: new Date(),
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
    console.error("Approve verification request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== REJECT VERIFICATION REQUEST ====================
export const rejectVerificationRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only company admins can reject
    if (currentUserRole !== UserRole.COMPANY) {
      return res.status(403).json({
        success: false,
        message: "Only company admins can reject verification requests",
      });
    }

    // Get company for current user
    const company = await prisma.company.findUnique({
      where: { ownerId: currentUserId },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company account not found",
      });
    }

    // Get verification request
    const verificationRequest = await prismaWithVerification.dealerVerificationRequest.findUnique({
      where: { id },
    });

    if (!verificationRequest) {
      return res.status(404).json({
        success: false,
        message: "Verification request not found",
      });
    }

    // Verify request belongs to this company
    if (verificationRequest.companyId !== company.id) {
      return res.status(403).json({
        success: false,
        message: "You can only reject requests for your own company",
      });
    }

    // Check if already rejected
    if (verificationRequest.status === "REJECTED") {
      return res.status(400).json({
        success: false,
        message: "Request is already rejected",
      });
    }

    // Get all previous rejections for this dealer-company pair
    const previousRejections = await prismaWithVerification.dealerVerificationRequest.findMany({
      where: {
        dealerId: verificationRequest.dealerId,
        companyId: verificationRequest.companyId,
        status: "REJECTED" as any,
      },
    });

    const newRejectedCount = previousRejections.length + 1;

    // Update request to REJECTED
    const updatedRequest = await prismaWithVerification.dealerVerificationRequest.update({
      where: { id },
      data: {
        status: "REJECTED" as any,
        rejectedCount: newRejectedCount,
        lastRejectedAt: new Date(),
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
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: updatedRequest,
      message: "Verification request rejected",
    });
  } catch (error: any) {
    console.error("Reject verification request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== ACKNOWLEDGE VERIFICATION REQUEST ====================
export const acknowledgeVerificationRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only dealers can acknowledge
    if (currentUserRole !== UserRole.DEALER) {
      return res.status(403).json({
        success: false,
        message: "Only dealers can acknowledge verification requests",
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
    const verificationRequest = await prismaWithVerification.dealerVerificationRequest.findUnique({
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
        message: "You can only acknowledge your own verification requests",
      });
    }

    // Update acknowledgedAt
    const updatedRequest = await prismaWithVerification.dealerVerificationRequest.update({
      where: { id },
      data: {
        acknowledgedAt: new Date(),
      },
    });

    return res.json({
      success: true,
      data: updatedRequest,
      message: "Verification request acknowledged",
    });
  } catch (error: any) {
    console.error("Acknowledge verification request error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== GET DEALER'S APPROVED COMPANIES ====================
export const getDealerCompanies = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only dealers can view their companies
    if (currentUserRole !== UserRole.DEALER) {
      return res.status(403).json({
        success: false,
        message: "Only dealers can view their companies",
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

    // Get all companies connected to this dealer via DealerCompany relationship
    const dealerCompanies = await (prisma as any).dealerCompany.findMany({
      where: {
        dealerId: dealer.id,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
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

    // Extract companies with connection info
    const companies = dealerCompanies.map((dc: any) => ({
      ...dc.company,
      connectedAt: dc.connectedAt,
      connectedVia: dc.connectedVia,
      dealerCompanyId: dc.id,
    }));

    return res.json({
      success: true,
      data: companies,
    });
  } catch (error: any) {
    console.error("Get dealer companies error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ==================== GET COMPANY DETAILS FOR DEALER ====================
export const getCompanyDetailsForDealer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { companyId } = req.params;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Only dealers can access
    if (currentUserRole !== UserRole.DEALER) {
      return res.status(403).json({
        success: false,
        message: "Only dealers can view company details",
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

    // Verify dealer has connection to this company via DealerCompany relationship
    const dealerCompanyLink = await (prisma as any).dealerCompany.findUnique({
      where: {
        dealerId_companyId: {
          dealerId: dealer.id,
          companyId: companyId,
        },
      },
    });

    if (!dealerCompanyLink) {
      return res.status(403).json({
        success: false,
        message: "You are not connected to this company",
      });
    }

    // Get company details
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        address: true,
        owner: {
          select: {
            name: true,
            phone: true,
          },
        },
        _count: {
          select: {
            companySales: true,
            consignments: true,
          },
        },
      },
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    return res.json({
      success: true,
      data: company,
    });
  } catch (error: any) {
    console.error("Get company details for dealer error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
