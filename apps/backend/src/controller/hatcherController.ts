import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, TransactionType } from "@prisma/client";
import {
  CreateHatcherySchema,
  UpdateHatcherySchema,
  HatcherySchema,
} from "@myapp/shared-types";
import { InventoryService } from "../services/inventoryService";

// ==================== GET ALL HATCHERIES ====================
export const getAllHatcheries = async (
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

    const [hatcheries, total] = await Promise.all([
      prisma.hatchery.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.hatchery.count({ where }),
    ]);

    // Calculate balance for each hatchery
    const hatcheriesWithBalance = await Promise.all(
      hatcheries.map(async (hatchery) => {
        // Get transactions directly from entityTransaction table
        const transactions = await prisma.entityTransaction.findMany({
          where: {
            hatcheryId: hatchery.id,
          },
          orderBy: { date: "desc" },
        });

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
          ...hatchery,
          balance: Math.max(0, balance), // Only show positive balance (amount due)
          thisMonthAmount,
          totalTransactions: transactions.length,
          recentTransactions: transactions.slice(0, 5), // Last 5 transactions
        };
      })
    );

    return res.json({
      success: true,
      data: hatcheriesWithBalance,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all hatcheries error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET HATCHERY BY ID ====================
export const getHatcheryById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    const hatchery = await prisma.hatchery.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!hatchery) {
      return res.status(404).json({ message: "Hatchery not found" });
    }

    // Get transactions directly from entityTransaction table
    const transactions = await prisma.entityTransaction.findMany({
      where: {
        hatcheryId: id,
      },
      orderBy: { date: "desc" },
    });
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
            id: transaction.id,
            itemName: transaction.itemName || "Unknown Item",
            // rate will be recomputed from totals below
            rate: 0,
            // Paid quantity only
            quantity: 0,
            // Free quantity (zero-cost)
            freeQuantity: 0,
            // Delivered = paid + free
            deliveredQuantity: 0,
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
        const paidQty = Number(transaction.quantity || 0);
        const freeQty = Number((transaction as any).freeQuantity || 0);
        groups[key].quantity += paidQty;
        groups[key].freeQuantity += freeQty;
        groups[key].deliveredQuantity = groups[key].quantity + groups[key].freeQuantity;
        groups[key].totalAmount += Number(transaction.amount);
        groups[key].amountDue += Number(transaction.amount);
        // Recompute average rate based on paid quantity only
        const paidTotal = groups[key].quantity || 1;
        groups[key].rate = groups[key].totalAmount / paidTotal;
      }
      return groups;
    }, {} as any);

    // 🔗 Apply payments to purchases using direct relationship only (no FIFO fallback)
    const purchaseGroups = Object.values(transactionGroups) as any[];
    const payments = transactions.filter((t) => t.type === "PAYMENT");

    for (const payment of payments) {
      const paymentAmount = Number(payment.amount);

      if (!payment.paymentToPurchaseId) continue; // Ignore unlinked payments

      const targetGroup = purchaseGroups.find(
        (group) => group.id === payment.paymentToPurchaseId
      );

      if (!targetGroup) continue; // Linked to non-existent/filtered purchase

      const currentDue = targetGroup.totalAmount - targetGroup.amountPaid;
      if (currentDue <= 0) continue;

      const paymentToApply = Math.min(paymentAmount, currentDue);
      targetGroup.amountPaid += paymentToApply;
      targetGroup.amountDue = Math.max(
        0,
        targetGroup.totalAmount - targetGroup.amountPaid
      );
      targetGroup.payments.push({
        amount: paymentToApply,
        date: payment.date,
        reference: payment.reference,
      });
    }

    const transactionTable = Object.values(transactionGroups);

    return res.json({
      success: true,
      data: {
        ...hatchery,
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
    console.error("Get hatchery by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE HATCHERY ====================
export const createHatchery = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    // Validate request body
    const { success, data, error } = CreateHatcherySchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if hatchery with same name already exists for this user
    const existingHatchery = await prisma.hatchery.findFirst({
      where: {
        userId: currentUserId,
        name: data.name,
      },
    });

    if (existingHatchery) {
      return res
        .status(400)
        .json({ message: "Hatchery with this name already exists" });
    }

    // Create hatchery
    const hatchery = await prisma.hatchery.create({
      data: {
        name: data.name,
        contact: data.contact,
        address: data.address,
        userId: currentUserId as string,
      },
    });

    return res.status(201).json({
      success: true,
      data: hatchery,
      message: "Hatchery created successfully",
    });
  } catch (error) {
    console.error("Create hatchery error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE HATCHERY ====================
export const updateHatchery = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    // Validate request body
    const { success, data, error } = UpdateHatcherySchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if hatchery exists and belongs to user
    const existingHatchery = await prisma.hatchery.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!existingHatchery) {
      return res.status(404).json({ message: "Hatchery not found" });
    }

    // Check for name uniqueness if name is being updated
    if (data.name && data.name !== existingHatchery.name) {
      const nameExists = await prisma.hatchery.findFirst({
        where: {
          userId: currentUserId,
          name: data.name,
          id: { not: id },
        },
      });

      if (nameExists) {
        return res
          .status(400)
          .json({ message: "Hatchery with this name already exists" });
      }
    }

    // Update hatchery
    const updatedHatchery = await prisma.hatchery.update({
      where: { id },
      data,
    });

    return res.json({
      success: true,
      data: updatedHatchery,
      message: "Hatchery updated successfully",
    });
  } catch (error) {
    console.error("Update hatchery error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE HATCHERY ====================
export const deleteHatchery = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    // Check if hatchery exists and belongs to user
    const existingHatchery = await prisma.hatchery.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!existingHatchery) {
      return res.status(404).json({ message: "Hatchery not found" });
    }

    // Check if hatchery has transactions by directly querying entityTransaction table
    const transactionCount = await prisma.entityTransaction.count({
      where: {
        hatcheryId: id,
      },
    });

    console.log("Existing hatchery:", existingHatchery);
    console.log("Transaction count for hatchery:", transactionCount);

    // Let's also check what transactions actually exist
    const actualTransactions = await prisma.entityTransaction.findMany({
      where: {
        hatcheryId: id,
      },
      select: {
        id: true,
        type: true,
        amount: true,
        itemName: true,
        date: true,
      },
    });
    console.log("Actual transactions found:", actualTransactions);

    // Check if hatchery has transactions
    if (transactionCount > 0) {
      return res.status(400).json({
        message:
          "Cannot delete hatchery with existing transactions. Please remove all transactions first.",
      });
    }

    // Delete hatchery
    await prisma.hatchery.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Hatchery deleted successfully",
    });
  } catch (error) {
    console.error("Delete hatchery error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== ADD HATCHERY TRANSACTION ====================
export const addHatcheryTransaction = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(400).json({
        message: "No User found in Controller",
      });
    }

    const {
      type,
      amount,
      quantity,
      itemName,
      date,
      description,
      reference,
      unitPrice,
      // Free chicks handling
      freeCount,
      freePercent,
      // 🔗 NEW: Payment data for single request
      paymentAmount,
      paymentDescription,
      // 🔗 NEW: Link standalone PAYMENT to a purchase
      paymentToPurchaseId,
    } = req.body;

    console.log("Hatchery ID:", id);
    console.log("Current user ID:", currentUserId);
    console.log("Type:", type);
    console.log("Amount:", amount);
    console.log("Quantity:", quantity);
    console.log("Item name:", itemName);
    console.log("Date:", date);
    console.log("Description:", description);
    console.log("Reference:", reference);
    console.log("Unit price:", unitPrice);
    console.log("Free count:", freeCount, "Free percent:", freePercent);
    console.log("Type, amount, and date are required", type, amount, date);
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

    // Normalize numbers
    const numericAmount = Number(amount);
    const numericQuantity =
      quantity !== undefined && quantity !== null ? Number(quantity) : null;
    const numericFreeCount =
      freeCount !== undefined && freeCount !== null ? Number(freeCount) : null;
    const numericFreePercent =
      freePercent !== undefined && freePercent !== null
        ? Number(freePercent)
        : null;
    const numericPaymentAmount =
      paymentAmount !== undefined && paymentAmount !== null
        ? Number(paymentAmount)
        : null;

    // Enforce positive amount
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res
        .status(400)
        .json({ message: "Amount must be a positive number" });
    }

    // Check if hatchery exists and belongs to user
    const hatchery = await prisma.hatchery.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!hatchery) {
      return res.status(404).json({ message: "Hatchery not found" });
    }

    let transactions = [];

    if (type === TransactionType.PURCHASE && itemName && quantity) {
      // Enforce positive integer quantity
      if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
        return res
          .status(400)
          .json({ message: "Quantity must be a positive integer" });
      }
      // Normalize free quantity (either from count or percent)
      let normalizedFreeQuantity = 0;
      if (
        numericFreeCount !== null &&
        Number.isInteger(numericFreeCount) &&
        numericFreeCount >= 0
      ) {
        normalizedFreeQuantity = numericFreeCount;
      } else if (
        numericFreePercent !== null &&
        Number.isFinite(numericFreePercent) &&
        numericFreePercent >= 0
      ) {
        normalizedFreeQuantity = Math.floor(
          (Number(quantity) * numericFreePercent) / 100
        );
      }
      // Validate paymentAmount if provided
      if (
        numericPaymentAmount !== null &&
        (!Number.isFinite(numericPaymentAmount) || numericPaymentAmount <= 0)
      ) {
        return res
          .status(400)
          .json({ message: "Initial payment must be a positive number" });
      }

      // 🔗 NEW: Use inventory service for purchases
      const result = await InventoryService.processSupplierPurchase({
        hatcheryId: id,
        itemName,
        quantity: Number(quantity),
        freeQuantity: normalizedFreeQuantity,
        unitPrice: Number(unitPrice || amount / quantity),
        totalAmount: Number(amount),
        date: new Date(date),
        description,
        reference,
        userId: currentUserId,
      });

      const purchaseTransaction = result.entityTransaction;
      transactions.push(purchaseTransaction);

      // 🔗 NEW: Create payment transaction if paymentAmount is provided
      if (paymentAmount && Number(paymentAmount) > 0) {
        // Prevent overpayment at creation
        if (Number(paymentAmount) > Number(amount)) {
          return res
            .status(400)
            .json({ message: "Initial payment cannot exceed purchase amount" });
        }
        const paymentTransaction = await prisma.entityTransaction.create({
          data: {
            type: TransactionType.PAYMENT,
            amount: Number(paymentAmount),
            quantity: null,
            itemName: null,
            date: new Date(date),
            description:
              paymentDescription || `Initial payment for ${itemName}`,
            reference: null,
            hatcheryId: id,
            entityType: "HATCHERY",
            entityId: id,
            // 🔗 NEW: Link payment to purchase
            paymentToPurchaseId: result.purchaseTransactionId,
          },
        });
        transactions.push(paymentTransaction);
      }
    } else {
      // Simple transaction (payments, adjustments, etc.)
      // 🔗 If this is a PAYMENT and paymentToPurchaseId is provided, validate and link it
      if (type === TransactionType.PAYMENT) {
        // Disallow unlinked payments
        if (!paymentToPurchaseId) {
          return res
            .status(400)
            .json({
              message:
                "paymentToPurchaseId is required for PAYMENT transactions",
            });
        }

        const purchaseTxn = await prisma.entityTransaction.findFirst({
          where: {
            id: paymentToPurchaseId,
            hatcheryId: id,
            type: TransactionType.PURCHASE,
          },
          select: { id: true, amount: true },
        });

        if (!purchaseTxn) {
          return res.status(400).json({
            message: "Invalid paymentToPurchaseId: target purchase not found",
          });
        }

        // Prevent overpayment: compute remaining due
        const alreadyPaidAgg = await prisma.entityTransaction.aggregate({
          _sum: { amount: true },
          where: {
            type: TransactionType.PAYMENT,
            paymentToPurchaseId: paymentToPurchaseId,
            hatcheryId: id,
          },
        });
        const alreadyPaid = Number(alreadyPaidAgg._sum.amount || 0);
        const purchaseTotal = Number(purchaseTxn.amount);
        const remainingDue = Math.max(0, purchaseTotal - alreadyPaid);
        if (Number(amount) > remainingDue) {
          return res.status(400).json({
            message: `Payment exceeds remaining due. Remaining: ${remainingDue}`,
          });
        }
      }

      const transaction = await prisma.entityTransaction.create({
        data: {
          type,
          amount: Number(amount),
          quantity: quantity ? Number(quantity) : null,
          itemName: itemName || null,
          date: new Date(date),
          description: description || null,
          reference: reference || null,
          hatcheryId: id,
          entityType: "HATCHERY",
          entityId: id,
          paymentToPurchaseId:
            type === TransactionType.PAYMENT
              ? paymentToPurchaseId || null
              : null,
        },
      });
      transactions.push(transaction);
    }

    return res.status(201).json({
      success: true,
      data: transactions.length === 1 ? transactions[0] : transactions,
      message:
        transactions.length === 1
          ? "Transaction added successfully"
          : `${transactions.length} transactions added successfully`,
    });
  } catch (error) {
    console.error("Add hatchery transaction error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET HATCHERY STATISTICS ====================
export const getHatcheryStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    // Get all hatcheries for the user
    const hatcheries = await prisma.hatchery.findMany({
      where: { userId: currentUserId },
    });

    // Calculate statistics
    let totalHatcheries = hatcheries.length;
    let activeHatcheries = 0;
    let outstandingAmount = 0;
    let thisMonthAmount = 0;

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    for (const hatchery of hatcheries) {
      // Get transactions directly from entityTransaction table
      const transactions = await prisma.entityTransaction.findMany({
        where: {
          hatcheryId: hatchery.id,
        },
      });

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

      if (balance > 0) {
        activeHatcheries++;
        outstandingAmount += balance;
      }

      // This month's purchases
      const thisMonthPurchases = transactions
        .filter(
          (t) => t.type === "PURCHASE" && new Date(t.date) >= currentMonth
        )
        .reduce((sum, t) => sum + Number(t.amount), 0);

      thisMonthAmount += thisMonthPurchases;
    }

    return res.json({
      success: true,
      data: {
        totalHatcheries,
        activeHatcheries,
        outstandingAmount,
        thisMonthAmount,
      },
    });
  } catch (error) {
    console.error("Get hatchery statistics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE HATCHERY TRANSACTION ====================
export const deleteHatcheryTransaction = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id, transactionId } = req.params;
    const { password } = req.body;
    const currentUserId = req.userId;

    // Verify password is provided
    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password confirmation is required for deletion",
      });
    }

    // Verify user's password
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

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

    // Verify hatchery belongs to user
    const hatchery = await prisma.hatchery.findFirst({
      where: { id, userId: currentUserId },
    });
    if (!hatchery) {
      return res.status(404).json({ message: "Hatchery not found" });
    }

    // Verify transaction exists and belongs to hatchery
    const txn = await prisma.entityTransaction.findFirst({
      where: { id: transactionId, hatcheryId: id },
      select: {
        id: true,
        type: true,
        amount: true,
        quantity: true,
        date: true,
        description: true,
        inventoryItemId: true,
        expenseId: true,
        paymentToPurchaseId: true,
      },
    });

    if (!txn) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    console.log("🔍 Deleting transaction:", txn);
    console.log("🔍 Transaction type:", txn.type);

    // If this is a PURCHASE, ensure stock was not consumed and reverse inventory safely
    if (txn.type === "PURCHASE") {
      if (!txn.inventoryItemId || !txn.quantity) {
        return res.status(400).json({
          message:
            "Purchase transaction missing inventory linkage; cannot safely delete.",
        });
      }

      const item = await prisma.inventoryItem.findUnique({
        where: { id: txn.inventoryItemId },
      });
      if (!item) {
        return res
          .status(404)
          .json({ message: "Linked inventory item not found" });
      }

      const currentStock = Number(item.currentStock || 0);
      const qty = Number(txn.quantity || 0);
      if (currentStock < qty) {
        return res.status(400).json({
          message: `Cannot delete: ${qty} units from purchase have been partially consumed. Available stock: ${currentStock}. Remove usages first.`,
        });
      }

      await prisma.$transaction(async (tx) => {
        // 🔗 NEW: Find and delete related PAYMENT transactions using direct relationship
        const relatedPaymentTxns = await tx.entityTransaction.findMany({
          where: {
            hatcheryId: id,
            type: "PAYMENT",
            paymentToPurchaseId: transactionId, // Direct relationship
          },
        });

        console.log(
          "🔍 Found related payment transactions:",
          relatedPaymentTxns
        );

        // Delete related payment transactions
        for (const paymentTxn of relatedPaymentTxns) {
          console.log(
            "🗑️ Deleting related payment transaction:",
            paymentTxn.id
          );
          await tx.entityTransaction.delete({ where: { id: paymentTxn.id } });
        }

        // 2) Reduce inventory stock by the purchased quantity (reverse stock-in)
        await tx.inventoryItem.update({
          where: { id: txn.inventoryItemId as string },
          data: { currentStock: { decrement: qty } },
        });

        // 3) Remove a matching inventoryTransaction (PURCHASE) if present
        const invTxn = await tx.inventoryTransaction.findFirst({
          where: {
            itemId: txn.inventoryItemId as string,
            type: "PURCHASE",
            quantity: qty,
          },
          orderBy: { date: "desc" },
        });
        if (invTxn) {
          await tx.inventoryTransaction.delete({ where: { id: invTxn.id } });
        }

        // 4) Remove the linked expense if it exists
        if (txn.expenseId) {
          await tx.expense.delete({ where: { id: txn.expenseId } });
        }

        // 5) Finally, delete the entity transaction
        console.log("🔍 About to delete entity transaction:", transactionId);
        const deletedEntityTxn = await tx.entityTransaction.delete({
          where: { id: transactionId },
        });
        console.log("✅ Deleted entity transaction:", deletedEntityTxn);

        // 6) Optional cleanup: remove empty inventory item if fully orphaned
        const refreshedItem = await tx.inventoryItem.findUnique({
          where: { id: txn.inventoryItemId as string },
          select: { id: true, currentStock: true },
        });
        if (refreshedItem && Number(refreshedItem.currentStock || 0) === 0) {
          const [remainingInvTxns, remainingUsages] = await Promise.all([
            tx.inventoryTransaction.count({
              where: { itemId: refreshedItem.id },
            }),
            tx.inventoryUsage.count({ where: { itemId: refreshedItem.id } }),
          ]);
          if (remainingInvTxns === 0 && remainingUsages === 0) {
            await tx.inventoryItem.delete({ where: { id: refreshedItem.id } });
          }
        }
      });
    } else {
      // Non-purchase: no inventory side effects, but still wrap in transaction for consistency
      console.log("🔍 Deleting non-purchase transaction:", transactionId);
      await prisma.$transaction(async (tx) => {
        // 🔗 NEW: If deleting a payment, check if it has a relationship to a purchase
        if (txn.type === "PAYMENT" && txn.paymentToPurchaseId) {
          console.log(
            "🔍 Deleting payment with relationship to purchase:",
            txn.paymentToPurchaseId
          );
        }

        const deletedTxn = await tx.entityTransaction.delete({
          where: { id: transactionId },
        });
        console.log("✅ Successfully deleted transaction:", deletedTxn);
      });
    }

    // Verify transaction was actually deleted
    const verifyDeleted = await prisma.entityTransaction.findFirst({
      where: { id: transactionId },
    });

    if (verifyDeleted) {
      console.error(
        "❌ Transaction still exists after deletion attempt:",
        verifyDeleted
      );
      return res.status(500).json({ message: "Transaction deletion failed" });
    } else {
      console.log("✅ Transaction successfully deleted and verified");
    }

    // Also check if there are any remaining transactions for this hatchery
    const remainingTransactions = await prisma.entityTransaction.findMany({
      where: { hatcheryId: id },
    });
    console.log(
      "🔍 Remaining transactions for hatchery after deletion:",
      remainingTransactions
    );

    return res.json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    console.error("Delete hatchery transaction error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET HATCHERY TRANSACTIONS ====================
export const getHatcheryTransactions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, type, startDate, endDate } = req.query;
    const currentUserId = req.userId;

    const skip = (Number(page) - 1) * Number(limit);

    // Check if hatchery exists and belongs to user
    const hatchery = await prisma.hatchery.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!hatchery) {
      return res.status(404).json({ message: "Hatchery not found" });
    }

    // Build where clause
    const where: any = {
      hatcheryId: id, // ✅ Use proper foreign key
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
        select: {
          id: true,
          type: true,
          amount: true,
          quantity: true,
          freeQuantity: true,
          itemName: true,
          date: true,
          description: true,
          reference: true,
          hatcheryId: true,
          entityType: true,
          entityId: true,
          inventoryItemId: true,
          expenseId: true,
          paymentToPurchaseId: true, // 🔗 NEW: Include payment relationship
          createdAt: true,
          updatedAt: true,
        },
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
    console.error("Get hatchery transactions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
