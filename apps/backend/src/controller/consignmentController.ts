import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { ConsignmentService } from "../services/consignmentService";
import { ConsignmentStatus, ConsignmentDirection } from "@prisma/client";

// ==================== COMPANY: CREATE CONSIGNMENT ====================
export const createCompanyConsignment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { dealerId, items, notes } = req.body;

    if (!dealerId || !items || items.length === 0) {
      return res.status(400).json({
        message: "Dealer ID and items are required",
      });
    }

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Validate dealer exists
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const consignment = await ConsignmentService.createConsignment({
      direction: ConsignmentDirection.COMPANY_TO_DEALER,
      fromCompanyId: company.id,
      toDealerId: dealerId,
      requestedById: userId as string,
      items: items.map((item: any) => ({
        companyProductId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
      notes,
    });

    return res.status(201).json({
      success: true,
      data: consignment,
      message: "Consignment created successfully",
    });
  } catch (error: any) {
    console.error("Create company consignment error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== COMPANY: GET CONSIGNMENTS ====================
export const getCompanyConsignments = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 50, status, direction, search } = req.query;

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const result = await ConsignmentService.listConsignments({
      fromCompanyId: company.id,
      status: status as ConsignmentStatus | undefined,
      direction: direction as ConsignmentDirection | undefined,
      page: Number(page),
      limit: Number(limit),
      search: search as string | undefined,
    });

    return res.status(200).json({
      success: true,
      data: result.consignments,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Get company consignments error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== COMPANY: GET CONSIGNMENT BY ID ====================
export const getCompanyConsignmentById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const consignment = await ConsignmentService.getConsignmentById(id);

    if (!consignment) {
      return res.status(404).json({ message: "Consignment not found" });
    }

    if (consignment.fromCompanyId !== company.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    return res.status(200).json({
      success: true,
      data: consignment,
    });
  } catch (error: any) {
    console.error("Get company consignment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== COMPANY: APPROVE DEALER REQUEST ====================
export const approveCompanyConsignment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { items, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "Items with accepted quantities are required",
      });
    }

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const consignment = await ConsignmentService.acceptConsignment({
      consignmentId: id,
      acceptedById: userId as string,
      items: items.map((item: any) => ({
        itemId: item.itemId,
        acceptedQuantity: Number(item.acceptedQuantity),
      })),
      notes,
    });

    return res.status(200).json({
      success: true,
      data: consignment,
      message: "Consignment approved successfully",
    });
  } catch (error: any) {
    console.error("Approve consignment error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== COMPANY: DISPATCH CONSIGNMENT ====================
export const dispatchCompanyConsignment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { dispatchRef, trackingInfo, notes } = req.body;

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const consignment = await ConsignmentService.dispatchConsignment({
      consignmentId: id,
      dispatchedById: userId as string,
      dispatchRef,
      trackingInfo,
      notes,
    });

    return res.status(200).json({
      success: true,
      data: consignment,
      message: "Consignment dispatched successfully",
    });
  } catch (error: any) {
    console.error("Dispatch consignment error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== COMPANY: REJECT CONSIGNMENT ====================
export const rejectCompanyConsignment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { reason } = req.body;

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const consignment = await ConsignmentService.rejectConsignment({
      consignmentId: id,
      rejectedById: userId as string,
      reason,
    });

    return res.status(200).json({
      success: true,
      data: consignment,
      message: "Consignment rejected",
    });
  } catch (error: any) {
    console.error("Reject consignment error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== COMPANY: CANCEL CONSIGNMENT ====================
export const cancelCompanyConsignment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { reason } = req.body;

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const consignment = await ConsignmentService.cancelConsignment({
      consignmentId: id,
      cancelledById: userId as string,
      reason,
    });

    return res.status(200).json({
      success: true,
      data: consignment,
      message: "Consignment cancelled",
    });
  } catch (error: any) {
    console.error("Cancel consignment error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== DEALER: REQUEST CONSIGNMENT ====================
export const createDealerConsignment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { companyId, items, notes } = req.body;

    if (!companyId || !items || items.length === 0) {
      return res.status(400).json({
        message: "Company ID and items are required",
      });
    }

    // Get dealer
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Validate company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const consignment = await ConsignmentService.createConsignment({
      direction: ConsignmentDirection.DEALER_TO_COMPANY,
      fromDealerId: dealer.id,
      fromCompanyId: companyId,
      toDealerId: dealer.id,
      requestedById: userId as string,
      items: items.map((item: any) => ({
        companyProductId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
      notes,
    });

    return res.status(201).json({
      success: true,
      data: consignment,
      message: "Consignment request created successfully",
    });
  } catch (error: any) {
    console.error("Create dealer consignment error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== DEALER: GET CONSIGNMENTS ====================
export const getDealerConsignments = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 50, status, direction, search } = req.query;

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const result = await ConsignmentService.listConsignments({
      toDealerId: dealer.id,
      status: status as ConsignmentStatus | undefined,
      direction: direction as ConsignmentDirection | undefined,
      page: Number(page),
      limit: Number(limit),
      search: search as string | undefined,
    });

    return res.status(200).json({
      success: true,
      data: result.consignments,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Get dealer consignments error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DEALER: GET CONSIGNMENT BY ID ====================
export const getDealerConsignmentById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const consignment = await ConsignmentService.getConsignmentById(id);

    if (!consignment) {
      return res.status(404).json({ message: "Consignment not found" });
    }

    if (consignment.toDealerId !== dealer.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    return res.status(200).json({
      success: true,
      data: consignment,
    });
  } catch (error: any) {
    console.error("Get dealer consignment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DEALER: ACCEPT CONSIGNMENT ====================
export const acceptDealerConsignment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { items, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        message: "Items with accepted quantities are required",
      });
    }

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const consignment = await ConsignmentService.acceptConsignment({
      consignmentId: id,
      acceptedById: userId as string,
      items: items.map((item: any) => ({
        itemId: item.itemId,
        acceptedQuantity: Number(item.acceptedQuantity),
      })),
      notes,
    });

    return res.status(200).json({
      success: true,
      data: consignment,
      message: "Consignment accepted successfully",
    });
  } catch (error: any) {
    console.error("Accept consignment error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== DEALER: CONFIRM RECEIPT ====================
export const confirmDealerConsignmentReceipt = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { grnRef, notes } = req.body;

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const consignment = await ConsignmentService.confirmReceipt({
      consignmentId: id,
      receivedById: userId as string,
      grnRef,
      notes,
    });

    return res.status(200).json({
      success: true,
      data: consignment,
      message: "Consignment received successfully. Sale created and inventory updated.",
    });
  } catch (error: any) {
    console.error("Confirm consignment receipt error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== DEALER: RECORD ADVANCE PAYMENT ====================
export const recordDealerAdvancePayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const {
      amount,
      paymentMethod,
      paymentReference,
      paymentDate,
      notes,
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: "Valid amount is required",
      });
    }

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Get consignment to find company
    const consignment = await prisma.consignmentRequest.findUnique({
      where: { id },
      select: { fromCompanyId: true, toDealerId: true },
    });

    if (!consignment) {
      return res.status(404).json({ message: "Consignment not found" });
    }

    if (consignment.toDealerId !== dealer.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (!consignment.fromCompanyId) {
      return res.status(400).json({
        message: "Consignment must be from a company",
      });
    }

    const ledgerEntry = await ConsignmentService.recordAdvancePayment({
      consignmentId: id,
      dealerId: dealer.id,
      companyId: consignment.fromCompanyId,
      amount: Number(amount),
      paymentMethod: paymentMethod || "CASH",
      paymentReference,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      notes,
      recordedById: userId as string,
    });

    return res.status(200).json({
      success: true,
      data: ledgerEntry,
      message: "Advance payment recorded successfully",
    });
  } catch (error: any) {
    console.error("Record advance payment error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== DEALER: REJECT CONSIGNMENT ====================
export const rejectDealerConsignment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { reason } = req.body;

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const consignment = await ConsignmentService.rejectConsignment({
      consignmentId: id,
      rejectedById: userId as string,
      reason,
    });

    return res.status(200).json({
      success: true,
      data: consignment,
      message: "Consignment rejected",
    });
  } catch (error: any) {
    console.error("Reject consignment error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== DEALER: CANCEL CONSIGNMENT ====================
export const cancelDealerConsignment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { reason } = req.body;

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const consignment = await ConsignmentService.cancelConsignment({
      consignmentId: id,
      cancelledById: userId as string,
      reason,
    });

    return res.status(200).json({
      success: true,
      data: consignment,
      message: "Consignment cancelled",
    });
  } catch (error: any) {
    console.error("Cancel consignment error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== SHARED: GET AUDIT LOGS ====================
export const getConsignmentAuditLogs = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;

    const auditLogs = await ConsignmentService.getAuditLogs(id);

    return res.status(200).json({
      success: true,
      data: auditLogs,
    });
  } catch (error: any) {
    console.error("Get audit logs error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
