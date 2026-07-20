import { Request, Response } from "express";
import { HatcheryBatchStatus, HatcheryBatchType, Prisma } from "@prisma/client";
import prisma from "../utils/prisma";

function getOwnerId(req: Request): string {
  return (req as any).userId as string;
}

function toDateOnly(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  end.setHours(23, 59, 59, 999);
  return end;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function money(value: unknown) {
  return Number(value ?? 0);
}

function buildRange(startDate?: string, endDate?: string, period = "30") {
  const today = new Date();
  const end = endDate ? endOfDay(toDateOnly(endDate) ?? today) : endOfDay(today);
  const parsedStart = startDate ? startOfDay(toDateOnly(startDate) ?? today) : null;

  if (parsedStart) {
    return { start: parsedStart, end };
  }

  const days = Math.max(1, parseInt(period, 10) || 30);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return { start: startOfDay(start), end };
}

function buildDailySeries(start: Date, end: Date) {
  const series: Array<{
    date: string;
    label: string;
    revenue: number;
    expenses: number;
    profit: number;
  }> = [];

  const cursor = new Date(start);
  while (cursor <= end) {
    series.push({
      date: dateKey(cursor),
      label: dateKey(cursor).slice(5),
      revenue: 0,
      expenses: 0,
      profit: 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return series;
}

type HatcheryBatchAnalyticsRow = {
  id: string;
  code: string;
  name: string | null;
  type: HatcheryBatchType;
  status: HatcheryBatchStatus;
  startDate: Date;
  endDate: Date | null;
  currentParents: number | null;
  initialParents: number | null;
};

async function buildBatchAnalyticsScope(
  ownerId: string,
  batches: HatcheryBatchAnalyticsRow[],
  start: Date,
  end: Date
) {
  if (batches.length === 0) {
    return {
      rows: [],
      summary: {
        totalBatches: 0,
        activeBatches: 0,
        closedBatches: 0,
        totalMortality: 0,
        totalExpenses: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalEggSales: 0,
        totalParentSales: 0,
        totalChickSales: 0,
        totalIncubations: 0,
        totalEggsSet: 0,
        totalProducedChicks: 0,
        totalSoldChicks: 0,
        averageMortalityRate: 0,
        averageProfitPerBatch: 0,
      },
    };
  }

  const batchIds = batches.map((batch) => batch.id);

  const [
    mortalities,
    expenses,
    eggSales,
    parentSales,
    incubations,
    hatchResults,
    chickSales,
  ] = await Promise.all([
    prisma.hatcheryBatchMortality.findMany({
      where: { batchId: { in: batchIds } },
      select: { batchId: true, count: true },
    }),
    prisma.hatcheryBatchExpense.findMany({
      where: {
        batchId: { in: batchIds },
        date: { gte: start, lte: end },
      },
      select: { batchId: true, amount: true },
    }),
    prisma.hatcheryEggSale.findMany({
      where: {
        batchId: { in: batchIds },
        date: { gte: start, lte: end },
      },
      select: { batchId: true, amount: true, count: true },
    }),
    prisma.hatcheryParentSale.findMany({
      where: {
        batchId: { in: batchIds },
        date: { gte: start, lte: end },
      },
      select: { batchId: true, amount: true, count: true },
    }),
    prisma.hatcheryIncubationBatch.findMany({
      where: {
        hatcheryOwnerId: ownerId,
        parentBatchId: { in: batchIds },
      },
      select: {
        id: true,
        parentBatchId: true,
        eggsSetCount: true,
      },
    }),
    prisma.hatcheryHatchResult.findMany({
      where: {
        incubationBatch: {
          is: {
            hatcheryOwnerId: ownerId,
            parentBatchId: { in: batchIds },
          },
        },
      },
      select: {
        incubationBatch: {
          select: {
            parentBatchId: true,
          },
        },
        hatchedA: true,
        hatchedB: true,
        cull: true,
      },
    }),
    prisma.hatcheryChickSale.findMany({
      where: {
        date: { gte: start, lte: end },
        incubationBatch: {
          is: {
            hatcheryOwnerId: ownerId,
            parentBatchId: { in: batchIds },
          },
        },
      },
      select: {
        incubationBatch: {
          select: {
            parentBatchId: true,
          },
        },
        amount: true,
        count: true,
      },
    }),
  ]);

  const initializeRow = (batch: HatcheryBatchAnalyticsRow) => ({
    id: batch.id,
    code: batch.code,
    name: batch.name,
    type: batch.type,
    status: batch.status,
    startDate: batch.startDate.toISOString(),
    endDate: batch.endDate ? batch.endDate.toISOString() : null,
    currentParents: batch.currentParents ?? null,
    initialParents: batch.initialParents ?? null,
    mortality: 0,
    mortalityRate: 0,
    expenses: 0,
    eggSalesRevenue: 0,
    parentSalesRevenue: 0,
    chickSalesRevenue: 0,
    revenue: 0,
    profit: 0,
    incubations: 0,
    eggsSet: 0,
    producedChicks: 0,
    soldChicks: 0,
    hatchabilityRate: 0,
  });

  const rows = batches.map(initializeRow);
  const rowMap = new Map(rows.map((row) => [row.id, row]));

  const addAmount = (id: string, key: "expenses" | "eggSalesRevenue" | "parentSalesRevenue" | "chickSalesRevenue", value: unknown) => {
    const row = rowMap.get(id);
    if (row) row[key] += money(value);
  };

  const addCount = (id: string, key: "mortality" | "eggsSet" | "producedChicks" | "soldChicks" | "incubations", value: unknown) => {
    const row = rowMap.get(id);
    if (row) row[key] += Number(value ?? 0);
  };

  for (const entry of mortalities) addCount(entry.batchId, "mortality", entry.count);
  for (const entry of expenses) addAmount(entry.batchId, "expenses", entry.amount);
  for (const entry of eggSales) {
    addAmount(entry.batchId, "eggSalesRevenue", entry.amount);
  }
  for (const entry of parentSales) {
    addAmount(entry.batchId, "parentSalesRevenue", entry.amount);
  }
  for (const entry of incubations) {
    addCount(entry.parentBatchId, "incubations", 1);
    addCount(entry.parentBatchId, "eggsSet", entry.eggsSetCount);
  }
  for (const entry of hatchResults) {
    const parentBatchId = entry.incubationBatch.parentBatchId;
    addCount(parentBatchId, "producedChicks", Number(entry.hatchedA ?? 0) + Number(entry.hatchedB ?? 0) + Number(entry.cull ?? 0));
  }
  for (const entry of chickSales) {
    const parentBatchId = entry.incubationBatch.parentBatchId;
    addCount(parentBatchId, "soldChicks", entry.count);
    addAmount(parentBatchId, "chickSalesRevenue", entry.amount);
  }

  const summary = rows.reduce(
    (acc, row) => {
      const revenue = row.eggSalesRevenue + row.parentSalesRevenue + row.chickSalesRevenue;
      const profit = revenue - row.expenses;
      const mortalityRate =
        row.initialParents && row.initialParents > 0 ? (row.mortality / row.initialParents) * 100 : 0;

      row.revenue = revenue;
      row.profit = profit;
      row.mortalityRate = mortalityRate;
      row.hatchabilityRate = row.eggsSet > 0 ? (row.producedChicks / row.eggsSet) * 100 : 0;

      acc.totalBatches += 1;
      acc.activeBatches += row.status === HatcheryBatchStatus.ACTIVE ? 1 : 0;
      acc.closedBatches += row.status === HatcheryBatchStatus.CLOSED ? 1 : 0;
      acc.totalMortality += row.mortality;
      acc.totalExpenses += row.expenses;
      acc.totalRevenue += revenue;
      acc.totalProfit += profit;
      acc.totalEggSales += row.eggSalesRevenue;
      acc.totalParentSales += row.parentSalesRevenue;
      acc.totalChickSales += row.chickSalesRevenue;
      acc.totalIncubations += row.incubations;
      acc.totalEggsSet += row.eggsSet;
      acc.totalProducedChicks += row.producedChicks;
      acc.totalSoldChicks += row.soldChicks;
      acc.totalInitialParents += row.initialParents ?? 0;
      return acc;
    },
    {
      totalBatches: 0,
      activeBatches: 0,
      closedBatches: 0,
      totalMortality: 0,
      totalExpenses: 0,
      totalRevenue: 0,
      totalProfit: 0,
      totalEggSales: 0,
      totalParentSales: 0,
      totalChickSales: 0,
      totalIncubations: 0,
      totalEggsSet: 0,
      totalProducedChicks: 0,
      totalSoldChicks: 0,
      totalInitialParents: 0,
    }
  );

  return {
    rows,
    summary: {
      totalBatches: summary.totalBatches,
      activeBatches: summary.activeBatches,
      closedBatches: summary.closedBatches,
      totalMortality: summary.totalMortality,
      totalExpenses: summary.totalExpenses,
      totalRevenue: summary.totalRevenue,
      totalProfit: summary.totalProfit,
      totalEggSales: summary.totalEggSales,
      totalParentSales: summary.totalParentSales,
      totalChickSales: summary.totalChickSales,
      totalIncubations: summary.totalIncubations,
      totalEggsSet: summary.totalEggsSet,
      totalProducedChicks: summary.totalProducedChicks,
      totalSoldChicks: summary.totalSoldChicks,
      averageMortalityRate:
        summary.totalInitialParents > 0 ? (summary.totalMortality / summary.totalInitialParents) * 100 : 0,
      averageProfitPerBatch:
        summary.totalBatches > 0 ? summary.totalProfit / summary.totalBatches : 0,
    },
  };
}

type HatcherySalesAnalyticsRow = {
  id: string;
  saleType: "EGG" | "PARENT" | "CHICK";
  date: string;
  batchCode: string;
  batchName: string | null;
  sourceCode: string | null;
  sourceName: string | null;
  partyName: string | null;
  partyPhone: string | null;
  itemLabel: string;
  count: number;
  amount: number;
  note: string | null;
  grade: string | null;
  saleable: boolean;
};

export async function getHatcheryAnalyticsOverview(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { startDate, endDate, period = "30", batchType, search } = req.query as Record<string, string>;

    const { start, end } = buildRange(startDate, endDate, period);
    const searchTerm = search?.trim() || "";
    const normalizedBatchType =
      batchType === "PARENT_FLOCK" || batchType === "INCUBATION"
        ? (batchType as HatcheryBatchType)
        : undefined;

    const batchWhere: Prisma.HatcheryBatchWhereInput = {
      hatcheryOwnerId: ownerId,
      ...(normalizedBatchType ? { type: normalizedBatchType } : {}),
      ...(searchTerm
        ? {
            OR: [
              { code: { contains: searchTerm, mode: "insensitive" } },
              { name: { contains: searchTerm, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [matchedBatches, ownerSuppliers, ownerParties, inventoryItems] = await Promise.all([
      prisma.hatcheryBatch.findMany({
        where: batchWhere,
        select: { id: true, type: true, status: true, code: true, name: true },
        orderBy: { startDate: "desc" },
      }),
      prisma.hatcherySupplier.findMany({
        where: { hatcheryOwnerId: ownerId },
        select: { id: true, name: true, balance: true },
        orderBy: { balance: "desc" },
      }),
      prisma.hatcheryParty.findMany({
        where: { hatcheryOwnerId: ownerId },
        select: { id: true, name: true, balance: true },
        orderBy: { balance: "desc" },
      }),
      prisma.hatcheryInventoryItem.findMany({
        where: { hatcheryOwnerId: ownerId, deletedAt: null },
        select: {
          id: true,
          name: true,
          itemType: true,
          currentStock: true,
          minStock: true,
        },
      }),
    ]);

    const batchIds = matchedBatches.map((batch) => batch.id);

    const incubationWhere: Prisma.HatcheryIncubationBatchWhereInput = {
      hatcheryOwnerId: ownerId,
      ...(searchTerm
        ? {
            OR: [
              { code: { contains: searchTerm, mode: "insensitive" } },
              { name: { contains: searchTerm, mode: "insensitive" } },
              {
                parentBatch: {
                  is: {
                    OR: [
                      { code: { contains: searchTerm, mode: "insensitive" } },
                      { name: { contains: searchTerm, mode: "insensitive" } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
      ...(normalizedBatchType === "PARENT_FLOCK" && batchIds.length > 0
        ? { parentBatchId: { in: batchIds } }
        : {}),
    };

    const matchedIncubations = await prisma.hatcheryIncubationBatch.findMany({
      where: incubationWhere,
      select: { id: true, stage: true, code: true, name: true, parentBatchId: true },
      orderBy: { startDate: "desc" },
    });

    const incubationIds = matchedIncubations.map((batch) => batch.id);

    const [eggSales, parentSales, chickSales, expenses, eggStockAgg, chickStockAgg] = await Promise.all([
      prisma.hatcheryEggSale.findMany({
        where: {
          batchId: { in: batchIds },
          date: { gte: start, lte: end },
        },
        select: { date: true, amount: true },
      }),
      prisma.hatcheryParentSale.findMany({
        where: {
          batchId: { in: batchIds },
          date: { gte: start, lte: end },
        },
        select: { date: true, amount: true },
      }),
      prisma.hatcheryChickSale.findMany({
        where: {
          incubationBatchId: { in: incubationIds },
          date: { gte: start, lte: end },
        },
        select: { date: true, amount: true },
      }),
      prisma.hatcheryBatchExpense.findMany({
        where: {
          batchId: { in: batchIds },
          date: { gte: start, lte: end },
        },
        select: { date: true, amount: true },
      }),
      prisma.hatcheryEggStock.aggregate({
        where: {
          batchId: { in: batchIds },
        },
        _sum: { currentStock: true },
      }),
      prisma.hatcheryChickStock.aggregate({
        where: {
          incubationBatchId: { in: incubationIds },
        },
        _sum: { currentStock: true },
      }),
    ]);

    const totalEggSalesRevenue = eggSales.reduce((sum, row) => sum + money(row.amount), 0);
    const totalParentSalesRevenue = parentSales.reduce((sum, row) => sum + money(row.amount), 0);
    const totalChickSalesRevenue = chickSales.reduce((sum, row) => sum + money(row.amount), 0);
    const totalRevenue = totalEggSalesRevenue + totalParentSalesRevenue + totalChickSalesRevenue;
    const totalExpenses = expenses.reduce((sum, row) => sum + money(row.amount), 0);
    const netProfit = totalRevenue - totalExpenses;

    const trendMap = new Map<
      string,
      { revenue: number; expenses: number; profit: number }
    >();
    for (const row of buildDailySeries(start, end)) {
      trendMap.set(row.date, { revenue: 0, expenses: 0, profit: 0 });
    }

    for (const sale of [...eggSales, ...parentSales, ...chickSales]) {
      const key = dateKey(new Date(sale.date));
      const bucket = trendMap.get(key);
      if (bucket) bucket.revenue += money(sale.amount);
    }
    for (const expense of expenses) {
      const key = dateKey(new Date(expense.date));
      const bucket = trendMap.get(key);
      if (bucket) bucket.expenses += money(expense.amount);
    }
    for (const bucket of trendMap.values()) {
      bucket.profit = bucket.revenue - bucket.expenses;
    }

    const trends = buildDailySeries(start, end).map((row) => {
      const bucket = trendMap.get(row.date) ?? { revenue: 0, expenses: 0, profit: 0 };
      return {
        ...row,
        revenue: bucket.revenue,
        expenses: bucket.expenses,
        profit: bucket.profit,
      };
    });

    const rangeDays = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    );
    const previousEnd = new Date(start);
    previousEnd.setDate(previousEnd.getDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - (rangeDays - 1));

    const [previousEggSales, previousParentSales, previousChickSales, previousExpenses] =
      await Promise.all([
        prisma.hatcheryEggSale.findMany({
          where: {
            batchId: { in: batchIds },
            date: { gte: previousStart, lte: previousEnd },
          },
          select: { amount: true },
        }),
        prisma.hatcheryParentSale.findMany({
          where: {
            batchId: { in: batchIds },
            date: { gte: previousStart, lte: previousEnd },
          },
          select: { amount: true },
        }),
        prisma.hatcheryChickSale.findMany({
          where: {
            incubationBatchId: { in: incubationIds },
            date: { gte: previousStart, lte: previousEnd },
          },
          select: { amount: true },
        }),
        prisma.hatcheryBatchExpense.findMany({
          where: {
            batchId: { in: batchIds },
            date: { gte: previousStart, lte: previousEnd },
          },
          select: { amount: true },
        }),
      ]);

    const previousRevenue =
      previousEggSales.reduce((sum, row) => sum + money(row.amount), 0) +
      previousParentSales.reduce((sum, row) => sum + money(row.amount), 0) +
      previousChickSales.reduce((sum, row) => sum + money(row.amount), 0);
    const previousExpensesTotal = previousExpenses.reduce((sum, row) => sum + money(row.amount), 0);
    const previousProfit = previousRevenue - previousExpensesTotal;

    const revenueGrowthPct =
      previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : totalRevenue > 0 ? 100 : 0;
    const profitGrowthPct =
      previousProfit !== 0 ? ((netProfit - previousProfit) / Math.abs(previousProfit)) * 100 : netProfit > 0 ? 100 : 0;

    const totalSupplierBalance = ownerSuppliers.reduce((sum, supplier) => sum + money(supplier.balance), 0);
    const totalPartyBalance = ownerParties.reduce((sum, party) => sum + money(party.balance), 0);

    const totalEggStock = money(eggStockAgg._sum.currentStock ?? 0);
    const totalProducedChicks = money(chickStockAgg._sum.currentStock ?? 0);

    const totalBatches = matchedBatches.length;
    const activeBatches = matchedBatches.filter((batch) => batch.status === HatcheryBatchStatus.ACTIVE).length;
    const totalIncubations = matchedIncubations.length;
    const activeIncubations = matchedIncubations.filter(
      (batch) => batch.stage !== "COMPLETED"
    ).length;

    const activeBatchesData = matchedBatches
      .filter((batch) => batch.status === HatcheryBatchStatus.ACTIVE)
      .slice(0, 5)
      .map((batch) => ({
        id: batch.id,
        code: batch.code,
        name: batch.name,
        type: batch.type,
      }));

    const activeIncubationsData = matchedIncubations
      .filter((batch) => batch.stage !== "COMPLETED")
      .slice(0, 5)
      .map((batch) => ({
        id: batch.id,
        code: batch.code,
        name: batch.name,
        stage: batch.stage,
      }));

    return res.json({
      success: true,
      data: {
        applied: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          batchType: normalizedBatchType ?? null,
          search: searchTerm || null,
        },
        overview: {
          totalRevenue: money(totalRevenue),
          totalExpenses: money(totalExpenses),
          netProfit: money(netProfit),
          eggSalesRevenue: money(totalEggSalesRevenue),
          parentSalesRevenue: money(totalParentSalesRevenue),
          chickSalesRevenue: money(totalChickSalesRevenue),
          totalBatches,
          activeBatches,
          totalIncubations,
          activeIncubations,
          totalEggStock,
          totalProducedChicks,
          totalSupplierBalance,
          totalPartyBalance,
        },
        comparison: {
          current: {
            revenue: money(totalRevenue),
            expenses: money(totalExpenses),
            profit: money(netProfit),
          },
          previous: {
            revenue: money(previousRevenue),
            expenses: money(previousExpensesTotal),
            profit: money(previousProfit),
          },
          revenueGrowthPct,
          profitGrowthPct,
        },
        trends: {
          daily: trends,
        },
        mix: {
          eggSalesRevenue: money(totalEggSalesRevenue),
          parentSalesRevenue: money(totalParentSalesRevenue),
          chickSalesRevenue: money(totalChickSalesRevenue),
        },
        highlights: {
          activeBatches: activeBatchesData,
          activeIncubations: activeIncubationsData,
        },
      },
    });
  } catch (err: any) {
    console.error("Get hatchery analytics overview error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch hatchery analytics overview",
    });
  }
}

export async function getHatcheryAnalyticsBatches(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const {
      startDate,
      endDate,
      period = "30",
      batchType,
      search,
      page = "1",
      limit = "10",
    } = req.query as Record<string, string>;

    const { start, end } = buildRange(startDate, endDate, period);
    const searchTerm = search?.trim() || "";
    const normalizedBatchType =
      batchType === "PARENT_FLOCK" || batchType === "INCUBATION"
        ? (batchType as HatcheryBatchType)
        : undefined;

    const batchWhere: Prisma.HatcheryBatchWhereInput = {
      hatcheryOwnerId: ownerId,
      ...(normalizedBatchType ? { type: normalizedBatchType } : {}),
      ...(searchTerm
        ? {
            OR: [
              { code: { contains: searchTerm, mode: "insensitive" } },
              { name: { contains: searchTerm, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * pageLimit;

    const [allBatches, pagedBatches, total] = await Promise.all([
      prisma.hatcheryBatch.findMany({
        where: batchWhere,
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          status: true,
          startDate: true,
          endDate: true,
          currentParents: true,
          initialParents: true,
        },
        orderBy: { startDate: "desc" },
      }),
      prisma.hatcheryBatch.findMany({
        where: batchWhere,
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          status: true,
          startDate: true,
          endDate: true,
          currentParents: true,
          initialParents: true,
        },
        orderBy: { startDate: "desc" },
        skip,
        take: pageLimit,
      }),
      prisma.hatcheryBatch.count({ where: batchWhere }),
    ]);

    const [allScope, pageScope] = await Promise.all([
      buildBatchAnalyticsScope(ownerId, allBatches, start, end),
      buildBatchAnalyticsScope(ownerId, pagedBatches, start, end),
    ]);

    return res.json({
      success: true,
      data: {
        applied: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          batchType: normalizedBatchType ?? null,
          search: searchTerm || null,
        },
        summary: allScope.summary,
        batches: pageScope.rows,
        page: pageNum,
        limit: pageLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageLimit)),
      },
    });
  } catch (err: any) {
    console.error("Get hatchery analytics batches error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch hatchery analytics batches",
    });
  }
}

export async function getHatcheryAnalyticsIncubations(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const {
      startDate,
      endDate,
      period = "30",
      search,
      parentBatchId,
      stage,
      page = "1",
      limit = "10",
    } = req.query as Record<string, string>;

    const { start, end } = buildRange(startDate, endDate, period);
    const searchTerm = search?.trim() || "";
    const normalizedStage =
      stage === "SETTER" || stage === "CANDLING" || stage === "HATCHER" || stage === "COMPLETED"
        ? stage
        : undefined;

    const where: Prisma.HatcheryIncubationBatchWhereInput = {
      hatcheryOwnerId: ownerId,
      ...(parentBatchId ? { parentBatchId } : {}),
      ...(normalizedStage ? { stage: normalizedStage } : {}),
      ...(searchTerm
        ? {
            OR: [
              { code: { contains: searchTerm, mode: "insensitive" } },
              { name: { contains: searchTerm, mode: "insensitive" } },
              {
                parentBatch: {
                  is: {
                    OR: [
                      { code: { contains: searchTerm, mode: "insensitive" } },
                      { name: { contains: searchTerm, mode: "insensitive" } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * pageLimit;

    const selectShape = {
      id: true,
      code: true,
      name: true,
      stage: true,
      startDate: true,
      eggsSetCount: true,
      parentBatchId: true,
      parentBatch: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    } satisfies Prisma.HatcheryIncubationBatchSelect;

    const [allIncubations, pagedIncubations, total] = await Promise.all([
      prisma.hatcheryIncubationBatch.findMany({
        where,
        select: selectShape,
        orderBy: { startDate: "desc" },
      }),
      prisma.hatcheryIncubationBatch.findMany({
        where,
        select: selectShape,
        orderBy: { startDate: "desc" },
        skip,
        take: pageLimit,
      }),
      prisma.hatcheryIncubationBatch.count({ where }),
    ]);

    const incubationIds = allIncubations.map((incubation) => incubation.id);

    const [lossRows, hatchRows, chickSalesRows, chickStockRows] = await Promise.all([
      prisma.hatcheryIncubationLoss.findMany({
        where: {
          incubationBatchId: { in: incubationIds },
          date: { gte: start, lte: end },
        },
        select: {
          incubationBatchId: true,
          type: true,
          count: true,
        },
      }),
      prisma.hatcheryHatchResult.findMany({
        where: {
          incubationBatchId: { in: incubationIds },
          date: { gte: start, lte: end },
        },
        select: {
          incubationBatchId: true,
          hatchedA: true,
          hatchedB: true,
          cull: true,
          lateDead: true,
          unhatched: true,
        },
      }),
      prisma.hatcheryChickSale.findMany({
        where: {
          incubationBatchId: { in: incubationIds },
          date: { gte: start, lte: end },
        },
        select: {
          incubationBatchId: true,
          count: true,
          amount: true,
        },
      }),
      prisma.hatcheryChickStock.findMany({
        where: { incubationBatchId: { in: incubationIds } },
        select: {
          incubationBatchId: true,
          currentStock: true,
        },
      }),
    ]);

    type IncubationAnalyticsRow = {
      id: string;
      code: string;
      name: string | null;
      stage: "SETTER" | "CANDLING" | "HATCHER" | "COMPLETED";
      startDate: string;
      eggsSetCount: number;
      parentBatch: { id: string; code: string; name: string | null } | null;
      candlingLoss: number;
      lateDead: number;
      unhatched: number;
      fertileEggs: number;
      totalHatchedA: number;
      totalHatchedB: number;
      totalCull: number;
      totalHatched: number;
      chickSalesCount: number;
      chickSalesRevenue: number;
      currentChickStock: number;
      hatchability: number;
      hatchOfTotal: number;
    };

    const rows: IncubationAnalyticsRow[] = pagedIncubations.map((incubation) => ({
      id: incubation.id,
      code: incubation.code,
      name: incubation.name,
      stage: incubation.stage,
      startDate: incubation.startDate.toISOString(),
      eggsSetCount: incubation.eggsSetCount,
      parentBatch: incubation.parentBatch,
      candlingLoss: 0,
      lateDead: 0,
      unhatched: 0,
      fertileEggs: 0,
      totalHatchedA: 0,
      totalHatchedB: 0,
      totalCull: 0,
      totalHatched: 0,
      chickSalesCount: 0,
      chickSalesRevenue: 0,
      currentChickStock: 0,
      hatchability: 0,
      hatchOfTotal: 0,
    }));

    const rowMap = new Map<string, IncubationAnalyticsRow>(rows.map((row) => [row.id, row]));
    type IncubationNumericKey = Exclude<keyof IncubationAnalyticsRow,
      "id" | "code" | "name" | "stage" | "startDate" | "eggsSetCount" | "parentBatch">;

    const safeAdd = (id: string, key: IncubationNumericKey, value: number) => {
      const row = rowMap.get(id);
      if (row) {
        row[key] += value;
      }
    };

    for (const row of lossRows) {
      if (row.type === "INFERTILE" || row.type === "EARLY_DEAD") {
        safeAdd(row.incubationBatchId, "candlingLoss", row.count);
      }
      if (row.type === "LATE_DEAD") safeAdd(row.incubationBatchId, "lateDead", row.count);
      if (row.type === "UNHATCHED") safeAdd(row.incubationBatchId, "unhatched", row.count);
    }
    for (const row of hatchRows) {
      safeAdd(row.incubationBatchId, "totalHatchedA", row.hatchedA);
      safeAdd(row.incubationBatchId, "totalHatchedB", row.hatchedB);
      safeAdd(row.incubationBatchId, "totalCull", row.cull);
    }
    for (const row of chickSalesRows) {
      safeAdd(row.incubationBatchId, "chickSalesCount", row.count);
      safeAdd(row.incubationBatchId, "chickSalesRevenue", money(row.amount));
    }
    for (const row of chickStockRows) {
      safeAdd(row.incubationBatchId, "currentChickStock", row.currentStock);
    }

    const summary = allIncubations.reduce(
      (acc, incubation) => {
        const incubationLosses = lossRows.filter((row) => row.incubationBatchId === incubation.id);
        const incubationHatches = hatchRows.filter((row) => row.incubationBatchId === incubation.id);
        const incubationSales = chickSalesRows.filter((row) => row.incubationBatchId === incubation.id);
        const incubationStocks = chickStockRows.filter((row) => row.incubationBatchId === incubation.id);

        const candlingLoss = incubationLosses
          .filter((row) => row.type === "INFERTILE" || row.type === "EARLY_DEAD")
          .reduce((sum, row) => sum + row.count, 0);
        const lateDead = incubationLosses
          .filter((row) => row.type === "LATE_DEAD")
          .reduce((sum, row) => sum + row.count, 0);
        const unhatched = incubationLosses
          .filter((row) => row.type === "UNHATCHED")
          .reduce((sum, row) => sum + row.count, 0);
        const eggsSet = incubation.eggsSetCount;
        const fertileEggs = eggsSet - candlingLoss;
        const totalHatchedA = incubationHatches.reduce((sum, row) => sum + Number(row.hatchedA ?? 0), 0);
        const totalHatchedB = incubationHatches.reduce((sum, row) => sum + Number(row.hatchedB ?? 0), 0);
        const totalCull = incubationHatches.reduce((sum, row) => sum + Number(row.cull ?? 0), 0);
        const totalHatched = totalHatchedA + totalHatchedB + totalCull;
        const chickSalesCount = incubationSales.reduce((sum, row) => sum + row.count, 0);
        const chickSalesRevenue = incubationSales.reduce((sum, row) => sum + money(row.amount), 0);
        const currentChickStock = incubationStocks.reduce((sum, row) => sum + row.currentStock, 0);
        const hatchability = fertileEggs > 0 ? (totalHatched / fertileEggs) * 100 : 0;
        const hatchOfTotal = eggsSet > 0 ? (totalHatched / eggsSet) * 100 : 0;

        acc.totalIncubations += 1;
        acc.setter += incubation.stage === "SETTER" ? 1 : 0;
        acc.candling += incubation.stage === "CANDLING" ? 1 : 0;
        acc.hatcher += incubation.stage === "HATCHER" ? 1 : 0;
        acc.completed += incubation.stage === "COMPLETED" ? 1 : 0;
        acc.totalEggsSet += eggsSet;
        acc.totalCandlingLoss += candlingLoss;
        acc.totalLateDead += lateDead;
        acc.totalUnhatched += unhatched;
        acc.totalFertileEggs += fertileEggs;
        acc.totalHatchedA += totalHatchedA;
        acc.totalHatchedB += totalHatchedB;
        acc.totalCull += totalCull;
        acc.totalHatched += totalHatched;
        acc.totalChickSalesCount += chickSalesCount;
        acc.totalChickSalesRevenue += chickSalesRevenue;
        acc.totalCurrentChickStock += currentChickStock;
        acc.totalHatchability += hatchability;
        acc.totalHatchOfTotal += hatchOfTotal;
        return acc;
      },
      {
        totalIncubations: 0,
        setter: 0,
        candling: 0,
        hatcher: 0,
        completed: 0,
        totalEggsSet: 0,
        totalCandlingLoss: 0,
        totalLateDead: 0,
        totalUnhatched: 0,
        totalFertileEggs: 0,
        totalHatchedA: 0,
        totalHatchedB: 0,
        totalCull: 0,
        totalHatched: 0,
        totalChickSalesCount: 0,
        totalChickSalesRevenue: 0,
        totalCurrentChickStock: 0,
        totalHatchability: 0,
        totalHatchOfTotal: 0,
      }
    );

    rows.forEach((row) => {
      const eggsSet = row.eggsSetCount;
      const fertileEggs = eggsSet - row.candlingLoss;
      row.fertileEggs = fertileEggs;
      row.totalHatched = row.totalHatchedA + row.totalHatchedB + row.totalCull;
      row.hatchability = fertileEggs > 0 ? (row.totalHatched / fertileEggs) * 100 : 0;
      row.hatchOfTotal = eggsSet > 0 ? (row.totalHatched / eggsSet) * 100 : 0;
    });

    return res.json({
      success: true,
      data: {
        applied: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          search: searchTerm || null,
          parentBatchId: parentBatchId || null,
          stage: normalizedStage ?? null,
        },
        summary: {
          totalIncubations: summary.totalIncubations,
          setter: summary.setter,
          candling: summary.candling,
          hatcher: summary.hatcher,
          completed: summary.completed,
          totalEggsSet: summary.totalEggsSet,
          totalCandlingLoss: summary.totalCandlingLoss,
          totalLateDead: summary.totalLateDead,
          totalUnhatched: summary.totalUnhatched,
          totalFertileEggs: summary.totalFertileEggs,
          totalHatched: summary.totalHatched,
          totalHatchedA: summary.totalHatchedA,
          totalHatchedB: summary.totalHatchedB,
          totalCull: summary.totalCull,
          totalChickSalesCount: summary.totalChickSalesCount,
          totalChickSalesRevenue: summary.totalChickSalesRevenue,
          totalCurrentChickStock: summary.totalCurrentChickStock,
          averageHatchability:
            summary.totalIncubations > 0 ? summary.totalHatchability / summary.totalIncubations : 0,
          averageHatchOfTotal:
            summary.totalIncubations > 0 ? summary.totalHatchOfTotal / summary.totalIncubations : 0,
        },
        incubations: rows,
        page: pageNum,
        limit: pageLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageLimit)),
      },
    });
  } catch (err: any) {
    console.error("Get hatchery analytics incubations error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch hatchery analytics incubations",
    });
  }
}

export async function getHatcheryAnalyticsProduction(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const {
      startDate,
      endDate,
      period = "30",
      search,
      batchType,
      page = "1",
      limit = "10",
    } = req.query as Record<string, string>;

    const { start, end } = buildRange(startDate, endDate, period);
    const searchTerm = search?.trim() || "";
    const normalizedBatchType =
      batchType === "PARENT_FLOCK" || batchType === "INCUBATION"
        ? (batchType as HatcheryBatchType)
        : undefined;

    const batchWhere: Prisma.HatcheryBatchWhereInput = {
      hatcheryOwnerId: ownerId,
      type: normalizedBatchType ?? HatcheryBatchType.PARENT_FLOCK,
    };

    const productionWhere: Prisma.HatcheryEggProductionWhereInput = {
      batch: { is: batchWhere },
      date: { gte: start, lte: end },
      ...(searchTerm
        ? {
            OR: [
              { note: { contains: searchTerm, mode: "insensitive" } },
              {
                batch: {
                  is: {
                    OR: [
                      { code: { contains: searchTerm, mode: "insensitive" } },
                      { name: { contains: searchTerm, mode: "insensitive" } },
                    ],
                  },
                },
              },
              {
                lines: {
                  some: {
                    eggType: {
                      is: {
                        name: { contains: searchTerm, mode: "insensitive" },
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * pageLimit;

    const selectShape = {
      id: true,
      batchId: true,
      date: true,
      note: true,
      batch: {
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
        },
      },
      lines: {
        select: {
          id: true,
          eggTypeId: true,
          count: true,
          eggType: {
            select: {
              id: true,
              name: true,
              isHatchable: true,
            },
          },
        },
      },
    } satisfies Prisma.HatcheryEggProductionSelect;

    const [allProductions, pagedProductions, total] = await Promise.all([
      prisma.hatcheryEggProduction.findMany({
        where: productionWhere,
        select: selectShape,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      }),
      prisma.hatcheryEggProduction.findMany({
        where: productionWhere,
        select: selectShape,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageLimit,
      }),
      prisma.hatcheryEggProduction.count({ where: productionWhere }),
    ]);

    const typeMap = new Map<
      string,
      { eggTypeId: string; name: string; isHatchable: boolean; total: number }
    >();
    const batchMap = new Map<
      string,
      { id: string; code: string; name: string | null; total: number; records: number }
    >();
    const trendMap = new Map<
      string,
      { date: string; label: string; total: number; hatchable: number; nonHatchable: number }
    >();
    const rows = pagedProductions.map((production) => ({
      id: production.id,
      batchId: production.batchId,
      date: production.date.toISOString(),
      note: production.note,
      batch: production.batch,
      total: production.lines.reduce((sum, line) => sum + Number(line.count ?? 0), 0),
      hatchableTotal: production.lines
        .filter((line) => line.eggType.isHatchable)
        .reduce((sum, line) => sum + Number(line.count ?? 0), 0),
      nonHatchableTotal: production.lines
        .filter((line) => !line.eggType.isHatchable)
        .reduce((sum, line) => sum + Number(line.count ?? 0), 0),
      lines: production.lines.map((line) => ({
        id: line.id,
        eggTypeId: line.eggTypeId,
        count: line.count,
        eggType: {
          id: line.eggType.id,
          name: line.eggType.name,
          isHatchable: line.eggType.isHatchable,
        },
      })),
    }));

    const toDateLabel = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return {
        date: `${y}-${m}-${d}`,
        label: `${m}-${d}`,
      };
    };

    let totalEggs = 0;
    let hatchableEggs = 0;
    let nonHatchableEggs = 0;
    let totalRecords = 0;

    for (const production of allProductions) {
      const productionTotal = production.lines.reduce((sum, line) => sum + Number(line.count ?? 0), 0);
      const productionHatchable = production.lines
        .filter((line) => line.eggType.isHatchable)
        .reduce((sum, line) => sum + Number(line.count ?? 0), 0);
      const productionNonHatchable = productionTotal - productionHatchable;
      const { date: trendDate, label } = toDateLabel(new Date(production.date));

      totalRecords += 1;
      totalEggs += productionTotal;
      hatchableEggs += productionHatchable;
      nonHatchableEggs += productionNonHatchable;

      const batch = production.batch;
      const batchBucket = batchMap.get(batch.id) ?? {
        id: batch.id,
        code: batch.code,
        name: batch.name,
        total: 0,
        records: 0,
      };
      batchBucket.total += productionTotal;
      batchBucket.records += 1;
      batchMap.set(batch.id, batchBucket);

      const trendBucket = trendMap.get(trendDate) ?? {
        date: trendDate,
        label,
        total: 0,
        hatchable: 0,
        nonHatchable: 0,
      };
      trendBucket.total += productionTotal;
      trendBucket.hatchable += productionHatchable;
      trendBucket.nonHatchable += productionNonHatchable;
      trendMap.set(trendDate, trendBucket);

      for (const line of production.lines) {
        const typeBucket = typeMap.get(line.eggTypeId) ?? {
          eggTypeId: line.eggTypeId,
          name: line.eggType.name,
          isHatchable: line.eggType.isHatchable,
          total: 0,
        };
        typeBucket.total += Number(line.count ?? 0);
        typeMap.set(line.eggTypeId, typeBucket);
      }
    }

    const typeTotals = Array.from(typeMap.values()).sort((a, b) => b.total - a.total);
    const topBatches = Array.from(batchMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
    const daily = Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    const averagePerRecord = totalRecords > 0 ? totalEggs / totalRecords : 0;
    const hatchableShare = totalEggs > 0 ? (hatchableEggs / totalEggs) * 100 : 0;

    return res.json({
      success: true,
      data: {
        applied: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          search: searchTerm || null,
          batchType: normalizedBatchType ?? null,
        },
        summary: {
          totalRecords,
          totalEggs,
          hatchableEggs,
          nonHatchableEggs,
          averagePerRecord,
          hatchableShare,
          uniqueBatches: batchMap.size,
        },
        trends: {
          daily,
        },
        typeTotals,
        topBatches,
        productions: rows,
        page: pageNum,
        limit: pageLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageLimit)),
      },
    });
  } catch (err: any) {
    console.error("Get hatchery analytics production error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch hatchery analytics production",
    });
  }
}

export async function getHatcheryAnalyticsSales(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const {
      startDate,
      endDate,
      period = "30",
      batchType,
      search,
      saleType,
      page = "1",
      limit = "10",
    } = req.query as Record<string, string>;

    const { start, end } = buildRange(startDate, endDate, period);
    const searchTerm = search?.trim() || "";
    const normalizedBatchType =
      batchType === "PARENT_FLOCK" || batchType === "INCUBATION"
        ? (batchType as HatcheryBatchType)
        : undefined;
    const normalizedSaleType =
      saleType === "EGG" || saleType === "PARENT" || saleType === "CHICK"
        ? (saleType as "EGG" | "PARENT" | "CHICK")
        : "ALL";

    const batchWhere: Prisma.HatcheryBatchWhereInput = {
      hatcheryOwnerId: ownerId,
      ...(normalizedBatchType ? { type: normalizedBatchType } : {}),
      ...(searchTerm
        ? {
            OR: [
              { code: { contains: searchTerm, mode: "insensitive" } },
              { name: { contains: searchTerm, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [matchedBatches, ownerParties] = await Promise.all([
      prisma.hatcheryBatch.findMany({
        where: batchWhere,
        select: { id: true, code: true, name: true, type: true },
        orderBy: { startDate: "desc" },
      }),
      prisma.hatcheryParty.findMany({
        where: { hatcheryOwnerId: ownerId },
        select: { id: true, name: true, phone: true, balance: true },
        orderBy: { balance: "desc" },
      }),
    ]);

    const batchIds = matchedBatches.map((batch) => batch.id);

    const incubationWhere: Prisma.HatcheryIncubationBatchWhereInput = {
      hatcheryOwnerId: ownerId,
      ...(searchTerm
        ? {
            OR: [
              { code: { contains: searchTerm, mode: "insensitive" } },
              { name: { contains: searchTerm, mode: "insensitive" } },
              {
                parentBatch: {
                  is: {
                    OR: [
                      { code: { contains: searchTerm, mode: "insensitive" } },
                      { name: { contains: searchTerm, mode: "insensitive" } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
      ...(normalizedBatchType === "PARENT_FLOCK" && batchIds.length > 0
        ? { parentBatchId: { in: batchIds } }
        : {}),
    };

    const matchedIncubations = await prisma.hatcheryIncubationBatch.findMany({
      where: incubationWhere,
      select: {
        id: true,
        code: true,
        name: true,
        parentBatchId: true,
        parentBatch: { select: { id: true, code: true, name: true, type: true } },
      },
      orderBy: { startDate: "desc" },
    });

    const incubationIds = matchedIncubations.map((batch) => batch.id);

    const [eggSales, parentSales, chickSales] = await Promise.all([
      normalizedSaleType === "CHICK"
        ? Promise.resolve([])
        : prisma.hatcheryEggSale.findMany({
            where: {
              batchId: { in: batchIds },
              date: { gte: start, lte: end },
            },
            select: {
              id: true,
              batchId: true,
              date: true,
              count: true,
              unitPrice: true,
              amount: true,
              partyId: true,
              note: true,
              batch: { select: { id: true, code: true, name: true, type: true } },
              eggType: { select: { id: true, name: true, isHatchable: true } },
              party: { select: { id: true, name: true, phone: true } },
            },
          }),
      normalizedSaleType === "CHICK"
        ? Promise.resolve([])
        : prisma.hatcheryParentSale.findMany({
            where: {
              batchId: { in: batchIds },
              date: { gte: start, lte: end },
            },
            select: {
              id: true,
              batchId: true,
              date: true,
              count: true,
              totalWeightKg: true,
              avgWeightKg: true,
              ratePerKg: true,
              amount: true,
              partyId: true,
              note: true,
              batch: { select: { id: true, code: true, name: true, type: true } },
              party: { select: { id: true, name: true, phone: true } },
            },
          }),
      normalizedSaleType === "EGG" || normalizedSaleType === "PARENT"
        ? Promise.resolve([])
        : prisma.hatcheryChickSale.findMany({
            where: {
              incubationBatchId: { in: incubationIds },
              date: { gte: start, lte: end },
            },
            select: {
              id: true,
              incubationBatchId: true,
              date: true,
              grade: true,
              count: true,
              unitPrice: true,
              amount: true,
              partyId: true,
              note: true,
              incubationBatch: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  parentBatchId: true,
                  parentBatch: { select: { id: true, code: true, name: true, type: true } },
                },
              },
              party: { select: { id: true, name: true, phone: true } },
            },
          }),
    ]);

    const rows: HatcherySalesAnalyticsRow[] = [];

    for (const sale of eggSales) {
      rows.push({
        id: sale.id,
        saleType: "EGG",
        date: sale.date.toISOString(),
        batchCode: sale.batch.code,
        batchName: sale.batch.name,
        sourceCode: sale.eggType.name,
        sourceName: sale.eggType.isHatchable ? "Hatchable" : "Egg type",
        partyName: sale.party?.name ?? null,
        partyPhone: sale.party?.phone ?? null,
        itemLabel: sale.eggType.name,
        count: sale.count,
        amount: money(sale.amount),
        note: sale.note ?? null,
        grade: null,
        saleable: sale.eggType.isHatchable,
      });
    }
    for (const sale of parentSales) {
      rows.push({
        id: sale.id,
        saleType: "PARENT",
        date: sale.date.toISOString(),
        batchCode: sale.batch.code,
        batchName: sale.batch.name,
        sourceCode: sale.batch.code,
        sourceName: sale.batch.name,
        partyName: sale.party?.name ?? null,
        partyPhone: sale.party?.phone ?? null,
        itemLabel: `${sale.count} birds`,
        count: sale.count,
        amount: money(sale.amount),
        note: sale.note ?? null,
        grade: null,
        saleable: true,
      });
    }
    for (const sale of chickSales) {
      rows.push({
        id: sale.id,
        saleType: "CHICK",
        date: sale.date.toISOString(),
        batchCode: sale.incubationBatch.parentBatch?.code ?? sale.incubationBatch.code,
        batchName: sale.incubationBatch.parentBatch?.name ?? sale.incubationBatch.name,
        sourceCode: sale.incubationBatch.code,
        sourceName: sale.incubationBatch.name,
        partyName: sale.party?.name ?? null,
        partyPhone: sale.party?.phone ?? null,
        itemLabel: `Grade ${sale.grade}`,
        count: sale.count,
        amount: money(sale.amount),
        note: sale.note ?? null,
        grade: sale.grade,
        saleable: sale.grade === "A" || sale.grade === "B",
      });
    }

    const searchMatch = (row: HatcherySalesAnalyticsRow) => {
      if (!searchTerm) return true;
      const haystack = [
        row.batchCode,
        row.batchName ?? "",
        row.sourceCode ?? "",
        row.sourceName ?? "",
        row.partyName ?? "",
        row.partyPhone ?? "",
        row.itemLabel,
        row.grade ?? "",
        row.note ?? "",
        row.saleType,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchTerm.toLowerCase());
    };

    const filteredRows = rows
      .filter(searchMatch)
      .sort((a, b) => b.date.localeCompare(a.date));

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, parseInt(limit, 10) || 10);
    const total = filteredRows.length;
    const pagedRows = filteredRows.slice((pageNum - 1) * pageLimit, pageNum * pageLimit);

    const summary = filteredRows.reduce(
      (acc, row) => {
        acc.totalSales += 1;
        acc.totalRevenue += row.amount;
        if (row.saleType === "EGG") {
          acc.eggRevenue += row.amount;
          acc.eggSales += 1;
          acc.eggCount += row.count;
        } else if (row.saleType === "PARENT") {
          acc.parentRevenue += row.amount;
          acc.parentSales += 1;
          acc.parentCount += row.count;
        } else {
          acc.chickRevenue += row.amount;
          acc.chickSales += 1;
          acc.chickCount += row.count;
        }

        const batchKey = `${row.batchCode}:${row.saleType}`;
        acc.batchMap.set(batchKey, {
          code: row.batchCode,
          name: row.batchName,
          total: (acc.batchMap.get(batchKey)?.total ?? 0) + row.amount,
          records: (acc.batchMap.get(batchKey)?.records ?? 0) + 1,
        });

        if (row.partyName) {
          const partyKey = `${row.partyName}:${row.partyPhone ?? ""}`;
          acc.partyMap.set(partyKey, {
            name: row.partyName,
            phone: row.partyPhone,
            total: (acc.partyMap.get(partyKey)?.total ?? 0) + row.amount,
            records: (acc.partyMap.get(partyKey)?.records ?? 0) + 1,
          });
        }

        const trendBucket = acc.trendMap.get(row.date.slice(0, 10)) ?? {
          date: row.date.slice(0, 10),
          label: row.date.slice(5, 10),
          revenue: 0,
          sales: 0,
        };
        trendBucket.revenue += row.amount;
        trendBucket.sales += 1;
        acc.trendMap.set(row.date.slice(0, 10), trendBucket);
        return acc;
      },
      {
        totalSales: 0,
        totalRevenue: 0,
        eggRevenue: 0,
        parentRevenue: 0,
        chickRevenue: 0,
        eggSales: 0,
        parentSales: 0,
        chickSales: 0,
        eggCount: 0,
        parentCount: 0,
        chickCount: 0,
        batchMap: new Map<string, { code: string; name: string | null; total: number; records: number }>(),
        partyMap: new Map<string, { name: string; phone: string | null; total: number; records: number }>(),
        trendMap: new Map<string, { date: string; label: string; revenue: number; sales: number }>(),
      }
    );

    const daily = Array.from(summary.trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    const topBatches = Array.from(summary.batchMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
    const topParties = Array.from(summary.partyMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
    const averageSaleValue = summary.totalSales > 0 ? summary.totalRevenue / summary.totalSales : 0;

    return res.json({
      success: true,
      data: {
        applied: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          search: searchTerm || null,
          batchType: normalizedBatchType ?? null,
          saleType: normalizedSaleType,
        },
        summary: {
          totalSales: summary.totalSales,
          totalRevenue: summary.totalRevenue,
          averageSaleValue,
          eggRevenue: summary.eggRevenue,
          parentRevenue: summary.parentRevenue,
          chickRevenue: summary.chickRevenue,
          eggSales: summary.eggSales,
          parentSales: summary.parentSales,
          chickSales: summary.chickSales,
          eggCount: summary.eggCount,
          parentCount: summary.parentCount,
          chickCount: summary.chickCount,
          uniqueBatches: topBatches.length ? new Set(filteredRows.map((row) => row.batchCode)).size : 0,
          uniqueParties: topParties.length ? new Set(filteredRows.map((row) => row.partyName).filter(Boolean)).size : 0,
        },
        trends: {
          daily,
        },
        topBatches,
        topParties,
        sales: pagedRows,
        page: pageNum,
        limit: pageLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageLimit)),
      },
    });
  } catch (err: any) {
    console.error("Get hatchery analytics sales error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch hatchery analytics sales",
    });
  }
}
