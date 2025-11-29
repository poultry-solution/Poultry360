import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import { DealerService } from "../services/dealerService";

// ==================== CREATE CONSIGNMENT REQUEST (DEALER TO COMPANY) ====================
export const createConsignmentRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { items, notes } = req.body;

    // Validation
    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "At least one item is required",
      });
    }

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      include: { company: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    if (!dealer.companyId) {
      return res.status(400).json({
        message: "Dealer is not linked to any company",
      });
    }

    // Calculate total amount
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.unitPrice,
      0
    );

    // Generate request number
    const requestNumber = `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Create consignment request
    const consignment = await prisma.consignmentRequest.create({
      data: {
        requestNumber,
        direction: "DEALER_TO_COMPANY",
        status: "PENDING",
        totalAmount: new Prisma.Decimal(totalAmount),
        notes,
        fromDealerId: dealer.id,
        toFarmerId: null, // Company will be set when approved
        items: {
          create: items.map((item: any) => ({
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalAmount: new Prisma.Decimal(item.quantity * item.unitPrice),
            companyProductId: item.companyProductId,
          })),
        },
      },
      include: {
        items: {
          include: {
            companyProduct: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      data: consignment,
      message: "Consignment request created successfully",
    });
  } catch (error: any) {
    console.error("Create consignment request error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== PROPOSE CONSIGNMENT (COMPANY TO DEALER) ====================
export const proposeConsignment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { dealerId, items, notes } = req.body;

    // Validation
    if (!dealerId || !items || items.length === 0) {
      return res.status(400).json({
        message: "Dealer ID and at least one item are required",
      });
    }

    // Get the company record
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Verify dealer exists and is linked to company
    const dealer = await prisma.dealer.findFirst({
      where: {
        id: dealerId,
        companyId: company.id,
      },
    });

    if (!dealer) {
      return res.status(404).json({
        message: "Dealer not found or not linked to your company",
      });
    }

    // Calculate total amount
    const totalAmount = items.reduce(
      (sum: number, item: any) => sum + item.quantity * item.unitPrice,
      0
    );

    // Generate request number
    const requestNumber = `PROP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Create consignment proposal
    const consignment = await prisma.consignmentRequest.create({
      data: {
        requestNumber,
        direction: "COMPANY_TO_DEALER",
        status: "PENDING",
        totalAmount: new Prisma.Decimal(totalAmount),
        notes,
        fromCompanyId: company.id,
        toDealerId: dealer.id,
        items: {
          create: items.map((item: any) => ({
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalAmount: new Prisma.Decimal(item.quantity * item.unitPrice),
            companyProductId: item.companyProductId,
          })),
        },
      },
      include: {
        items: {
          include: {
            companyProduct: true,
          },
        },
        toDealer: true,
      },
    });

    return res.status(201).json({
      success: true,
      data: consignment,
      message: "Consignment proposed successfully",
    });
  } catch (error: any) {
    console.error("Propose consignment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET CONSIGNMENTS ====================
export const getConsignments = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const userRole = req.role;
    const {
      page = 1,
      limit = 10,
      status,
      direction,
      type = "incoming",
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    let where: any = {};

    if (userRole === "DEALER") {
      const dealer = await prisma.dealer.findUnique({
        where: { ownerId: userId },
      });

      if (!dealer) {
        return res.status(404).json({ message: "Dealer not found" });
      }

      if (type === "incoming") {
        where.toDealerId = dealer.id;
      } else {
        where.fromDealerId = dealer.id;
      }
    } else if (userRole === "COMPANY") {
      const company = await prisma.company.findUnique({
        where: { ownerId: userId },
      });

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      if (type === "incoming") {
        where.OR = [
          { fromDealerId: { in: await getDealerIds(company.id) } },
        ];
      } else {
        where.fromCompanyId = company.id;
      }
    }

    if (status) {
      where.status = status;
    }

    if (direction) {
      where.direction = direction;
    }

    const [consignments, total] = await Promise.all([
      prisma.consignmentRequest.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              companyProduct: true,
              dealerProduct: true,
            },
          },
          fromCompany: true,
          fromDealer: true,
          toDealer: true,
          toFarmer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      }),
      prisma.consignmentRequest.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: consignments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Get consignments error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Helper function to get dealer IDs for a company
async function getDealerIds(companyId: string): Promise<string[]> {
  const dealers = await prisma.dealer.findMany({
    where: { companyId },
    select: { id: true },
  });
  return dealers.map((d) => d.id);
}

// ==================== GET CONSIGNMENT BY ID ====================
export const getConsignmentById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const consignment = await prisma.consignmentRequest.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            companyProduct: true,
            dealerProduct: true,
          },
        },
        fromCompany: true,
        fromDealer: true,
        toDealer: true,
        toFarmer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        ledgerEntries: true,
      },
    });

    if (!consignment) {
      return res.status(404).json({ message: "Consignment not found" });
    }

    // Verify access
    // TODO: Add proper authorization checks

    return res.status(200).json({
      success: true,
      data: consignment,
    });
  } catch (error: any) {
    console.error("Get consignment by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== ACCEPT CONSIGNMENT ====================
export const acceptConsignment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { items } = req.body;

    // Validation
    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "Items acceptance data is required",
      });
    }

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Process consignment acceptance using service
    const updatedConsignment = await DealerService.processConsignmentAcceptance({
      consignmentId: id,
      dealerId: dealer.id,
      items,
    });

    return res.status(200).json({
      success: true,
      data: updatedConsignment,
      message: "Consignment processed successfully",
    });
  } catch (error: any) {
    console.error("Accept consignment error:", error);
    return res.status(400).json({ message: error.message || "Internal server error" });
  }
};

