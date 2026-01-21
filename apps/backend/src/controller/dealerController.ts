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

    // Get company for company users (needed for both query and balance calculation)
    let company: { id: string } | null = null;
    if (currentUserRole === UserRole.COMPANY) {
      company = await prisma.company.findUnique({
        where: { ownerId: currentUserId },
        select: { id: true },
      });

      if (!company) {
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            totalPages: 0,
          },
        });
      }
    }

    // Build where clause
    let where: any;
    let dealerFarmerConnections: Map<string, { connectionId: string; connectionType: string }> = new Map();

    // For company users, get dealers linked via DealerCompany relationship OR manually created
    if (currentUserRole === UserRole.COMPANY && company) {
      // Get dealer IDs linked to this company via DealerCompany table
      const dealerCompanies = await (prisma as any).dealerCompany.findMany({
        where: {
          companyId: company.id,
        },
        select: {
          dealerId: true,
        },
      });

      const linkedDealerIds = dealerCompanies.map((dc: any) => dc.dealerId);

      // Include dealers where:
      // 1. Has DealerCompany relationship with this company
      // 2. OR userId matches current user (manually created dealers)
      where = {
        OR: [
          { id: { in: linkedDealerIds.length > 0 ? linkedDealerIds : [null] } },
          { userId: currentUserId },
        ],
      };
    } else {
      // For farmers (OWNER role), fetch both manual and connected dealers
      const dealerFarmers = await prisma.dealerFarmer.findMany({
        where: {
          farmerId: currentUserId,
          archivedByFarmer: false,
        },
        include: {
          dealer: true,
        },
      });

      const connectedDealerIds = dealerFarmers.map((df) => df.dealerId);

      // Store connection metadata for later use
      dealerFarmers.forEach((df) => {
        dealerFarmerConnections.set(df.dealerId, {
          connectionId: df.id,
          connectionType: "CONNECTED",
        });
      });

      // Include dealers where:
      // 1. Manually created by farmer (userId = farmerId)
      // 2. OR connected via DealerFarmer (archivedByFarmer = false)
      where = {
        OR: [
          { userId: currentUserId },
        ],
      };

      // Only add connected dealers condition if there are any
      if (connectedDealerIds.length > 0) {
        where.OR.push({ id: { in: connectedDealerIds } });
      }
    }

    // Add search filter
    if (search) {
      const searchFilter = {
        OR: [
          { name: { contains: search as string, mode: "insensitive" } },
          { contact: { contains: search as string, mode: "insensitive" } },
          { address: { contains: search as string, mode: "insensitive" } },
        ],
      };

      // Combine with existing where clause
      where = {
        AND: [
          where,
          searchFilter,
        ],
      };
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
        let balance = 0;
        let thisMonthAmount = 0;
        let totalTransactions = 0;
        let recentTransactions: any[] = [];

        // For company users, calculate balance from CompanySale
        if (currentUserRole === UserRole.COMPANY && company) {
          const sales = await prisma.companySale.findMany({
            where: {
              companyId: company.id,
              dealerId: dealer.id,
            },
            select: {
              totalAmount: true,
              paidAmount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          });

          const totalSales = sales.reduce(
            (sum, sale) => sum + Number(sale.totalAmount),
            0
          );
          const totalPaid = sales.reduce(
            (sum, sale) => sum + Number(sale.paidAmount),
            0
          );
          balance = totalSales - totalPaid; // Preserve negative balance for advances

          // Calculate this month amount
          const currentMonth = new Date();
          currentMonth.setDate(1);
          currentMonth.setHours(0, 0, 0, 0);

          const thisMonthSales = sales.filter(
            (s) => new Date(s.createdAt) >= currentMonth
          );
          thisMonthAmount = thisMonthSales.reduce(
            (sum, s) => sum + Number(s.totalAmount),
            0
          );
          totalTransactions = sales.length;
          recentTransactions = sales.slice(0, 5);
        } else {
          // For other users, calculate from EntityTransaction (as before)
          const transactions = await prisma.entityTransaction.findMany({
            where: {
              dealerId: dealer.id,
            },
            orderBy: { date: "desc" },
          });

          // Calculate balance: PURCHASE/ADJUSTMENT (positive) - PAYMENT/RECEIPT (negative)
          balance = transactions.reduce((sum, transaction) => {
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

          thisMonthAmount = thisMonthTransactions
            .filter((t) => t.type === "PURCHASE")
            .reduce((sum, t) => sum + Number(t.amount), 0);

          totalTransactions = transactions.length;
          recentTransactions = transactions.slice(0, 5);
        }

        // Determine connection type
        const isManualDealer = dealer.userId === currentUserId;
        const connectionInfo = dealerFarmerConnections.get(dealer.id);
        const connectionType = connectionInfo ? "CONNECTED" : "MANUAL";
        const isOwnedDealer = !!dealer.ownerId;

        return {
          ...dealer,
          balance: balance, // Preserve negative balance for advances
          thisMonthAmount,
          totalTransactions,
          recentTransactions,
          connectionType, // NEW: "MANUAL" | "CONNECTED"
          connectionId: connectionInfo?.connectionId, // NEW: DealerFarmer.id if connected
          isOwnedDealer, // NEW: true if dealer has ownerId (registered dealer)
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

    // Check if dealer is manually created OR connected via DealerFarmer
    const dealer = await prisma.dealer.findUnique({
      where: { id },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Verify access: either manually created or connected
    const isManualDealer = dealer.userId === currentUserId;
    const dealerFarmerConnection = await prisma.dealerFarmer.findFirst({
      where: {
        dealerId: id,
        farmerId: currentUserId,
        archivedByFarmer: false,
      },
    });

    if (!isManualDealer && !dealerFarmerConnection) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Determine connection type
    const connectionType = dealerFarmerConnection ? "CONNECTED" : "MANUAL";
    const isOwnedDealer = !!dealer.ownerId;

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
        connectionType, // NEW: "MANUAL" | "CONNECTED"
        connectionId: dealerFarmerConnection?.id, // NEW: DealerFarmer.id if connected
        isOwnedDealer, // NEW: true if dealer has ownerId
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

    // Check if dealer with same name already exists for this user (manually created)
    const existingManualDealer = await prisma.dealer.findFirst({
      where: {
        userId: currentUserId,
        name: data.name,
      },
    });

    if (existingManualDealer) {
      return res
        .status(400)
        .json({ message: "Dealer with this name already exists" });
    }

    // Check if a connected dealer with the same name exists
    const connectedDealers = await prisma.dealerFarmer.findMany({
      where: {
        farmerId: currentUserId,
        archivedByFarmer: false,
      },
      include: {
        dealer: true,
      },
    });

    const connectedDealerWithSameName = connectedDealers.find(
      (df) => df.dealer.name.toLowerCase() === data.name.toLowerCase()
    );

    if (connectedDealerWithSameName) {
      return res.status(400).json({
        message: "A connected dealer with this name already exists. You cannot create a duplicate dealer.",
      });
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

    // Check if dealer exists
    const existingDealer = await prisma.dealer.findUnique({
      where: { id },
    });

    if (!existingDealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Check if dealer is manually created or connected
    const isManualDealer = existingDealer.userId === currentUserId;
    const dealerFarmerConnection = await prisma.dealerFarmer.findFirst({
      where: {
        dealerId: id,
        farmerId: currentUserId,
        archivedByFarmer: false,
      },
    });

    // Verify access
    if (!isManualDealer && !dealerFarmerConnection) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Prevent deletion of connected dealers
    if (dealerFarmerConnection && !isManualDealer) {
      return res.status(400).json({
        message: "Cannot delete connected dealers. Please archive the connection instead from your Connected Dealers page.",
      });
    }

    // Only allow deletion of manually created dealers
    if (!isManualDealer) {
      return res.status(403).json({
        message: "You can only delete dealers you created manually.",
      });
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

    // Check if dealer exists
    const dealer = await prisma.dealer.findUnique({
      where: { id },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Verify access: either manually created or connected
    const isManualDealer = dealer.userId === currentUserId;
    const dealerFarmerConnection = await prisma.dealerFarmer.findFirst({
      where: {
        dealerId: id,
        farmerId: currentUserId,
        archivedByFarmer: false,
      },
    });

    if (!isManualDealer && !dealerFarmerConnection) {
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
          select: { id: true, amount: true, reference: true },
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

        // 🔗 NEW: Check if this is a connected dealer - create payment request instead
        if (dealerFarmerConnection && purchaseTxn.reference) {
          // Find the DealerSale that corresponds to this purchase (by invoice number)
          const dealerSale = await prisma.dealerSale.findFirst({
            where: {
              dealerId: id,
              invoiceNumber: purchaseTxn.reference,
            },
            include: {
              customer: true,
            },
          });

          if (dealerSale && dealerSale.customer?.farmerId === currentUserId) {
            // This is a linked sale - create payment request instead of direct payment
            const { DealerSalePaymentRequestService } = await import("../services/dealerSalePaymentRequestService");

            const paymentRequest = await DealerSalePaymentRequestService.createPaymentRequest({
              dealerSaleId: dealerSale.id,
              farmerId: currentUserId,
              amount: numericAmount,
              paymentDate: new Date(date),
              paymentReference: reference || undefined,
              paymentMethod: undefined,
              description: description || undefined,
            });

            return res.status(201).json({
              success: true,
              data: paymentRequest,
              message: "Payment request created and sent to dealer for approval",
              isPaymentRequest: true,
            });
          }
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

    // Check if dealer exists
    const dealer = await prisma.dealer.findUnique({
      where: { id },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Verify access: either manually created or connected
    const isManualDealer = dealer.userId === currentUserId;
    const dealerFarmerConnection = await prisma.dealerFarmer.findFirst({
      where: {
        dealerId: id,
        farmerId: currentUserId,
        archivedByFarmer: false,
      },
    });

    if (!isManualDealer && !dealerFarmerConnection) {
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

    // Get connected dealers via DealerFarmer
    const dealerFarmers = await prisma.dealerFarmer.findMany({
      where: {
        farmerId: currentUserId,
        archivedByFarmer: false,
      },
    });

    const connectedDealerIds = dealerFarmers.map((df) => df.dealerId);

    // Get all dealers for the user (manual + connected)
    const dealerWhere: any = {
      OR: [
        { userId: currentUserId },
      ],
    };

    // Only add connected dealers condition if there are any
    if (connectedDealerIds.length > 0) {
      dealerWhere.OR.push({ id: { in: connectedDealerIds } });
    }

    const dealers = await prisma.dealer.findMany({
      where: dealerWhere,
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

// ==================== GET COMPANY PRODUCTS FOR DEALER ====================
export const getCompanyProducts = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { companyId } = req.params;
    const { page = 1, limit = 20, search, type } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Get dealer
    const dealer = await prisma.dealer.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Verify dealer has connection to company
    const connection = await (prisma as any).dealerCompany.findUnique({
      where: {
        dealerId_companyId: {
          dealerId: dealer.id,
          companyId: companyId,
        },
        archivedByDealer: false,
      },
    });

    if (!connection) {
      return res.status(403).json({
        message: "You are not connected to this company",
      });
    }

    // Get company owner ID
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { ownerId: true, name: true, address: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Build where clause for products
    const where: any = {
      supplierId: company.ownerId,
      currentStock: { gt: 0 }, // Only show products with available stock
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (type) {
      where.type = type;
    }

    // Get products
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          unit: true,
          price: true,
          currentStock: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: products,
      company: {
        id: companyId,
        name: company.name,
        address: company.address,
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error("Get company products for dealer error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
