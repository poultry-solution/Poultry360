import { Request, Response } from "express";
import {
  Prisma,
  HatcheryBatchStatus,
  HatcheryBatchType,
  HatcheryBatchExpenseType,
  HatcheryIncubationLossType,
  HatcheryFeedTarget,
} from "@prisma/client";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";
import { HatcheryBatchService } from "../services/hatcheryBatchService";
import { HatcheryBatchExpenseService } from "../services/hatcheryBatchExpenseService";
import { HatcheryEggService } from "../services/hatcheryEggService";
import { HatcheryLayRateService } from "../services/hatcheryLayRateService";

// Categories whose consumption can be attributed to a parent group. Feed is
// bought as one total stock; the split only ever happens at consumption.
const FEED_EXPENSE_CATEGORIES = new Set(["FEED", "SELF_MADE"]);

// Decimal(12,4) tolerance when checking that a split adds up.
const FEED_SPLIT_EPSILON = 0.0001;

/**
 * Validate and normalise the feed attribution fields for one expense.
 * Throws with a user-facing message; returns nulls for non-feed expenses so the
 * initial CHICKS placement expense can never carry a feedTarget.
 */
function resolveFeedAttribution(input: {
  category: string;
  quantity?: number;
  feedTarget?: unknown;
  maleFeedQuantity?: unknown;
  femaleFeedQuantity?: unknown;
}): {
  feedTarget: HatcheryFeedTarget | null;
  maleFeedQuantity: number | null;
  femaleFeedQuantity: number | null;
} {
  const isFeed = FEED_EXPENSE_CATEGORIES.has(String(input.category).toUpperCase());
  const hasMale = input.maleFeedQuantity !== undefined && input.maleFeedQuantity !== null;
  const hasFemale = input.femaleFeedQuantity !== undefined && input.femaleFeedQuantity !== null;
  const hasTarget = input.feedTarget !== undefined && input.feedTarget !== null;

  if (!isFeed) {
    if (hasTarget) throw new Error("feedTarget only applies to feed expenses");
    if (hasMale || hasFemale) {
      throw new Error("Feed quantity split only applies to feed expenses");
    }
    return { feedTarget: null, maleFeedQuantity: null, femaleFeedQuantity: null };
  }

  const target = input.feedTarget as HatcheryFeedTarget;
  if (
    target !== HatcheryFeedTarget.MALE &&
    target !== HatcheryFeedTarget.FEMALE &&
    target !== HatcheryFeedTarget.BOTH
  ) {
    throw new Error("feedTarget must be MALE, FEMALE or BOTH for feed expenses");
  }

  // MALE/FEMALE already attribute the whole quantity; a split would be ambiguous.
  if (target !== HatcheryFeedTarget.BOTH) {
    if (hasMale || hasFemale) {
      throw new Error("Feed quantity split is only valid when feedTarget is BOTH");
    }
    return { feedTarget: target, maleFeedQuantity: null, femaleFeedQuantity: null };
  }

  // Split is optional under BOTH — many hatcheries feed both groups together.
  if (!hasMale && !hasFemale) {
    return { feedTarget: target, maleFeedQuantity: null, femaleFeedQuantity: null };
  }
  if (!hasMale || !hasFemale) {
    throw new Error(
      "Provide both maleFeedQuantity and femaleFeedQuantity, or neither"
    );
  }

  const male = Number(input.maleFeedQuantity);
  const female = Number(input.femaleFeedQuantity);
  if (!Number.isFinite(male) || male < 0 || !Number.isFinite(female) || female < 0) {
    throw new Error("Feed split quantities must be non-negative numbers");
  }
  if (input.quantity === undefined || !Number.isFinite(input.quantity)) {
    throw new Error("A total feed quantity is required to split it by sex");
  }
  if (Math.abs(male + female - input.quantity) > FEED_SPLIT_EPSILON) {
    throw new Error(
      `Feed split must add up to the total quantity (${male} + ${female} != ${input.quantity})`
    );
  }

  return { feedTarget: target, maleFeedQuantity: male, femaleFeedQuantity: female };
}

function getOwnerId(req: Request): string {
  // Keep consistent with existing controllers + middleware contract.
  // `authMiddleware` sets `req.userId`.
  return (req as any).userId as string;
}

function isInitialPlacementExpense(expense: {
  type: HatcheryBatchExpenseType;
  category: string;
  inventoryTxnId: string | null;
  note: string | null;
}) {
  return (
    expense.type === HatcheryBatchExpenseType.INVENTORY &&
    expense.category === "CHICKS" &&
    !!expense.inventoryTxnId &&
    expense.note === "Initial flock placement"
  );
}

// ─── Batch CRUD ─────────────────────────────────────────────────────────────

