import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, TransactionType } from "@prisma/client";
import {
  CreateDealerSchema,
  UpdateDealerSchema,
} from "@myapp/shared-types";
import { InventoryService } from "../services/inventoryService";

// ==================== GET ALL DEALERS ====================
export const getAllDealers = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { page = 1, limit = 10, search, all } = req.query;
    const currentUserId = req.userId;
    const currentUserRole = req.role;
    const shouldReturnAll = all === "true";
    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.min(500, Math.max(1, Number(limit) || 10));

    const skip = (pageNumber - 1) * limitNumber;

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
            page: pageNumber,
            limit: shouldReturnAll ? 0 : limitNumber,
            total: 0,
            totalPages: 0,
          },
        });
      }
    }

    // Build where clause
    let where: any;
    let dealerCompanyConnections: Map<string, { connectionId: string; connectionType: string }> = new Map();

    // For company users, get dealers linked via surviving company-dealer accounts OR manually created
    if (currentUserRole === UserRole.COMPANY && company) {
      const dealerAccounts = await prisma.companyDealerAccount.findMany({
        where: {
          companyId: company.id,
        },
        select: {
          id: true,
          dealerId: true,
        },
      });

      const linkedDealerIds = dealerAccounts.map((account) => account.dealerId);

      // Store connection metadata for later use
      dealerAccounts.forEach((account) => {
        dealerCompanyConnections.set(account.dealerId, {
          connectionId: account.id,
          connectionType: "CONNECTED",
        });
      });

      // Include dealers where:
      // 1. Has DealerCompany relationship with this company (not archived)
      // 2. OR userId matches current user (manually created dealers)
      where = {
        OR: [
          ...(linkedDealerIds.length > 0 ? [{ id: { in: linkedDealerIds } }] : []),
          { userId: currentUserId },
        ],
      };
    } else {
      // For farmers (OWNER role), supplier ledger is manual-only.
      where = {
        userId: currentUserId,
      };
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
        ...(shouldReturnAll ? {} : { skip, take: limitNumber }),
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

        // Determine connection type first
        let connectionInfo;
        if (currentUserRole === UserRole.COMPANY) {
          connectionInfo = dealerCompanyConnections.get(dealer.id);
        }
        const connectionType = connectionInfo ? "CONNECTED" : "MANUAL";
        const isOwnedDealer = !!dealer.ownerId;

        // For company users, fetch balance from CompanyDealerAccount
        if (currentUserRole === UserRole.COMPANY && company) {
          const account = await prisma.companyDealerAccount.findUnique({
            where: {
              companyId_dealerId: {
                companyId: company.id,
                dealerId: dealer.id,
              },
            },
            select: {
              balance: true,
              totalSales: true,
              totalPayments: true,
            },
          });

          balance = account ? Number(account.balance) : 0;

          const currentMonth = new Date();
          currentMonth.setDate(1);
          currentMonth.setHours(0, 0, 0, 0);

          const sales = await prisma.companySale.findMany({
            where: {
              companyId: company.id,
              dealerId: dealer.id,
              createdAt: { gte: currentMonth },
            },
            select: {
              totalAmount: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          });

          thisMonthAmount = sales.reduce(
            (sum, s) => sum + Number(s.totalAmount),
            0
          );

          const totalSalesCount = await prisma.companySale.count({
            where: {
              companyId: company.id,
              dealerId: dealer.id,
            },
          });

          totalTransactions = totalSalesCount;
          recentTransactions = sales;
        } else {
          // For manual dealers: use dealer.balance stored field
          balance = Number(dealer.balance);

          const currentMonth = new Date();
          currentMonth.setDate(1);
          currentMonth.setHours(0, 0, 0, 0);

          const transactions = await prisma.entityTransaction.findMany({
            where: { dealerId: dealer.id },
            orderBy: { date: "desc" },
            take: 5,
          });

          const thisMonthTxns = await prisma.entityTransaction.findMany({
            where: {
              dealerId: dealer.id,
              type: "PURCHASE",
              date: { gte: currentMonth },
            },
            select: { amount: true },
          });

          thisMonthAmount = thisMonthTxns.reduce(
            (sum, t) => sum + Number(t.amount), 0
          );

          totalTransactions = await prisma.entityTransaction.count({
            where: { dealerId: dealer.id },
          });
          recentTransactions = transactions;
        }

        return {
          ...dealer,
          balance,
          thisMonthAmount,
          totalTransactions,
          recentTransactions,
          connectionType,
          connectionId: connectionInfo?.connectionId,
          isOwnedDealer,
        };
      })
    );

    return res.json({
      success: true,
      data: dealersWithBalance,
      pagination: {
        page: shouldReturnAll ? 1 : pageNumber,
        limit: shouldReturnAll ? total : limitNumber,
        total,
        totalPages: shouldReturnAll ? 1 : Math.ceil(total / limitNumber),
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

    const dealer = await prisma.dealer.findUnique({
      where: { id },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const isManualDealer = dealer.userId === currentUserId;
    if (!isManualDealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const connectionType = "MANUAL";
    const isOwnedDealer = !!dealer.ownerId;

    // ── Manual dealers: use dealer.balance + EntityTransaction aggregates ──
    const balance = Number(dealer.balance);

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [
      openingBalanceHistoryRaw,
      purchaseSummary,
      paymentSummary,
      thisMonthPurchaseSummary,
      thisMonthPurchaseCount,
      totalTransactions,
    ] = await Promise.all([
      prisma.entityTransaction.findMany({
        where: { dealerId: id, type: TransactionType.OPENING_BALANCE },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
      prisma.entityTransaction.aggregate({
        where: { dealerId: id, type: TransactionType.PURCHASE },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.entityTransaction.aggregate({
        where: { dealerId: id, type: TransactionType.PAYMENT },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.entityTransaction.aggregate({
        where: {
          dealerId: id,
          type: TransactionType.PURCHASE,
          date: { gte: currentMonth },
        },
        _sum: { amount: true },
      }),
      prisma.entityTransaction.count({
        where: {
          dealerId: id,
          type: TransactionType.PURCHASE,
          date: { gte: currentMonth },
        },
      }),
      prisma.entityTransaction.count({
        where: { dealerId: id },
      }),
    ]);

    const openingBalanceTxn = openingBalanceHistoryRaw[0] || null;
    const openingBalanceHistory = openingBalanceHistoryRaw.map((t) => ({
      id: t.id,
      amount: Number(t.amount),
      date: t.date,
      notes: t.description,
    }));

    const totalPurchasedAmount = Number(purchaseSummary._sum.amount || 0);
    const totalPaidAmount = Number(paymentSummary._sum.amount || 0);
    const purchaseCount = Number(purchaseSummary._count._all || 0);
    const paymentCount = Number(paymentSummary._count._all || 0);
    const thisMonthAmount = Number(thisMonthPurchaseSummary._sum.amount || 0);

    return res.json({
      success: true,
      data: {
        ...dealer,
        balance,
        openingBalance: openingBalanceTxn
          ? {
              id: openingBalanceTxn.id,
              amount: Number(openingBalanceTxn.amount),
              date: openingBalanceTxn.date,
              notes: openingBalanceTxn.description,
            }
          : null,
        openingBalanceHistory,
        thisMonthAmount,
        totalTransactions,
        connectionType,
        isOwnedDealer,
        summary: {
          totalPurchases: purchaseCount,
          totalPayments: paymentCount,
          totalPurchasedAmount,
          totalPaidAmount,
          outstandingAmount: balance,
          thisMonthPurchases: thisMonthPurchaseCount,
          thisMonthAmount,
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
    const currentUserRole = req.role;

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

    let companyId: string | null = null;
    if (currentUserRole === UserRole.COMPANY) {
      const company = await prisma.company.findUnique({
        where: { ownerId: currentUserId },
        select: { id: true },
      });

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      companyId = company.id;
    }

    const dealer = await prisma.$transaction(async (tx) => {
      const createdDealer = await tx.dealer.create({
        data: {
          name: data.name,
          contact: data.contact,
          address: data.address,
          userId: currentUserId as string,
        },
      });

      if (companyId) {
        await tx.companyDealerAccount.upsert({
          where: {
            companyId_dealerId: {
              companyId,
              dealerId: createdDealer.id,
            },
          },
          update: {},
          create: {
            companyId,
            dealerId: createdDealer.id,
            balance: 0,
            totalSales: 0,
            totalPayments: 0,
          },
        });
      }

      return createdDealer;
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
    const currentUserRole = req.role;

    // Check if dealer exists
    const existingDealer = await prisma.dealer.findUnique({
      where: { id },
    });

    if (!existingDealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Handle company users
    if (currentUserRole === UserRole.COMPANY) {
      // Get company
      const company = await prisma.company.findUnique({
        where: { ownerId: currentUserId },
        select: { id: true },
      });

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Check if dealer already has a company-dealer account entry
      const dealerCompanyConnection = await prisma.companyDealerAccount.findUnique({
        where: {
          companyId_dealerId: {
            companyId: company.id,
            dealerId: id,
          },
        },
      });

      // Check if dealer is manually created by company
      const isManualDealer = existingDealer.userId === currentUserId;

      // Verify access
      if (!isManualDealer && !dealerCompanyConnection) {
        return res.status(404).json({ message: "Dealer not found" });
      }

      // For account-linked dealers, do not allow deletion from this endpoint.
      if (dealerCompanyConnection && !isManualDealer) {
        return res.status(403).json({
          message: "You can only delete dealers you created manually.",
        });
      }

      // Only allow deletion of manually created dealers
      if (!isManualDealer) {
        return res.status(403).json({
          message: "You can only delete dealers you created manually.",
        });
      }

      // Check dependencies for self-created dealers
      const [salesCount, account] = await Promise.all([
        prisma.companySale.count({
          where: {
            companyId: company.id,
            dealerId: id,
          },
        }),
        prisma.companyDealerAccount.findUnique({
          where: {
            companyId_dealerId: {
              companyId: company.id,
              dealerId: id,
            },
          },
          select: {
            balance: true,
          },
        }),
      ]);

      // Check if dealer has sales or account balance
      if (salesCount > 0) {
        return res.status(400).json({
          message: "Cannot delete dealer with existing sales. Please remove all sales first.",
        });
      }

      if (account && Number(account.balance) !== 0) {
        return res.status(400).json({
          message: `Cannot delete dealer with account balance of रू ${Math.abs(Number(account.balance)).toFixed(2)}. Please settle the account first.`,
        });
      }

      // Safe to delete
      await prisma.dealer.delete({
        where: { id },
      });

      return res.json({
        success: true,
        message: "Dealer deleted successfully",
      });
    }

    // Handle farmer users (manual suppliers only)
    const isManualDealer = existingDealer.userId === currentUserId;
    if (!isManualDealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    // Check if dealer has transactions by directly querying entityTransaction table
    const transactionCount = await prisma.entityTransaction.count({
      where: {
        dealerId: id,
      },
    });

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
      freeQuantity,
      itemName,
      purchaseCategory,
      date,
      expiryDate,
      description,
      reference,
      unitPrice,
      imageUrl,
      unit,
      // single-request optional initial payment
      paymentAmount,
      paymentDescription,
      // link standalone PAYMENT to a purchase (optional for khata-style)
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
    if (!Number.isFinite(numericAmount)) {
      return res.status(400).json({ message: "Amount must be a valid number" });
    }
    if (type === TransactionType.OPENING_BALANCE) {
      if (numericAmount === 0) {
        return res.status(400).json({ message: "Opening balance cannot be zero" });
      }
    } else if (numericAmount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive number" });
    }

    // Check if dealer exists
    const dealer = await prisma.dealer.findUnique({
      where: { id },
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const isManualDealer = dealer.userId === currentUserId;
    if (!isManualDealer) {
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
      let parsedExpiryDate: Date | null = null;
      if (expiryDate !== undefined && expiryDate !== null && expiryDate !== "") {
        parsedExpiryDate = new Date(expiryDate);
        if (Number.isNaN(parsedExpiryDate.getTime())) {
          return res.status(400).json({ message: "Expiry date must be a valid date" });
        }
      }

      // Use inventory service for purchases
      const numericFreeQuantity = freeQuantity !== undefined && freeQuantity !== null ? Number(freeQuantity) : 0;
      const result = await InventoryService.processSupplierPurchase({
        dealerId: id,
        itemName,
        quantity: Number(numericQuantity),
        freeQuantity: numericFreeQuantity,
        unitPrice: Number(unitPrice || numericAmount / Number(numericQuantity)),
        totalAmount: Number(numericAmount),
        date: new Date(date),
        expiryDate: purchaseCategory === "MEDICINE" ? parsedExpiryDate : null,
        description,
        reference,
        purchaseCategory: purchaseCategory || undefined,
        userId: currentUserId,
        unit: unit || undefined,
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
        // paymentToPurchaseId is OPTIONAL — if provided, validate and check overpayment
        // If not provided, this is a khata-style general payment (just reduces overall balance)
        if (paymentToPurchaseId) {
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

        } // end if (paymentToPurchaseId)
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
          imageUrl: imageUrl || null,
          dealerId: id,
          entityType: "DEALER",
          entityId: id,
          paymentToPurchaseId: type === TransactionType.PAYMENT ? paymentToPurchaseId || null : null,
        },
      });
      transactions.push(transaction);
    }

    // Update stored balance on dealer for manual suppliers.
    if (isManualDealer) {
      let balanceIncrement = 0;
      let purchaseIncrement = 0;
      let paymentIncrement = 0;

      for (const txn of transactions) {
        const amt = Number(txn.amount);
        if (txn.type === "PURCHASE" || txn.type === "ADJUSTMENT") {
          balanceIncrement += amt;
          purchaseIncrement += amt;
        } else if (txn.type === "OPENING_BALANCE") {
          // Signed snapshot value; affects balance but not purchases/payments totals
          balanceIncrement += amt;
        } else if (txn.type === "PAYMENT" || txn.type === "RECEIPT") {
          balanceIncrement -= amt;
          paymentIncrement += amt;
        }
      }

      await prisma.dealer.update({
        where: { id },
        data: {
          balance: { increment: balanceIncrement },
          totalPurchases: { increment: purchaseIncrement },
          totalPayments: { increment: paymentIncrement },
        },
      });
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

// ==================== SET DEALER OPENING BALANCE (MANUAL ONLY) ====================
export const setDealerOpeningBalance = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    const { openingBalance, notes } = req.body;

    if (!currentUserId) {
      return res.status(400).json({ message: "No User found in Controller" });
    }

    const numericOpening = Number(openingBalance);
    if (!Number.isFinite(numericOpening)) {
      return res.status(400).json({ message: "openingBalance must be a valid number" });
    }

    const dealer = await prisma.dealer.findUnique({ where: { id } });
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    const isManualDealer = dealer.userId === currentUserId;
    if (!isManualDealer) {
      return res.status(400).json({ message: "Opening balance can only be set for manual suppliers" });
    }

    const prev = await prisma.entityTransaction.findFirst({
      where: { dealerId: id, type: TransactionType.OPENING_BALANCE },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      select: { amount: true },
    });

    const prevAmount = prev ? Number(prev.amount) : 0;
    const delta = numericOpening - prevAmount;

    const [txn] = await prisma.$transaction([
      prisma.entityTransaction.create({
        data: {
          type: TransactionType.OPENING_BALANCE,
          amount: numericOpening,
          quantity: null,
          itemName: null,
          date: new Date(),
          description: notes ? String(notes) : null,
          reference: null,
          imageUrl: null,
          dealerId: id,
          entityType: "DEALER",
          entityId: id,
          paymentToPurchaseId: null,
        },
      }),
      prisma.dealer.update({
        where: { id },
        data: {
          balance: { increment: delta },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: txn,
      message: "Opening balance updated successfully",
    });
  } catch (error) {
    console.error("Set dealer opening balance error:", error);
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

    const isManualDealer = dealer.userId === currentUserId;
    if (!isManualDealer) {
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
        freeQuantity: true,
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

    // If this is a PURCHASE, ensure stock was not consumed and reverse inventory safely (paid + free)
    if (txn.type === 'PURCHASE') {
      if (!txn.inventoryItemId) {
        return res.status(400).json({ message: 'Purchase transaction missing inventory linkage; cannot safely delete.' });
      }
      const qty = Number(txn.quantity || 0);
      const freeQty = Number(txn.freeQuantity ?? 0);
      const totalToReverse = qty + freeQty;
      if (totalToReverse <= 0) {
        return res.status(400).json({ message: 'Purchase has no quantity or free quantity to reverse.' });
      }

      const item = await prisma.inventoryItem.findUnique({ where: { id: txn.inventoryItemId } });
      if (!item) {
        return res.status(404).json({ message: 'Linked inventory item not found' });
      }

      const currentStock = Number(item.currentStock || 0);
      if (currentStock < totalToReverse) {
        return res.status(400).json({
          message: `Cannot delete: ${totalToReverse} units from purchase have been partially consumed. Available stock: ${currentStock}. Remove usages first.`,
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

        // 2) Reduce inventory stock by paid + free quantity (reverse full stock-in)
        await tx.inventoryItem.update({
          where: { id: txn.inventoryItemId as string },
          data: { currentStock: { decrement: totalToReverse } },
        });

        // 3) Remove paid InventoryTransaction (PURCHASE) if present
        if (qty > 0) {
          const paidInvTxn = await tx.inventoryTransaction.findFirst({
            where: {
              itemId: txn.inventoryItemId as string,
              type: 'PURCHASE',
              quantity: qty,
              date: txn.date,
            },
            orderBy: { date: 'desc' },
          });
          if (paidInvTxn) {
            await tx.inventoryTransaction.delete({ where: { id: paidInvTxn.id } });
          }
        }

        // 4) Remove free InventoryTransaction (PURCHASE, totalAmount 0) if present
        if (freeQty > 0) {
          const freeInvTxn = await tx.inventoryTransaction.findFirst({
            where: {
              itemId: txn.inventoryItemId as string,
              type: 'PURCHASE',
              quantity: freeQty,
              totalAmount: 0,
              date: txn.date,
            },
            orderBy: { date: 'desc' },
          });
          if (freeInvTxn) {
            await tx.inventoryTransaction.delete({ where: { id: freeInvTxn.id } });
          }
        }

        // 5) Remove the linked expense if it exists
        if (txn.expenseId) {
          await tx.expense.delete({ where: { id: txn.expenseId } });
        }

        // 6) Finally, delete the entity transaction
        console.log("🔍 About to delete entity transaction:", transactionId);
        const deletedEntityTxn = await tx.entityTransaction.delete({ where: { id: transactionId } });
        console.log("✅ Deleted entity transaction:", deletedEntityTxn);

        // 7) Optional cleanup: remove empty inventory item if fully orphaned
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

    // Update stored balance on dealer for manual suppliers.
    if (isManualDealer) {
      const txnAmount = Number(txn.amount);
      let balanceDecrement = 0;
      let purchaseDecrement = 0;
      let paymentDecrement = 0;

      if (txn.type === "PURCHASE" || txn.type === "ADJUSTMENT") {
        // Reverse the purchase: balance goes down
        balanceDecrement = txnAmount;
        purchaseDecrement = txnAmount;

        // Also reverse any related payments that were deleted with the purchase
        const relatedPayments = await prisma.entityTransaction.findMany({
          where: { dealerId: id, type: "PAYMENT", paymentToPurchaseId: transactionId },
        });
        // These were already deleted in the $transaction above, but we captured txn.amount before
        // We need to count the payments that were deleted — they no longer exist in DB
        // So we track them separately: each deleted payment reversed the balance reduction
        // Actually those payments are gone, so let's compute from what we know
        // The related payments were found and deleted inside the $transaction
        // Their deletion means balance should go UP (less was paid)
        // Net effect: purchase deletion = -purchase + deleted_payments
        // But we can't query them now. Let's use a simpler approach:
        // We'll compute from remaining transactions vs stored balance
      } else if (txn.type === "PAYMENT" || txn.type === "RECEIPT") {
        // Reverse the payment: balance goes up (we owe more again)
        balanceDecrement = -txnAmount;
        paymentDecrement = txnAmount;
      }

      // For purchases, related payments were also deleted - recalculate balance from scratch
      if (txn.type === "PURCHASE") {
        // Recalculate from remaining transactions for accuracy
        const remainingTxns = await prisma.entityTransaction.findMany({
          where: { dealerId: id },
        });
        const newBalance = remainingTxns.reduce((sum, t) => {
          if (t.type === "PURCHASE" || t.type === "ADJUSTMENT" || t.type === "OPENING_BALANCE") return sum + Number(t.amount);
          if (t.type === "PAYMENT" || t.type === "RECEIPT") return sum - Number(t.amount);
          return sum;
        }, 0);
        const newTotalPurchases = remainingTxns
          .filter((t) => t.type === "PURCHASE")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const newTotalPayments = remainingTxns
          .filter((t) => t.type === "PAYMENT")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        await prisma.dealer.update({
          where: { id },
          data: {
            balance: newBalance,
            totalPurchases: newTotalPurchases,
            totalPayments: newTotalPayments,
          },
        });
      } else {
        await prisma.dealer.update({
          where: { id },
          data: {
            balance: { decrement: balanceDecrement },
            totalPayments: { decrement: paymentDecrement },
          },
        });
      }
    }

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
      const balance = Number(dealer.balance);

      if (balance > 0) {
        activeDealers++;
        outstandingAmount += balance;
      }

      // This month's purchases (still from EntityTransaction for stats)
      const thisMonthPurchases = await prisma.entityTransaction.aggregate({
        _sum: { amount: true },
        where: {
          dealerId: dealer.id,
          type: "PURCHASE",
          date: { gte: currentMonth },
        },
      });

      thisMonthAmount += Number(thisMonthPurchases._sum.amount || 0);
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

    // Verify dealer has a company-dealer account relationship
    const connection = await prisma.companyDealerAccount.findUnique({
      where: {
        companyId_dealerId: {
          companyId: String(companyId),
          dealerId: dealer.id,
        },
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
          unitSellingPrice: true,
          currentStock: true,
          imageUrl: true,
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
