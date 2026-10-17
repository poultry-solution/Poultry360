import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole } from "@prisma/client";
import { getNepalBsMonthWindow, nepalBatchDay } from "../utils/nepalBsDate";
import {
  aggregateCurrentCfcr,
  aggregateCurrentFcr,
  calculateFarmerBatchFcr,
} from "../services/farmerFcrService";

// Helper: compute total outstanding to dealers (manual suppliers + account ledgers). Must match getDealerStatistics.
export async function getMoneyToGiveForUser(userId: string): Promise<number> {
  const farmerAccounts = await prisma.dealerFarmerAccount.findMany({
    where: {
      farmerId: userId,
    },
    select: { dealerId: true, balance: true },
  });
  const accountDealerIds = farmerAccounts.map((account) => account.dealerId);
  const dealerWhere: any = {
    OR: [{ userId: userId }],
  };
  if (accountDealerIds.length > 0) {
    dealerWhere.OR.push({ id: { in: accountDealerIds } });
  }
  const dealers = await prisma.dealer.findMany({
    where: dealerWhere,
  });
  const accountDealerSet = new Set(accountDealerIds);
  let farmerAccountBalances: Map<string, number> = new Map();
  if (accountDealerIds.length > 0) {
    farmerAccounts.forEach((a) => {
      farmerAccountBalances.set(a.dealerId, Number(a.balance));
    });
  }
  let total = 0;
  for (const dealer of dealers) {
    const balance = accountDealerSet.has(dealer.id)
      ? (farmerAccountBalances.get(dealer.id) ?? 0)
      : Number(dealer.balance);
    if (balance > 0) total += balance;
  }
  return total;
}

