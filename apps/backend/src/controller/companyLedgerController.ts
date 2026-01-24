import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { CompanyService } from "../services/companyService";
import { CompanyDealerAccountService } from "../services/companyDealerAccountService";
import { Prisma } from "@prisma/client";

// ==================== GET COMPANY LEDGER ENTRIES ====================
export const getCompanyLedgerEntries = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const {
      page = 1,
      limit = 50,
      type,
      partyId,
      startDate,
      endDate,
    } = req.query;

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const result = await CompanyService.getLedgerEntries({
      companyId: company.id,
      type: type as string,
      partyId: partyId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: Number(page),
      limit: Number(limit),
    });

    return res.status(200).json({
      success: true,
      data: result.entries,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error: any) {
    console.error("Get company ledger entries error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET COMPANY LEDGER PARTIES ====================
export const getCompanyLedgerParties = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { search } = req.query;

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Get all dealers with accounts
    const dealers = await prisma.dealer.findMany({
      where: {
        OR: [
          { userId: userId }, // Static dealers
          { ownerId: { not: null } }, // Platform dealers
        ],
        ...(search
          ? {
              OR: [
                { name: { contains: search as string, mode: "insensitive" } },
                { contact: { contains: search as string, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        companyAccounts: {
          where: { companyId: company.id },
          select: {
            balance: true,
            totalSales: true,
            lastSaleDate: true,
            lastPaymentDate: true,
          },
        },
      },
    });

    // Map dealers with their account balances
    const partiesWithBalance = dealers.map((dealer) => {
      const account = dealer.companyAccounts[0]; // One account per company-dealer pair
      
      return {
        id: dealer.id,
        name: dealer.name,
        contact: dealer.contact,
        address: dealer.address,
        balance: account ? Number(account.balance) : 0,
        lastTransactionDate: account?.lastSaleDate || account?.lastPaymentDate || null,
        totalSales: account ? Number(account.totalSales) : 0,
      };
    });

    // Filter out dealers with no balance and no sales
    const activeParties = partiesWithBalance.filter(
      (p) => p.balance !== 0 || p.totalSales > 0
    );

    return res.status(200).json({
      success: true,
      data: activeParties,
    });
  } catch (error: any) {
    console.error("Get company ledger parties error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET COMPANY LEDGER SUMMARY ====================
export const getCompanyLedgerSummary = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { startDate, endDate } = req.query;

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const stats = await CompanyService.getStatistics(
      company.id,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    // Get pending payment requests
    const pendingRequests = await prisma.paymentRequest.count({
      where: {
        companyId: company.id,
        status: { in: ["PENDING", "ACCEPTED", "PAYMENT_SUBMITTED"] },
      },
    });

    // Get total outstanding from all dealer accounts
    const accountsBalance = await prisma.companyDealerAccount.aggregate({
      where: { companyId: company.id },
      _sum: { balance: true },
    });

    // Get total payments received
    const totalPayments = await prisma.companyDealerPayment.aggregate({
      where: {
        account: {
          companyId: company.id,
        },
        ...(startDate || endDate
          ? {
              paymentDate: {
                ...(startDate ? { gte: new Date(startDate as string) } : {}),
                ...(endDate ? { lte: new Date(endDate as string) } : {}),
              },
            }
          : {}),
      },
      _sum: {
        amount: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        totalSales: stats.totalSales,
        totalRevenue: stats.totalRevenue,
        totalOutstanding: Number(accountsBalance._sum.balance || 0),
        totalReceived: Number(totalPayments._sum.amount || 0),
        pendingRequests,
        activeConsignments: stats.activeConsignments,
      },
    });
  } catch (error: any) {
    console.error("Get company ledger summary error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== ADD COMPANY PAYMENT ====================
export const addCompanyPayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { dealerId, saleId, amount, paymentMethod, date, notes } = req.body;

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

    // Record payment to dealer's account (account-based system only)
    await CompanyDealerAccountService.recordPayment({
      companyId: company.id,
      dealerId,
      amount: Number(amount),
      paymentMethod: paymentMethod || "CASH",
      paymentDate: date ? new Date(date) : new Date(),
      notes,
      recordedById: userId as string,
    });

    return res.status(201).json({
      success: true,
      message: "Payment recorded successfully",
    });
  } catch (error: any) {
    console.error("Add company payment error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