// ==================== REJECT CONSIGNMENT ====================
export const rejectConsignment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { reason } = req.body;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Get consignment
    const consignment = await prisma.consignmentRequest.findUnique({
      where: { id },
    });

    if (!consignment) {
      return res.status(404).json({ message: "Consignment not found" });
    }

    if (consignment.toDealerId !== dealer.id) {
      return res.status(403).json({
        message: "Unauthorized to reject this consignment",
      });
    }

    // Update consignment
    const updatedConsignment = await prisma.consignmentRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        notes: reason ? `${consignment.notes || ""}\nRejection reason: ${reason}` : consignment.notes,
      },
      include: {
        items: {
          include: {
            companyProduct: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedConsignment,
      message: "Consignment rejected successfully",
    });
  } catch (error: any) {
    console.error("Reject consignment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== APPROVE CONSIGNMENT REQUEST (COMPANY) ====================
export const approveConsignmentRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Get the company record
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Get consignment
    const consignment = await prisma.consignmentRequest.findUnique({
      where: { id },
    });

    if (!consignment) {
      return res.status(404).json({ message: "Consignment not found" });
    }

    // Verify it's a request to the company
    if (consignment.direction !== "DEALER_TO_COMPANY") {
      return res.status(400).json({
        message: "This is not a dealer request",
      });
    }

    // Update consignment
    const updatedConsignment = await prisma.consignmentRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
      },
      include: {
        items: {
          include: {
            companyProduct: true,
          },
        },
        fromDealer: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedConsignment,
      message: "Consignment request approved successfully",
    });
  } catch (error: any) {
    console.error("Approve consignment request error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DISPATCH CONSIGNMENT (COMPANY) ====================
export const dispatchConsignment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Get the company record
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Get consignment
    const consignment = await prisma.consignmentRequest.findUnique({
      where: { id },
    });

    if (!consignment) {
      return res.status(404).json({ message: "Consignment not found" });
    }

    if (consignment.fromCompanyId !== company.id) {
      return res.status(403).json({
        message: "Unauthorized to dispatch this consignment",
      });
    }

    if (consignment.status !== "APPROVED" && consignment.status !== "PENDING") {
      return res.status(400).json({
        message: "Only approved or pending consignments can be dispatched",
      });
    }

    // Update consignment
    const updatedConsignment = await prisma.consignmentRequest.update({
      where: { id },
      data: {
        status: "DISPATCHED",
      },
      include: {
        items: {
          include: {
            companyProduct: true,
          },
        },
        toDealer: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: updatedConsignment,
      message: "Consignment dispatched successfully",
    });
  } catch (error: any) {
    console.error("Dispatch consignment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

