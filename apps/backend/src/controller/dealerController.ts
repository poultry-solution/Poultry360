import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole, TransactionType } from "@prisma/client";
import {
  CreateDealerSchema,
  UpdateDealerSchema,
  DealerSchema,
} from "@myapp/shared-types";
import { InventoryService } from "../services/inventoryService";
import { DealerFarmerAccountService } from "../services/dealerFarmerAccountService";

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
    let dealerCompanyConnections: Map<string, { connectionId: string; connectionType: string }> = new Map();

    // For company users, get dealers linked via DealerCompany relationship OR manually created
    if (currentUserRole === UserRole.COMPANY && company) {
      // Get dealer IDs linked to this company via DealerCompany table (exclude archived)
      const dealerCompanies = await (prisma as any).dealerCompany.findMany({
        where: {
          companyId: company.id,
          archivedByCompany: false, // Filter out archived connections
        },
        select: {
          id: true,
          dealerId: true,
        },
      });

      const linkedDealerIds = dealerCompanies.map((dc: any) => dc.dealerId);

      // Store connection metadata for later use
      dealerCompanies.forEach((dc: any) => {
        dealerCompanyConnections.set(dc.dealerId, {
          connectionId: dc.id,
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

    // Pre-fetch DealerFarmerAccount balances for connected dealers (farmer users only)
    let farmerAccountBalances: Map<string, { balance: number; totalSales: number; totalPayments: number }> = new Map();
    if (currentUserRole !== UserRole.COMPANY) {
      const connectedDealerIds = Array.from(dealerFarmerConnections.keys());
      if (connectedDealerIds.length > 0) {
        const accounts = await prisma.dealerFarmerAccount.findMany({
          where: {
            farmerId: currentUserId,
            dealerId: { in: connectedDealerIds },
          },
          select: {
            dealerId: true,
            balance: true,
            totalSales: true,
            totalPayments: true,
          },
        });
        accounts.forEach((a) => {
          farmerAccountBalances.set(a.dealerId, {
            balance: Number(a.balance),
            totalSales: Number(a.totalSales),
            totalPayments: Number(a.totalPayments),
          });
        });
      }
    }

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
        } else {
          connectionInfo = dealerFarmerConnections.get(dealer.id);
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
        } else if (connectionType === "CONNECTED") {
          // For connected dealers: use DealerFarmerAccount balance
          const accountData = farmerAccountBalances.get(dealer.id);
          balance = accountData?.balance ?? 0;

          // Get recent transactions from EntityTransaction for display
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

    // ── Connected dealers: use DealerFarmerAccount + DealerSale/DealerFarmerPayment ──
    if (connectionType === "CONNECTED") {
      const account = await prisma.dealerFarmerAccount.findFirst({
        where: { dealerId: id, farmerId: currentUserId },
        select: {
          id: true,
          balance: true,
          totalSales: true,
          totalPayments: true,
        },
      });

      const balance = account ? Number(account.balance) : 0;
      const totalSales = account ? Number(account.totalSales) : 0;
      const totalPaymentsAmt = account ? Number(account.totalPayments) : 0;

      // Get sales (purchases from farmer's perspective) from DealerSale
      const sales = account
        ? await prisma.dealerSale.findMany({
            where: { accountId: account.id },
            orderBy: { date: "desc" },
            include: {
              items: { include: { product: { select: { name: true } } } },
              discount: true,
            },
          })
        : [];

      // Get payments from DealerFarmerPayment
      const farmerPayments = account
        ? await prisma.dealerFarmerPayment.findMany({
            where: { accountId: account.id },
            orderBy: { paymentDate: "desc" },
          })
        : [];

      // Map sales to purchases format for the frontend
      const purchases = sales.map((sale) => {
        const quantities = sale.items.map((i: any) => Number(i.quantity));
        const unitPrices = sale.items.map((i: any) => Number(i.unitPrice));
        const units = sale.items.map((i: any) => i.unit || "unit");
        return {
          id: sale.id,
          itemName:
            sale.items.map((i: any) => i.product?.name || "Item").join(", ") ||
            "Sale",
          purchaseCategory: null,
          quantity: quantities.reduce((sum, q) => sum + q, 0),
          quantities: quantities.length > 0 ? quantities : undefined,
          unitPrices: unitPrices.length > 0 ? unitPrices : undefined,
          units: units.length > 0 ? units : undefined,
          freeQuantity: 0,
          amount: Number(sale.totalAmount),
          subtotalAmount: sale.subtotalAmount ? Number(sale.subtotalAmount) : null,
          discountType: sale.discount?.type || null,
          discountValue: sale.discount?.value ? Number(sale.discount.value) : null,
          date: sale.date,
          description: sale.notes,
          reference: sale.invoiceNumber,
        };
      });

      // Map DealerFarmerPayment to payments format
      const paymentsList = farmerPayments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        date: p.paymentDate,
        description: p.notes,
        reference: p.reference,
        paymentMethod: p.paymentMethod,
        balanceAfter: Number(p.balanceAfter),
      }));

      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      const thisMonthPurchases = sales.filter(
        (s) => new Date(s.date) >= currentMonth
      );
      const thisMonthAmount = thisMonthPurchases.reduce(
        (sum, s) => sum + Number(s.totalAmount),
        0
      );

      return res.json({
        success: true,
        data: {
          ...dealer,
          balance,
          thisMonthAmount,
          totalTransactions: sales.length + farmerPayments.length,
          transactionTable: [],
          purchases,
          payments: paymentsList,
          connectionType,
          connectionId: dealerFarmerConnection?.id,
          isOwnedDealer,
          summary: {
            totalPurchases: purchases.length,
            totalPayments: paymentsList.length,
            outstandingAmount: balance,
            totalPurchasedAmount: totalSales,
            totalPaidAmount: totalPaymentsAmt,
            thisMonthPurchases: thisMonthPurchases.length,
          },
        },
      });
    }

    // ── Manual dealers: use dealer.balance + EntityTransaction ──
    const balance = Number(dealer.balance);

    const transactions = await prisma.entityTransaction.findMany({
      where: { dealerId: id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    const openingBalanceTxn = transactions.find((t) => t.type === "OPENING_BALANCE") || null;
    const openingBalanceHistory = transactions
      .filter((t) => t.type === "OPENING_BALANCE")
      .map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        date: t.date,
        notes: t.description,
      }));

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
            ),
            payments: [],
          };
        }
        groups[key].quantity += transaction.quantity || 0;
        groups[key].totalAmount += Number(transaction.amount);
        groups[key].amountDue += Number(transaction.amount);
      }
      return groups;
    }, {} as any);

    const purchaseGroups = Object.values(transactionGroups) as any[];
    const paymentsRaw = transactions.filter((t) => t.type === "PAYMENT");

    for (const payment of paymentsRaw) {
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

    const purchases = transactions
      .filter((t) => t.type === "PURCHASE")
      .map((t) => ({
        id: t.id,
        itemName: t.itemName,
        purchaseCategory: t.purchaseCategory,
        quantity: t.quantity,
        freeQuantity: t.freeQuantity,
        amount: Number(t.amount),
        unitPrice: t.unitPrice ? Number(t.unitPrice) : null,
        unit: t.unit || null,
        date: t.date,
        description: t.description,
        reference: t.reference,
      }));

    const paymentsList = transactions
      .filter((t) => t.type === "PAYMENT")
      .map((t) => ({
        id: t.id,
        amount: Number(t.amount),
        date: t.date,
        description: t.description,
        reference: t.reference,
        imageUrl: t.imageUrl,
        paymentToPurchaseId: t.paymentToPurchaseId,
      }));

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
        totalTransactions: transactions.length,
        transactionTable,
        purchases,
        payments: paymentsList,
        connectionType,
        connectionId: dealerFarmerConnection?.id,
        isOwnedDealer,
        summary: {
          totalPurchases: purchases.length,
          totalPayments: paymentsList.length,
          outstandingAmount: balance,
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

      // Check if dealer is connected via DealerCompany
      const dealerCompanyConnection = await (prisma as any).dealerCompany.findUnique({
        where: {
          dealerId_companyId: {
            dealerId: id,
            companyId: company.id,
          },
        },
      });

      // Check if dealer is manually created by company
      const isManualDealer = existingDealer.userId === currentUserId;

      // Verify access
      if (!isManualDealer && !dealerCompanyConnection) {
        return res.status(404).json({ message: "Dealer not found" });
      }

      // For connected dealers, archive the connection instead of deleting
      if (dealerCompanyConnection && !isManualDealer) {
        // Archive the connection
        await (prisma as any).dealerCompany.update({
          where: {
            dealerId_companyId: {
              dealerId: id,
              companyId: company.id,
            },
          },
          data: { archivedByCompany: true },
        });

        return res.json({
          success: true,
          message: "Dealer connection archived successfully",
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

    // Handle farmer users (existing logic)
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

        // Check if this is a connected dealer - create payment request instead
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

    // Update stored balance on dealer for manual dealers
    if (isManualDealer && !dealerFarmerConnection) {
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

    // Manual only: must be created by the farmer and NOT connected
    const isManualDealer = dealer.userId === currentUserId;
    const dealerFarmerConnection = await prisma.dealerFarmer.findFirst({
      where: {
        dealerId: id,
        farmerId: currentUserId,
        archivedByFarmer: false,
      },
      select: { id: true },
    });

    if (!isManualDealer || dealerFarmerConnection) {
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

    // Update stored balance on dealer for manual dealers
    if (isManualDealer && !dealerFarmerConnection) {
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

    // Pre-fetch DealerFarmerAccount balances for connected dealers
    const connectedDealerIdSet = new Set(connectedDealerIds);
    let farmerAccountBalances: Map<string, number> = new Map();
    if (connectedDealerIds.length > 0) {
      const accounts = await prisma.dealerFarmerAccount.findMany({
        where: {
          farmerId: currentUserId,
          dealerId: { in: connectedDealerIds },
        },
        select: { dealerId: true, balance: true },
      });
      accounts.forEach((a) => {
        farmerAccountBalances.set(a.dealerId, Number(a.balance));
      });
    }

    // Calculate statistics
    let totalDealers = dealers.length;
    let activeDealers = 0;
    let outstandingAmount = 0;
    let thisMonthAmount = 0;

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    for (const dealer of dealers) {
      // Get balance from correct source
      let balance = 0;
      if (connectedDealerIdSet.has(dealer.id)) {
        balance = farmerAccountBalances.get(dealer.id) ?? 0;
      } else {
        balance = Number(dealer.balance);
      }

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
