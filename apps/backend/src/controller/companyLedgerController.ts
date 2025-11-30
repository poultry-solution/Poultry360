import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { CompanyService } from "../services/companyService";
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

    // Get all dealers with sales
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
        companySales: {
          where: { companyId: company.id },
          select: {
            id: true,
            totalAmount: true,
            paidAmount: true,
            dueAmount: true,
            date: true,
          },
        },
      },
    });

    // Calculate balance for each dealer from actual sales
    const partiesWithBalance = dealers.map((dealer) => {
      // Calculate balance from actual sales (sum of dueAmount)
      const balance = dealer.companySales.reduce((sum, sale) => {
        const due = Number(sale.dueAmount || 0);
        return sum + due;
      }, 0);

      // Get last transaction date
      const lastSale = dealer.companySales
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      return {
        id: dealer.id,
        name: dealer.name,
        contact: dealer.contact,
        address: dealer.address,
        balance: Math.max(0, balance),
        lastTransactionDate: lastSale?.date || null,
        totalSales: dealer.companySales.length,
      };
    });

    // Filter out dealers with no balance and no sales
    const activeParties = partiesWithBalance.filter(
      (p) => p.balance > 0 || p.totalSales > 0
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

    // Get total received (from payments)
    const totalReceived = await prisma.companySalePayment.aggregate({
      where: {
        companySale: {
          companyId: company.id,
          ...(startDate || endDate
            ? {
                date: {
                  ...(startDate ? { gte: new Date(startDate as string) } : {}),
                  ...(endDate ? { lte: new Date(endDate as string) } : {}),
                },
              }
            : {}),
        },
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
        totalDue: stats.totalDue,
        totalReceived: Number(totalReceived._sum.amount || 0),
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

    // If saleId is provided, use existing payment flow
    if (saleId) {
      const updatedSale = await CompanyService.addSalePayment({
        saleId,
        companyId: company.id,
        amount: Number(amount),
        date: date ? new Date(date) : new Date(),
        description: notes,
        paymentMethod,
      });

      return res.status(201).json({
        success: true,
        data: updatedSale,
        message: "Payment added successfully",
      });
    }

    // For general payments (not linked to a specific sale)
    // We need to find the most recent sale with due amount and apply payment
    const saleWithDue = await prisma.companySale.findFirst({
      where: {
        companyId: company.id,
        dealerId,
        dueAmount: { gt: 0 },
      },
      orderBy: { date: "asc" }, // Oldest first (FIFO)
    });

    if (saleWithDue) {
      const updatedSale = await CompanyService.addSalePayment({
        saleId: saleWithDue.id,
        companyId: company.id,
        amount: Number(amount),
        date: date ? new Date(date) : new Date(),
        description: notes || "General payment",
        paymentMethod,
      });

      return res.status(201).json({
        success: true,
        data: updatedSale,
        message: "Payment added successfully",
      });
    }

    // No sale with due amount found
    return res.status(400).json({
      message: "No outstanding balance found for this dealer",
    });
  } catch (error: any) {
    console.error("Add company payment error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