// ==================== GET DASHBOARD OVERVIEW ====================
export const getDashboardOverview = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.role;

    // Money to give: dealers only (manual suppliers + account ledgers), same as /dealers/statistics. Compute once for all responses.
    const moneyToGive =
      currentUserId != null
        ? await getMoneyToGiveForUser(currentUserId)
        : 0;

    // Get user's farms
    const userFarms = await prisma.farm.findMany({
      where: {
        OR: [
          { ownerId: currentUserId },
          { managers: { some: { id: currentUserId } } },
        ],
      },
      select: { id: true },
    });

    const farmIds = userFarms.map((farm) => farm.id);

    if (farmIds.length === 0) {
      return res.json({
        success: true,
        data: {
          totalFarms: 0,
          activeBatches: 0,
          completedBatches: 0,
          lifetimeProfit: 0,
          monthlyRevenue: 0,
          monthlyRevenueGrowth: 0,
          moneyToReceive: 0,
          customersOwingCount: 0,
          moneyToGive,
          totalExpenses: 0,
          monthLabel: getNepalBsMonthWindow().monthLabel,
          growthBasis: "same-days-last-month",
          recentActivity: [],
        },
      });
    }

    // "This month" is the current Nepali (BS) month in Nepal days. Growth compares
    // the month so far with the same number of days at the start of last month.
    const month = getNepalBsMonthWindow();

    // Get all analytics data in parallel
    const [
      totalFarms,
      activeBatches,
      completedBatches,
      lifetimeSales,
      lifetimeExpenses,
      currentMonthSales,
      lastMonthSales,
      currentMonthExpenses,
      owingCustomers,
      recentExpenses,
      recentSales,
      recentBatches,
    ] = await Promise.all([
      // Total farms
      prisma.farm.count({
        where: {
          OR: [
            { ownerId: currentUserId },
            { managers: { some: { id: currentUserId } } },
          ],
        },
      }),

      // Active batches
      prisma.batch.count({
        where: {
          farmId: { in: farmIds },
          status: "ACTIVE",
        },
      }),

      // Completed batches
      prisma.batch.count({
        where: {
          farmId: { in: farmIds },
          status: "COMPLETED",
        },
      }),

      // Lifetime sales
      prisma.sale.aggregate({
        where: {
          farmId: { in: farmIds },
        },
        _sum: { amount: true },
      }),

      // Lifetime expenses
      prisma.expense.aggregate({
        where: {
          farmId: { in: farmIds },
        },
        _sum: { amount: true },
      }),

      // Current month sales
      prisma.sale.aggregate({
        where: {
          farmId: { in: farmIds },
          date: { gte: month.currentStart },
        },
        _sum: { amount: true },
      }),

      // Same number of days at the start of last month
      prisma.sale.aggregate({
        where: {
          farmId: { in: farmIds },
          date: {
            gte: month.previousStart,
            lte: month.previousSameDaysEnd,
          },
        },
        _sum: { amount: true },
      }),

      // Current month expenses
      prisma.expense.aggregate({
        where: {
          farmId: { in: farmIds },
          date: { gte: month.currentStart },
        },
        _sum: { amount: true },
      }),

      // Money to receive = what customers owe now (same as the Sales ledger).
      // Sale.dueAmount is not used: customer payments lower the balance, not each sale.
      prisma.customer.aggregate({
        where: { userId: currentUserId, balance: { gt: 0 } },
        _sum: { balance: true },
        _count: { _all: true },
      }),

      // Recent expenses (last 5)
      prisma.expense.findMany({
        where: {
          farmId: { in: farmIds },
        },
        include: {
          category: {
            select: { name: true },
          },
          farm: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Recent sales (last 5)
      prisma.sale.findMany({
        where: {
          farmId: { in: farmIds },
        },
        include: {
          category: {
            select: { name: true },
          },
          farm: {
            select: { name: true },
          },
          customer: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Recent batch updates (last 5)
      prisma.batch.findMany({
        where: {
          farmId: { in: farmIds },
        },
        include: {
          farm: {
            select: { name: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
    ]);

    // Calculate derived metrics
    const lifetimeSalesAmount = Number(lifetimeSales._sum.amount || 0);
    const lifetimeExpensesAmount = Number(lifetimeExpenses._sum.amount || 0);
    const lifetimeProfit = lifetimeSalesAmount - lifetimeExpensesAmount;

    const currentMonthSalesAmount = Number(currentMonthSales._sum.amount || 0);
    const lastMonthSalesAmount = Number(lastMonthSales._sum.amount || 0);
    const monthlyRevenueGrowth =
      lastMonthSalesAmount > 0
        ? ((currentMonthSalesAmount - lastMonthSalesAmount) /
            lastMonthSalesAmount) *
          100
        : 0;

    const moneyToReceive = Number(owingCustomers._sum.balance || 0);
    const customersOwingCount = owingCustomers._count._all;

    const totalExpenses = Number(currentMonthExpenses._sum.amount || 0);

    // Build recent activity
    const recentActivity = [
      ...recentExpenses.map((expense) => ({
        id: `expense-${expense.id}`,
        type: "expense" as const,
        title: `New expense recorded`,
        description: `${expense.category.name} - रू ${Number(expense.amount).toLocaleString("en-IN")}`,
        timestamp: expense.createdAt,
        farmName: expense.farm?.name || "General",
      })),
      ...recentSales.map((sale) => ({
        id: `sale-${sale.id}`,
        type: "sale" as const,
        title: `New sale recorded`,
        description: `${sale.category.name} - रू ${Number(sale.amount).toLocaleString("en-IN")}${sale.customer ? ` to ${sale.customer.name}` : ""}`,
        timestamp: sale.createdAt,
        farmName: sale.farm?.name || "General",
      })),
      ...recentBatches.map((batch) => ({
        id: `batch-${batch.id}`,
        type: "batch" as const,
        title: `Batch ${batch.batchNumber} ${batch.status === "COMPLETED" ? "completed" : "updated"}`,
        description: `${batch.farm.name} - ${batch.initialChicks.toLocaleString()} birds`,
        timestamp: batch.updatedAt,
        farmName: batch.farm.name,
      })),
    ]
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 10);

    return res.json({
      success: true,
      data: {
        totalFarms,
        activeBatches,
        completedBatches,
        lifetimeProfit,
        monthlyRevenue: currentMonthSalesAmount,
        monthlyRevenueGrowth,
        moneyToReceive,
        customersOwingCount,
        moneyToGive,
        totalExpenses,
        monthLabel: month.monthLabel,
        growthBasis: "same-days-last-month",
        recentActivity,
      },
    });
  } catch (error) {
    console.error("Get dashboard overview error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET DASHBOARD FINANCIAL SUMMARY ====================
export const getDashboardFinancialSummary = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const { period = "month" } = req.query; // month, quarter, year

    // Get user's farms
    const userFarms = await prisma.farm.findMany({
      where: {
        OR: [
          { ownerId: currentUserId },
          { managers: { some: { id: currentUserId } } },
        ],
      },
      select: { id: true },
    });

    const farmIds = userFarms.map((farm) => farm.id);

    if (farmIds.length === 0) {
      return res.json({
        success: true,
        data: {
          totalRevenue: 0,
          totalExpenses: 0,
          netProfit: 0,
          profitMargin: 0,
          revenueByCategory: [],
          expensesByCategory: [],
          monthlyTrend: [],
        },
      });
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "quarter":
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [
      totalRevenue,
      totalExpenses,
      revenueByCategory,
      expensesByCategory,
      monthlyTrend,
    ] = await Promise.all([
      // Total revenue
      prisma.sale.aggregate({
        where: {
          farmId: { in: farmIds },
          date: { gte: startDate },
        },
        _sum: { amount: true },
      }),

      // Total expenses
      prisma.expense.aggregate({
        where: {
          farmId: { in: farmIds },
          date: { gte: startDate },
        },
        _sum: { amount: true },
      }),

      // Revenue by category
      prisma.sale.groupBy({
        by: ["categoryId"],
        where: {
          farmId: { in: farmIds },
          date: { gte: startDate },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // Expenses by category
      prisma.expense.groupBy({
        by: ["categoryId"],
        where: {
          farmId: { in: farmIds },
          date: { gte: startDate },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // Monthly trend (last 12 months)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', date) as month,
          SUM(CASE WHEN "entityType" = 'SALE' THEN amount ELSE 0 END) as revenue,
          SUM(CASE WHEN "entityType" = 'EXPENSE' THEN amount ELSE 0 END) as expenses
        FROM (
          SELECT date, amount, 'SALE' as "entityType" FROM "Sale" WHERE "farmId" = ANY(${farmIds})
          UNION ALL
          SELECT date, amount, 'EXPENSE' as "entityType" FROM "Expense" WHERE "farmId" = ANY(${farmIds})
        ) combined
        WHERE date >= ${new Date(now.getFullYear() - 1, now.getMonth(), 1)}
        GROUP BY DATE_TRUNC('month', date)
        ORDER BY month DESC
        LIMIT 12
      `,
    ]);

    // Get category names
    const categoryIds = [
      ...revenueByCategory.map((r) => r.categoryId),
      ...expensesByCategory.map((e) => e.categoryId),
    ];

    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, type: true },
    });

    const categoryMap = categories.reduce(
      (acc, cat) => {
        acc[cat.id] = cat;
        return acc;
      },
      {} as Record<string, any>
    );

    // Calculate derived metrics
    const totalRevenueAmount = Number(totalRevenue._sum.amount || 0);
    const totalExpensesAmount = Number(totalExpenses._sum.amount || 0);
    const netProfit = totalRevenueAmount - totalExpensesAmount;
    const profitMargin =
      totalRevenueAmount > 0 ? (netProfit / totalRevenueAmount) * 100 : 0;

    // Format revenue by category
    const revenueByCategoryFormatted = revenueByCategory.map((item) => ({
      categoryId: item.categoryId,
      categoryName: categoryMap[item.categoryId]?.name || "Unknown",
      amount: Number(item._sum.amount || 0),
      count: item._count.id,
    }));

    // Format expenses by category
    const expensesByCategoryFormatted = expensesByCategory.map((item) => ({
      categoryId: item.categoryId,
      categoryName: categoryMap[item.categoryId]?.name || "Unknown",
      amount: Number(item._sum.amount || 0),
      count: item._count.id,
    }));

    return res.json({
      success: true,
      data: {
        totalRevenue: totalRevenueAmount,
        totalExpenses: totalExpensesAmount,
        netProfit,
        profitMargin,
        revenueByCategory: revenueByCategoryFormatted,
        expensesByCategory: expensesByCategoryFormatted,
        monthlyTrend: monthlyTrend || [],
      },
    });
  } catch (error) {
    console.error("Get dashboard financial summary error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET DASHBOARD PERFORMANCE METRICS ====================
export const getDashboardPerformanceMetrics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;

    // Get user's farms
    const userFarms = await prisma.farm.findMany({
      where: {
        OR: [
          { ownerId: currentUserId },
          { managers: { some: { id: currentUserId } } },
        ],
      },
      select: { id: true },
    });

    const farmIds = userFarms.map((farm) => farm.id);

    if (farmIds.length === 0) {
      return res.json({
        success: true,
        data: {
          averageBatchProfit: 0,
          averageBatchDuration: 0,
          mortalityRate: 0,
          feedConversionRatio: 0,
          topPerformingFarms: [],
          batchPerformance: [],
        },
      });
    }

    const [batchStats, farmPerformance] =
      await Promise.all([
        // Batch statistics
        prisma.batch.findMany({
          where: {
            farmId: { in: farmIds },
            status: "COMPLETED",
          },
          include: {
            farm: {
              select: { name: true },
            },
          },
        }),

        // Farm performance
        prisma.farm.findMany({
          where: { id: { in: farmIds } },
          include: {
            batches: {
              where: { status: "COMPLETED" },
              include: {
                expenses: {
                  select: { amount: true },
                },
                sales: {
                  select: { amount: true },
                },
              },
            },
          },
        }),
      ]);

    // Calculate batch performance metrics
    const batchPerformance = await Promise.all(
      batchStats.map(async (batch) => {
        const [expenses, sales, fcrResult] = await Promise.all([
          prisma.expense.aggregate({
            where: { batchId: batch.id },
            _sum: { amount: true },
          }),
          prisma.sale.aggregate({
            where: { batchId: batch.id },
            _sum: { amount: true },
          }),
          calculateFarmerBatchFcr(batch.id),
        ]);

        const totalExpenses = Number(expenses._sum.amount || 0);
        const totalSales = Number(sales._sum.amount || 0);
        const totalMortality = fcrResult?.currentDeaths || 0;
        const profit = totalSales - totalExpenses;
        const duration = batch.endDate ? nepalBatchDay(batch.startDate, batch.endDate) : 0;

        const includeInCurrentFcr =
          fcrResult?.displayStatus === "FRESH" ||
          fcrResult?.displayStatus === "FINAL";

        return {
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          farmName: batch.farm.name,
          initialChicks: batch.initialChicks,
          totalExpenses,
          totalSales,
          profit,
          mortality: totalMortality,
          mortalityRate:
            batch.initialChicks > 0
              ? (totalMortality / batch.initialChicks) * 100
              : 0,
          duration,
          profitPerBird:
            batch.initialChicks > 0 ? profit / batch.initialChicks : 0,
          fcr: includeInCurrentFcr ? fcrResult?.currentFcr ?? null : null,
          fcrFeedKg: includeInCurrentFcr ? fcrResult?.feedKg || 0 : 0,
          fcrWeightGainKg:
            includeInCurrentFcr ? fcrResult?.weightGainKg || 0 : 0,
          fcrDisplayStatus: fcrResult?.displayStatus || "NOT_CALCULABLE",
          cfcr: includeInCurrentFcr ? fcrResult?.currentCfcr ?? null : null,
          cfcrTargetWeightKg: fcrResult?.cfcrTargetWeightKg ?? null,
          cfcrCorrectionFactorPerKg:
            fcrResult?.cfcrCorrectionFactorPerKg ?? null,
          cfcrStatus: fcrResult?.cfcrStatus || "SOURCE_FCR_UNAVAILABLE",
        };
      })
    );

    // Calculate overall metrics
    const totalInitialChicks = batchStats.reduce(
      (sum, batch) => sum + batch.initialChicks,
      0
    );
    const totalMortality = batchPerformance.reduce(
      (sum, batch) => sum + batch.mortality,
      0
    );
    const averageBatchProfit =
      batchPerformance.length > 0
        ? batchPerformance.reduce((sum, batch) => sum + batch.profit, 0) /
          batchPerformance.length
        : 0;

    const averageBatchDuration =
      batchPerformance.length > 0
        ? batchPerformance.reduce((sum, batch) => sum + batch.duration, 0) /
          batchPerformance.length
        : 0;

    const mortalityRate =
      totalInitialChicks > 0 ? (totalMortality / totalInitialChicks) * 100 : 0;

    // Calculate farm performance
    const topPerformingFarms = farmPerformance
      .map((farm) => {
        const completedBatches = farm.batches;
        const totalProfit = completedBatches.reduce((sum, batch) => {
          const expenses = batch.expenses.reduce(
            (sum, exp) => sum + Number(exp.amount),
            0
          );
          const sales = batch.sales.reduce(
            (sum, sale) => sum + Number(sale.amount),
            0
          );
          return sum + (sales - expenses);
        }, 0);

        return {
          farmId: farm.id,
          farmName: farm.name,
          totalBatches: completedBatches.length,
          totalProfit,
          averageProfit:
            completedBatches.length > 0
              ? totalProfit / completedBatches.length
              : 0,
        };
      })
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 5);

    const cfcrAggregate = aggregateCurrentCfcr(
      batchPerformance.map((batch) => ({
        displayStatus: batch.fcrDisplayStatus,
        cfcr: batch.cfcr,
        weightGainKg: batch.fcrWeightGainKg,
        targetWeightKg: batch.cfcrTargetWeightKg,
        correctionFactorPerKg: batch.cfcrCorrectionFactorPerKg,
      })),
    );

    return res.json({
      success: true,
      data: {
        averageBatchProfit,
        averageBatchDuration,
        mortalityRate,
        feedConversionRatio:
          aggregateCurrentFcr(
            batchPerformance.map((batch) => ({
              displayStatus: batch.fcrDisplayStatus,
              feedKg: batch.fcrFeedKg,
              weightGainKg: batch.fcrWeightGainKg,
            })),
          ) ?? 0,
        correctedFeedConversionRatio: cfcrAggregate.cfcr,
        cfcrTargetWeightKg: cfcrAggregate.targetWeightKg,
        cfcrCorrectionFactorPerKg: cfcrAggregate.correctionFactorPerKg,
        cfcrMixedSettings: cfcrAggregate.mixedSettings,
        topPerformingFarms,
        batchPerformance: batchPerformance.slice(0, 10), // Top 10 batches
      },
    });
  } catch (error) {
    console.error("Get dashboard performance metrics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET MONEY TO RECEIVE DETAILS ====================
export const getMoneyToReceiveDetails = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const pageNumber = Math.max(1, Math.floor(Number(req.query.page)) || 1);
    const limitNumber = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit)) || 10));
    const skip = (pageNumber - 1) * limitNumber;

    // Customers who owe money now (Customer.balance, same as the Sales ledger).
    const owingWhere = { userId: currentUserId, balance: { gt: 0 } };
    const [customers, totals] = await Promise.all([
      prisma.customer.findMany({
        where: owingWhere,
        orderBy: [{ balance: "desc" }, { id: "asc" }],
        skip,
        take: limitNumber,
        select: { id: true, name: true, phone: true, balance: true },
      }),
      prisma.customer.aggregate({
        where: owingWhere,
        _sum: { balance: true },
        _count: { _all: true },
      }),
    ]);

    // Recent unpaid credit sales of these customers, for context in the popup.
    const recentSales = customers.length
      ? await prisma.sale.findMany({
          where: { customerId: { in: customers.map((c) => c.id) }, isCredit: true, dueAmount: { gt: 0 } },
          include: { farm: { select: { name: true } }, category: { select: { name: true } } },
          orderBy: { date: "desc" },
        })
      : [];

    const rows = customers.map((customer) => {
      const sales = recentSales.filter((sale) => sale.customerId === customer.id);
      const balance = Number(customer.balance);
      return {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        totalBalance: balance,
        totalDueAmount: balance,
        salesCount: sales.length,
        lastSaleDate: sales[0]?.date ?? null,
        sales: sales.slice(0, 5).map((sale) => ({
          saleId: sale.id,
          amount: Number(sale.amount),
          dueAmount: Number(sale.dueAmount || 0),
          date: sale.date,
          farmName: sale.farm?.name,
          categoryName: sale.category.name,
        })),
      };
    });

    const totalCustomers = totals._count._all;
    return res.json({
      success: true,
      data: {
        totalAmount: Number(totals._sum.balance || 0),
        totalCustomers,
        customers: rows,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: totalCustomers,
          totalPages: Math.ceil(totalCustomers / limitNumber),
        },
      },
    });
  } catch (error) {
    console.error("Get money to receive details error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET MONEY TO PAY DETAILS ====================
export const getMoneyToPayDetails = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    // Get all suppliers (dealers, hatcheries, medical suppliers) with outstanding balances
    const [
      dealers,
      hatcheries,
      medicalSuppliers,
      totalDealers,
      totalHatcheries,
      totalMedicalSuppliers,
    ] = await Promise.all([
      prisma.dealer.findMany({
        where: { userId: currentUserId },
        include: {
          transactions: {
            orderBy: { date: "desc" },
          },
        },
        skip,
        take: Number(limit),
      }),
      prisma.hatchery.findMany({
        where: { userId: currentUserId },
        include: {
          transactions: {
            orderBy: { date: "desc" },
          },
        },
        skip,
        take: Number(limit),
      }),
      prisma.medicineSupplier.findMany({
        where: { userId: currentUserId },
        include: {
          transactions: {
            orderBy: { date: "desc" },
          },
        },
        skip,
        take: Number(limit),
      }),
      prisma.dealer.count({ where: { userId: currentUserId } }),
      prisma.hatchery.count({ where: { userId: currentUserId } }),
      prisma.medicineSupplier.count({ where: { userId: currentUserId } }),
    ]);

    // Helper function to calculate outstanding amount for any supplier
    const calculateOutstanding = (transactions: any[]) => {
      return transactions.reduce((sum, transaction) => {
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
    };

    // Helper function to get this month's amount
    const getThisMonthAmount = (transactions: any[]) => {
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      return transactions
        .filter(
          (t) => new Date(t.date) >= currentMonth && t.type === "PURCHASE"
        )
        .reduce((sum, t) => sum + Number(t.amount), 0);
    };

    // Process dealers
    const dealersWithOutstanding = dealers
      .map((dealer) => {
        const balance = calculateOutstanding(dealer.transactions);
        const thisMonthAmount = getThisMonthAmount(dealer.transactions);

        return {
          supplierId: dealer.id,
          supplierName: dealer.name,
          supplierContact: dealer.contact,
          supplierAddress: dealer.address,
          supplierType: "DEALER",
          outstandingAmount: Math.max(0, balance),
          thisMonthAmount,
          totalTransactions: dealer.transactions.length,
          lastTransactionDate: dealer.transactions[0]?.date || null,
          recentTransactions: dealer.transactions.slice(0, 5).map((t) => ({
            transactionId: t.id,
            type: t.type,
            amount: Number(t.amount),
            date: t.date,
            description: t.description,
            itemName: t.itemName,
          })),
        };
      })
      .filter((dealer) => dealer.outstandingAmount > 0);

    // Process hatcheries
    const hatcheriesWithOutstanding = hatcheries
      .map((hatchery) => {
        const balance = calculateOutstanding(hatchery.transactions);
        const thisMonthAmount = getThisMonthAmount(hatchery.transactions);

        return {
          supplierId: hatchery.id,
          supplierName: hatchery.name,
          supplierContact: hatchery.contact,
          supplierAddress: hatchery.address,
          supplierType: "HATCHERY",
          outstandingAmount: Math.max(0, balance),
          thisMonthAmount,
          totalTransactions: hatchery.transactions.length,
          lastTransactionDate: hatchery.transactions[0]?.date || null,
          recentTransactions: hatchery.transactions.slice(0, 5).map((t) => ({
            transactionId: t.id,
            type: t.type,
            amount: Number(t.amount),
            date: t.date,
            description: t.description,
            itemName: t.itemName,
          })),
        };
      })
      .filter((hatchery) => hatchery.outstandingAmount > 0);

    // Process medical suppliers
    const medicalSuppliersWithOutstanding = medicalSuppliers
      .map((supplier) => {
        const balance = calculateOutstanding(supplier.transactions);
        const thisMonthAmount = getThisMonthAmount(supplier.transactions);

        return {
          supplierId: supplier.id,
          supplierName: supplier.name,
          supplierContact: supplier.contact,
          supplierAddress: supplier.address,
          supplierType: "MEDICAL_SUPPLIER",
          outstandingAmount: Math.max(0, balance),
          thisMonthAmount,
          totalTransactions: supplier.transactions.length,
          lastTransactionDate: supplier.transactions[0]?.date || null,
          recentTransactions: supplier.transactions.slice(0, 5).map((t) => ({
            transactionId: t.id,
            type: t.type,
            amount: Number(t.amount),
            date: t.date,
            description: t.description,
            itemName: t.itemName,
          })),
        };
      })
      .filter((supplier) => supplier.outstandingAmount > 0);

    // Combine all suppliers and sort by outstanding amount
    const allSuppliersWithOutstanding = [
      ...dealersWithOutstanding,
      ...hatcheriesWithOutstanding,
      ...medicalSuppliersWithOutstanding,
    ].sort((a, b) => b.outstandingAmount - a.outstandingAmount);

    const totalAmount = allSuppliersWithOutstanding.reduce(
      (sum, supplier) => sum + supplier.outstandingAmount,
      0
    );

    const totalSuppliers =
      totalDealers + totalHatcheries + totalMedicalSuppliers;

    return res.json({
      success: true,
      data: {
        totalAmount,
        totalSuppliers: allSuppliersWithOutstanding.length,
        suppliers: allSuppliersWithOutstanding,
        summary: {
          totalDealers: dealersWithOutstanding.length,
          totalHatcheries: hatcheriesWithOutstanding.length,
          totalMedicalSuppliers: medicalSuppliersWithOutstanding.length,
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalSuppliers,
          totalPages: Math.ceil(totalSuppliers / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("Get money to pay details error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET BATCH PERFORMANCE LIST ====================
export const getBatchPerformanceList = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const { status, sortBy, sortOrder, farmId, limit, batchType } = req.query;

    // Only known values reach Prisma (a raw sortBy used to crash with a 500).
    const safeSortBy = sortBy === "createdAt" ? "createdAt" : "startDate";
    const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";
    const safeStatus = status === "ACTIVE" || status === "COMPLETED" ? status : undefined;
    const safeBatchType = batchType === "BROILER" || batchType === "LAYERS" ? batchType : undefined;
    // Optional cap for the Home graph (the FCR work is per batch). No limit = all batches, as before.
    const BATCH_PERFORMANCE_MAX_LIMIT = 60;
    const parsedLimit = Math.floor(Number(limit));
    const take = limit === undefined || !Number.isFinite(parsedLimit)
      ? undefined
      : Math.min(BATCH_PERFORMANCE_MAX_LIMIT, Math.max(1, parsedLimit));

    // Get user's farms
    const userFarms = await prisma.farm.findMany({
      where: {
        OR: [
          { ownerId: currentUserId },
          { managers: { some: { id: currentUserId } } },
        ],
      },
      select: { id: true },
    });

    const farmIds = userFarms.map((farm) => farm.id);

    if (farmId !== undefined && !farmIds.includes(String(farmId))) {
      return res.status(400).json({ message: "Farm not found" });
    }

    if (farmIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        hasMore: false,
        availableTypes: [],
      });
    }

    const scope = { farmId: farmId !== undefined ? String(farmId) : { in: farmIds } };
    const where: any = { ...scope };
    if (safeStatus) {
      where.status = safeStatus;
    }
    if (safeBatchType) {
      where.batchType = safeBatchType;
    }
    // Which batch types exist here, so the graph only offers a Broiler/Layers switch when both do.
    const typeGroups = await prisma.batch.groupBy({ by: ["batchType"], where: scope });
    const availableTypes = typeGroups.map((group) => group.batchType).sort();

    // Take one extra row to know whether more batches exist than were returned.
    const rows = await prisma.batch.findMany({
      where,
      include: {
        farm: { select: { name: true } },
      },
      orderBy: [{ [safeSortBy]: safeSortOrder }, { id: safeSortOrder }],
      ...(take !== undefined ? { take: take + 1 } : {}),
    });
    const hasMore = take !== undefined && rows.length > take;
    const batches = hasMore ? rows.slice(0, take) : rows;

    // Calculate metrics for each batch
    const batchesWithMetrics = await Promise.all(
      batches.map(async (batch) => {
        const [expenses, sales, fcrResult] = await Promise.all([
          prisma.expense.aggregate({
            where: { batchId: batch.id },
            _sum: { amount: true },
          }),
          prisma.sale.aggregate({
            where: { batchId: batch.id },
            _sum: { amount: true },
          }),
          calculateFarmerBatchFcr(batch.id),
        ]);

        // Calculate days (age of batch)
        const days = nepalBatchDay(batch.startDate, batch.endDate || new Date());

        // Natural deaths only. currentDeaths also holds the birds written off when a
        // batch is closed (closureBirdCount); those are not deaths.
        const closureBirds = batch.status === "COMPLETED" ? Number(batch.closureBirdCount || 0) : 0;
        const mortalityCount = Math.max(0, (fcrResult?.currentDeaths || 0) - closureBirds);
        const mortalityRate = batch.initialChicks > 0 ? (mortalityCount / batch.initialChicks) * 100 : 0;

        // Calculate financials
        const totalExpenses = Number(expenses._sum.amount || 0);
        const totalSales = Number(sales._sum.amount || 0);
        const profit = totalSales - totalExpenses;

        // Average weight
        const avgWeight = fcrResult?.remainingAverageWeightKg || 0;

        return {
          id: batch.id,
          batchNumber: batch.batchNumber,
          farmName: batch.farm.name,
          farmId: batch.farmId,
          batchType: batch.batchType,
          status: batch.status,
          startDate: batch.startDate,
          endDate: batch.endDate,
          days,
          mortality: mortalityCount,
          mortalityRate: mortalityRate.toFixed(2),
          fcr: fcrResult?.fcr != null ? fcrResult.fcr.toFixed(2) : 'N/A',
          // FCR to show today: final for closed batches; for active ones null when
          // newer feed/sales/deaths make the last calculation out of date.
          currentFcr:
            batch.status === "COMPLETED"
              ? (fcrResult?.fcr != null ? fcrResult.fcr.toFixed(2) : 'N/A')
              : (fcrResult?.currentFcr != null ? fcrResult.currentFcr.toFixed(2) : 'N/A'),
          cfcr:
            fcrResult?.currentCfcr != null
              ? fcrResult.currentCfcr.toFixed(2)
              : "N/A",
          cfcrStatus: fcrResult?.cfcrStatus || "SOURCE_FCR_UNAVAILABLE",
          fcrStatus: fcrResult?.status || "NOT_AVAILABLE",
          fcrFreshness: fcrResult?.freshnessStatus || "NOT_AVAILABLE",
          fcrAsOfDate: fcrResult?.asOfDate || null,
          expenses: totalExpenses,
          salesAmount: totalSales,
          avgWeight: avgWeight.toFixed(2),
          profitLoss: profit,
          initialChicks: batch.initialChicks,
        };
      })
    );

    return res.json({
      success: true,
      data: batchesWithMetrics,
      hasMore,
      availableTypes,
    });
  } catch (error) {
    console.error("Get batch performance list error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
