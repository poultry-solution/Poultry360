import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, TransactionType } from "@prisma/client";
import {
  CreateMedicineSupplierSchema,
  UpdateMedicineSupplierSchema,
  MedicineSupplierSchema,
} from "@myapp/shared-types";

// ==================== GET ALL MEDICAL SUPPLIERS ====================
export const getAllMedicalSuppliers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {
      userId: currentUserId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { contact: { contains: search as string, mode: "insensitive" } },
        { address: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [suppliers, total] = await Promise.all([
      prisma.medicineSupplier.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          transactions: {
            orderBy: { date: "desc" },
          },
          _count: {
            select: {
              transactions: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.medicineSupplier.count({ where }),
    ]);

    // Calculate balance for each supplier
    const suppliersWithBalance = await Promise.all(
      suppliers.map(async (supplier) => {
        const transactions = supplier.transactions;

        // Calculate balance: PURCHASE/ADJUSTMENT (positive) - PAYMENT/RECEIPT (negative)
        const balance = transactions.reduce((sum, transaction) => {
          if (
            transaction.type === "PURCHASE" ||
            transaction.type === "ADJUSTMENT"
          ) {
            return sum + Number(transaction.amount);
          } else if (
            transaction.type === "PAYMENT" ||
            transaction.type === "RECEIPT"
          ) {
            return sum - Number(transaction.amount);
          }
          return sum;
        }, 0);

        // Get recent transactions for this month
        const currentMonth = new Date();
        currentMonth.setDate(1);
        currentMonth.setHours(0, 0, 0, 0);

        const thisMonthTransactions = transactions.filter(
          (t) => new Date(t.date) >= currentMonth
        );

        const thisMonthAmount = thisMonthTransactions
          .filter((t) => t.type === "PURCHASE")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        return {
          ...supplier,
          balance: Math.max(0, balance), // Only show positive balance (amount due)
          thisMonthAmount,
          totalTransactions: transactions.length,
          recentTransactions: transactions.slice(0, 5), // Last 5 transactions
        };
      })
    );

    return res.json({
      success: true,
      data: suppliersWithBalance,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all medical suppliers error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET MEDICAL SUPPLIER BY ID ====================
export const getMedicalSupplierById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    const supplier = await prisma.medicineSupplier.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
      include: {
        transactions: {
          orderBy: { date: "desc" },
        },
      },
    });

    if (!supplier) {
      return res.status(404).json({ message: "Medical supplier not found" });
    }

    // Calculate balance and transaction summary
    const transactions = supplier.transactions;
    const balance = transactions.reduce((sum, transaction) => {
      if (
        transaction.type === "PURCHASE" ||
        transaction.type === "ADJUSTMENT"
      ) {
        return sum + Number(transaction.amount);
      } else if (
        transaction.type === "PAYMENT" ||
        transaction.type === "RECEIPT"
      ) {
        return sum - Number(transaction.amount);
      }
      return sum;
    }, 0);

    // Get this month's transactions
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const thisMonthTransactions = transactions.filter(
      (t) => new Date(t.date) >= currentMonth
    );

    const thisMonthAmount = thisMonthTransactions
      .filter((t) => t.type === "PURCHASE")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Group transactions by item for the table view
    const transactionGroups = transactions.reduce((groups, transaction) => {
      if (transaction.type === "PURCHASE") {
        const key = `${transaction.itemName || "Unknown Item"}_${transaction.id}`;
        if (!groups[key]) {
          groups[key] = {
            itemName: transaction.itemName || "Unknown Item",
            rate:
              Number(transaction.amount) / Number(transaction.quantity || 1),
            quantity: 0,
            totalAmount: 0,
            amountPaid: 0,
            amountDue: 0,
            date: transaction.date,
            dueDate: new Date(
              transaction.date.getTime() + 30 * 24 * 60 * 60 * 1000
            ), // 30 days from purchase
            payments: [],
          };
        }
        groups[key].quantity += transaction.quantity || 0;
        groups[key].totalAmount += Number(transaction.amount);
        groups[key].amountDue += Number(transaction.amount);
      }
      return groups;
    }, {} as any);

    // Apply payments to purchases (FIFO - First In, First Out)
    const purchaseGroups = Object.values(transactionGroups) as any[];
    let remainingPayments = transactions
      .filter((t) => t.type === "PAYMENT")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    for (const payment of remainingPayments) {
      const paymentAmount = Number(payment.amount);
      let remainingPayment = paymentAmount;

      // Apply payment to purchases in chronological order
      for (const group of purchaseGroups.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )) {
        if (remainingPayment <= 0) break;

        const currentDue = group.totalAmount - group.amountPaid;
        if (currentDue > 0) {
          const paymentToApply = Math.min(remainingPayment, currentDue);
          group.amountPaid += paymentToApply;
          group.amountDue = Math.max(0, group.totalAmount - group.amountPaid);
          group.payments.push({
            amount: paymentToApply,
            date: payment.date,
            reference: payment.reference,
          });
          remainingPayment -= paymentToApply;
        }
      }
    }

    const transactionTable = Object.values(transactionGroups);

    return res.json({
      success: true,
      data: {
        ...supplier,
        balance: Math.max(0, balance),
        thisMonthAmount,
        totalTransactions: transactions.length,
        transactionTable,
        summary: {
          totalPurchases: transactions.filter((t) => t.type === "PURCHASE")
            .length,
          totalPayments: transactions.filter((t) => t.type === "PAYMENT")
            .length,
          outstandingAmount: Math.max(0, balance),
          thisMonthPurchases: thisMonthTransactions.filter(
            (t) => t.type === "PURCHASE"
          ).length,
        },
      },
    });
  } catch (error) {
    console.error("Get medical supplier by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE MEDICAL SUPPLIER ====================
export const createMedicalSupplier = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    // Validate request body
    const { success, data, error } = CreateMedicineSupplierSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if supplier with same name already exists for this user
    const existingSupplier = await prisma.medicineSupplier.findFirst({
      where: {
        userId: currentUserId,
        name: data.name,
      },
    });

    if (existingSupplier) {
      return res
        .status(400)
        .json({ message: "Medical supplier with this name already exists" });
    }

    // Create supplier
    const supplier = await prisma.medicineSupplier.create({
      data: {
        name: data.name,
        contact: data.contact,
        address: data.address,
        userId: currentUserId as string,
      },
    });

    return res.status(201).json({
      success: true,
      data: supplier,
      message: "Medical supplier created successfully",
    });
  } catch (error) {
    console.error("Create medical supplier error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE MEDICAL SUPPLIER ====================
export const updateMedicalSupplier = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    // Validate request body
    const { success, data, error } = UpdateMedicineSupplierSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if supplier exists and belongs to user
    const existingSupplier = await prisma.medicineSupplier.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!existingSupplier) {
      return res.status(404).json({ message: "Medical supplier not found" });
    }

    // Check for name uniqueness if name is being updated
    if (data.name && data.name !== existingSupplier.name) {
      const nameExists = await prisma.medicineSupplier.findFirst({
        where: {
          userId: currentUserId,
          name: data.name,
          id: { not: id },
        },
      });

      if (nameExists) {
        return res
          .status(400)
          .json({ message: "Medical supplier with this name already exists" });
      }
    }

    // Update supplier
    const updatedSupplier = await prisma.medicineSupplier.update({
      where: { id },
      data,
    });

    return res.json({
      success: true,
      data: updatedSupplier,
      message: "Medical supplier updated successfully",
    });
  } catch (error) {
    console.error("Update medical supplier error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE MEDICAL SUPPLIER ====================
export const deleteMedicalSupplier = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    // Check if supplier exists and belongs to user
    const existingSupplier = await prisma.medicineSupplier.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    if (!existingSupplier) {
      return res.status(404).json({ message: "Medical supplier not found" });
    }

    // Check if supplier has transactions
    if (existingSupplier._count.transactions > 0) {
      return res.status(400).json({
        message:
          "Cannot delete medical supplier with existing transactions. Please remove all transactions first.",
      });
    }

    // Delete supplier
    await prisma.medicineSupplier.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Medical supplier deleted successfully",
    });
  } catch (error) {
    console.error("Delete medical supplier error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== ADD MEDICAL SUPPLIER TRANSACTION ====================
export const addMedicalSupplierTransaction = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const {
      type,
      amount,
      quantity,
      itemName,
      date,
      description,
      reference,
      unitPrice,
    } = req.body;

    // Validate required fields
    if (!type || !amount || !date) {
      return res
        .status(400)
        .json({ message: "Type, amount, and date are required" });
    }

    // Validate transaction type
    if (!Object.values(TransactionType).includes(type)) {
      return res.status(400).json({ message: "Invalid transaction type" });
    }

    // Check if supplier exists and belongs to user
    const supplier = await prisma.medicineSupplier.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!supplier) {
      return res.status(404).json({ message: "Medical supplier not found" });
    }

    // Create transaction
    const transaction = await prisma.entityTransaction.create({
      data: {
        type,
        amount: Number(amount),
        quantity: quantity ? Number(quantity) : null,
        itemName: itemName || null,
        date: new Date(date),
        description: description || null,
        reference: reference || null,
        medicineSupplierId: id, // ✅ Use proper foreign key
        entityType: "MEDICINE_SUPPLIER", // Keep for backward compatibility
        entityId: id,
      },
    });

    return res.status(201).json({
      success: true,
      data: transaction,
      message: "Transaction added successfully",
    });
  } catch (error) {
    console.error("Add medical supplier transaction error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET MEDICAL SUPPLIER STATISTICS ====================
export const getMedicalSupplierStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    // Get all suppliers for the user
    const suppliers = await prisma.medicineSupplier.findMany({
      where: { userId: currentUserId },
      include: {
        transactions: true,
      },
    });

    // Calculate statistics
    let totalSuppliers = suppliers.length;
    let activeSuppliers = 0;
    let outstandingAmount = 0;
    let thisMonthAmount = 0;

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    suppliers.forEach((supplier) => {
      const balance = supplier.transactions.reduce((sum, transaction) => {
        if (
          transaction.type === "PURCHASE" ||
          transaction.type === "ADJUSTMENT"
        ) {
          return sum + Number(transaction.amount);
        } else if (
          transaction.type === "PAYMENT" ||
          transaction.type === "RECEIPT"
        ) {
          return sum - Number(transaction.amount);
        }
        return sum;
      }, 0);

      if (balance > 0) {
        activeSuppliers++;
        outstandingAmount += balance;
      }

      // This month's purchases
      const thisMonthPurchases = supplier.transactions
        .filter(
          (t) => t.type === "PURCHASE" && new Date(t.date) >= currentMonth
        )
        .reduce((sum, t) => sum + Number(t.amount), 0);

      thisMonthAmount += thisMonthPurchases;
    });

    return res.json({
      success: true,
      data: {
        totalSuppliers,
        activeSuppliers,
        outstandingAmount,
        thisMonthAmount,
      },
    });
  } catch (error) {
    console.error("Get medical supplier statistics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET MEDICAL SUPPLIER TRANSACTIONS ====================
export const getMedicalSupplierTransactions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, type, startDate, endDate } = req.query;
    const currentUserId = req.userId;

    const skip = (Number(page) - 1) * Number(limit);

    // Check if supplier exists and belongs to user
    const supplier = await prisma.medicineSupplier.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!supplier) {
      return res.status(404).json({ message: "Medical supplier not found" });
    }

    // Build where clause
    const where: any = {
      medicineSupplierId: id, // ✅ Use proper foreign key
    };

    if (type) {
      where.type = type as TransactionType;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    const [transactions, total] = await Promise.all([
      prisma.entityTransaction.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { date: "desc" },
      }),
      prisma.entityTransaction.count({ where }),
    ]);

    return res.json({
      success: true,
      data: transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get medical supplier transactions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
