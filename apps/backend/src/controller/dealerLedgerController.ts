import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import { DealerService } from "../services/dealerService";

// ==================== GET LEDGER ENTRIES ====================
export const getLedgerEntries = async (
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

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Use service to get ledger entries
    const result = await DealerService.getLedgerEntries({
      dealerId: dealer.id,
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
    console.error("Get ledger entries error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET CURRENT BALANCE ====================
export const getCurrentBalance = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const balance = await DealerService.calculateBalance(dealer.id);

    return res.status(200).json({
      success: true,
      data: { balance },
    });
  } catch (error: any) {
    console.error("Get current balance error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET PARTY-SPECIFIC LEDGER ====================
export const getPartyLedger = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { partyId } = req.params;
    const { page = 1, limit = 50, startDate, endDate } = req.query;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Use service to get party-specific ledger
    const result = await DealerService.getLedgerEntries({
      dealerId: dealer.id,
      partyId,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: Number(page),
      limit: Number(limit),
    });

    // Calculate party balance
    const partyBalance = result.entries.length > 0
      ? Number(result.entries[0].balance)
      : 0;

    // Get party details
    let partyDetails = null;
    if (result.entries.length > 0) {
      const firstEntry = result.entries[0];
      if (firstEntry.partyType === "CUSTOMER") {
        partyDetails = await prisma.customer.findUnique({
          where: { id: partyId },
        });
      } else if (firstEntry.partyType === "FARMER") {
        partyDetails = await prisma.user.findUnique({
          where: { id: partyId },
          select: {
            id: true,
            name: true,
            phone: true,
            companyName: true,
          },
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        entries: result.entries,
        partyBalance,
        partyDetails,
      },
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error: any) {
    console.error("Get party ledger error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE MANUAL ADJUSTMENT ====================
export const createAdjustment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { amount, description, reference, date } = req.body;

    // Validation
    if (!amount || !description) {
      return res.status(400).json({
        message: "Amount and description are required",
      });
    }

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Get current balance
    const currentBalance = await DealerService.calculateBalance(dealer.id);

    // Calculate new balance
    const newBalance = currentBalance + Number(amount);

    // Create adjustment entry
    const adjustment = await prisma.dealerLedgerEntry.create({
      data: {
        type: "ADJUSTMENT",
        amount: new Prisma.Decimal(Math.abs(amount)),
        balance: new Prisma.Decimal(newBalance),
        date: date ? new Date(date) : new Date(),
        description,
        reference,
        dealerId: dealer.id,
      },
    });

    return res.status(201).json({
      success: true,
      data: adjustment,
      message: "Adjustment created successfully",
    });
  } catch (error: any) {
    console.error("Create adjustment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET LEDGER SUMMARY ====================
export const getLedgerSummary = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { startDate, endDate } = req.query;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const where: any = {
      dealerId: dealer.id,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    // Calculate from actual sales data
    const salesWhere: any = {
      dealerId: dealer.id,
    };

    if (startDate || endDate) {
      salesWhere.date = {};
      if (startDate) salesWhere.date.gte = new Date(startDate as string);
      if (endDate) salesWhere.date.lte = new Date(endDate as string);
    }

    const salesSummary = await prisma.dealerSale.aggregate({
      where: salesWhere,
      _sum: {
        totalAmount: true,
        paidAmount: true,
        dueAmount: true,
      },
    });

    const totalSalesAmount = Number(salesSummary._sum.totalAmount || 0);
    const totalPaidAmount = Number(salesSummary._sum.paidAmount || 0);
    const totalDueAmount = Number(salesSummary._sum.dueAmount || 0);

    // Get entries grouped by type for other stats
    const entriesByType = await prisma.dealerLedgerEntry.groupBy({
      by: ["type"],
      where,
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // Get current balance
    const currentBalance = await DealerService.calculateBalance(dealer.id);

    // Calculate totals from ledger entries
    const totalPurchases = entriesByType
      .filter((e) => e.type === "PURCHASE")
      .reduce((sum, e) => sum + Number(e._sum.amount || 0), 0);

    const totalPaymentsReceived = entriesByType
      .filter((e) => e.type === "PAYMENT_RECEIVED")
      .reduce((sum, e) => sum + Number(e._sum.amount || 0), 0);

    const totalPaymentsMade = entriesByType
      .filter((e) => e.type === "PAYMENT_MADE")
      .reduce((sum, e) => sum + Number(e._sum.amount || 0), 0);

    // Get unique parties with transactions
    const uniqueParties = await prisma.dealerSale.findMany({
      where: { dealerId: dealer.id },
      select: { customerId: true, farmerId: true },
      distinct: ["customerId", "farmerId"],
    });

    return res.status(200).json({
      success: true,
      data: {
        currentBalance,
        totalSales: totalSalesAmount,
        totalPaidAmount,
        totalDueAmount,
        totalPurchases,
        totalPaymentsReceived,
        totalPaymentsMade,
        entriesByType: entriesByType.map((e) => ({
          type: e.type,
          count: e._count,
          total: e._sum.amount,
        })),
        outstandingBalances: uniqueParties.length,
      },
    });
  } catch (error: any) {
    console.error("Get ledger summary error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== EXPORT LEDGER ====================
export const exportLedger = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { format = "json", startDate, endDate, type } = req.query;

    // Get the dealer record
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Get all entries without pagination
    const result = await DealerService.getLedgerEntries({
      dealerId: dealer.id,
      type: type as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: 1,
      limit: 10000, // Large limit for export
    });

    if (format === "csv") {
      // Convert to CSV
      const csv = convertToCSV(result.entries);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=ledger-${Date.now()}.csv`
      );
      return res.status(200).send(csv);
    }

    // Return JSON by default
    return res.status(200).json({
      success: true,
      data: result.entries,
    });
  } catch (error: any) {
    console.error("Export ledger error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET DEALER LEDGER PARTIES ====================
export const getDealerLedgerParties = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { search } = req.query;

    // Get dealer
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Get all customers (static customers)
    const staticCustomers = await prisma.customer.findMany({
      where: {
        userId: userId,
        ...(search
          ? {
              OR: [
                { name: { contains: search as string, mode: "insensitive" } },
                { phone: { contains: search as string, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        dealerSales: {
          where: { dealerId: dealer.id },
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

    // Get all farmers (users) who have sales with this dealer
    const farmersWithSales = await prisma.user.findMany({
      where: {
        dealerSalesReceived: {
          some: { dealerId: dealer.id },
        },
        ...(search
          ? {
              OR: [
                { name: { contains: search as string, mode: "insensitive" } },
                { phone: { contains: search as string, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        dealerSalesReceived: {
          where: { dealerId: dealer.id },
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

    // Combine and calculate balances
    const partiesWithBalance = [
      ...staticCustomers.map((customer) => {
        const balance = customer.dealerSales.reduce((sum, sale) => {
          const due = Number(sale.dueAmount || 0);
          return sum + due;
        }, 0);

        const lastSale = customer.dealerSales
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        return {
          id: customer.id,
          name: customer.name,
          contact: customer.phone,
          address: customer.address,
          balance: Math.max(0, balance),
          lastTransactionDate: lastSale?.date || null,
          totalSales: customer.dealerSales.length,
          partyType: "CUSTOMER",
        };
      }),
      ...farmersWithSales.map((farmer) => {
        const balance = farmer.dealerSalesReceived.reduce((sum: number, sale: any) => {
          const due = Number(sale.dueAmount || 0);
          return sum + due;
        }, 0);

        const lastSale = farmer.dealerSalesReceived
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        return {
          id: farmer.id,
          name: farmer.name,
          contact: farmer.phone,
          address: farmer.CompanyFarmLocation || null,
          balance: Math.max(0, balance),
          lastTransactionDate: lastSale?.date || null,
          totalSales: farmer.dealerSalesReceived.length,
          partyType: "FARMER",
        };
      }),
    ];

    // Filter out parties with no balance and no sales
    const activeParties = partiesWithBalance.filter(
      (p) => p.balance > 0 || p.totalSales > 0
    );

    return res.status(200).json({
      success: true,
      data: activeParties,
    });
  } catch (error: any) {
    console.error("Get dealer ledger parties error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== ADD DEALER PAYMENT ====================
export const addDealerPayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { saleId, amount, paymentMethod, date, notes } = req.body;

    // Validation
    if (!saleId || !amount || amount <= 0) {
      return res.status(400).json({ message: "Sale ID and valid amount are required" });
    }

    // Get dealer
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Verify sale belongs to dealer
    const sale = await prisma.dealerSale.findUnique({
      where: { id: saleId },
      select: { dealerId: true },
    });

    if (!sale || sale.dealerId !== dealer.id) {
      return res.status(403).json({ message: "Sale not found or access denied" });
    }

    // Use DealerService to add payment
    await DealerService.addSalePayment({
      saleId,
      amount: Number(amount),
      paymentMethod: paymentMethod || "CASH",
      date: date ? new Date(date) : new Date(),
      description: notes || `Payment received`,
    });

    return res.status(200).json({
      success: true,
      message: "Payment added successfully",
    });
  } catch (error: any) {
    console.error("Add dealer payment error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// Helper function to convert entries to CSV
function convertToCSV(entries: any[]): string {
  const headers = [
    "Date",
    "Type",
    "Description",
    "Reference",
    "Amount",
    "Balance",
    "Party ID",
    "Party Type",
  ];

  const rows = entries.map((entry) => [
    new Date(entry.date).toLocaleDateString(),
    entry.type,
    entry.description || "",
    entry.reference || "",
    entry.amount,
    entry.balance,
    entry.partyId || "",
    entry.partyType || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  return csvContent;
}

