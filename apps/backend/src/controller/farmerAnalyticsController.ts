import { Request, Response } from "express";
import { BatchStatus, BatchType, Prisma } from "@prisma/client";
import prisma from "../utils/prisma";
import { getMoneyToGiveForUser } from "./dashboardController";

type GroupBy = "daily" | "weekly" | "monthly";
type AnalyticsScope = {
  accessibleFarms: Array<{ id: string; name: string }>;
  batchOptions: Array<{
    id: string;
    batchNumber: string;
    batchType: BatchType;
    status: BatchStatus;
    startDate: Date;
    endDate: Date | null;
    farmId: string;
    farm: { name: string };
    initialChicks: number;
    mortalities: Array<{ count: number }>;
  }>;
  selectedFarmIds: string[];
  scopedBatches: Array<{
    id: string;
    batchNumber: string;
    batchType: BatchType;
    status: BatchStatus;
    startDate: Date;
    endDate: Date | null;
    farmId: string;
    farm: { name: string };
    initialChicks: number;
    mortalities: Array<{ count: number }>;
  }>;
  scopedBatchIds: string[];
  financeScopeWhere: Prisma.SaleWhereInput & Prisma.ExpenseWhereInput;
  filters: {
    farmId?: string;
    batchId?: string;
    batchType?: BatchType;
    status?: BatchStatus;
    groupBy: GroupBy;
    startDate?: Date;
    endDate?: Date;
  };
};

const validBatchTypes: BatchType[] = ["BROILER", "LAYERS"];
const validStatuses: BatchStatus[] = ["ACTIVE", "COMPLETED"];
const validGroupBy: GroupBy[] = ["daily", "weekly", "monthly"];

function one(value: unknown): string | undefined {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return typeof value === "string" ? value : undefined;
}

function normalizeOptional(value: unknown): string | undefined {
  const raw = one(value);
  if (!raw || raw === "all") return undefined;
  return raw;
}

function normalizeBatchType(value: unknown): BatchType | undefined {
  const raw = normalizeOptional(value);
  return validBatchTypes.includes(raw as BatchType) ? (raw as BatchType) : undefined;
}

function normalizeStatus(value: unknown): BatchStatus | undefined {
  const raw = normalizeOptional(value);
  return validStatuses.includes(raw as BatchStatus) ? (raw as BatchStatus) : undefined;
}

function normalizeGroupBy(value: unknown): GroupBy {
  const raw = one(value);
  return validGroupBy.includes(raw as GroupBy) ? (raw as GroupBy) : "daily";
}

