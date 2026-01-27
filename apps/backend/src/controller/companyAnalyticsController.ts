import { Request, Response } from "express";
import prisma from "../utils/prisma";

// ==================== GET COMPANY ANALYTICS ====================
export const getCompanyAnalytics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.userId;
    const { period = "30" } = req.query; // days

    // Get company
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const days = parseInt(period as string);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Revenue trends (last 30 days by default)
    // Get all sales and group by date manually since Prisma groupBy on DateTime doesn't work well
    const allSales = await prisma.companySale.findMany({
      where: {
        companyId: company.id,
        date: { gte: startDate },
      },
      select: {
        id: true, // Include ID for debugging
        date: true,
        totalAmount: true,
      },
      orderBy: { date: "asc" },
    });

    // Debug: Log sales count
    console.log(`[Analytics] Found ${allSales.length} sales for period ${days} days`);

    // Group by date (day only, ignoring time)
    // Use the date as stored in DB (which should be in local timezone)
    const revenueTrendsMap = new Map<string, { revenue: number; salesCount: number }>();
    allSales.forEach((sale) => {
      // Format date as YYYY-MM-DD using the date's year, month, day
      // This preserves the local date without timezone conversion issues
      const date = new Date(sale.date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      
      const existing = revenueTrendsMap.get(dateKey) || { revenue: 0, salesCount: 0 };
      revenueTrendsMap.set(dateKey, {
        revenue: existing.revenue + Number(sale.totalAmount),
        salesCount: existing.salesCount + 1,
      });
    });

    // Convert to array and sort by date
    const revenueTrends = Array.from(revenueTrendsMap.entries())
      .map(([date, data]) => ({
        date,
        _sum: { totalAmount: data.revenue },
        _count: data.salesCount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Debug: Log grouped trends
    console.log(`[Analytics] Grouped into ${revenueTrends.length} date entries:`, 
      revenueTrends.map(t => `${t.date}: ${t._sum.totalAmount} (${t._count} sales)`).join(', '));

    // Sales by dealer (top 10)
    const salesByDealer = await prisma.companySale.groupBy({
      by: ["dealerId"],
      where: {
        companyId: company.id,
        date: { gte: startDate },
      },
      _sum: { totalAmount: true },
      _count: true,
      orderBy: {
        _sum: { totalAmount: "desc" },
      },
      take: 10,
    });

    // Get dealer details
    const salesByDealerWithDetails = await Promise.all(
      salesByDealer.map(async (sale) => {
        const dealer = await prisma.dealer.findUnique({
          where: { id: sale.dealerId },
          select: { id: true, name: true, contact: true },
        });
        return {
          dealerId: sale.dealerId,
          dealerName: dealer?.name || "Unknown",
          dealerContact: dealer?.contact || "",
          totalAmount: Number(sale._sum.totalAmount || 0),
          totalSales: sale._count,
        };
      })
    );

    // Product performance (top 10)
    const productPerformance = await prisma.companySaleItem.groupBy({
      by: ["productId"],
      where: {
        sale: {
          companyId: company.id,
          date: { gte: startDate },
        },
      },
      _sum: {
        quantity: true,
        totalAmount: true,
      },
      _count: true,
      orderBy: {
        _sum: { totalAmount: "desc" },
      },
      take: 10,
    });

    // Get product details
    const productPerformanceWithDetails = await Promise.all(
      productPerformance.map(async (product) => {
        const prod = await prisma.product.findUnique({
          where: { id: product.productId },
          select: { id: true, name: true, type: true, unit: true },
        });
        return {
          productId: product.productId,
          productName: prod?.name || "Unknown",
          productType: prod?.type || "OTHER",
          unit: prod?.unit || "",
          totalQuantity: Number(product._sum.quantity || 0),
          totalAmount: Number(product._sum.totalAmount || 0),
          saleCount: product._count,
        };
      })
    );

    // Consignment analytics
    const consignmentStats = await prisma.consignmentRequest.groupBy({
      by: ["status"],
      where: {
        fromCompanyId: company.id,
        createdAt: { gte: startDate },
      },
      _count: true,
      _sum: { totalAmount: true },
    });

    // Payment/Collection analytics
    const paymentStats = await prisma.companyDealerPayment.groupBy({
      by: ["paymentMethod"],
      where: {
        account: {
          companyId: company.id,
        },
        paymentDate: { gte: startDate },
      },
      _sum: { amount: true },
      _count: true,
    });

    // Monthly comparison (current vs previous month)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [currentMonthSales, previousMonthSales] = await Promise.all([
      prisma.companySale.aggregate({
        where: {
          companyId: company.id,
          date: { gte: currentMonthStart },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      prisma.companySale.aggregate({
        where: {
          companyId: company.id,
          date: {
            gte: previousMonthStart,
            lte: previousMonthEnd,
          },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);

    const currentMonthRevenue = Number(currentMonthSales._sum.totalAmount || 0);
    const previousMonthRevenue = Number(previousMonthSales._sum.totalAmount || 0);
    const revenueGrowth = previousMonthRevenue > 0
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : currentMonthRevenue > 0 ? 100 : 0;

    // Account balances summary
    const accountBalances = await prisma.companyDealerAccount.findMany({
      where: { companyId: company.id },
      include: {
        dealer: {
          select: { id: true, name: true, contact: true },
        },
      },
      orderBy: { balance: "desc" },
      take: 10,
    });

    // Overall totals
    const totalSales = await prisma.companySale.count({
      where: { companyId: company.id },
    });

    const totalRevenue = await prisma.companySale.aggregate({
      where: { companyId: company.id },
      _sum: { totalAmount: true },
    });

    const totalOutstanding = await prisma.companyDealerAccount.aggregate({
      where: { companyId: company.id },
      _sum: { balance: true },
    });

    const totalPayments = await prisma.companyDealerPayment.aggregate({
      where: {
        account: { companyId: company.id },
      },
      _sum: { amount: true },
    });

    return res.status(200).json({
      success: true,
      data: {
        overview: {
          totalSales,
          totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
          totalOutstanding: Number(totalOutstanding._sum.balance || 0),
          totalPayments: Number(totalPayments._sum.amount || 0),
        },
        trends: {
          revenueTrends: revenueTrends.map((trend) => ({
            date: trend.date,
            revenue: Number(trend._sum.totalAmount || 0),
            salesCount: trend._count,
          })),
          monthlyComparison: {
            currentMonth: {
              revenue: currentMonthRevenue,
              salesCount: currentMonthSales._count,
            },
            previousMonth: {
              revenue: previousMonthRevenue,
              salesCount: previousMonthSales._count,
            },
            growth: revenueGrowth,
          },
        },
        salesByDealer: salesByDealerWithDetails,
        productPerformance: productPerformanceWithDetails,
        consignments: {
          byStatus: consignmentStats.map((stat) => ({
            status: stat.status,
            count: stat._count,
            totalAmount: Number(stat._sum.totalAmount || 0),
          })),
        },
        payments: {
          byMethod: paymentStats.map((stat) => ({
            method: stat.paymentMethod || "UNKNOWN",
            totalAmount: Number(stat._sum.amount || 0),
            count: stat._count,
          })),
        },
        topAccounts: accountBalances.map((acc) => ({
          dealerId: acc.dealerId,
          dealerName: acc.dealer.name,
          dealerContact: acc.dealer.contact,
          balance: Number(acc.balance),
          totalSales: Number(acc.totalSales),
          totalPayments: Number(acc.totalPayments),
        })),
      },
    });
  } catch (error: any) {
    console.error("Get company analytics error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
