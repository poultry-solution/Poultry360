import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, TransactionType } from "@prisma/client";
import {
  CreateDealerSchema,
  UpdateDealerSchema,
  DealerSchema,
} from "@myapp/shared-types";
import { InventoryService } from "../services/inventoryService";

// ==================== GET ALL DEALERS ====================
export const getAllDealers = async (
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

    const [dealers, total] = await Promise.all([
      prisma.dealer.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.dealer.count({ where }),
    ]);

    // Calculate balance for each dealer
    const dealersWithBalance = await Promise.all(
      dealers.map(async (dealer) => {
        // Get transactions directly from entityTransaction table
        const transactions = await prisma.entityTransaction.findMany({
          where: {
            dealerId: dealer.id,
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
          ...dealer,
          balance: Math.max(0, balance), // Only show positive balance (amount due)
          thisMonthAmount,
          totalTransactions: transactions.length,
          recentTransactions: transactions.slice(0, 5), // Last 5 transactions
        };
      })
    );

    return res.json({
      success: true,
      data: dealersWithBalance,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get all dealers error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET DEALER BY ID ====================
export const getDealerById = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    const dealer = await prisma.dealer.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Get transactions directly from entityTransaction table
    const transactions = await prisma.entityTransaction.findMany({
      where: {
        dealerId: id,
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

    // 🔗 Apply payments to purchases using direct relationship only (no FIFO fallback)
    const purchaseGroups = Object.values(transactionGroups) as any[];
    const payments = transactions.filter((t) => t.type === "PAYMENT");

    for (const payment of payments) {
      const paymentAmount = Number(payment.amount);
      if (!payment.paymentToPurchaseId) continue;

      const targetGroup = purchaseGroups.find(
        (group) => group.id === payment.paymentToPurchaseId
      );
      if (!targetGroup) continue;

      const currentDue = targetGroup.totalAmount - targetGroup.amountPaid;
      if (currentDue <= 0) continue;

      const paymentToApply = Math.min(paymentAmount, currentDue);
      targetGroup.amountPaid += paymentToApply;
      targetGroup.amountDue = Math.max(0, targetGroup.totalAmount - targetGroup.amountPaid);
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
        ...dealer,
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
    console.error("Get dealer by ID error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE DEALER ====================
export const createDealer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    // Validate request body
    const { success, data, error } = CreateDealerSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if dealer with same name already exists for this user
    const existingDealer = await prisma.dealer.findFirst({
      where: {
        userId: currentUserId,
        name: data.name,
      },
    });

    if (existingDealer) {
      return res
        .status(400)
        .json({ message: "Dealer with this name already exists" });
    }

    // Create dealer
    const dealer = await prisma.dealer.create({
      data: {
        name: data.name,
        contact: data.contact,
        address: data.address,
        userId: currentUserId as string,
      },
    });

    return res.status(201).json({
      success: true,
      data: dealer,
      message: "Dealer created successfully",
    });
  } catch (error) {
    console.error("Create dealer error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE DEALER ====================
export const updateDealer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    // Validate request body
    const { success, data, error } = UpdateDealerSchema.safeParse(req.body);
    if (!success) {
      return res.status(400).json({ message: error?.message });
    }

    // Check if dealer exists and belongs to user
    const existingDealer = await prisma.dealer.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!existingDealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Check for name uniqueness if name is being updated
    if (data.name && data.name !== existingDealer.name) {
      const nameExists = await prisma.dealer.findFirst({
        where: {
          userId: currentUserId,
          name: data.name,
          id: { not: id },
        },
      });

      if (nameExists) {
        return res
          .status(400)
          .json({ message: "Dealer with this name already exists" });
      }
    }

    // Update dealer
    const updatedDealer = await prisma.dealer.update({
      where: { id },
      data,
    });

    return res.json({
      success: true,
      data: updatedDealer,
      message: "Dealer updated successfully",
    });
  } catch (error) {
    console.error("Update dealer error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE DEALER ====================
export const deleteDealer = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    // Check if dealer exists and belongs to user
    const existingDealer = await prisma.dealer.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!existingDealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Check if dealer has transactions by directly querying entityTransaction table
    const transactionCount = await prisma.entityTransaction.count({
      where: {
        dealerId: id,
      },
    });

    console.log("Existing dealer:", existingDealer);
    console.log("Transaction count for dealer:", transactionCount);

    // Let's also check what transactions actually exist
    const actualTransactions = await prisma.entityTransaction.findMany({
      where: {
        dealerId: id,
      },
      select: {
        id: true,
        type: true,
        amount: true,
        itemName: true,
        date: true,
      }
    });
    console.log("Actual transactions found:", actualTransactions);

    // Check if dealer has transactions
    if (transactionCount > 0) {
      return res.status(400).json({
        message:
          "Cannot delete dealer with existing transactions. Please remove all transactions first.",
      });
    }

    // Delete dealer
    await prisma.dealer.delete({
      where: { id },
    });

    return res.json({
      success: true,
      message: "Dealer deleted successfully",
    });
  } catch (error) {
    console.error("Delete dealer error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== ADD DEALER TRANSACTION ====================
export const addDealerTransaction = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;

    const currentUserId = req.userId;

    if (!currentUserId) {
      return res.status(400).json({
        message: "No User found in COntrooler",
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
      // 🔗 NEW: single-request optional initial payment
      paymentAmount,
      paymentDescription,
      // 🔗 NEW: link standalone PAYMENT to a purchase
      paymentToPurchaseId,
    } = req.body;

    // Validate required fields
    if (!type || amount === undefined || amount === null || !date) {
      return res
        .status(400)
        .json({ message: "Type, amount, and date are required" });
    }

    // Validate transaction type
    if (!Object.values(TransactionType).includes(type)) {
      return res.status(400).json({ message: "Invalid transaction type" });
    }

    // Normalize numbers and validate positive amount
    const numericAmount = Number(amount);
    const numericQuantity = quantity !== undefined && quantity !== null ? Number(quantity) : null;
    const numericPaymentAmount = paymentAmount !== undefined && paymentAmount !== null ? Number(paymentAmount) : null;
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }

    // Check if dealer exists and belongs to user
    const dealer = await prisma.dealer.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    let transactions: any[] = [];

    if (type === TransactionType.PURCHASE && itemName && numericQuantity !== null) {
      // Enforce positive integer quantity
      if (!Number.isInteger(numericQuantity) || numericQuantity <= 0) {
        return res.status(400).json({ message: "Quantity must be a positive integer" });
      }
      // Validate initial payment if provided
      if (numericPaymentAmount !== null && (!Number.isFinite(numericPaymentAmount) || numericPaymentAmount <= 0)) {
        return res.status(400).json({ message: "Initial payment must be a positive number" });
      }

      // 🔗 Use inventory service for purchases
      const result = await InventoryService.processSupplierPurchase({
        dealerId: id,
        itemName,
        quantity: Number(numericQuantity),
        unitPrice: Number(unitPrice || numericAmount / Number(numericQuantity)),
        totalAmount: Number(numericAmount),
        date: new Date(date),
        description,
        reference,
        userId: currentUserId,
      });

      const purchaseTransaction = result.entityTransaction;
      transactions.push(purchaseTransaction);

      if (numericPaymentAmount && numericPaymentAmount > 0) {
        if (numericPaymentAmount > numericAmount) {
          return res.status(400).json({ message: "Initial payment cannot exceed purchase amount" });
        }
        const paymentTransaction = await prisma.entityTransaction.create({
          data: {
            type: TransactionType.PAYMENT,
            amount: Number(numericPaymentAmount),
            quantity: null,
            itemName: null,
            date: new Date(date),
            description: paymentDescription || `Initial payment for ${itemName}`,
            reference: null,
            dealerId: id,
            entityType: "DEALER",
            entityId: id,
            paymentToPurchaseId: result.purchaseTransactionId,
          },
        });
        transactions.push(paymentTransaction);
      }
    } else {
      // PAYMENT validation and overpayment prevention
      if (type === TransactionType.PAYMENT) {
        if (!paymentToPurchaseId) {
          return res.status(400).json({ message: "paymentToPurchaseId is required for PAYMENT transactions" });
        }
        const purchaseTxn = await prisma.entityTransaction.findFirst({
          where: { id: paymentToPurchaseId, dealerId: id, type: TransactionType.PURCHASE },
          select: { id: true, amount: true },
        });
        if (!purchaseTxn) {
          return res.status(400).json({ message: "Invalid paymentToPurchaseId: target purchase not found" });
        }
        const alreadyPaidAgg = await prisma.entityTransaction.aggregate({
          _sum: { amount: true },
          where: { type: TransactionType.PAYMENT, paymentToPurchaseId, dealerId: id },
        });
        const alreadyPaid = Number(alreadyPaidAgg._sum.amount || 0);
        const purchaseTotal = Number(purchaseTxn.amount);
        const remainingDue = Math.max(0, purchaseTotal - alreadyPaid);
        if (numericAmount > remainingDue) {
          return res.status(400).json({ message: `Payment exceeds remaining due. Remaining: ${remainingDue}` });
        }
      }

      const transaction = await prisma.entityTransaction.create({
        data: {
          type,
          amount: Number(numericAmount),
          quantity: numericQuantity ? Number(numericQuantity) : null,
          itemName: itemName || null,
          date: new Date(date),
          description: description || null,
          reference: reference || null,
          dealerId: id,
          entityType: "DEALER",
          entityId: id,
          paymentToPurchaseId: type === TransactionType.PAYMENT ? paymentToPurchaseId || null : null,
        },
      });
      transactions.push(transaction);
    }

    return res.status(201).json({
      success: true,
      data: transactions.length === 1 ? transactions[0] : transactions,
      message: transactions.length === 1 ? "Transaction added successfully" : `${transactions.length} transactions added successfully`,
    });
  } catch (error) {
    console.error("Add dealer transaction error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE DEALER TRANSACTION ====================
export const deleteDealerTransaction = async (
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
        message: "Password confirmation is required for deletion" 
      });
    }

    // Verify user's password
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const bcrypt = require('bcrypt');
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false,
        message: "Invalid password. Deletion cancelled." 
      });
    }

    // Verify dealer belongs to user
    const dealer = await prisma.dealer.findFirst({
      where: { id, userId: currentUserId },
    });
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Verify transaction exists and belongs to dealer
    const txn = await prisma.entityTransaction.findFirst({
      where: { id: transactionId, dealerId: id },
      select: {
        id: true,
        type: true,
        amount: true,
        quantity: true,
        date: true,
        description: true,
        inventoryItemId: true,
        expenseId: true,
      },
    });
    if (!txn) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    console.log("🔍 Deleting transaction:", txn);
    console.log("🔍 Transaction type:", txn.type);

    // If this is a PURCHASE, ensure stock was not consumed and reverse inventory safely
    if (txn.type === 'PURCHASE') {
      if (!txn.inventoryItemId || !txn.quantity) {
        return res.status(400).json({ message: 'Purchase transaction missing inventory linkage; cannot safely delete.' });
      }

      const item = await prisma.inventoryItem.findUnique({ where: { id: txn.inventoryItemId } });
      if (!item) {
        return res.status(404).json({ message: 'Linked inventory item not found' });
      }

      const currentStock = Number(item.currentStock || 0);
      const qty = Number(txn.quantity || 0);
      if (currentStock < qty) {
        return res.status(400).json({
          message: `Cannot delete: ${qty} units from purchase have been partially consumed. Available stock: ${currentStock}. Remove usages first.`,
        });
      }

      await prisma.$transaction(async (tx) => {
        // 🔗 Find and delete related PAYMENT transactions using direct relationship
        const relatedPaymentTxns = await tx.entityTransaction.findMany({
          where: {
            dealerId: id,
            type: 'PAYMENT',
            paymentToPurchaseId: transactionId,
          }
        });

        console.log("🔍 Found related payment transactions:", relatedPaymentTxns);
        
        // Delete related payment transactions
        for (const paymentTxn of relatedPaymentTxns) {
          console.log("🗑️ Deleting related payment transaction:", paymentTxn.id);
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
            type: 'PURCHASE',
            quantity: qty,
          },
          orderBy: { date: 'desc' },
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
        const deletedEntityTxn = await tx.entityTransaction.delete({ where: { id: transactionId } });
        console.log("✅ Deleted entity transaction:", deletedEntityTxn);

        // 6) Optional cleanup: remove empty inventory item if fully orphaned
        const refreshedItem = await tx.inventoryItem.findUnique({
          where: { id: txn.inventoryItemId as string },
          select: { id: true, currentStock: true },
        });
        if (refreshedItem && Number(refreshedItem.currentStock || 0) === 0) {
          const [remainingInvTxns, remainingUsages] = await Promise.all([
            tx.inventoryTransaction.count({ where: { itemId: refreshedItem.id } }),
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
        const deletedTxn = await tx.entityTransaction.delete({ where: { id: transactionId } });
        console.log("✅ Successfully deleted transaction:", deletedTxn);
      });
    }

    // Verify transaction was actually deleted
    const verifyDeleted = await prisma.entityTransaction.findFirst({
      where: { id: transactionId },
    });
    
    if (verifyDeleted) {
      console.error("❌ Transaction still exists after deletion attempt:", verifyDeleted);
      return res.status(500).json({ message: "Transaction deletion failed" });
    } else {
      console.log("✅ Transaction successfully deleted and verified");
    }

    // Also check if there are any remaining transactions for this dealer
    const remainingTransactions = await prisma.entityTransaction.findMany({
      where: { dealerId: id },
    });
    console.log("🔍 Remaining transactions for dealer after deletion:", remainingTransactions);

    return res.json({ success: true, message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Delete dealer transaction error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET DEALER STATISTICS ====================
export const getDealerStatistics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    // Get all dealers for the user
    const dealers = await prisma.dealer.findMany({
      where: { userId: currentUserId },
    });

    // Calculate statistics
    let totalDealers = dealers.length;
    let activeDealers = 0;
    let outstandingAmount = 0;
    let thisMonthAmount = 0;

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    for (const dealer of dealers) {
      // Get transactions directly from entityTransaction table
      const transactions = await prisma.entityTransaction.findMany({
        where: {
          dealerId: dealer.id,
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
        activeDealers++;
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
        totalDealers,
        activeDealers,
        outstandingAmount,
        thisMonthAmount,
      },
    });
  } catch (error) {
    console.error("Get dealer statistics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET DEALER TRANSACTIONS ====================
export const getDealerTransactions = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, type, startDate, endDate } = req.query;
    const currentUserId = req.userId;

    const skip = (Number(page) - 1) * Number(limit);

    // Check if dealer exists and belongs to user
    const dealer = await prisma.dealer.findFirst({
      where: {
        id,
        userId: currentUserId,
      },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Build where clause
    const where: any = {
      dealerId: id, // ✅ Use proper foreign key
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
    console.error("Get dealer transactions error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
