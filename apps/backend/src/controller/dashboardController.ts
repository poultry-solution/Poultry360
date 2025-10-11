import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole } from "@prisma/client";

// ==================== GET DASHBOARD OVERVIEW ====================
export const getDashboardOverview = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    const currentUserRole = req.role;

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
          moneyToGive: 0,
          totalExpenses: 0,
          recentActivity: [],
        },
      });
    }

    // Get current month and last month dates
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

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
      creditSales,
      dealerOutstanding,
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
          date: { gte: currentMonthStart },
        },
        _sum: { amount: true },
      }),

      // Last month sales
      prisma.sale.aggregate({
        where: {
          farmId: { in: farmIds },
          date: {
            gte: lastMonthStart,
            lte: lastMonthEnd,
          },
        },
        _sum: { amount: true },
      }),

      // Current month expenses
      prisma.expense.aggregate({
        where: {
          farmId: { in: farmIds },
          date: { gte: currentMonthStart },
        },
        _sum: { amount: true },
      }),

      // Credit sales (money to receive)
      prisma.sale.aggregate({
        where: {
          farmId: { in: farmIds },
          isCredit: true,
        },
        _sum: { dueAmount: true },
      }),

      // All suppliers outstanding (money to give) - we'll calculate this manually
      Promise.all([
        prisma.dealer.findMany({
          where: { userId: currentUserId },
          include: {
            transactions: true,
          },
        }),
        prisma.hatchery.findMany({
          where: { userId: currentUserId },
          include: {
            transactions: true,
          },
        }),
        prisma.medicineSupplier.findMany({
          where: { userId: currentUserId },
          include: {
            transactions: true,
          },
        }),
      ]),

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

    const moneyToReceive = Number(creditSales._sum.dueAmount || 0);

    // Calculate money to give (outstanding supplier balances)
    const [dealers, hatcheries, medicalSuppliers] = dealerOutstanding;
    const allSuppliers = [...dealers, ...hatcheries, ...medicalSuppliers];

    const moneyToGive = allSuppliers.reduce((total, supplier) => {
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
      return total + Math.max(0, balance); // Only count positive balances (amounts due)
    }, 0);

    const totalExpenses = Number(currentMonthExpenses._sum.amount || 0);

    // Build recent activity
    const recentActivity = [
      ...recentExpenses.map((expense) => ({
        id: `expense-${expense.id}`,
        type: "expense" as const,
        title: `New expense recorded`,
        description: `${expense.category.name} - ₹${Number(expense.amount).toLocaleString()}`,
        timestamp: expense.createdAt,
        farmName: expense.farm?.name || "General",
      })),
      ...recentSales.map((sale) => ({
        id: `sale-${sale.id}`,
        type: "sale" as const,
        title: `New sale recorded`,
        description: `${sale.category.name} - ₹${Number(sale.amount).toLocaleString()}${sale.customer ? ` to ${sale.customer.name}` : ""}`,
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
        moneyToGive,
        totalExpenses,
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

    const [batchStats, mortalityStats, feedStats, farmPerformance] =
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

        // Mortality statistics
        prisma.mortality.aggregate({
          where: {
            batch: {
              farmId: { in: farmIds },
            },
          },
          _sum: { count: true },
        }),

        // Feed consumption statistics
        prisma.feedConsumption.aggregate({
          where: {
            batch: {
              farmId: { in: farmIds },
            },
          },
          _sum: { quantity: true },
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
        const expenses = await prisma.expense.aggregate({
          where: { batchId: batch.id },
          _sum: { amount: true },
        });

        const sales = await prisma.sale.aggregate({
          where: { batchId: batch.id },
          _sum: { amount: true },
        });

        const mortality = await prisma.mortality.aggregate({
          where: { batchId: batch.id },
          _sum: { count: true },
        });

        const totalExpenses = Number(expenses._sum.amount || 0);
        const totalSales = Number(sales._sum.amount || 0);
        const totalMortality = Number(mortality._sum.count || 0);
        const profit = totalSales - totalExpenses;
        const duration = batch.endDate
          ? Math.ceil(
              (batch.endDate.getTime() - batch.startDate.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0;

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
        };
      })
    );

    // Calculate overall metrics
    const totalInitialChicks = batchStats.reduce(
      (sum, batch) => sum + batch.initialChicks,
      0
    );
    const totalMortality = Number(mortalityStats._sum.count || 0);
    const totalFeedConsumption = Number(feedStats._sum.quantity || 0);

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

    return res.json({
      success: true,
      data: {
        averageBatchProfit,
        averageBatchDuration,
        mortalityRate,
        feedConversionRatio: 0, // TODO: Calculate FCR properly
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
    const { page = 1, limit = 10 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

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
          totalAmount: 0,
          totalCustomers: 0,
          customers: [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            totalPages: 0,
          },
        },
      });
    }

    // Get credit sales with customer details
    const [creditSales, totalCreditSales] = await Promise.all([
      prisma.sale.findMany({
        where: {
          farmId: { in: farmIds },
          isCredit: true,
          dueAmount: { gt: 0 },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              balance: true,
            },
          },
          farm: {
            select: {
              id: true,
              name: true,
            },
          },
          category: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { date: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.sale.count({
        where: {
          farmId: { in: farmIds },
          isCredit: true,
          dueAmount: { gt: 0 },
        },
      }),
    ]);

    // Group by customer and calculate totals
    const customerMap = new Map();

    creditSales.forEach((sale) => {
      if (!sale.customer) return;

      const customerId = sale.customer.id;
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customerId,
          customerName: sale.customer.name,
          customerPhone: sale.customer.phone,
          totalBalance: 0,
          totalDueAmount: 0,
          salesCount: 0,
          lastSaleDate: sale.date,
          sales: [],
        });
      }

      const customer = customerMap.get(customerId);
      customer.totalDueAmount += Number(sale.dueAmount || 0);
      customer.salesCount += 1;
      customer.sales.push({
        saleId: sale.id,
        amount: Number(sale.amount),
        dueAmount: Number(sale.dueAmount || 0),
        date: sale.date,
        farmName: sale.farm?.name,
        categoryName: sale.category.name,
      });

      if (sale.date > customer.lastSaleDate) {
        customer.lastSaleDate = sale.date;
      }
    });

    const customers = Array.from(customerMap.values()).sort(
      (a, b) => b.totalDueAmount - a.totalDueAmount
    );

    const totalAmount = customers.reduce(
      (sum, customer) => sum + customer.totalDueAmount,
      0
    );

    return res.json({
      success: true,
      data: {
        totalAmount,
        totalCustomers: customers.length,
        customers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCreditSales,
          totalPages: Math.ceil(totalCreditSales / Number(limit)),
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
    const { status, sortBy = 'startDate', sortOrder = 'desc' } = req.query;
    
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
        data: [],
      });
    }
    
    // Build where clause with optional status filter
    const where: any = { farmId: { in: farmIds } };
    if (status) {
      where.status = status; // 'ACTIVE' or 'COMPLETED'
    }

    // Fetch all batches with aggregated data
    const batches = await prisma.batch.findMany({
      where,
      include: {
        farm: { select: { name: true } },
      },
      orderBy: { [sortBy as string]: sortOrder },
    });

    // Calculate metrics for each batch
    const batchesWithMetrics = await Promise.all(
      batches.map(async (batch) => {
        const [
          mortality,
          expenses,
          sales,
          feedConsumption,
          latestWeight,
        ] = await Promise.all([
          prisma.mortality.aggregate({
            where: { 
              batchId: batch.id,
              reason: { not: 'SLAUGHTERED_FOR_SALE' } // Only natural deaths
            },
            _sum: { count: true },
          }),
          prisma.expense.aggregate({
            where: { batchId: batch.id },
            _sum: { amount: true },
          }),
          prisma.sale.aggregate({
            where: { batchId: batch.id },
            _sum: { amount: true },
          }),
          prisma.feedConsumption.aggregate({
            where: { batchId: batch.id },
            _sum: { quantity: true },
          }),
          prisma.birdWeight.findFirst({
            where: { batchId: batch.id },
            orderBy: { date: 'desc' },
            select: { avgWeight: true },
          }),
        ]);

        // Calculate days (age of batch)
        const endDate = batch.endDate || new Date();
        const days = Math.ceil(
          (endDate.getTime() - batch.startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Calculate mortality count (only natural deaths)
        const mortalityCount = Number(mortality._sum.count || 0);
        const mortalityRate = (mortalityCount / batch.initialChicks) * 100;

        // Calculate FCR
        const totalFeed = Number(feedConsumption._sum.quantity || 0);
        const initialWeight = batch.initialChicks * 0.05; // 50g per day-old chick
        const currentChicks = batch.initialChicks - mortalityCount;
        const currentWeight = latestWeight ? Number(latestWeight.avgWeight) * currentChicks : 0;
        const weightGain = Math.max(0, currentWeight - initialWeight);
        const fcr = weightGain > 0 ? totalFeed / weightGain : null;

        // Calculate financials
        const totalExpenses = Number(expenses._sum.amount || 0);
        const totalSales = Number(sales._sum.amount || 0);
        const profit = totalSales - totalExpenses;

        // Average weight
        const avgWeight = latestWeight ? Number(latestWeight.avgWeight) : 0;

        return {
          id: batch.id,
          batchNumber: batch.batchNumber,
          farmName: batch.farm.name,
          status: batch.status,
          startDate: batch.startDate,
          days,
          mortality: mortalityCount,
          mortalityRate: mortalityRate.toFixed(2),
          fcr: fcr ? fcr.toFixed(2) : 'N/A',
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
    });
  } catch (error) {
    console.error("Get batch performance list error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
