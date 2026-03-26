import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { HatcherySupplierTxnType, HatcheryPurchaseCategory } from "@prisma/client";
import { HatcherySupplierService } from "../services/hatcherySupplierService";
import bcrypt from "bcrypt";

// ==================== LIST SUPPLIERS ====================
export const listHatcherySuppliers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { search, page = 1, limit = 50 } = req.query;

    const where: any = { hatcheryOwnerId: userId };
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { contact: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.hatcherySupplier.findMany({
        where,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: "asc" },
      }),
      prisma.hatcherySupplier.count({ where }),
    ]);

    return res.json({
      success: true,
      data: suppliers,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    console.error("listHatcherySuppliers:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== STATISTICS ====================
export const hatcherySupplierStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;

    const suppliers = await prisma.hatcherySupplier.findMany({
      where: { hatcheryOwnerId: userId },
      select: { balance: true },
    });

    const totalSuppliers = suppliers.length;
    const outstandingAmount = suppliers.reduce(
      (s, sup) => s + Math.max(0, Number(sup.balance)),
      0
    );
    const activeSuppliers = suppliers.filter(
      (s) => Number(s.balance) > 0
    ).length;

    // This month's purchases
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const thisMonthAgg = await prisma.hatcherySupplierTxn.aggregate({
      _sum: { amount: true },
      where: {
        supplier: { hatcheryOwnerId: userId },
        type: HatcherySupplierTxnType.PURCHASE,
        date: { gte: monthStart },
      },
    });

    return res.json({
      success: true,
      data: {
        totalSuppliers,
        activeSuppliers,
        outstandingAmount,
        thisMonthAmount: Number(thisMonthAgg._sum.amount ?? 0),
      },
    });
  } catch (err) {
    console.error("hatcherySupplierStatistics:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET SUPPLIER BY ID ====================
export const getHatcherySupplierById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const supplier = await prisma.hatcherySupplier.findFirst({
      where: { id, hatcheryOwnerId: userId },
    });
    if (!supplier)
      return res.status(404).json({ message: "Supplier not found" });

    const txns = await prisma.hatcherySupplierTxn.findMany({
      where: { supplierId: id },
      include: { items: true },
      orderBy: { date: "desc" },
    });

    return res.json({ success: true, data: { ...supplier, transactions: txns } });
  } catch (err) {
    console.error("getHatcherySupplierById:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE SUPPLIER ====================
export const createHatcherySupplier = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { name, contact, address } = req.body;

    if (!name?.trim())
      return res.status(400).json({ message: "Supplier name is required" });

    const existing = await prisma.hatcherySupplier.findFirst({
      where: { hatcheryOwnerId: userId, name: name.trim() },
    });
    if (existing)
      return res
        .status(400)
        .json({ message: "Supplier with this name already exists" });

    const supplier = await prisma.hatcherySupplier.create({
      data: {
        hatcheryOwnerId: userId,
        name: name.trim(),
        contact: contact?.trim() ?? null,
        address: address?.trim() ?? null,
      },
    });

    return res
      .status(201)
      .json({ success: true, data: supplier, message: "Supplier created" });
  } catch (err) {
    console.error("createHatcherySupplier:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE SUPPLIER ====================
export const updateHatcherySupplier = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { name, contact, address } = req.body;

    const supplier = await prisma.hatcherySupplier.findFirst({
      where: { id, hatcheryOwnerId: userId },
    });
    if (!supplier)
      return res.status(404).json({ message: "Supplier not found" });

    if (name && name !== supplier.name) {
      const dupe = await prisma.hatcherySupplier.findFirst({
        where: { hatcheryOwnerId: userId, name: name.trim(), id: { not: id } },
      });
      if (dupe)
        return res
          .status(400)
          .json({ message: "Supplier with this name already exists" });
    }

    const updated = await prisma.hatcherySupplier.update({
      where: { id },
      data: {
        name: name?.trim() ?? supplier.name,
        contact: contact !== undefined ? contact?.trim() ?? null : supplier.contact,
        address: address !== undefined ? address?.trim() ?? null : supplier.address,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateHatcherySupplier:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE SUPPLIER ====================
export const deleteHatcherySupplier = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const supplier = await prisma.hatcherySupplier.findFirst({
      where: { id, hatcheryOwnerId: userId },
    });
    if (!supplier)
      return res.status(404).json({ message: "Supplier not found" });

    const txnCount = await prisma.hatcherySupplierTxn.count({
      where: { supplierId: id },
    });
    if (txnCount > 0)
      return res.status(400).json({
        message: `Cannot delete: supplier has ${txnCount} transaction(s). Remove all transactions first.`,
      });

    await prisma.hatcherySupplier.delete({ where: { id } });

    return res.json({ success: true, message: "Supplier deleted" });
  } catch (err) {
    console.error("deleteHatcherySupplier:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== SET OPENING BALANCE ====================
export const setHatcherySupplierOpeningBalance = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { amount, date, note } = req.body;

    if (amount === undefined || amount === null || isNaN(Number(amount)))
      return res.status(400).json({ message: "amount is required" });

    const txn = await HatcherySupplierService.setOpeningBalance({
      supplierId: id,
      hatcheryOwnerId: userId,
      amount: Number(amount),
      date: date ? new Date(date) : new Date(),
      note,
    });

    return res.json({ success: true, data: txn });
  } catch (err: any) {
    console.error("setHatcherySupplierOpeningBalance:", err);
    if (err.message === "Supplier not found")
      return res.status(404).json({ message: err.message });
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== ADD TRANSACTION (purchase / payment / adjustment) ====================
export const addHatcherySupplierTransaction = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const {
      type,
      amount,
      date,
      note,
      reference,
      receiptImageUrl,
      // purchase-specific
      category,
      items,
    } = req.body;

    if (!type || !date)
      return res.status(400).json({ message: "type and date are required" });

    if (type === HatcherySupplierTxnType.PURCHASE) {
      if (!category || !Object.values(HatcheryPurchaseCategory).includes(category))
        return res
          .status(400)
          .json({ message: "Valid category is required for purchase" });

      if (!Array.isArray(items) || items.length === 0)
        return res
          .status(400)
          .json({ message: "At least one item is required for purchase" });

      for (const item of items) {
        if (!item.itemName?.trim())
          return res.status(400).json({ message: "itemName required for each item" });
        if (!item.quantity || Number(item.quantity) <= 0)
          return res.status(400).json({ message: "quantity must be > 0 for each item" });
        if (item.unitPrice === undefined || Number(item.unitPrice) < 0)
          return res.status(400).json({ message: "unitPrice must be >= 0 for each item" });
        if (!item.totalAmount || Number(item.totalAmount) <= 0)
          return res.status(400).json({ message: "totalAmount must be > 0 for each item" });
      }

      const txn = await HatcherySupplierService.addPurchaseTxn({
        supplierId: id,
        hatcheryOwnerId: userId,
        category,
        items: items.map((i: any) => ({
          itemName: i.itemName.trim(),
          quantity: Number(i.quantity),
          freeQuantity: Number(i.freeQuantity ?? 0),
          unit: i.unit ?? "kg",
          unitPrice: Number(i.unitPrice),
          totalAmount: Number(i.totalAmount),
        })),
        date: new Date(date),
        note,
      });

      return res.status(201).json({ success: true, data: txn });
    }

    if (type === HatcherySupplierTxnType.PAYMENT) {
      if (!amount || Number(amount) <= 0)
        return res.status(400).json({ message: "amount must be > 0 for payment" });

      const txn = await HatcherySupplierService.addPaymentTxn({
        supplierId: id,
        hatcheryOwnerId: userId,
        amount: Number(amount),
        date: new Date(date),
        note,
        reference,
        receiptImageUrl,
      });

      return res.status(201).json({ success: true, data: txn });
    }

    if (type === HatcherySupplierTxnType.ADJUSTMENT) {
      if (amount === undefined || amount === null)
        return res.status(400).json({ message: "amount is required for adjustment" });

      const supplier = await prisma.hatcherySupplier.findFirst({
        where: { id, hatcheryOwnerId: userId },
      });
      if (!supplier)
        return res.status(404).json({ message: "Supplier not found" });

      const numAmount = Number(amount);
      const newBalance = Number(supplier.balance) + numAmount;

      const txn = await prisma.$transaction(async (tx) => {
        const t = await tx.hatcherySupplierTxn.create({
          data: {
            supplierId: id,
            type: HatcherySupplierTxnType.ADJUSTMENT,
            amount: Math.abs(numAmount),
            balanceAfter: newBalance,
            date: new Date(date),
            note,
          },
        });
        await tx.hatcherySupplier.update({
          where: { id },
          data: { balance: newBalance },
        });
        return t;
      });

      return res.status(201).json({ success: true, data: txn });
    }

    return res.status(400).json({ message: "Unsupported transaction type" });
  } catch (err: any) {
    console.error("addHatcherySupplierTransaction:", err);
    if (err.message === "Supplier not found")
      return res.status(404).json({ message: err.message });
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE TRANSACTION ====================
export const deleteHatcherySupplierTransaction = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { id, txnId } = req.params;
    const { password } = req.body;

    if (!password)
      return res
        .status(400)
        .json({ message: "Password confirmation required for deletion" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res
        .status(401)
        .json({ message: "Invalid password. Deletion cancelled." });

    const result = await HatcherySupplierService.deleteTxn({
      txnId,
      supplierId: id,
      hatcheryOwnerId: userId,
    });

    return res.json({ success: true, data: result, message: "Transaction deleted" });
  } catch (err: any) {
    console.error("deleteHatcherySupplierTransaction:", err);
    if (
      err.message === "Supplier not found" ||
      err.message === "Transaction not found"
    )
      return res.status(404).json({ message: err.message });
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET TRANSACTIONS LIST ====================
export const listHatcherySupplierTransactions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { page = 1, limit = 50, type, startDate, endDate } = req.query;

    const supplier = await prisma.hatcherySupplier.findFirst({
      where: { id, hatcheryOwnerId: userId },
    });
    if (!supplier)
      return res.status(404).json({ message: "Supplier not found" });

    const where: any = { supplierId: id };
    if (type) where.type = type;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [txns, total] = await Promise.all([
      prisma.hatcherySupplierTxn.findMany({
        where,
        include: { items: true },
        skip,
        take: Number(limit),
        orderBy: { date: "desc" },
      }),
      prisma.hatcherySupplierTxn.count({ where }),
    ]);

    return res.json({
      success: true,
      data: txns,
      pagination: { page: Number(page), limit: Number(limit), total },
    });
  } catch (err) {
    console.error("listHatcherySupplierTransactions:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
