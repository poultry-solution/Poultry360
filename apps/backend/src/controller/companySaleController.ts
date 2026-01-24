import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { TransactionType } from "@prisma/client";
import { CompanyService } from "../services/companyService";

// ==================== SEARCH DEALERS FOR COMPANY ====================
export const searchDealersForCompany = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { search, page = 1, limit = 50 } = req.query;

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const skip = (Number(page) - 1) * Number(limit);

    // First, get dealer IDs that are connected to this company via DealerCompany
    const dealerCompanies = await (prisma as any).dealerCompany.findMany({
      where: {
        companyId: company.id,
      },
      select: {
        dealerId: true,
      },
    });

    const connectedDealerIds = dealerCompanies.map((dc: any) => dc.dealerId);

    // Build where clause to include ONLY:
    // 1. Dealers manually created by this company (userId = currentUserId)
    // 2. Dealers connected to this company via DealerCompany relationship
    const where: any = {
      OR: [
        { userId: userId }, // Static dealers created by company
        { id: { in: connectedDealerIds.length > 0 ? connectedDealerIds : [] } }, // Connected dealers only
      ],
    };

    // Add search filter
    if (search) {
      const searchFilter = {
        OR: [
          { name: { contains: search as string, mode: "insensitive" } },
          { contact: { contains: search as string, mode: "insensitive" } },
          { address: { contains: search as string, mode: "insensitive" } },
        ],
      };

      // Combine with existing OR using AND
      where.AND = [
        {
          OR: where.OR,
        },
        searchFilter,
      ];
      delete where.OR;
    }

    const [dealers, total] = await Promise.all([
      prisma.dealer.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.dealer.count({ where }),
    ]);

    // Calculate balance and add connection metadata for each dealer
    const dealersWithBalance = await Promise.all(
      dealers.map(async (dealer) => {
        // Check if dealer is connected via DealerCompany relationship
        const dealerCompany = await (prisma as any).dealerCompany.findUnique({
          where: {
            dealerId_companyId: {
              dealerId: dealer.id,
              companyId: company.id,
            },
          },
        });

        const account = await prisma.companyDealerAccount.findUnique({
          where: {
            companyId_dealerId: {
              companyId: company.id,
              dealerId: dealer.id,
            },
          },
          select: {
            balance: true,
          },
        });

        return {
          ...dealer,
          balance: account ? Number(account.balance) : 0,
          connectionType: dealerCompany ? "CONNECTED" : "MANUAL",
          isOwnedDealer: dealer.userId === userId, // Company-created dealer
        };
      })
    );

    console.log("dealersWithBalance", dealersWithBalance);

    return res.status(200).json({
      success: true,
      data: dealersWithBalance,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Search dealers for company error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE COMPANY SALE ====================
export const createCompanySale = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { dealerId, items, paymentMethod, notes, date } = req.body;

    // Validation
    if (!dealerId) {
      return res.status(400).json({ message: "Dealer is required" });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "At least one item is required" });
    }

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Create sale using service (account-based system)
    const sale = await CompanyService.createCompanySale({
      companyId: company.id,
      dealerId,
      soldById: userId as string,
      items,
      paymentMethod,
      notes,
      date: date ? new Date(date) : new Date(),
    });

    return res.status(201).json({
      success: true,
      data: sale,
      message: "Sale created successfully",
    });
  } catch (error: any) {
    console.error("Create company sale error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== GET COMPANY SALES ====================
export const getCompanySales = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const {
      page = 1,
      limit = 10,
      search,
      startDate,
      endDate,
      isPaid,
      dealerId,
    } = req.query;

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      companyId: company.id,
    };

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search as string, mode: "insensitive" } },
        { notes: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    // Note: isPaid filter removed - use account-based balance checking instead
    // if (isPaid === "true") {
    //   where.dueAmount = null;
    // } else if (isPaid === "false") {
    //   where.dueAmount = { not: null };
    // }

    if (dealerId) {
      where.dealerId = dealerId;
    }

    const [sales, total] = await Promise.all([
      prisma.companySale.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          dealer: true,
          items: {
            include: {
              product: true,
            },
          },
          account: true,
        },
        orderBy: { date: "desc" },
      }),
      prisma.companySale.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: sales,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Get company sales error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET COMPANY SALE BY ID ====================
export const getCompanySaleById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const sale = await prisma.companySale.findFirst({
      where: {
        id,
        companyId: company.id,
      },
      include: {
        dealer: true,
        items: {
          include: {
            product: true,
          },
        },
        account: true,
        ledgerEntries: {
          orderBy: {
            date: "desc",
          },
        },
      },
    });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    return res.status(200).json({
      success: true,
      data: sale,
    });
  } catch (error: any) {
    console.error("Get company sale by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== ADD COMPANY SALE PAYMENT ====================
// Redirected to account-based payment system
export const addCompanySalePayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { amount, paymentMethod, description, date } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: "Valid amount is required",
      });
    }

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Get sale to find dealerId
    const sale = await prisma.companySale.findFirst({
      where: { id, companyId: company.id },
      select: { dealerId: true },
    });

    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    // Record payment to dealer's account (account-based system)
    const { CompanyDealerAccountService } = await import("../services/companyDealerAccountService");
    await CompanyDealerAccountService.recordPayment({
      companyId: company.id,
      dealerId: sale.dealerId,
      amount: Number(amount),
      paymentMethod: paymentMethod || "CASH",
      paymentDate: date ? new Date(date) : new Date(),
      notes: description,
      recordedById: userId as string,
    });

    return res.status(200).json({
      success: true,
      message: "Payment recorded to dealer account",
    });
  } catch (error: any) {
    console.error("Add company sale payment error:", error);
    return res
      .status(400)
      .json({ message: error.message || "Internal server error" });
  }
};

// ==================== GET COMPANY SALES STATISTICS ====================
export const getCompanySalesStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { startDate, endDate } = req.query;

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const where: any = {
      companyId: company.id,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    // Get totals
    const sales = await prisma.companySale.findMany({
      where,
    });

    const totalSales = sales.length;
    const totalRevenue = sales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount),
      0
    );
    const creditSales = sales.filter((sale) => sale.isCredit).length;

    // Get top dealers
    const topDealers = await prisma.companySale.groupBy({
      by: ["dealerId"],
      where: {
        ...where,
        dealerId: { not: null },
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          totalAmount: "desc",
        },
      },
      take: 5,
    });

    // Get dealer details
    const topDealersWithDetails = await Promise.all(
      topDealers.map(async (td) => {
        const dealer = await prisma.dealer.findUnique({
          where: { id: td.dealerId! },
        });
        return {
          dealer,
          totalAmount: td._sum.totalAmount,
          totalSales: td._count,
        };
      })
    );

    // Get total outstanding from dealer accounts
    const accountsBalance = await prisma.companyDealerAccount.aggregate({
      where: { companyId: company.id },
      _sum: { balance: true },
    });

    return res.status(200).json({
      success: true,
      data: {
        totalSales,
        totalRevenue,
        totalOutstanding: Number(accountsBalance._sum.balance || 0),
        creditSales,
        topDealers: topDealersWithDetails,
      },
    });
  } catch (error: any) {
    console.error("Get company sales statistics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
