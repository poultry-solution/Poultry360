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

    // Get entries grouped by type
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

    // Calculate totals
    const totalSales = entriesByType
      .filter((e) => e.type === "SALE")
      .reduce((sum, e) => sum + Number(e._sum.amount || 0), 0);

    const totalPurchases = entriesByType
      .filter((e) => e.type === "PURCHASE")
      .reduce((sum, e) => sum + Number(e._sum.amount || 0), 0);

    const totalPaymentsReceived = entriesByType
      .filter((e) => e.type === "PAYMENT_RECEIVED")
      .reduce((sum, e) => sum + Number(e._sum.amount || 0), 0);

    const totalPaymentsMade = entriesByType
      .filter((e) => e.type === "PAYMENT_MADE")
      .reduce((sum, e) => sum + Number(e._sum.amount || 0), 0);

    // Get outstanding balances by party
    const outstandingByParty = await prisma.dealerLedgerEntry.findMany({
      where: {
        dealerId: dealer.id,
        partyId: { not: null },
      },
      orderBy: {
        createdAt: "desc",
      },
      distinct: ["partyId"],
      select: {
        partyId: true,
        partyType: true,
        balance: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        currentBalance,
        totalSales,
        totalPurchases,
        totalPaymentsReceived,
        totalPaymentsMade,
        entriesByType: entriesByType.map((e) => ({
          type: e.type,
          count: e._count,
          total: e._sum.amount,
        })),
        outstandingBalances: outstandingByParty.length,
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

