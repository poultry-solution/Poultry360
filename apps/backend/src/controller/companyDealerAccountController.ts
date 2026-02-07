import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { CompanyDealerAccountService } from "../services/companyDealerAccountService";

// ==================== GET DEALER ACCOUNT (COMPANY SIDE) ====================
export const getDealerAccount = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { dealerId } = req.params;

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

    // Get or create account
    const account = await CompanyDealerAccountService.getOrCreateAccount(
      company.id,
      dealerId
    );

    return res.status(200).json({
      success: true,
      data: {
        id: account.id,
        balance: Number(account.balance),
        totalSales: Number(account.totalSales),
        totalPayments: Number(account.totalPayments),
        lastSaleDate: account.lastSaleDate,
        lastPaymentDate: account.lastPaymentDate,
        balanceLimit: account.balanceLimit != null ? Number(account.balanceLimit) : null,
        balanceLimitSetAt: account.balanceLimitSetAt,
        balanceLimitSetBy: account.balanceLimitSetBy,
        dealer: account.dealer,
        company: account.company,
      },
    });
  } catch (error: any) {
    console.error("Get dealer account error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET DEALER ACCOUNT STATEMENT (COMPANY SIDE) ====================
export const getDealerAccountStatement = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { dealerId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const statement = await CompanyDealerAccountService.getAccountStatement({
      companyId: company.id,
      dealerId,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: Number(page),
      limit: Number(limit),
    });

    return res.status(200).json({
      success: true,
      data: statement,
    });
  } catch (error: any) {
    console.error("Get dealer account statement error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== RECORD PAYMENT (COMPANY SIDE) ====================
export const recordDealerPayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { dealerId } = req.params;
    const {
      amount,
      paymentMethod,
      paymentDate,
      notes,
      reference,
      receiptImageUrl,
      proofImageUrl,
    } = req.body;

    // Validation
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Valid payment amount is required",
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

    // Record payment
    const result = await CompanyDealerAccountService.recordPayment({
      companyId: company.id,
      dealerId,
      amount: Number(amount),
      paymentMethod,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      notes,
      reference,
      receiptImageUrl,
      proofImageUrl,
      recordedById: userId as string,
    });

    return res.status(201).json({
      success: true,
      data: {
        payment: result.payment,
        account: {
          id: result.account.id,
          balance: Number(result.account.balance),
          totalSales: Number(result.account.totalSales),
          totalPayments: Number(result.account.totalPayments),
        },
      },
      message: "Payment recorded successfully",
    });
  } catch (error: any) {
    console.error("Record dealer payment error:", error);
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

// ==================== GET COMPANY ACCOUNT (DEALER SIDE) ====================
export const getCompanyAccount = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { companyId } = req.params;

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

    // Get or create account
    const account = await CompanyDealerAccountService.getOrCreateAccount(
      companyId,
      dealer.id
    );

    return res.status(200).json({
      success: true,
      data: {
        id: account.id,
        balance: Number(account.balance),
        totalSales: Number(account.totalSales),
        totalPayments: Number(account.totalPayments),
        lastSaleDate: account.lastSaleDate,
        lastPaymentDate: account.lastPaymentDate,
        dealer: account.dealer,
        company: account.company,
      },
    });
  } catch (error: any) {
    console.error("Get company account error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET COMPANY ACCOUNT STATEMENT (DEALER SIDE) ====================
export const getCompanyAccountStatement = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { companyId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    // Get dealer
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const statement = await CompanyDealerAccountService.getAccountStatement({
      companyId,
      dealerId: dealer.id,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: Number(page),
      limit: Number(limit),
    });

    return res.status(200).json({
      success: true,
      data: statement,
    });
  } catch (error: any) {
    console.error("Get company account statement error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== RECORD PAYMENT (DEALER SIDE) ====================
export const recordCompanyPayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { companyId } = req.params;
    const {
      amount,
      paymentMethod,
      paymentDate,
      notes,
      reference,
      receiptImageUrl,
      proofImageUrl,
    } = req.body;

    // Validation
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Valid payment amount is required",
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

    // Record payment
    const result = await CompanyDealerAccountService.recordPayment({
      companyId,
      dealerId: dealer.id,
      amount: Number(amount),
      paymentMethod,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      notes,
      reference,
      receiptImageUrl,
      proofImageUrl,
      recordedById: userId as string,
    });

    return res.status(201).json({
      success: true,
      data: {
        payment: result.payment,
        account: {
          id: result.account.id,
          balance: Number(result.account.balance),
          totalSales: Number(result.account.totalSales),
          totalPayments: Number(result.account.totalPayments),
        },
      },
      message: "Payment recorded successfully",
    });
  } catch (error: any) {
    console.error("Record company payment error:", error);
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

// ==================== SET DEALER BALANCE LIMIT (COMPANY SIDE) ====================
export const setDealerBalanceLimit = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { dealerId } = req.params;
    const { balanceLimit } = req.body;

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const dealer = await prisma.dealer.findUnique({
      where: { id: dealerId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const normalizedLimit =
      balanceLimit === undefined || balanceLimit === null || balanceLimit === ""
        ? null
        : Number(balanceLimit);

    if (normalizedLimit !== null && (isNaN(normalizedLimit) || normalizedLimit < 0)) {
      return res.status(400).json({
        message: "Balance limit must be a non-negative number or null",
      });
    }

    const account = await CompanyDealerAccountService.setBalanceLimit({
      companyId: company.id,
      dealerId,
      balanceLimit: normalizedLimit,
      setById: userId as string,
    });

    return res.status(200).json({
      success: true,
      data: {
        id: account.id,
        balance: Number(account.balance),
        balanceLimit: account.balanceLimit != null ? Number(account.balanceLimit) : null,
        balanceLimitSetAt: account.balanceLimitSetAt,
        balanceLimitSetBy: account.balanceLimitSetBy,
      },
      message: "Balance limit updated successfully",
    });
  } catch (error: any) {
    console.error("Set dealer balance limit error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CHECK DEALER BALANCE LIMIT (COMPANY SIDE) ====================
export const checkDealerBalanceLimit = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { dealerId } = req.params;
    const { saleAmount } = req.body;

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const parsed = Number(saleAmount);
    if (
      !Number.isFinite(parsed) ||
      parsed < 0
    ) {
      return res.status(400).json({
        message: "Valid sale amount is required",
      });
    }

    const result = await CompanyDealerAccountService.checkBalanceLimit({
      companyId: company.id,
      dealerId,
      saleAmount: parsed,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Check dealer balance limit error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET ALL COMPANY ACCOUNTS (COMPANY SIDE) ====================
export const getAllDealerAccounts = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const accounts = await CompanyDealerAccountService.getCompanyAccounts(
      company.id
    );

    return res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (error: any) {
    console.error("Get all dealer accounts error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET ALL COMPANY ACCOUNTS (DEALER SIDE) ====================
export const getAllCompanyAccounts = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;

    // Get dealer
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const accounts = await CompanyDealerAccountService.getDealerAccounts(
      dealer.id
    );

    return res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (error: any) {
    console.error("Get all company accounts error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET ALL DEALER PAYMENTS (COMPANY SIDE) ====================
export const getAllDealerPayments = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { startDate, endDate, page = 1, limit = 50, dealerId } = req.query;

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const result = await CompanyDealerAccountService.getAllPayments({
      companyId: company.id,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: Number(page),
      limit: Number(limit),
      dealerId: dealerId as string,
    });

    return res.status(200).json({
      success: true,
      data: result.payments,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("Get all dealer payments error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