export async function listHatcheryBatches(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { type, status, search, page = "1", limit = "20" } = req.query as Record<string, string>;

    const where: any = { hatcheryOwnerId: ownerId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [batches, total] = await Promise.all([
      prisma.hatcheryBatch.findMany({
        where,
        orderBy: { startDate: "desc" },
        skip,
        take: parseInt(limit),
        include: {
          _count: { select: { expenses: true, mortalities: true, eggProductions: true } },
        },
      }),
      prisma.hatcheryBatch.count({ where }),
    ]);

    return res.json({ batches, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createHatcheryBatch(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { type = "PARENT_FLOCK", startDate, notes, placements } = req.body;

    if (!startDate) {
      return res.status(400).json({ error: "startDate is required" });
    }

    if (type === HatcheryBatchType.PARENT_FLOCK) {
      if (!placements || !Array.isArray(placements) || placements.length === 0) {
        return res.status(400).json({ error: "placements are required for parent flock batch" });
      }

      const batch = await HatcheryBatchService.createParentFlockBatch({
        hatcheryOwnerId: ownerId,
        startDate: new Date(startDate),
        notes,
        placements,
      });

      return res.status(201).json(batch);
    }

    // Incubation batch creation (skeleton for later)
    return res.status(400).json({ error: "Incubation batch creation is not yet implemented" });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function getHatcheryBatch(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id } = req.params;

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id, hatcheryOwnerId: ownerId },
      include: {
        placements: {
          include: { inventoryItem: { select: { id: true, name: true, unit: true, unitPrice: true } } },
        },
        _count: {
          select: {
            mortalities: true,
            expenses: true,
            eggProductions: true,
            eggSales: true,
            parentSales: true,
          },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ error: "Batch not found" });
    }

    // Compute quick summary stats + business snapshot metrics
    const [
      totalMortality,
      totalExpenses,
      eggStockRows,
      parentSalesCount,
      eggSalesAgg,
      parentSalesAgg,
      incubationAgg,
      candlingLossAgg,
      hatchResultAgg,
      chickSalesAgg,
    ] =
      await Promise.all([
        prisma.hatcheryBatchMortality.aggregate({
          where: { batchId: id },
          _sum: { count: true },
        }),
        prisma.hatcheryBatchExpense.aggregate({
          where: { batchId: id },
          _sum: { amount: true },
        }),
        prisma.hatcheryEggStock.findMany({
          where: { batchId: id },
          include: { eggType: { select: { id: true, name: true, isHatchable: true } } },
        }),
        prisma.hatcheryParentSale.aggregate({
          where: { batchId: id },
          _sum: { count: true },
        }),
        prisma.hatcheryEggSale.aggregate({
          where: { batchId: id },
          _sum: { count: true, amount: true },
        }),
        prisma.hatcheryParentSale.aggregate({
          where: { batchId: id },
          _sum: { count: true, amount: true },
        }),
        prisma.hatcheryIncubationBatch.aggregate({
          where: { parentBatchId: id, hatcheryOwnerId: ownerId },
          _count: { id: true },
          _sum: { eggsSetCount: true },
        }),
        prisma.hatcheryIncubationLoss.aggregate({
          where: {
            incubationBatch: { parentBatchId: id, hatcheryOwnerId: ownerId },
            type: {
              in: [
                HatcheryIncubationLossType.INFERTILE,
                HatcheryIncubationLossType.EARLY_DEAD,
              ],
            },
          },
          _sum: { count: true },
        }),
        prisma.hatcheryHatchResult.aggregate({
          where: { incubationBatch: { parentBatchId: id, hatcheryOwnerId: ownerId } },
          _sum: { hatchedA: true, hatchedB: true, cull: true },
        }),
        prisma.hatcheryChickSale.aggregate({
          where: { incubationBatch: { parentBatchId: id, hatcheryOwnerId: ownerId } },
          _sum: { count: true, amount: true },
        }),
      ]);

    const round2 = (n: number) => Math.round(n * 100) / 100;

    const totalExpensesAmount = Number(totalExpenses._sum.amount ?? 0);
    const eggSalesRevenue = Number(eggSalesAgg._sum.amount ?? 0);
    const parentSalesRevenue = Number(parentSalesAgg._sum.amount ?? 0);
    const chickSalesRevenue = Number(chickSalesAgg._sum.amount ?? 0);
    const totalRevenue = eggSalesRevenue + parentSalesRevenue + chickSalesRevenue;
    const profitOrLoss = totalRevenue - totalExpensesAmount;

    const producedA = hatchResultAgg._sum.hatchedA ?? 0;
    const producedB = hatchResultAgg._sum.hatchedB ?? 0;
    const producedCull = hatchResultAgg._sum.cull ?? 0;
    const producedTotal = producedA + producedB + producedCull;
    const soldTotal = chickSalesAgg._sum.count ?? 0;
    const unsoldTotal = producedTotal - soldTotal;

    const incubationCount = incubationAgg._count.id ?? 0;
    const eggsSetTotal = incubationAgg._sum.eggsSetCount ?? 0;
    const candlingLossTotal = candlingLossAgg._sum.count ?? 0;
    const fertileEggsTotal = eggsSetTotal - candlingLossTotal;
    const weightedHatchabilityPct =
      fertileEggsTotal > 0 ? round2((producedTotal / fertileEggsTotal) * 100) : 0;
    const weightedHatchOfTotalPct =
      eggsSetTotal > 0 ? round2((producedTotal / eggsSetTotal) * 100) : 0;
    const totalRelevantCost = totalExpensesAmount;
    const saleableTotal = producedA + producedB;
    const costPerProducedChick =
      producedTotal > 0 ? round2(totalRelevantCost / producedTotal) : null;
    const costPerSaleableChick =
      saleableTotal > 0 ? round2(totalRelevantCost / saleableTotal) : null;
    const costEngineWarnings: string[] = [];
    if (producedTotal <= 0) {
      costEngineWarnings.push(
        "Cost per produced chick is unavailable until at least one chick is produced."
      );
    }
    if (saleableTotal <= 0) {
      costEngineWarnings.push(
        "Cost per saleable chick is unavailable until at least one saleable chick (A or B) is produced."
      );
    }
    const costEngineStatus =
      producedTotal > 0 && saleableTotal > 0 ? "READY" : "INSUFFICIENT_DATA";

    return res.json({
      ...batch,
      summary: {
        totalMortality: totalMortality._sum.count ?? 0,
        totalExpenses: totalExpensesAmount,
        eggStock: eggStockRows,
        parentSalesCount: parentSalesCount._sum.count ?? 0,
        businessSnapshot: {
          financial: {
            totalExpenses: round2(totalExpensesAmount),
            eggSalesRevenue: round2(eggSalesRevenue),
            parentSalesRevenue: round2(parentSalesRevenue),
            chickSalesRevenue: round2(chickSalesRevenue),
            totalRevenue: round2(totalRevenue),
            profitOrLoss: round2(profitOrLoss),
          },
          production: {
            producedA,
            producedB,
            producedCull,
            producedTotal,
            soldTotal,
            unsoldTotal,
          },
          incubation: {
            incubationCount,
            eggsSetTotal,
            candlingLossTotal,
            fertileEggsTotal,
            weightedHatchabilityPct,
            weightedHatchOfTotalPct,
          },
        },
        costEngine: {
          totalRelevantCost: round2(totalRelevantCost),
          producedTotal,
          saleableTotal,
          costPerProducedChick,
          costPerSaleableChick,
          saleableDefinition: "A_PLUS_B",
          status: costEngineStatus,
          warnings: costEngineWarnings,
        },
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateHatcheryBatch(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id } = req.params;
    const { name, notes } = req.body;

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const updated = await prisma.hatcheryBatch.update({
      where: { id },
      data: { name, notes },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function closeHatcheryBatch(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id } = req.params;

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const updated = await prisma.hatcheryBatch.update({
      where: { id },
      data: { status: HatcheryBatchStatus.CLOSED, endDate: new Date() },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function reopenHatcheryBatch(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id } = req.params;

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const updated = await prisma.hatcheryBatch.update({
      where: { id },
      data: { status: HatcheryBatchStatus.ACTIVE, endDate: null },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteHatcheryBatch(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId } = req.params;
    const { password } = req.body ?? {};

    if (!password) {
      return res.status(400).json({ error: "Password confirmation is required" });
    }

    const user = await prisma.user.findUnique({ where: { id: ownerId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid password. Deletion cancelled." });
    }

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
      include: {
        placements: true,
        expenses: true,
      },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const [mortalityCount, eggProductionCount, eggSaleCount, parentSaleCount, incubationCount] =
      await Promise.all([
        prisma.hatcheryBatchMortality.count({ where: { batchId } }),
        prisma.hatcheryEggProduction.count({ where: { batchId } }),
        prisma.hatcheryEggSale.count({ where: { batchId } }),
        prisma.hatcheryParentSale.count({ where: { batchId } }),
        prisma.hatcheryIncubationBatch.count({ where: { parentBatchId: batchId } }),
      ]);

    if (
      mortalityCount > 0 ||
      eggProductionCount > 0 ||
      eggSaleCount > 0 ||
      parentSaleCount > 0 ||
      incubationCount > 0
    ) {
      return res.status(400).json({
        error:
          "Batch cannot be deleted because it already has operational data (mortality, egg production/sales, parent sales, or incubation links).",
      });
    }

    const initialExpenses = batch.expenses.filter(isInitialPlacementExpense);
    const nonInitialExpenses = batch.expenses.filter((e) => !isInitialPlacementExpense(e));
    if (nonInitialExpenses.length > 0) {
      return res.status(400).json({
        error:
          "Batch cannot be deleted because non-initial expenses exist. Delete those records first.",
      });
    }

    // Consistency check: every initial placement must have a matching initial expense row.
    if (batch.placements.length !== initialExpenses.length) {
      return res.status(400).json({
        error: "Cannot delete due to inconsistent initial placement records.",
      });
    }
    const placementKeyQty = new Map<string, number>();
    for (const p of batch.placements) {
      const key = `${p.inventoryItemId}::${p.quantity}`;
      placementKeyQty.set(key, (placementKeyQty.get(key) ?? 0) + 1);
    }
    for (const e of initialExpenses) {
      const qty = Number(e.quantity ?? 0);
      const key = `${e.inventoryItemId}::${qty}`;
      placementKeyQty.set(key, (placementKeyQty.get(key) ?? 0) - 1);
    }
    const isConsistent = [...placementKeyQty.values()].every((v) => v === 0);
    if (!isConsistent) {
      return res.status(400).json({
        error: "Cannot delete due to inconsistent initial placement records.",
      });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Revert initial placement inventory usage.
      for (const expense of initialExpenses) {
        const qty = Number(expense.quantity ?? 0);
        if (!expense.inventoryItemId || !expense.inventoryTxnId || qty <= 0) {
          throw new Error("Cannot delete due to inconsistent initial placement records.");
        }

        await tx.hatcheryInventoryItem.update({
          where: { id: expense.inventoryItemId },
          data: { currentStock: { increment: qty } },
        });

        await tx.hatcheryInventoryTxn.delete({
          where: { id: expense.inventoryTxnId },
        });
      }

      await tx.hatcheryBatch.delete({
        where: { id: batchId },
      });
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── Mortality ───────────────────────────────────────────────────────────────

export async function listHatcheryMortalities(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId } = req.params;
    const { page = "1", limit = "10" } = req.query as Record<string, string>;

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, parseInt(limit, 10) || 10);
    const where = { batchId };

    const [mortalities, totalRows, totalSummary] = await Promise.all([
      prisma.hatcheryBatchMortality.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (pageNum - 1) * pageLimit,
        take: pageLimit,
      }),
      prisma.hatcheryBatchMortality.count({ where }),
      prisma.hatcheryBatchMortality.aggregate({
        where,
        _sum: { count: true },
      }),
    ]);

    return res.json({
      mortalities,
      page: pageNum,
      limit: pageLimit,
      total: totalRows,
      totalPages: Math.max(1, Math.ceil(totalRows / pageLimit)),
      summary: {
        totalMortality: Number(totalSummary._sum.count ?? 0),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function addHatcheryMortality(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId } = req.params;
    const { date, maleCount, femaleCount, note } = req.body;

    const male = Number(maleCount ?? 0);
    const female = Number(femaleCount ?? 0);

    if (!date) return res.status(400).json({ error: "date is required" });
    if (
      !Number.isInteger(male) ||
      male < 0 ||
      !Number.isInteger(female) ||
      female < 0
    ) {
      return res.status(400).json({
        error: "maleCount and femaleCount must be non-negative whole numbers",
      });
    }
    const count = male + female;
    if (count <= 0) {
      return res
        .status(400)
        .json({ error: "Record at least one male or female mortality" });
    }

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    // Friendly up-front message. The authoritative guard is the WHERE clause on
    // the update below, which also closes the race where two concurrent
    // requests both pass this check and together overdraw the flock.
    if ((batch.currentMaleParents ?? 0) < male || (batch.currentFemaleParents ?? 0) < female) {
      return res.status(400).json({
        error:
          `Cannot record ${male} male / ${female} female mortality; ` +
          `only ${batch.currentMaleParents ?? 0} male and ${batch.currentFemaleParents ?? 0} female birds remain`,
      });
    }

    const mortality = await prisma.$transaction(async (tx) => {
      const updated = await tx.hatcheryBatch.updateMany({
        where: {
          id: batchId,
          hatcheryOwnerId: ownerId,
          currentMaleParents: { gte: male },
          currentFemaleParents: { gte: female },
        },
        data: {
          currentMaleParents: { decrement: male },
          currentFemaleParents: { decrement: female },
          currentParents: { decrement: count },
        },
      });
      if (updated.count !== 1) {
        throw new Error("Not enough live birds of that sex remaining");
      }

      return tx.hatcheryBatchMortality.create({
        data: {
          batchId,
          date: new Date(date),
          count,
          maleCount: male,
          femaleCount: female,
          note,
        },
      });
    });

    return res.status(201).json(mortality);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function deleteHatcheryMortality(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId, mortalityId } = req.params;

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const mortality = await prisma.hatcheryBatchMortality.findFirst({
      where: { id: mortalityId, batchId },
    });
    if (!mortality) return res.status(404).json({ error: "Mortality record not found" });

    await prisma.$transaction([
      prisma.hatcheryBatchMortality.delete({ where: { id: mortalityId } }),
      // Symmetric reversal: restore exactly what this record decremented.
      prisma.hatcheryBatch.update({
        where: { id: batchId },
        data: {
          currentParents: { increment: mortality.count },
          currentMaleParents: { increment: mortality.maleCount },
          currentFemaleParents: { increment: mortality.femaleCount },
        },
      }),
    ]);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── Expenses ────────────────────────────────────────────────────────────────

// Sentinel meaning "no category filter", matching the convention used by the
// farmer expense list (expenseController.getBatchExpenses).
const ALL_CATEGORIES = "All";

type FeedBucket = {
  amount: number;
  /**
   * Quantity per unit. Feed rows carry their inventory item's unit, so a batch
   * can legitimately mix "kg" and "bag" — summing those into one number would
   * be meaningless, hence a map rather than a scalar.
   */
  quantities: Record<string, number>;
};

function emptyFeedBucket(): FeedBucket {
  return { amount: 0, quantities: {} };
}

function addToFeedBucket(
  bucket: FeedBucket,
  quantity: number,
  unit: string | null,
  amount: number
) {
  bucket.amount += amount;
  if (quantity > 0) {
    const key = unit ?? "";
    bucket.quantities[key] = (bucket.quantities[key] ?? 0) + quantity;
  }
}

/**
 * Attribute feed consumption to each parent group, in both quantity and money.
 *
 * A BOTH row carries its own male/female split, so attribution must SPLIT rows
 * rather than select them — filtering rows by feedTarget would drop a
 * 800F/200M row from a female view entirely and undercount by 800.
 *
 * Money is exact, not pro-rated guesswork: amount = quantity x unitPrice for a
 * single feed lot, so femaleFeedQuantity x unitPrice is the true female cost.
 */
export function summariseFeedBySex(
  rows: Array<{
    quantity: Prisma.Decimal | null;
    unit: string | null;
    amount: Prisma.Decimal;
    unitPrice: Prisma.Decimal | null;
    feedTarget: HatcheryFeedTarget | null;
    maleFeedQuantity: Prisma.Decimal | null;
    femaleFeedQuantity: Prisma.Decimal | null;
  }>
) {
  if (rows.length === 0) return null;

  const female = emptyFeedBucket();
  const male = emptyFeedBucket();
  const unallocated = emptyFeedBucket();

  for (const row of rows) {
    const quantity = Number(row.quantity ?? 0);
    const amount = Number(row.amount ?? 0);
    const unitPrice = Number(row.unitPrice ?? 0);

    if (row.feedTarget === HatcheryFeedTarget.FEMALE) {
      addToFeedBucket(female, quantity, row.unit, amount);
      continue;
    }
    if (row.feedTarget === HatcheryFeedTarget.MALE) {
      addToFeedBucket(male, quantity, row.unit, amount);
      continue;
    }

    // BOTH: use the optional split when it was recorded. The API rejects a
    // one-sided split, so either both are present or neither is.
    const hasSplit =
      row.maleFeedQuantity !== null && row.femaleFeedQuantity !== null;
    if (!hasSplit) {
      addToFeedBucket(unallocated, quantity, row.unit, amount);
      continue;
    }

    const maleQty = Number(row.maleFeedQuantity ?? 0);
    const femaleQty = Number(row.femaleFeedQuantity ?? 0);
    addToFeedBucket(female, femaleQty, row.unit, round2(femaleQty * unitPrice));
    addToFeedBucket(male, maleQty, row.unit, round2(maleQty * unitPrice));
  }

  return { female, male, unallocated };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export async function listHatcheryExpenses(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId } = req.params;
    const { page = "1", limit = "10", category } = req.query as Record<string, string>;

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, parseInt(limit, 10) || 10);

    // Stored categories are mixed case in practice (inventory writes "FEED",
    // the manual form writes "manual"), so match case-insensitively rather than
    // normalising stored values — isInitialPlacementExpense compares
    // category === "CHICKS" exactly and must keep working.
    const categoryFilter =
      category && category !== ALL_CATEGORIES ? category : null;

    const where: Prisma.HatcheryBatchExpenseWhereInput = { batchId };
    if (categoryFilter) {
      where.category = { equals: categoryFilter, mode: "insensitive" };
    }

    // The male/female split only means anything for feed, so it is computed
    // only when a feed category is actually selected — skipping the query
    // entirely on every other view. Reuses the same set the expense validator
    // uses, so "feed" can never mean one thing here and another there.
    const isFeedScope =
      !!categoryFilter && FEED_EXPENSE_CATEGORIES.has(categoryFilter.toUpperCase());

    const [expenses, grouped, feedRows] = await Promise.all([
      prisma.hatcheryBatchExpense.findMany({
        where,
        // Tiebreakers are required: with `date` alone, rows sharing a date can
        // reorder between requests, so paging duplicates some rows and skips
        // others.
        orderBy: [{ date: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        skip: (pageNum - 1) * pageLimit,
        take: pageLimit,
        include: {
          inventoryItem: { select: { id: true, name: true, unit: true } },
        },
      }),
      // Deliberately NOT category-filtered: this drives the filter dropdown, so
      // it must list every category including the unselected ones, and it also
      // yields the unfiltered grand total and each category's row count.
      prisma.hatcheryBatchExpense.groupBy({
        by: ["category"],
        where: { batchId },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      // Scoped to the same `where` as the rows, so the breakdown always
      // describes exactly what is on screen.
      isFeedScope
        ? prisma.hatcheryBatchExpense.findMany({
            where: { ...where, feedTarget: { not: null } },
            select: {
              quantity: true,
              unit: true,
              amount: true,
              unitPrice: true,
              feedTarget: true,
              maleFeedQuantity: true,
              femaleFeedQuantity: true,
            },
          })
        : Promise.resolve([]),
    ]);

    // Fold on upper case so a stray "feed" and "FEED" collapse into one bucket.
    const byCategoryMap = new Map<
      string,
      { category: string; amount: number; count: number }
    >();
    for (const group of grouped) {
      const key = String(group.category).toUpperCase();
      const existing = byCategoryMap.get(key);
      const amount = Number(group._sum.amount ?? 0);
      const count = Number(group._count?._all ?? 0);
      if (existing) {
        existing.amount += amount;
        existing.count += count;
      } else {
        byCategoryMap.set(key, { category: group.category, amount, count });
      }
    }

    const byCategory = [...byCategoryMap.values()].sort(
      (a, b) => b.amount - a.amount
    );
    const totalExpenses = byCategory.reduce((sum, row) => sum + row.amount, 0);

    const selected = categoryFilter
      ? byCategoryMap.get(categoryFilter.toUpperCase())
      : null;
    const filteredExpenses = categoryFilter ? (selected?.amount ?? 0) : totalExpenses;
    const totalRows = categoryFilter
      ? (selected?.count ?? 0)
      : byCategory.reduce((sum, row) => sum + row.count, 0);

    return res.json({
      expenses,
      page: pageNum,
      limit: pageLimit,
      total: totalRows,
      totalPages: Math.max(1, Math.ceil(totalRows / pageLimit)),
      summary: {
        // Unchanged meaning: the batch grand total, ignoring the filter. The
        // detail page's "Total Expenses" card reads this and must keep matching
        // Profit/Loss on the Overview tab.
        totalExpenses: round2(totalExpenses),
        filteredExpenses: round2(filteredExpenses),
        byCategory,
        feedBySex: summariseFeedBySex(feedRows),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function addHatcheryExpense(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId } = req.params;
    const {
      date,
      type = "MANUAL",
      category,
      inventoryItemId,
      quantity,
      itemName,
      unit,
      unitPrice,
      amount,
      note,
      feedTarget,
      maleFeedQuantity,
      femaleFeedQuantity,
    } = req.body;

    if (!date || !category) {
      return res.status(400).json({ error: "date and category are required" });
    }

    // Stock is always deducted once on the total quantity; this only records
    // which parent group consumed it.
    const feed = resolveFeedAttribution({
      category,
      quantity: quantity === undefined ? undefined : Number(quantity),
      feedTarget,
      maleFeedQuantity,
      femaleFeedQuantity,
    });

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    let expense;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (type === HatcheryBatchExpenseType.INVENTORY) {
        if (!inventoryItemId || !quantity) {
          throw new Error("inventoryItemId and quantity are required for inventory expense");
        }
        expense = await HatcheryBatchExpenseService.createInventoryExpense(tx, {
          batchId,
          hatcheryOwnerId: ownerId,
          date: new Date(date),
          category,
          inventoryItemId,
          quantity: Number(quantity),
          note,
          ...feed,
        });
      } else {
        if (!itemName || !amount) {
          throw new Error("itemName and amount are required for manual expense");
        }
        expense = await HatcheryBatchExpenseService.createManualExpense(tx, {
          batchId,
          date: new Date(date),
          category,
          itemName,
          quantity: quantity ? Number(quantity) : undefined,
          unit,
          unitPrice: unitPrice ? Number(unitPrice) : undefined,
          amount: Number(amount),
          note,
          ...feed,
        });
      }
    });

    return res.status(201).json(expense);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function deleteHatcheryExpense(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId, expenseId } = req.params;

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const expense = await prisma.hatcheryBatchExpense.findFirst({
      where: { id: expenseId, batchId },
    });
    if (!expense) return res.status(404).json({ error: "Expense not found" });

    if (isInitialPlacementExpense(expense)) {
      return res.status(400).json({
        error:
          "Initial flock placement expense cannot be deleted individually. Delete the full batch if it was created by mistake.",
      });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await HatcheryBatchExpenseService.deleteExpense(tx, expenseId);
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── Egg Type Management ─────────────────────────────────────────────────────

export async function listEggTypes(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const types = await prisma.hatcheryEggType.findMany({
      where: { hatcheryOwnerId: ownerId },
      orderBy: [{ isHatchable: "desc" }, { name: "asc" }],
    });
    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createEggType(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { name, isHatchable = false } = req.body;

    if (!name) return res.status(400).json({ error: "name is required" });

    if (isHatchable) {
      const existing = await prisma.hatcheryEggType.findFirst({
        where: { hatcheryOwnerId: ownerId, isHatchable: true },
      });
      if (existing) {
        return res.status(400).json({
          error: "A HATCHABLE egg type already exists. Only one is allowed.",
        });
      }
    }

    const type = await prisma.hatcheryEggType.create({
      data: { hatcheryOwnerId: ownerId, name, isHatchable },
    });

    return res.status(201).json(type);
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Egg type with this name already exists" });
    }
    return res.status(400).json({ error: err.message });
  }
}

export async function updateEggType(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id } = req.params;
    const { name } = req.body;

    const existing = await prisma.hatcheryEggType.findFirst({
      where: { id, hatcheryOwnerId: ownerId },
    });
    if (!existing) return res.status(404).json({ error: "Egg type not found" });

    const updated = await prisma.hatcheryEggType.update({
      where: { id },
      data: { name },
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function deleteEggType(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id } = req.params;

    const eggType = await prisma.hatcheryEggType.findFirst({
      where: { id, hatcheryOwnerId: ownerId },
    });
    if (!eggType) return res.status(404).json({ error: "Egg type not found" });

    if (eggType.isHatchable) {
      return res.status(400).json({ error: "Cannot delete the HATCHABLE egg type" });
    }

    // Check for references
    const [prodCount, stockCount, saleCount] = await Promise.all([
      prisma.hatcheryEggProductionLine.count({ where: { eggTypeId: id } }),
      prisma.hatcheryEggStock.count({ where: { eggTypeId: id } }),
      prisma.hatcheryEggSale.count({ where: { eggTypeId: id } }),
    ]);

    if (prodCount + stockCount + saleCount > 0) {
      return res.status(400).json({
        error: "Cannot delete: egg type is referenced by production, stock, or sale records",
      });
    }

    await prisma.hatcheryEggType.delete({ where: { id } });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── Egg Production ──────────────────────────────────────────────────────────

export async function listEggProductions(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId } = req.params;
    const { page = "1", limit = "10" } = req.query as Record<string, string>;

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const pageLimit = Math.max(1, parseInt(limit, 10) || 10);
    const where = { batchId };

    const [productions, totalRows, lineRows] = await Promise.all([
      prisma.hatcheryEggProduction.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (pageNum - 1) * pageLimit,
        take: pageLimit,
        include: {
          lines: {
            include: {
              eggType: { select: { id: true, name: true, isHatchable: true } },
            },
          },
        },
      }),
      prisma.hatcheryEggProduction.count({ where }),
      prisma.hatcheryEggProductionLine.findMany({
        where: { production: { batchId } },
        select: { eggTypeId: true, count: true },
      }),
    ]);

    const typeTotals: Record<string, number> = {};
    for (const line of lineRows) {
      typeTotals[line.eggTypeId] = (typeTotals[line.eggTypeId] ?? 0) + Number(line.count);
    }
    const grandTotal = Object.values(typeTotals).reduce((sum, value) => sum + value, 0);

    // Computed over ALL production for the batch (grandTotal above is already
    // un-paginated), not just the page being returned.
    const layRate = await HatcheryLayRateService.computeForBatch(batchId, grandTotal);

    return res.json({
      productions,
      page: pageNum,
      limit: pageLimit,
      total: totalRows,
      totalPages: Math.max(1, Math.ceil(totalRows / pageLimit)),
      summary: {
        typeTotals,
        grandTotal,
        layRate,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function addEggProduction(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId } = req.params;
    const { date, note, lines } = req.body;

    if (!date) return res.status(400).json({ error: "date is required" });

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const production = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      return HatcheryEggService.addProduction(tx, {
        batchId,
        date: new Date(date),
        note,
        lines,
      });
    });

    const result = await prisma.hatcheryEggProduction.findUnique({
      where: { id: production.id },
      include: {
        lines: {
          include: {
            eggType: { select: { id: true, name: true, isHatchable: true } },
          },
        },
      },
    });

    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function deleteEggProduction(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId, productionId } = req.params;

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const prod = await prisma.hatcheryEggProduction.findFirst({
      where: { id: productionId, batchId },
    });
    if (!prod) return res.status(404).json({ error: "Production record not found" });

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await HatcheryEggService.deleteProduction(tx, productionId);
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

// ─── Egg Inventory (batch-wise stock) ────────────────────────────────────────

export async function getEggInventory(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { batchId, typeId, page = "1", limit = "10" } = req.query as Record<string, string>;

    const where: any = {
      batch: { hatcheryOwnerId: ownerId, status: HatcheryBatchStatus.ACTIVE },
    };
    if (batchId) where.batchId = batchId;
    if (typeId) where.eggTypeId = typeId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [stockRows, totalRows, stockSummary] = await Promise.all([
      prisma.hatcheryEggStock.findMany({
        where,
        include: {
          batch: { select: { id: true, code: true, name: true, status: true } },
          eggType: { select: { id: true, name: true, isHatchable: true } },
        },
        orderBy: [{ batch: { startDate: "desc" } }, { eggType: { isHatchable: "desc" } }],
        skip,
        take: parseInt(limit),
      }),
      prisma.hatcheryEggStock.count({ where }),
      prisma.hatcheryEggStock.aggregate({
        where,
        _sum: { currentStock: true },
      }),
    ]);

    return res.json({
      data: stockRows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalRows,
        totalPages: Math.max(1, Math.ceil(totalRows / parseInt(limit))),
      },
      summary: {
        totalStock: Number(stockSummary._sum.currentStock ?? 0),
        totalRows,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── Egg Sales ───────────────────────────────────────────────────────────────

export async function listEggSales(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId } = req.params;
    const { page = "1", limit = "10" } = req.query as Record<string, string>;

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const currentPage = Math.max(1, parseInt(page) || 1);
    const pageLimit = Math.max(1, parseInt(limit) || 10);
    const skip = (currentPage - 1) * pageLimit;

    const [sales, totalRows, salesAgg] = await Promise.all([
      prisma.hatcheryEggSale.findMany({
        where: { batchId },
        orderBy: { date: "desc" },
        skip,
        take: pageLimit,
        include: { eggType: { select: { id: true, name: true, isHatchable: true } } },
      }),
      prisma.hatcheryEggSale.count({ where: { batchId } }),
      prisma.hatcheryEggSale.aggregate({
        where: { batchId },
        _sum: { amount: true },
      }),
    ]);

    return res.json({
      data: sales,
      page: currentPage,
      limit: pageLimit,
      total: totalRows,
      totalPages: Math.max(1, Math.ceil(totalRows / pageLimit)),
      summary: {
        totalRevenue: Number(salesAgg._sum.amount ?? 0),
        totalSales: totalRows,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function addEggSale(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId } = req.params;
    const { eggTypeId, date, count, unitPrice, partyId, note } = req.body;

    if (!eggTypeId || !date || !count || !unitPrice) {
      return res.status(400).json({ error: "eggTypeId, date, count, and unitPrice are required" });
    }

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const sale = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      return HatcheryEggService.sellEggs(tx, {
        batchId,
        eggTypeId,
        date: new Date(date),
        count: parseInt(count),
        unitPrice: Number(unitPrice),
        partyId: partyId || undefined,
        note,
      });
    });

    return res.status(201).json(sale);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function deleteEggSale(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId, saleId } = req.params;

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const sale = await prisma.hatcheryEggSale.findFirst({
      where: { id: saleId, batchId },
    });
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await HatcheryEggService.deleteEggSale(tx, saleId);
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

// ─── Parent Sales ─────────────────────────────────────────────────────────────

export async function listParentSales(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId } = req.params;
    const { page = "1", limit = "10" } = req.query as Record<string, string>;

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const currentPage = Math.max(1, parseInt(page) || 1);
    const pageLimit = Math.max(1, parseInt(limit) || 10);
    const skip = (currentPage - 1) * pageLimit;

    const [sales, totalRows, salesAgg] = await Promise.all([
      prisma.hatcheryParentSale.findMany({
        where: { batchId },
        orderBy: { date: "desc" },
        skip,
        take: pageLimit,
      }),
      prisma.hatcheryParentSale.count({ where: { batchId } }),
      prisma.hatcheryParentSale.aggregate({
        where: { batchId },
        _sum: { amount: true },
      }),
    ]);

    return res.json({
      data: sales,
      page: currentPage,
      limit: pageLimit,
      total: totalRows,
      totalPages: Math.max(1, Math.ceil(totalRows / pageLimit)),
      summary: {
        totalRevenue: Number(salesAgg._sum.amount ?? 0),
        totalSales: totalRows,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function addParentSale(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId } = req.params;
    const { date, maleCount, femaleCount, totalWeightKg, ratePerKg, partyId, note } =
      req.body;

    const male = Number(maleCount ?? 0);
    const female = Number(femaleCount ?? 0);

    if (!date || !totalWeightKg || !ratePerKg) {
      return res.status(400).json({
        error: "date, totalWeightKg, and ratePerKg are required",
      });
    }
    if (
      !Number.isInteger(male) ||
      male < 0 ||
      !Number.isInteger(female) ||
      female < 0
    ) {
      return res.status(400).json({
        error: "maleCount and femaleCount must be non-negative whole numbers",
      });
    }
    const saleCount = male + female;
    if (saleCount <= 0) {
      return res
        .status(400)
        .json({ error: "Sell at least one male or female bird" });
    }

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    // Friendly up-front message; the guarded update below is authoritative.
    if ((batch.currentMaleParents ?? 0) < male || (batch.currentFemaleParents ?? 0) < female) {
      return res.status(400).json({
        error:
          `Cannot sell ${male} male / ${female} female birds; ` +
          `only ${batch.currentMaleParents ?? 0} male and ${batch.currentFemaleParents ?? 0} female remain`,
      });
    }

    const totalKg = parseFloat(totalWeightKg);
    const rate = parseFloat(ratePerKg);
    const avgWeightKg = saleCount > 0 ? Math.round((totalKg / saleCount) * 1000) / 1000 : 0;
    const amount = Math.round(totalKg * rate * 100) / 100;

    const sale = await prisma.$transaction(async (tx) => {
      const updated = await tx.hatcheryBatch.updateMany({
        where: {
          id: batchId,
          hatcheryOwnerId: ownerId,
          currentMaleParents: { gte: male },
          currentFemaleParents: { gte: female },
        },
        data: {
          currentMaleParents: { decrement: male },
          currentFemaleParents: { decrement: female },
          currentParents: { decrement: saleCount },
        },
      });
      if (updated.count !== 1) {
        throw new Error("Not enough live birds of that sex remaining");
      }

      const created = await tx.hatcheryParentSale.create({
        data: {
          batchId,
          date: new Date(date),
          count: saleCount,
          maleCount: male,
          femaleCount: female,
          totalWeightKg: totalKg,
          avgWeightKg,
          ratePerKg: rate,
          amount,
          partyId: partyId || null,
          note,
        },
      });

      if (partyId) {
        const { HatcheryPartyService } = await import("../services/hatcheryPartyService");
        await HatcheryPartyService.recordSale(tx, partyId, created.id, "parent_sale", amount, new Date(date));
      }

      return created;
    });

    return res.status(201).json(sale);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function deleteParentSale(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId, saleId } = req.params;

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const sale = await prisma.hatcheryParentSale.findFirst({
      where: { id: saleId, batchId },
    });
    if (!sale) return res.status(404).json({ error: "Sale not found" });

    await prisma.$transaction(async (tx) => {
      if (sale.partyId) {
        const { HatcheryPartyService } = await import("../services/hatcheryPartyService");
        await HatcheryPartyService.reverseSale(tx, saleId, "parent_sale");
      }

      await tx.hatcheryParentSale.delete({ where: { id: saleId } });

      // Symmetric reversal: restore exactly what this sale decremented.
      await tx.hatcheryBatch.update({
        where: { id: batchId },
        data: {
          currentParents: { increment: sale.count },
          currentMaleParents: { increment: sale.maleCount },
          currentFemaleParents: { increment: sale.femaleCount },
        },
      });
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
