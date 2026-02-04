import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { DealerFarmerAccountService } from "../services/dealerFarmerAccountService";

// ==================== LIST FARMER ACCOUNTS (DEALER SIDE) ====================
export const getDealerFarmerAccounts = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const accounts = await DealerFarmerAccountService.getDealerAccounts(dealer.id);

    return res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (error: any) {
    console.error("Get dealer farmer accounts error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// ==================== GET FARMER ACCOUNT (DEALER SIDE) ====================
export const getDealerFarmerAccount = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { farmerId } = req.params;

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const account = await DealerFarmerAccountService.getOrCreateAccount(
      dealer.id,
      farmerId
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
        dealer: account.dealer,
        farmer: account.farmer,
      },
    });
  } catch (error: any) {
    console.error("Get dealer farmer account error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// ==================== GET FARMER ACCOUNT STATEMENT (DEALER SIDE) ====================
export const getDealerFarmerAccountStatement = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { farmerId } = req.params;
    const { startDate, endDate, page = 1, limit = 50 } = req.query;

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const statement = await DealerFarmerAccountService.getAccountStatement({
      dealerId: dealer.id,
      farmerId,
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
    console.error("Get dealer farmer account statement error:", error);
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};

// ==================== RECORD DIRECT PAYMENT TO FARMER (DEALER SIDE) ====================
export const recordDealerFarmerPayment = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { farmerId } = req.params;
    const {
      amount,
      paymentMethod,
      paymentDate,
      notes,
      reference,
      receiptImageUrl,
      proofImageUrl,
    } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Valid payment amount is required",
      });
    }

    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Ensure dealer has an active connection with this farmer
    const connection = await prisma.dealerFarmer.findFirst({
      where: {
        dealerId: dealer.id,
        farmerId,
        archivedByDealer: false,
        archivedByFarmer: false,
      },
    });

    if (!connection) {
      return res.status(403).json({
        message: "No active connection with this farmer. You can only record payments for linked farmers.",
      });
    }

    const result = await DealerFarmerAccountService.recordPayment({
      dealerId: dealer.id,
      farmerId,
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
    console.error("Record dealer farmer payment error:", error);
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};
