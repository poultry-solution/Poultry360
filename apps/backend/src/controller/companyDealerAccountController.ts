import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { CompanyDealerAccountService } from "../services/companyDealerAccountService";
import { Prisma, UserRole } from "@prisma/client";

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

    const adjustments = await (prisma as any).companyDealerAccountAdjustment.findMany({
      where: { accountId: account.id, type: "OPENING_BALANCE" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

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
        openingBalanceCurrent:
          (account as any).openingBalanceCurrent != null
            ? Number((account as any).openingBalanceCurrent)
            : null,
        openingBalanceProposed:
          (account as any).openingBalanceProposed != null
            ? Number((account as any).openingBalanceProposed)
            : null,
        openingBalanceStatus: (account as any).openingBalanceStatus ?? null,
        openingBalanceHistory: adjustments.map((a: any) => ({
          id: a.id,
          amount: Number(a.amount),
          status: a.status,
          notes: a.notes,
          createdAt: a.createdAt,
          createdByRole: a.createdByRole,
          respondedAt: a.respondedAt,
          dealerResponseNote: a.dealerResponseNote,
        })),
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

    const adjustments = await (prisma as any).companyDealerAccountAdjustment.findMany({
      where: { accountId: account.id, type: "OPENING_BALANCE" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.status(200).json({
      success: true,
      data: {
        id: account.id,
        balance: Number(account.balance),
        totalSales: Number(account.totalSales),
        totalPayments: Number(account.totalPayments),
        lastSaleDate: account.lastSaleDate,
        lastPaymentDate: account.lastPaymentDate,
        openingBalanceCurrent:
          (account as any).openingBalanceCurrent != null
            ? Number((account as any).openingBalanceCurrent)
            : null,
        openingBalanceProposed:
          (account as any).openingBalanceProposed != null
            ? Number((account as any).openingBalanceProposed)
            : null,
        openingBalanceStatus: (account as any).openingBalanceStatus ?? null,
        openingBalanceHistory: adjustments.map((a: any) => ({
          id: a.id,
          amount: Number(a.amount),
          status: a.status,
          notes: a.notes,
          createdAt: a.createdAt,
          createdByRole: a.createdByRole,
          respondedAt: a.respondedAt,
          dealerResponseNote: a.dealerResponseNote,
        })),
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

// ==================== PROPOSE OPENING BALANCE (COMPANY SIDE, NEEDS DEALER ACK) ====================
export const proposeDealerOpeningBalance = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const role = req.role;
    const { connectionId } = req.params;
    const { openingBalance, notes } = req.body;

    if (role !== (UserRole as any).COMPANY) {
      return res.status(403).json({ message: "Only company can propose opening balance" });
    }

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!company) return res.status(404).json({ message: "Company not found" });

    const numericOpening = Number(openingBalance);
    if (!Number.isFinite(numericOpening)) {
      return res.status(400).json({ message: "openingBalance must be a valid number" });
    }
    if (numericOpening === 0) {
      return res.status(400).json({ message: "openingBalance cannot be 0 for proposal" });
    }

    const connection = await prisma.dealerCompany.findUnique({
      where: { id: connectionId },
      select: { id: true, companyId: true, dealerId: true },
    });
    if (!connection || connection.companyId !== company.id) {
      return res.status(404).json({ message: "Connection not found" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.companyDealerAccount.upsert({
        where: { companyId_dealerId: { companyId: connection.companyId, dealerId: connection.dealerId } },
        create: {
          companyId: connection.companyId,
          dealerId: connection.dealerId,
          balance: new Prisma.Decimal(0),
          totalSales: new Prisma.Decimal(0),
          totalPayments: new Prisma.Decimal(0),
          openingBalanceProposed: new Prisma.Decimal(numericOpening),
          openingBalanceStatus: "PENDING_ACK" as any,
        },
        update: {
          openingBalanceProposed: new Prisma.Decimal(numericOpening),
          openingBalanceStatus: "PENDING_ACK" as any,
        },
        select: { id: true },
      });

      const adj = await (tx as any).companyDealerAccountAdjustment.create({
        data: {
          accountId: account.id,
          type: "OPENING_BALANCE",
          amount: new Prisma.Decimal(numericOpening),
          notes: notes ? String(notes) : "Opening balance",
          createdByRole: "COMPANY",
          createdById: userId,
          status: "PENDING_ACK",
        },
      });

      return { accountId: account.id, adjustment: adj };
    });

    return res.status(200).json({
      success: true,
      data: {
        accountId: result.accountId,
        proposal: {
          id: result.adjustment.id,
          amount: Number(result.adjustment.amount),
          status: result.adjustment.status,
          notes: result.adjustment.notes,
          createdAt: result.adjustment.createdAt,
        },
      },
      message: "Opening balance proposed. Dealer approval required.",
    });
  } catch (error: any) {
    console.error("Propose opening balance error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// Same as above but uses dealerId (for company dealer account page URL)
export const proposeDealerOpeningBalanceForDealer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const role = req.role;
    const { dealerId } = req.params;
    const { openingBalance, notes } = req.body;

    if (role !== (UserRole as any).COMPANY) {
      return res.status(403).json({ message: "Only company can propose opening balance" });
    }

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!company) return res.status(404).json({ message: "Company not found" });

    const numericOpening = Number(openingBalance);
    if (!Number.isFinite(numericOpening)) {
      return res.status(400).json({ message: "openingBalance must be a valid number" });
    }
    if (numericOpening === 0) {
      return res.status(400).json({ message: "openingBalance cannot be 0 for proposal" });
    }

    const connection = await prisma.dealerCompany.findUnique({
      where: { dealerId_companyId: { dealerId, companyId: company.id } },
      select: { id: true, companyId: true, dealerId: true },
    });
    if (!connection) {
      return res.status(404).json({ message: "Connection not found" });
    }

    // Reuse logic by calling the connectionId-based implementation via a local shim.
    (req as any).params.connectionId = connection.id;
    return await proposeDealerOpeningBalance(req, res);
  } catch (error: any) {
    console.error("Propose opening balance (dealerId) error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// ==================== DEALER: ACK/DISPUTE OPENING BALANCE PROPOSAL ====================
export const acknowledgeCompanyOpeningBalance = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const role = req.role;
    const { companyId } = req.params;
    const { note } = req.body;

    if (role !== (UserRole as any).DEALER) {
      return res.status(403).json({ message: "Only dealer can acknowledge opening balance" });
    }

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.companyDealerAccount.findUnique({
        where: { companyId_dealerId: { companyId, dealerId: dealer.id } },
        select: { id: true, openingBalanceProposed: true },
      });
      if (!account) throw new Error("Account not found");

      const pending = await (tx as any).companyDealerAccountAdjustment.findFirst({
        where: { accountId: account.id, type: "OPENING_BALANCE", status: "PENDING_ACK" },
        orderBy: { createdAt: "desc" },
      });
      if (!pending) return { ok: false as const, message: "No pending opening balance proposal" };

      const proposed = account.openingBalanceProposed != null ? Number(account.openingBalanceProposed) : Number(pending.amount);

      const prevAck = await (tx as any).companyDealerAccountAdjustment.findFirst({
        where: { accountId: account.id, type: "OPENING_BALANCE", status: "ACKNOWLEDGED" },
        orderBy: { createdAt: "desc" },
        select: { amount: true },
      });
      const prevAckAmount = prevAck ? Number(prevAck.amount) : 0;
      const delta = proposed - prevAckAmount;

      await tx.companyDealerAccount.update({
        where: { id: account.id },
        data: {
          balance: { increment: new Prisma.Decimal(delta) },
          openingBalanceCurrent: new Prisma.Decimal(proposed),
          openingBalanceProposed: null,
          openingBalanceStatus: "ACKNOWLEDGED" as any,
        },
      });

      const updated = await (tx as any).companyDealerAccountAdjustment.update({
        where: { id: pending.id },
        data: {
          status: "ACKNOWLEDGED",
          dealerResponseNote: note ? String(note) : null,
          respondedAt: new Date(),
        },
      });

      return { ok: true as const, adjustment: updated, delta };
    });

    if (!result.ok) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({
      success: true,
      data: {
        deltaApplied: result.delta,
        openingBalance: {
          id: result.adjustment.id,
          amount: Number(result.adjustment.amount),
          status: result.adjustment.status,
          respondedAt: result.adjustment.respondedAt,
        },
      },
      message: "Opening balance acknowledged",
    });
  } catch (error: any) {
    console.error("Acknowledge opening balance error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

export const disputeCompanyOpeningBalance = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const role = req.role;
    const { companyId } = req.params;
    const { note } = req.body;

    if (role !== (UserRole as any).DEALER) {
      return res.status(403).json({ message: "Only dealer can dispute opening balance" });
    }

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!dealer) return res.status(404).json({ message: "Dealer not found" });

    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.companyDealerAccount.findUnique({
        where: { companyId_dealerId: { companyId, dealerId: dealer.id } },
        select: { id: true },
      });
      if (!account) throw new Error("Account not found");

      const pending = await (tx as any).companyDealerAccountAdjustment.findFirst({
        where: { accountId: account.id, type: "OPENING_BALANCE", status: "PENDING_ACK" },
        orderBy: { createdAt: "desc" },
      });
      if (!pending) return { ok: false as const, message: "No pending opening balance proposal" };

      await tx.companyDealerAccount.update({
        where: { id: account.id },
        data: {
          openingBalanceProposed: null,
          openingBalanceStatus: "DISPUTED" as any,
        },
      });

      const updated = await (tx as any).companyDealerAccountAdjustment.update({
        where: { id: pending.id },
        data: {
          status: "DISPUTED",
          dealerResponseNote: note ? String(note) : null,
          respondedAt: new Date(),
        },
      });

      return { ok: true as const, adjustment: updated };
    });

    if (!result.ok) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({
      success: true,
      data: {
        openingBalance: {
          id: result.adjustment.id,
          amount: Number(result.adjustment.amount),
          status: result.adjustment.status,
          respondedAt: result.adjustment.respondedAt,
        },
      },
      message: "Opening balance disputed",
    });
  } catch (error: any) {
    console.error("Dispute opening balance error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
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
