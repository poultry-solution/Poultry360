import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import { DealerService } from "../services/dealerService";
import { DealerFarmerAccountService } from "../services/dealerFarmerAccountService";

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
      },
    });

    const totalSalesAmount = Number(salesSummary._sum.totalAmount || 0);
    const totalPaidAmount = Number(salesSummary._sum.paidAmount || 0);

    // Calculate total due from Customer.balance field (consistent with party balances)
    const customers = await prisma.customer.findMany({
      where: { userId },
      select: { balance: true },
    });

    // Sum only positive balances (customers who owe dealer)
    // Negative balances are advances (dealer owes customer)
    const totalDueAmount = customers.reduce((sum, customer) => {
      const balance = Number(customer.balance || 0);
      return sum + (balance > 0 ? balance : 0); // Only count positive balances as "due"
    }, 0);

    // Calculate total advances (negative balances)
    const totalAdvances = customers.reduce((sum, customer) => {
      const balance = Number(customer.balance || 0);
      return sum + (balance < 0 ? Math.abs(balance) : 0); // Sum absolute value of negative balances
    }, 0);

    // Net position (can be negative when advances outweigh due)
    // Customer side: positive = money to receive; negative = money to give (advance)
    const manualCustomerAgg = await prisma.customer.aggregate({
      where: { userId },
      _sum: { balance: true },
    });
    const manualCustomerNetBalance = Number(manualCustomerAgg._sum.balance || 0);

    const connectedFarmerAgg = await prisma.dealerFarmerAccount.aggregate({
      where: { dealerId: dealer.id },
      _sum: { balance: true },
    });
    const connectedFarmerNetBalance = Number(
      connectedFarmerAgg._sum.balance || 0
    );

    const netCustomerBalance =
      manualCustomerNetBalance + connectedFarmerNetBalance;

    // Company side: dealer owes company when balance > 0; dealer has paid advance when balance < 0
    const connectedCompanyAgg = await prisma.companyDealerAccount.aggregate({
      where: { dealerId: dealer.id },
      _sum: { balance: true },
    });
    const connectedCompanyNetBalance = Number(
      connectedCompanyAgg._sum.balance || 0
    );

    const manualCompanyAgg = await prisma.dealerManualCompany.aggregate({
      where: { dealerId: dealer.id, archivedAt: null },
      _sum: { balance: true },
    });
    const manualCompanyNetBalance = Number(
      manualCompanyAgg._sum.balance || 0
    );

    const netCompanyBalance =
      connectedCompanyNetBalance + manualCompanyNetBalance;

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
        totalDueAmount, // Only positive balances (customers owe dealer)
        totalAdvances, // Negative balances (dealer owes customers)
        netCustomerBalance,
        netCompanyBalance,
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
      select: {
        id: true,
        name: true,
        phone: true,
        address: true,
        balance: true,
        farmerId: true,
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

    // Exclude farmers who already appear as a connected Customer to avoid duplicates
    const connectedFarmerIds = staticCustomers
      .map((c) => c.farmerId)
      .filter((id): id is string => id != null);

    // Get all farmers (users) who have sales with this dealer
    const farmersWithSales = await prisma.user.findMany({
      where: {
        dealerSalesReceived: {
          some: { dealerId: dealer.id },
        },
        ...(connectedFarmerIds.length > 0
          ? { id: { notIn: connectedFarmerIds } }
          : {}),
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

    // Account-based: farmer balance comes from DealerFarmerAccount, not sum of sale dueAmounts
    const farmerAccounts = await DealerFarmerAccountService.getDealerAccounts(dealer.id);
    const farmerBalanceByUserId = new Map(
      farmerAccounts.map((acc) => [acc.farmerId, acc.balance])
    );

    // Combine and calculate balances
    const partiesWithBalance = [
      ...staticCustomers.map((customer) => {
        // Use the Customer.balance field directly (includes advances)
        // Positive = customer owes dealer, Negative = dealer owes customer (advance)
        const balance = Number(customer.balance || 0);

        const lastSale = customer.dealerSales
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        return {
          id: customer.id,
          name: customer.name,
          contact: customer.phone,
          address: customer.address,
          balance: balance, // Show actual balance (can be negative for advances)
          lastTransactionDate: lastSale?.date || null,
          totalSales: customer.dealerSales.length,
          partyType: "CUSTOMER",
        };
      }),
      ...farmersWithSales.map((farmer) => {
        // Use dealer-farmer account balance (account-based); same source as customer account page
        const balance = farmerBalanceByUserId.get(farmer.id) ?? 0;

        const lastSale = farmer.dealerSalesReceived
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        return {
          id: farmer.id,
          name: farmer.name,
          contact: farmer.phone,
          address: farmer.CompanyFarmLocation || null,
          balance: Number(balance), // Can be negative (advance)
          lastTransactionDate: lastSale?.date || null,
          totalSales: farmer.dealerSalesReceived.length,
          partyType: "FARMER",
        };
      }),
    ];

    // Filter out parties with no balance and no sales
    // Keep parties with balance != 0 (positive or negative) or those with sales history
    const activeParties = partiesWithBalance.filter(
      (p) => p.balance !== 0 || p.totalSales > 0
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
    const { saleId, customerId, amount, paymentMethod, date, notes, receiptImageUrl, reference } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    // Either saleId OR customerId must be provided
    if (!saleId && !customerId) {
      return res.status(400).json({ message: "Either sale ID or customer ID is required" });
    }

    // Get dealer
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Resolve customerId: either provided directly or looked up from saleId
    let resolvedCustomerId = customerId;

    if (saleId && !resolvedCustomerId) {
      const sale = await prisma.dealerSale.findUnique({
        where: { id: saleId },
        select: { dealerId: true, customerId: true, invoiceNumber: true },
      });

      if (!sale || sale.dealerId !== dealer.id) {
        return res.status(403).json({ message: "Sale not found or access denied" });
      }

      resolvedCustomerId = sale.customerId;
    }

    if (!resolvedCustomerId) {
      return res.status(400).json({ message: "Customer ID is required" });
    }

    // Verify customer belongs to this dealer user
    const customer = await prisma.customer.findUnique({
      where: { id: resolvedCustomerId },
      select: { userId: true, farmerId: true },
    });

    if (!customer || customer.userId !== userId) {
      return res.status(403).json({ message: "Customer not found or access denied" });
    }

    // Connected customers (farmerId set) must use the dealer-farmer account payment flow
    if (customer.farmerId) {
      return res.status(400).json({
        message: "Connected farmer payments must be recorded through the farmer account page, not this endpoint.",
      });
    }

    // Account-level payment for manual customers
    const result = await DealerService.addAccountPayment({
      customerId: resolvedCustomerId,
      dealerId: dealer.id,
      amount: Number(amount),
      paymentMethod: paymentMethod || "CASH",
      date: date ? new Date(date) : new Date(),
      description: notes || `Payment received`,
      receiptUrl: receiptImageUrl,
      reference,
    });

    return res.status(200).json({
      success: true,
      message: "Payment added successfully",
      data: result,
    });
  } catch (error: any) {
    console.error("Add dealer payment error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// ==================== DELETE MANUAL CUSTOMER GENERAL PAYMENT ====================
/**
 * Reverses a mistaken account-level general payment (POST /dealer/ledger/payments without saleId).
 * Manual customers only (Customer.farmerId == null). Password required.
 */
export const deleteDealerManualGeneralPayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { ledgerEntryId } = req.params;
    const { password } = req.body ?? {};

    if (!password || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        message: "Password confirmation is required for deletion",
      });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const bcrypt = require("bcrypt");
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid password. Deletion cancelled.",
      });
    }

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const entry = await prisma.dealerLedgerEntry.findFirst({
      where: { id: ledgerEntryId, dealerId: dealer.id },
    });

    if (!entry) {
      return res.status(404).json({ message: "Ledger entry not found" });
    }

    if (entry.type !== "PAYMENT_RECEIVED") {
      return res.status(400).json({
        message: "Only payment entries can be deleted",
      });
    }

    if (entry.partyType !== "CUSTOMER" || !entry.partyId) {
      return res.status(400).json({
        message: "Only manual customer payments can be deleted",
      });
    }

    // Bill-level payments attach saleId on the ledger row; only allow account-level general payments
    if (entry.saleId != null) {
      return res.status(400).json({
        message: "Delete bill-level payments from the sale flow is not supported here",
      });
    }

    const customer = await prisma.customer.findFirst({
      where: { id: entry.partyId, userId },
      select: { id: true, farmerId: true },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (customer.farmerId != null) {
      return res.status(400).json({
        message: "Delete payment is only available for manual customers",
      });
    }

    const paymentAmount = Number(entry.amount);
    const deletedCreatedAt = entry.createdAt;
    const deletedId = entry.id;

    await prisma.$transaction(async (tx) => {
      // Handle legacy FIFO-linked DealerSalePayment rows (pre-migration payments)
      const legacySplits = await tx.dealerSalePayment.findMany({
        where: { linkedLedgerEntryId: ledgerEntryId },
        include: { sale: true },
      });

      if (legacySplits.length > 0) {
        // Revert each affected sale's paidAmount/dueAmount
        for (const sp of legacySplits) {
          const sale = sp.sale;
          const alloc = Number(sp.amount);
          const newPaidAmount = Number(sale.paidAmount) - alloc;
          const newDueAmount = Number(sale.totalAmount) - newPaidAmount;

          if (newPaidAmount < -0.0001) {
            throw new Error("Invalid payment reversal: paid amount would become negative");
          }

          await tx.dealerSale.update({
            where: { id: sale.id },
            data: {
              paidAmount: new Prisma.Decimal(newPaidAmount),
              dueAmount: newDueAmount > 0 ? new Prisma.Decimal(newDueAmount) : null,
            },
          });

          await tx.dealerSalePayment.delete({ where: { id: sp.id } });
        }
      }

      // Clean up any EntityTransaction rows linked via sourceDealerLedgerEntryId
      await tx.entityTransaction.deleteMany({
        where: { sourceDealerLedgerEntryId: ledgerEntryId },
      });

      // Revert customer balance and totalPayments
      await tx.customer.update({
        where: { id: customer.id },
        data: {
          balance: { increment: new Prisma.Decimal(paymentAmount) },
          totalPayments: { decrement: new Prisma.Decimal(paymentAmount) },
        },
      });

      // Delete the ledger entry
      await tx.dealerLedgerEntry.delete({
        where: { id: ledgerEntryId },
      });

      // Fix running balances for all subsequent ledger entries
      await tx.dealerLedgerEntry.updateMany({
        where: {
          dealerId: dealer.id,
          OR: [
            { createdAt: { gt: deletedCreatedAt } },
            {
              AND: [
                { createdAt: deletedCreatedAt },
                { id: { gt: deletedId } },
              ],
            },
          ],
        },
        data: {
          balance: { increment: new Prisma.Decimal(paymentAmount) },
        },
      });
    });

    return res.status(200).json({
      success: true,
      message: "Payment deleted and balances reverted",
    });
  } catch (error: any) {
    console.error("Delete dealer manual general payment error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
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