function parseStartDate(value: unknown): Date | undefined {
  const raw = one(value);
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function parseEndDate(value: unknown): Date | undefined {
  const raw = one(value);
  if (!raw) return undefined;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return undefined;
  parsed.setHours(23, 59, 59, 999);
  return parsed;
}

async function buildAnalyticsScope(
  currentUserId: string,
  query: Request["query"]
): Promise<AnalyticsScope | { error: { status: number; message: string } }> {
  const farmId = normalizeOptional(query.farmId);
  const batchId = normalizeOptional(query.batchId);
  const batchType = normalizeBatchType(query.batchType);
  const status = normalizeStatus(query.status);
  const groupBy = normalizeGroupBy(query.groupBy);
  const startDate = parseStartDate(query.startDate);
  const endDate = parseEndDate(query.endDate);

  const accessibleFarms = await prisma.farm.findMany({
    where: {
      OR: [
        { ownerId: currentUserId },
        { managers: { some: { id: currentUserId } } },
      ],
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const accessibleFarmIds = accessibleFarms.map((farm) => farm.id);
  if (farmId && !accessibleFarmIds.includes(farmId)) {
    return {
      error: {
        status: 403,
        message: "You do not have access to this farm.",
      },
    };
  }

  const selectedFarmIds = farmId ? [farmId] : accessibleFarmIds;
  const batchWhere: Prisma.BatchWhereInput = {
    farmId: { in: selectedFarmIds },
    ...(batchType ? { batchType } : {}),
    ...(status ? { status } : {}),
  };

  const batchOptions = await prisma.batch.findMany({
    where: batchWhere,
    select: {
      id: true,
      batchNumber: true,
      batchType: true,
      status: true,
      startDate: true,
      endDate: true,
      farmId: true,
      farm: {
        select: {
          name: true,
        },
      },
      initialChicks: true,
      mortalities: {
        select: {
          count: true,
        },
      },
    },
    orderBy: {
      startDate: "desc",
    },
  });

  if (batchId && !batchOptions.some((batch) => batch.id === batchId)) {
    return {
      error: {
        status: 403,
        message: "You do not have access to this batch.",
      },
    };
  }

  const scopedBatches = batchId
    ? batchOptions.filter((batch) => batch.id === batchId)
    : batchOptions;
  const scopedBatchIds = scopedBatches.map((batch) => batch.id);
  const hasBatchScopeFilter = Boolean(batchId || batchType || status);
  const financeScopeWhere: Prisma.SaleWhereInput & Prisma.ExpenseWhereInput =
    hasBatchScopeFilter
      ? { batchId: { in: scopedBatchIds } }
      : { farmId: { in: selectedFarmIds } };

  return {
    accessibleFarms,
    batchOptions,
    selectedFarmIds,
    scopedBatches,
    scopedBatchIds,
    financeScopeWhere,
    filters: {
      farmId,
      batchId,
      batchType,
      status,
      groupBy,
      startDate,
      endDate,
    },
  };
}

function buildDateFilter(
  startDate?: Date,
  endDate?: Date
): { date?: Prisma.DateTimeFilter } {
  const dateWhere: Prisma.DateTimeFilter = {};
  if (startDate) dateWhere.gte = startDate;
  if (endDate) dateWhere.lte = endDate;
  return startDate || endDate ? { date: dateWhere } : {};
}

function getPeriodStart(date: Date, groupBy: GroupBy): Date {
  const period = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (groupBy === "monthly") {
    return new Date(period.getFullYear(), period.getMonth(), 1);
  }
  if (groupBy === "weekly") {
    const day = period.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    period.setDate(period.getDate() + mondayOffset);
  }
  return period;
}

function formatPeriodKey(date: Date, groupBy: GroupBy): string {
  const start = getPeriodStart(date, groupBy);
  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, "0");
  const day = String(start.getDate()).padStart(2, "0");
  if (groupBy === "monthly") return `${year}-${month}`;
  return `${year}-${month}-${day}`;
}

function formatPeriodLabel(date: Date, groupBy: GroupBy): string {
  const start = getPeriodStart(date, groupBy);
  if (groupBy === "monthly") {
    return start.toLocaleString("en", { month: "short", year: "numeric" });
  }
  if (groupBy === "weekly") {
    return `Week of ${start.toLocaleDateString("en", {
      month: "short",
      day: "numeric",
    })}`;
  }
  return start.toLocaleDateString("en", { month: "short", day: "numeric" });
}

export const getFarmerAnalyticsOverview = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const farmId = normalizeOptional(req.query.farmId);
    const batchId = normalizeOptional(req.query.batchId);
    const batchType = normalizeBatchType(req.query.batchType);
    const status = normalizeStatus(req.query.status);
    const groupBy = normalizeGroupBy(req.query.groupBy);
    const startDate = parseStartDate(req.query.startDate);
    const endDate = parseEndDate(req.query.endDate);

    const accessibleFarms = await prisma.farm.findMany({
      where: {
        OR: [
          { ownerId: currentUserId },
          { managers: { some: { id: currentUserId } } },
        ],
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    const accessibleFarmIds = accessibleFarms.map((farm) => farm.id);
    if (farmId && !accessibleFarmIds.includes(farmId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this farm.",
      });
    }

    const selectedFarmIds = farmId ? [farmId] : accessibleFarmIds;

    const batchWhere: Prisma.BatchWhereInput = {
      farmId: { in: selectedFarmIds },
      ...(batchType ? { batchType } : {}),
      ...(status ? { status } : {}),
    };

    const batchOptions = await prisma.batch.findMany({
      where: batchWhere,
      select: {
        id: true,
        batchNumber: true,
        batchType: true,
      status: true,
      startDate: true,
      endDate: true,
      farmId: true,
        farm: {
          select: {
            name: true,
          },
        },
        initialChicks: true,
        mortalities: {
          select: {
            count: true,
          },
        },
      },
      orderBy: {
        startDate: "desc",
      },
    });

    if (batchId && !batchOptions.some((batch) => batch.id === batchId)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this batch.",
      });
    }

    const scopedBatches = batchId
      ? batchOptions.filter((batch) => batch.id === batchId)
      : batchOptions;
    const scopedBatchIds = scopedBatches.map((batch) => batch.id);
    const hasBatchScopeFilter = Boolean(batchId || batchType || status);

    const financeScopeWhere: Prisma.SaleWhereInput & Prisma.ExpenseWhereInput =
      hasBatchScopeFilter
        ? { batchId: { in: scopedBatchIds } }
        : { farmId: { in: selectedFarmIds } };

    const dateWhere: Prisma.DateTimeFilter = {};
    if (startDate) dateWhere.gte = startDate;
    if (endDate) dateWhere.lte = endDate;

    const dateFilter =
      startDate || endDate
        ? {
            date: dateWhere,
          }
        : {};

    const [sales, expenses, creditSales, moneyToPay] = await Promise.all([
      prisma.sale.aggregate({
        where: {
          ...financeScopeWhere,
          ...dateFilter,
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.expense.aggregate({
        where: {
          ...financeScopeWhere,
          ...dateFilter,
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.sale.aggregate({
        where: {
          ...financeScopeWhere,
          isCredit: true,
        },
        _sum: {
          dueAmount: true,
        },
      }),
      getMoneyToGiveForUser(currentUserId),
    ]);

    const totalBirds = scopedBatches.reduce(
      (sum, batch) => sum + batch.initialChicks,
      0
    );
    const currentBirds = scopedBatches.reduce((sum, batch) => {
      const mortalityCount = batch.mortalities.reduce(
        (count, mortality) => count + mortality.count,
        0
      );
      return sum + Math.max(batch.initialChicks - mortalityCount, 0);
    }, 0);

    const totalRevenue = Number(sales._sum.amount || 0);
    const totalExpenses = Number(expenses._sum.amount || 0);

    return res.json({
      success: true,
      data: {
        filters: {
          farms: accessibleFarms,
          batches: batchOptions.map((batch) => ({
            id: batch.id,
            batchNumber: batch.batchNumber,
            batchType: batch.batchType,
            status: batch.status,
            startDate: batch.startDate,
            farmId: batch.farmId,
            farmName: batch.farm.name,
          })),
          applied: {
            farmId: farmId || null,
            batchId: batchId || null,
            batchType: batchType || null,
            status: status || null,
            startDate: startDate ? startDate.toISOString() : null,
            endDate: endDate ? endDate.toISOString() : null,
            groupBy,
          },
        },
        summary: {
          totalFarms: selectedFarmIds.length,
          activeBatches: scopedBatches.filter(
            (batch) => batch.status === "ACTIVE"
          ).length,
          totalBirds,
          currentBirds,
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          moneyToReceive: Number(creditSales._sum.dueAmount || 0),
          moneyToPay,
        },
      },
    });
  } catch (error) {
    console.error("Get farmer analytics overview error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch farmer analytics overview",
    });
  }
};

export const getFarmerFinanceAnalytics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const scope = await buildAnalyticsScope(currentUserId, req.query);
    if ("error" in scope) {
      return res.status(scope.error.status).json({
        success: false,
        message: scope.error.message,
      });
    }

    const { financeScopeWhere, filters } = scope;
    const dateFilter = buildDateFilter(filters.startDate, filters.endDate);

    const [sales, expenses] = await Promise.all([
      prisma.sale.findMany({
        where: {
          ...financeScopeWhere,
          ...dateFilter,
        },
        select: {
          id: true,
          date: true,
          amount: true,
        },
        orderBy: {
          date: "asc",
        },
      }),
      prisma.expense.findMany({
        where: {
          ...financeScopeWhere,
          ...dateFilter,
        },
        select: {
          id: true,
          date: true,
          amount: true,
          categoryId: true,
          category: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      }),
    ]);

    const periodMap = new Map<
      string,
      {
        period: string;
        label: string;
        revenue: number;
        expenses: number;
        profit: number;
      }
    >();

    const ensurePeriod = (date: Date) => {
      const period = formatPeriodKey(date, filters.groupBy);
      const existing = periodMap.get(period);
      if (existing) return existing;
      const row = {
        period,
        label: formatPeriodLabel(date, filters.groupBy),
        revenue: 0,
        expenses: 0,
        profit: 0,
      };
      periodMap.set(period, row);
      return row;
    };

    sales.forEach((sale) => {
      const row = ensurePeriod(sale.date);
      row.revenue += Number(sale.amount || 0);
    });

    expenses.forEach((expense) => {
      const row = ensurePeriod(expense.date);
      row.expenses += Number(expense.amount || 0);
    });

    const trend = Array.from(periodMap.values())
      .map((row) => ({
        ...row,
        profit: row.revenue - row.expenses,
      }))
      .sort((a, b) => a.period.localeCompare(b.period));

    const expenseCategoryMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        amount: number;
        count: number;
      }
    >();

    expenses.forEach((expense) => {
      const existing = expenseCategoryMap.get(expense.categoryId) || {
        categoryId: expense.categoryId,
        categoryName: expense.category.name,
        amount: 0,
        count: 0,
      };
      existing.amount += Number(expense.amount || 0);
      existing.count += 1;
      expenseCategoryMap.set(expense.categoryId, existing);
    });

    const totalRevenue = sales.reduce(
      (sum, sale) => sum + Number(sale.amount || 0),
      0
    );
    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + Number(expense.amount || 0),
      0
    );

    const expenseCategories = Array.from(expenseCategoryMap.values())
      .map((category) => ({
        ...category,
        percentage:
          totalExpenses > 0 ? (category.amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return res.json({
      success: true,
      data: {
        totals: {
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          salesCount: sales.length,
          expenseCount: expenses.length,
        },
        trend,
        expenseCategories,
        table: trend,
      },
    });
  } catch (error) {
    console.error("Get farmer finance analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch farmer finance analytics",
    });
  }
};

export const getFarmerFlockComparisonAnalytics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const scope = await buildAnalyticsScope(currentUserId, req.query);
    if ("error" in scope) {
      return res.status(scope.error.status).json({
        success: false,
        message: scope.error.message,
      });
    }

    const { scopedBatches, scopedBatchIds, filters } = scope;
    const dateFilter = buildDateFilter(filters.startDate, filters.endDate);

    if (scopedBatchIds.length === 0) {
      return res.json({
        success: true,
        data: {
          rows: [],
          charts: {
            profitByBatch: [],
            costPerBirdByBatch: [],
          },
        },
      });
    }

    const [
      saleGroups,
      expenseGroups,
      allMortalityGroups,
      naturalMortalityGroups,
      feedGroups,
    ] = await Promise.all([
      prisma.sale.groupBy({
        by: ["batchId"],
        where: {
          batchId: { in: scopedBatchIds },
          ...dateFilter,
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.expense.groupBy({
        by: ["batchId"],
        where: {
          batchId: { in: scopedBatchIds },
          ...dateFilter,
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.mortality.groupBy({
        by: ["batchId"],
        where: {
          batchId: { in: scopedBatchIds },
        },
        _sum: {
          count: true,
        },
      }),
      prisma.mortality.groupBy({
        by: ["batchId"],
        where: {
          batchId: { in: scopedBatchIds },
          reason: {
            not: {
              equals: "SLAUGHTERED_FOR_SALE",
            },
          },
        },
        _sum: {
          count: true,
        },
      }),
      prisma.feedConsumption.groupBy({
        by: ["batchId"],
        where: {
          batchId: { in: scopedBatchIds },
        },
        _sum: {
          quantity: true,
        },
      }),
    ]);

    const salesByBatch = new Map(
      saleGroups
        .filter((group) => group.batchId)
        .map((group) => [group.batchId as string, Number(group._sum.amount || 0)])
    );
    const expensesByBatch = new Map(
      expenseGroups
        .filter((group) => group.batchId)
        .map((group) => [group.batchId as string, Number(group._sum.amount || 0)])
    );
    const allMortalityByBatch = new Map(
      allMortalityGroups.map((group) => [
        group.batchId,
        Number(group._sum.count || 0),
      ])
    );
    const naturalMortalityByBatch = new Map(
      naturalMortalityGroups.map((group) => [
        group.batchId,
        Number(group._sum.count || 0),
      ])
    );
    const feedByBatch = new Map(
      feedGroups.map((group) => [
        group.batchId,
        Number(group._sum.quantity || 0),
      ])
    );

    const today = new Date();
    const rows = scopedBatches.map((batch) => {
      const revenue = salesByBatch.get(batch.id) || 0;
      const expense = expensesByBatch.get(batch.id) || 0;
      const profit = revenue - expense;
      const totalMortality = allMortalityByBatch.get(batch.id) || 0;
      const naturalMortality = naturalMortalityByBatch.get(batch.id) || 0;
      const currentBirds = Math.max(batch.initialChicks - totalMortality, 0);
      const durationEnd = batch.status === "COMPLETED" && batch.endDate
        ? batch.endDate
        : today;
      const ageDays = Math.max(
        0,
        Math.ceil(
          (durationEnd.getTime() - batch.startDate.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      const costPerBird =
        batch.initialChicks > 0 ? expense / batch.initialChicks : 0;
      const profitPerBird =
        batch.initialChicks > 0 ? profit / batch.initialChicks : 0;

      return {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        farmId: batch.farmId,
        farmName: batch.farm.name,
        batchType: batch.batchType,
        status: batch.status,
        startDate: batch.startDate,
        endDate: batch.endDate,
        ageDays,
        initialBirds: batch.initialChicks,
        currentBirds,
        naturalMortality,
        totalMortality,
        mortalityRate:
          batch.initialChicks > 0
            ? (naturalMortality / batch.initialChicks) * 100
            : 0,
        revenue,
        expense,
        profit,
        costPerBird,
        profitPerBird,
        feedConsumed: feedByBatch.get(batch.id) || 0,
      };
    });

    const profitByBatch = [...rows]
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 12)
      .map((row) => ({
        batchId: row.batchId,
        batchNumber: row.batchNumber,
        farmName: row.farmName,
        profit: row.profit,
      }));

    const costPerBirdByBatch = [...rows]
      .sort((a, b) => b.costPerBird - a.costPerBird)
      .slice(0, 12)
      .map((row) => ({
        batchId: row.batchId,
        batchNumber: row.batchNumber,
        farmName: row.farmName,
        costPerBird: row.costPerBird,
      }));

    return res.json({
      success: true,
      data: {
        rows,
        charts: {
          profitByBatch,
          costPerBirdByBatch,
        },
      },
    });
  } catch (error) {
    console.error("Get farmer flock comparison analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch farmer flock comparison analytics",
    });
  }
};

export const getFarmerOperationsAnalytics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const scope = await buildAnalyticsScope(currentUserId, req.query);
    if ("error" in scope) {
      return res.status(scope.error.status).json({
        success: false,
        message: scope.error.message,
      });
    }

    const { scopedBatches, scopedBatchIds, filters } = scope;
    const dateFilter = buildDateFilter(filters.startDate, filters.endDate);

    if (scopedBatchIds.length === 0) {
      return res.json({
        success: true,
        data: {
          health: {
            totals: {
              naturalMortality: 0,
              mortalityRate: 0,
              initialBirds: 0,
            },
            mortalityTrend: [],
            mortalityByReason: [],
          },
          feed: {
            trend: [],
            byBatch: [],
          },
          medicine: {
            byBatch: [],
          },
        },
      });
    }

    const batchMeta = new Map(
      scopedBatches.map((batch) => [
        batch.id,
        {
          batchNumber: batch.batchNumber,
          farmName: batch.farm.name,
          initialChicks: batch.initialChicks,
        },
      ])
    );

    const naturalMortalityWhere: Prisma.MortalityWhereInput = {
      batchId: { in: scopedBatchIds },
      saleId: null,
      reason: {
        notIn: ["SLAUGHTERED_FOR_SALE", "BATCH_CLOSURE"],
      },
      ...dateFilter,
    };

    const [
      naturalMortalities,
      naturalMortalityTotal,
      feedConsumptions,
      inventoryUsages,
      fallbackExpenses,
    ] = await Promise.all([
      prisma.mortality.findMany({
        where: naturalMortalityWhere,
        select: {
          id: true,
          date: true,
          count: true,
          reason: true,
        },
        orderBy: {
          date: "asc",
        },
      }),
      prisma.mortality.aggregate({
        where: naturalMortalityWhere,
        _sum: {
          count: true,
        },
      }),
      prisma.feedConsumption.findMany({
        where: {
          batchId: { in: scopedBatchIds },
          ...dateFilter,
        },
        select: {
          id: true,
          date: true,
          quantity: true,
          batchId: true,
        },
        orderBy: {
          date: "asc",
        },
      }),
      prisma.inventoryUsage.findMany({
        where: {
          batchId: { in: scopedBatchIds },
          ...dateFilter,
          item: {
            itemType: {
              in: ["FEED", "MEDICINE"],
            },
          },
        },
        select: {
          id: true,
          batchId: true,
          date: true,
          quantity: true,
          unitPrice: true,
          totalAmount: true,
          item: {
            select: {
              name: true,
              itemType: true,
              unit: true,
              unitPrice: true,
            },
          },
        },
      }),
      prisma.expense.findMany({
        where: {
          batchId: { in: scopedBatchIds },
          ...dateFilter,
          category: {
            name: {
              in: ["Feed", "Medicine"],
              mode: "insensitive",
            },
          },
        },
        select: {
          id: true,
          batchId: true,
          amount: true,
          quantity: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      }),
    ]);

    const totalInitialBirds = scopedBatches.reduce(
      (sum, batch) => sum + batch.initialChicks,
      0
    );
    const naturalMortalityCount = Number(
      naturalMortalityTotal._sum.count || 0
    );

    const mortalityTrendMap = new Map<
      string,
      { period: string; label: string; naturalDeaths: number }
    >();
    const reasonMap = new Map<string, number>();

    naturalMortalities.forEach((mortality) => {
      const period = formatPeriodKey(mortality.date, filters.groupBy);
      const row =
        mortalityTrendMap.get(period) ||
        {
          period,
          label: formatPeriodLabel(mortality.date, filters.groupBy),
          naturalDeaths: 0,
        };
      row.naturalDeaths += mortality.count;
      mortalityTrendMap.set(period, row);

      const reason = mortality.reason || "Unknown";
      reasonMap.set(reason, (reasonMap.get(reason) || 0) + mortality.count);
    });

    const mortalityTrend = Array.from(mortalityTrendMap.values()).sort((a, b) =>
      a.period.localeCompare(b.period)
    );
    const mortalityByReason = Array.from(reasonMap.entries())
      .map(([reason, count]) => ({
        reason,
        count,
        percentage:
          naturalMortalityCount > 0 ? (count / naturalMortalityCount) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const feedTrendMap = new Map<
      string,
      { period: string; label: string; quantity: number }
    >();
    const feedQuantityByBatch = new Map<string, number>();

    feedConsumptions.forEach((feed) => {
      const period = formatPeriodKey(feed.date, filters.groupBy);
      const row =
        feedTrendMap.get(period) ||
        {
          period,
          label: formatPeriodLabel(feed.date, filters.groupBy),
          quantity: 0,
        };
      const quantity = Number(feed.quantity || 0);
      row.quantity += quantity;
      feedTrendMap.set(period, row);
      feedQuantityByBatch.set(
        feed.batchId,
        (feedQuantityByBatch.get(feed.batchId) || 0) + quantity
      );
    });

    const usageSummaryByBatch = new Map<
      string,
      {
        feedQuantity: number;
        feedCost: number;
        medicineQuantity: number;
        medicineCost: number;
        feedUsageCount: number;
        medicineUsageCount: number;
      }
    >();

    const ensureUsageSummary = (batchId: string) => {
      const existing = usageSummaryByBatch.get(batchId);
      if (existing) return existing;
      const next = {
        feedQuantity: 0,
        feedCost: 0,
        medicineQuantity: 0,
        medicineCost: 0,
        feedUsageCount: 0,
        medicineUsageCount: 0,
      };
      usageSummaryByBatch.set(batchId, next);
      return next;
    };

    inventoryUsages.forEach((usage) => {
      if (!usage.batchId) return;
      const summary = ensureUsageSummary(usage.batchId);
      const quantity = Number(usage.quantity || 0);
      const unitPrice = Number(usage.unitPrice ?? usage.item.unitPrice ?? 0);
      const cost =
        usage.totalAmount != null
          ? Number(usage.totalAmount || 0)
          : quantity * unitPrice;

      if (usage.item.itemType === "FEED") {
        summary.feedQuantity += quantity;
        summary.feedCost += cost;
        summary.feedUsageCount += 1;
      }
      if (usage.item.itemType === "MEDICINE") {
        summary.medicineQuantity += quantity;
        summary.medicineCost += cost;
        summary.medicineUsageCount += 1;
      }
    });

    const fallbackSummaryByBatch = new Map<
      string,
      {
        feedQuantity: number;
        feedCost: number;
        medicineQuantity: number;
        medicineCost: number;
      }
    >();

    const ensureFallbackSummary = (batchId: string) => {
      const existing = fallbackSummaryByBatch.get(batchId);
      if (existing) return existing;
      const next = {
        feedQuantity: 0,
        feedCost: 0,
        medicineQuantity: 0,
        medicineCost: 0,
      };
      fallbackSummaryByBatch.set(batchId, next);
      return next;
    };

    fallbackExpenses.forEach((expense) => {
      if (!expense.batchId) return;
      const summary = ensureFallbackSummary(expense.batchId);
      const categoryName = expense.category.name.toLowerCase();
      const amount = Number(expense.amount || 0);
      const quantity = Number(expense.quantity || 0);

      if (categoryName === "feed") {
        summary.feedQuantity += quantity;
        summary.feedCost += amount;
      }
      if (categoryName === "medicine") {
        summary.medicineQuantity += quantity;
        summary.medicineCost += amount;
      }
    });

    const feedByBatch = scopedBatches.map((batch) => {
      const usage = usageSummaryByBatch.get(batch.id);
      const fallback = fallbackSummaryByBatch.get(batch.id);
      const hasUsage = Boolean(usage?.feedUsageCount);
      const meta = batchMeta.get(batch.id);
      return {
        batchId: batch.id,
        batchNumber: meta?.batchNumber || batch.batchNumber,
        farmName: meta?.farmName || batch.farm.name,
        quantity:
          feedQuantityByBatch.get(batch.id) ||
          (hasUsage ? usage?.feedQuantity || 0 : fallback?.feedQuantity || 0),
        cost: hasUsage ? usage?.feedCost || 0 : fallback?.feedCost || 0,
        source: hasUsage ? "inventory" : fallback ? "expense" : "none",
      };
    });

    const medicineByBatch = scopedBatches.map((batch) => {
      const usage = usageSummaryByBatch.get(batch.id);
      const fallback = fallbackSummaryByBatch.get(batch.id);
      const hasUsage = Boolean(usage?.medicineUsageCount);
      const meta = batchMeta.get(batch.id);
      return {
        batchId: batch.id,
        batchNumber: meta?.batchNumber || batch.batchNumber,
        farmName: meta?.farmName || batch.farm.name,
        quantity: hasUsage
          ? usage?.medicineQuantity || 0
          : fallback?.medicineQuantity || 0,
        cost: hasUsage
          ? usage?.medicineCost || 0
          : fallback?.medicineCost || 0,
        source: hasUsage ? "inventory" : fallback ? "expense" : "none",
      };
    });

    return res.json({
      success: true,
      data: {
        health: {
          totals: {
            naturalMortality: naturalMortalityCount,
            mortalityRate:
              totalInitialBirds > 0
                ? (naturalMortalityCount / totalInitialBirds) * 100
                : 0,
            initialBirds: totalInitialBirds,
          },
          mortalityTrend,
          mortalityByReason,
        },
        feed: {
          trend: Array.from(feedTrendMap.values()).sort((a, b) =>
            a.period.localeCompare(b.period)
          ),
          byBatch: feedByBatch,
        },
        medicine: {
          byBatch: medicineByBatch,
        },
      },
    });
  } catch (error) {
    console.error("Get farmer operations analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch farmer operations analytics",
    });
  }
};

export const getFarmerProductionAnalytics = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const currentUserId = req.userId;
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const scope = await buildAnalyticsScope(currentUserId, req.query);
    if ("error" in scope) {
      return res.status(scope.error.status).json({
        success: false,
        message: scope.error.message,
      });
    }

    const layerBatches = scope.scopedBatches.filter(
      (batch) => batch.batchType === "LAYERS"
    );
    const layerBatchIds = layerBatches.map((batch) => batch.id);
    const dateFilter = buildDateFilter(
      scope.filters.startDate,
      scope.filters.endDate
    );

    if (layerBatchIds.length === 0) {
      return res.json({
        success: true,
        data: {
          totals: {
            totalEggs: 0,
            eggsSold: 0,
            eggSalesRevenue: 0,
            eggStock: 0,
            costPerEgg: null,
            revenuePerEgg: null,
          },
          productionTrend: [],
          productionByType: [],
          salesVsProduction: [],
          flockComparison: [],
        },
      });
    }

    const [
      productions,
      eggSales,
      eggInventory,
      expenses,
      naturalMortalityGroups,
    ] = await Promise.all([
      prisma.eggProduction.findMany({
        where: {
          batchId: { in: layerBatchIds },
          ...dateFilter,
        },
        select: {
          id: true,
          date: true,
          batchId: true,
          entries: {
            select: {
              count: true,
              eggTypeId: true,
              eggType: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      }),
      prisma.sale.findMany({
        where: {
          batchId: { in: layerBatchIds },
          itemType: "EGGS",
          ...dateFilter,
        },
        select: {
          id: true,
          date: true,
          amount: true,
          quantity: true,
          batchId: true,
          eggTypeId: true,
          eggType: {
            select: {
              name: true,
            },
          },
          eggLines: {
            select: {
              quantity: true,
              unitPrice: true,
              eggTypeId: true,
              eggType: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          date: "asc",
        },
      }),
      prisma.batchEggInventory.findMany({
        where: {
          batchId: { in: layerBatchIds },
        },
        select: {
          batchId: true,
          quantity: true,
          eggTypeId: true,
          eggType: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.expense.groupBy({
        by: ["batchId"],
        where: {
          batchId: { in: layerBatchIds },
          ...dateFilter,
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.mortality.groupBy({
        by: ["batchId"],
        where: {
          batchId: { in: layerBatchIds },
          saleId: null,
          reason: {
            notIn: ["SLAUGHTERED_FOR_SALE", "BATCH_CLOSURE"],
          },
        },
        _sum: {
          count: true,
        },
      }),
    ]);

    const productionTrendMap = new Map<
      string,
      { period: string; label: string; eggsProduced: number }
    >();
    const productionByTypeMap = new Map<
      string,
      { eggTypeId: string; eggTypeName: string; produced: number }
    >();
    const productionByBatch = new Map<string, number>();

    productions.forEach((production) => {
      const period = formatPeriodKey(production.date, scope.filters.groupBy);
      const trendRow =
        productionTrendMap.get(period) ||
        {
          period,
          label: formatPeriodLabel(production.date, scope.filters.groupBy),
          eggsProduced: 0,
        };

      production.entries.forEach((entry) => {
        trendRow.eggsProduced += entry.count;
        productionByBatch.set(
          production.batchId,
          (productionByBatch.get(production.batchId) || 0) + entry.count
        );
        const typeRow = productionByTypeMap.get(entry.eggTypeId) || {
          eggTypeId: entry.eggTypeId,
          eggTypeName: entry.eggType.name,
          produced: 0,
        };
        typeRow.produced += entry.count;
        productionByTypeMap.set(entry.eggTypeId, typeRow);
      });

      productionTrendMap.set(period, trendRow);
    });

    const salesTrendMap = new Map<
      string,
      { period: string; label: string; eggsSold: number; salesRevenue: number }
    >();
    const salesByBatch = new Map<string, { eggsSold: number; revenue: number }>();

    eggSales.forEach((sale) => {
      const period = formatPeriodKey(sale.date, scope.filters.groupBy);
      const trendRow =
        salesTrendMap.get(period) ||
        {
          period,
          label: formatPeriodLabel(sale.date, scope.filters.groupBy),
          eggsSold: 0,
          salesRevenue: 0,
        };

      let saleEggCount = 0;
      if (sale.eggLines.length > 0) {
        sale.eggLines.forEach((line) => {
          saleEggCount += line.quantity;
        });
      } else {
        saleEggCount = Number(sale.quantity || 0);
      }

      trendRow.eggsSold += saleEggCount;
      trendRow.salesRevenue += Number(sale.amount || 0);
      salesTrendMap.set(period, trendRow);

      if (sale.batchId) {
        const batchSales = salesByBatch.get(sale.batchId) || {
          eggsSold: 0,
          revenue: 0,
        };
        batchSales.eggsSold += saleEggCount;
        batchSales.revenue += Number(sale.amount || 0);
        salesByBatch.set(sale.batchId, batchSales);
      }
    });

    const allPeriods = new Set([
      ...Array.from(productionTrendMap.keys()),
      ...Array.from(salesTrendMap.keys()),
    ]);

    const salesVsProduction = Array.from(allPeriods)
      .map((period) => {
        const production = productionTrendMap.get(period);
        const sales = salesTrendMap.get(period);
        return {
          period,
          label: production?.label || sales?.label || period,
          eggsProduced: production?.eggsProduced || 0,
          eggsSold: sales?.eggsSold || 0,
          salesRevenue: sales?.salesRevenue || 0,
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));

    const eggStock = eggInventory.reduce(
      (sum, inventory) => sum + inventory.quantity,
      0
    );
    const stockByBatch = new Map<string, number>();
    eggInventory.forEach((inventory) => {
      stockByBatch.set(
        inventory.batchId,
        (stockByBatch.get(inventory.batchId) || 0) + inventory.quantity
      );
    });

    const expenseByBatch = new Map(
      expenses
        .filter((expense) => expense.batchId)
        .map((expense) => [
          expense.batchId as string,
          Number(expense._sum.amount || 0),
        ])
    );
    const naturalMortalityByBatch = new Map(
      naturalMortalityGroups.map((group) => [
        group.batchId,
        Number(group._sum.count || 0),
      ])
    );

    const totalEggs = Array.from(productionByBatch.values()).reduce(
      (sum, count) => sum + count,
      0
    );
    const eggsSold = Array.from(salesByBatch.values()).reduce(
      (sum, sale) => sum + sale.eggsSold,
      0
    );
    const eggSalesRevenue = Array.from(salesByBatch.values()).reduce(
      (sum, sale) => sum + sale.revenue,
      0
    );
    const totalExpenses = Array.from(expenseByBatch.values()).reduce(
      (sum, amount) => sum + amount,
      0
    );

    const flockComparison = layerBatches.map((batch) => {
      const produced = productionByBatch.get(batch.id) || 0;
      const sales = salesByBatch.get(batch.id) || { eggsSold: 0, revenue: 0 };
      const expense = expenseByBatch.get(batch.id) || 0;
      const naturalMortality = naturalMortalityByBatch.get(batch.id) || 0;
      const profit = sales.revenue - expense;
      return {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        farmName: batch.farm.name,
        totalEggs: produced,
        eggsPerBird:
          batch.initialChicks > 0 ? produced / batch.initialChicks : null,
        salesRevenue: sales.revenue,
        unsoldStock: stockByBatch.get(batch.id) || 0,
        mortalityRate:
          batch.initialChicks > 0
            ? (naturalMortality / batch.initialChicks) * 100
            : 0,
        profit,
      };
    });

    return res.json({
      success: true,
      data: {
        totals: {
          totalEggs,
          eggsSold,
          eggSalesRevenue,
          eggStock,
          costPerEgg: totalEggs > 0 ? totalExpenses / totalEggs : null,
          revenuePerEgg: eggsSold > 0 ? eggSalesRevenue / eggsSold : null,
        },
        productionTrend: Array.from(productionTrendMap.values()).sort((a, b) =>
          a.period.localeCompare(b.period)
        ),
        productionByType: Array.from(productionByTypeMap.values()).sort(
          (a, b) => b.produced - a.produced
        ),
        salesVsProduction,
        flockComparison,
      },
    });
  } catch (error) {
    console.error("Get farmer production analytics error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch farmer production analytics",
    });
  }
};
