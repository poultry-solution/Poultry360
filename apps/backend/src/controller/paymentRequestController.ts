import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { CompanyService } from "../services/companyService";
import {
  PaymentRequestStatus,
  PaymentRequestDirection,
} from "@prisma/client";

// ==================== COMPANY: CREATE PAYMENT REQUEST ====================
// Account-based only: payment is applied to company-dealer account ledger (no sale linkage).
export const createCompanyPaymentRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { dealerId, amount, description } = req.body;

    // Validation
    if (!dealerId || !amount || amount <= 0) {
      return res.status(400).json({
        message: "Dealer ID and valid amount are required",
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

    // Verify dealer exists
    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const paymentRequest = await CompanyService.createPaymentRequest({
      companyId: company.id,
      dealerId,
      requestedById: userId as string,
      amount: Number(amount),
      companySaleId: undefined,
      description,
      direction: PaymentRequestDirection.COMPANY_TO_DEALER,
    });

    return res.status(201).json({
      success: true,
      data: paymentRequest,
      message: "Payment request created successfully",
    });
  } catch (error: any) {
    console.error("Create company payment request error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== COMPANY: GET PAYMENT REQUESTS ====================
export const getCompanyPaymentRequests = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const {
      page = 1,
      limit = 50,
      status,
      direction,
      dealerId,
    } = req.query;

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const result = await CompanyService.getPaymentRequests({
      companyId: company.id,
      dealerId: dealerId as string,
      status: status as PaymentRequestStatus,
      direction: direction as PaymentRequestDirection,
      page: Number(page),
      limit: Number(limit),
    });

    return res.status(200).json({
      success: true,
      data: result.requests,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error: any) {
    console.error("Get company payment requests error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== COMPANY: ACCEPT PAYMENT REQUEST ====================
export const acceptCompanyPaymentRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const updated = await CompanyService.acceptPaymentRequest({
      requestId: id,
      companyId: company.id,
      acceptedById: userId as string,
    });

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Payment request accepted successfully",
    });
  } catch (error: any) {
    console.error("Accept company payment request error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== COMPANY: VERIFY PAYMENT REQUEST ====================
export const verifyCompanyPaymentRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { isApproved, reviewNotes } = req.body;

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    if (typeof isApproved !== "boolean") {
      return res.status(400).json({
        message: "isApproved must be a boolean",
      });
    }

    const updated = await CompanyService.verifyPaymentRequest({
      requestId: id,
      companyId: company.id,
      reviewedById: userId as string,
      isApproved,
      reviewNotes,
    });

    return res.status(200).json({
      success: true,
      data: updated,
      message: isApproved
        ? "Payment verified and approved"
        : "Payment request rejected",
    });
  } catch (error: any) {
    console.error("Verify company payment request error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== DEALER: GET PAYMENT REQUESTS ====================
export const getDealerPaymentRequests = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const {
      page = 1,
      limit = 50,
      status,
      direction,
    } = req.query;

    // Get dealer
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const result = await CompanyService.getPaymentRequests({
      dealerId: dealer.id,
      status: status as PaymentRequestStatus,
      direction: direction as PaymentRequestDirection,
      page: Number(page),
      limit: Number(limit),
    });

    return res.status(200).json({
      success: true,
      data: result.requests,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error: any) {
    console.error("Get dealer payment requests error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DEALER: ACCEPT PAYMENT REQUEST ====================
export const acceptDealerPaymentRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Get dealer
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const updated = await CompanyService.acceptPaymentRequest({
      requestId: id,
      dealerId: dealer.id,
      acceptedById: userId as string,
    });

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Payment request accepted",
    });
  } catch (error: any) {
    console.error("Accept dealer payment request error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== DEALER: SUBMIT PAYMENT PROOF ====================
export const submitDealerPaymentProof = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const {
      paymentMethod,
      paymentReference,
      paymentReceiptUrl,
      paymentDate,
    } = req.body;

    // Validation
    if (!paymentMethod) {
      return res.status(400).json({
        message: "Payment method is required",
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

    const updated = await CompanyService.submitPaymentProof({
      requestId: id,
      dealerId: dealer.id,
      submittedById: userId as string,
      paymentMethod,
      paymentReference,
      paymentReceiptUrl,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
    });

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Payment proof submitted successfully",
    });
  } catch (error: any) {
    console.error("Submit dealer payment proof error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== DEALER: CREATE PAYMENT REQUEST ====================
export const createDealerPaymentRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const {
      companyId,
      amount,
      companySaleId,
      description,
      paymentMethod,
      paymentReference,
      paymentReceiptUrl,
      paymentDate,
    } = req.body;

    // Validation
    if (!companyId || !amount || amount <= 0) {
      return res.status(400).json({
        message: "Company ID and valid amount are required",
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        message: "Payment method is required",
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

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // If saleId provided, validate that it exists
    if (companySaleId) {
      const sale = await prisma.companySale.findFirst({
        where: {
          id: companySaleId,
          companyId,
          dealerId: dealer.id,
        },
      });

      if (!sale) {
        return res.status(404).json({
          message: "Sale not found or does not belong to this company/dealer",
        });
      }

      // Note: We allow amount > sale.dueAmount because overflow will be auto-applied to other sales
    }

    // Create payment request (dealer-initiated)
    const paymentRequest = await CompanyService.createPaymentRequest({
      companyId,
      dealerId: dealer.id,
      requestedById: userId as string,
      amount: Number(amount),
      companySaleId,
      description,
      direction: PaymentRequestDirection.DEALER_TO_COMPANY,
    });

    // Immediately submit payment proof since dealer has already paid
    const updated = await CompanyService.submitPaymentProof({
      requestId: paymentRequest.id,
      dealerId: dealer.id,
      submittedById: userId as string,
      paymentMethod,
      paymentReference,
      paymentReceiptUrl,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
    });

    return res.status(201).json({
      success: true,
      data: updated,
      message: "Payment proof submitted successfully. Waiting for company verification.",
    });
  } catch (error: any) {
    console.error("Create dealer payment request error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== CANCEL PAYMENT REQUEST ====================
export const cancelPaymentRequest = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Determine if company or dealer
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company && !dealer) {
      return res.status(404).json({ message: "Company or dealer not found" });
    }

    const updated = await CompanyService.cancelPaymentRequest({
      requestId: id,
      companyId: company?.id,
      dealerId: dealer?.id,
      cancelledById: userId as string,
    });

    return res.status(200).json({
      success: true,
      data: updated,
      message: "Payment request cancelled successfully",
    });
  } catch (error: any) {
    console.error("Cancel payment request error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

