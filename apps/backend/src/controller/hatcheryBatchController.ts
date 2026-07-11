import { Request, Response } from "express";
import {
  Prisma,
  HatcheryBatchStatus,
  HatcheryBatchType,
  HatcheryBatchExpenseType,
  HatcheryIncubationLossType,
} from "@prisma/client";
import bcrypt from "bcrypt";
import prisma from "../utils/prisma";
import { HatcheryBatchService } from "../services/hatcheryBatchService";
import { HatcheryBatchExpenseService } from "../services/hatcheryBatchExpenseService";
import { HatcheryEggService } from "../services/hatcheryEggService";

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

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const mortalities = await prisma.hatcheryBatchMortality.findMany({
      where: { batchId },
      orderBy: { date: "desc" },
    });

    return res.json(mortalities);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function addHatcheryMortality(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId } = req.params;
    const { date, count, note } = req.body;

    if (!date || !count || count <= 0) {
      return res.status(400).json({ error: "date and count > 0 are required" });
    }

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    if ((batch.currentParents ?? 0) < count) {
      return res.status(400).json({
        error: `Cannot record ${count} mortality; only ${batch.currentParents} birds remaining`,
      });
    }

    const [mortality] = await prisma.$transaction([
      prisma.hatcheryBatchMortality.create({
        data: { batchId, date: new Date(date), count, note },
      }),
      prisma.hatcheryBatch.update({
        where: { id: batchId },
        data: { currentParents: { decrement: count } },
      }),
    ]);

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
      prisma.hatcheryBatch.update({
        where: { id: batchId },
        data: { currentParents: { increment: mortality.count } },
      }),
    ]);

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export async function listHatcheryExpenses(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId } = req.params;

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const expenses = await prisma.hatcheryBatchExpense.findMany({
      where: { batchId },
      orderBy: { date: "desc" },
      include: {
        inventoryItem: { select: { id: true, name: true, unit: true } },
      },
    });

    return res.json(expenses);
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
    } = req.body;

    if (!date || !category) {
      return res.status(400).json({ error: "date and category are required" });
    }

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
          date: new Date(date),
          category,
          inventoryItemId,
          quantity: Number(quantity),
          note,
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

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const productions = await prisma.hatcheryEggProduction.findMany({
      where: { batchId },
      orderBy: { date: "desc" },
      include: {
        lines: {
          include: {
            eggType: { select: { id: true, name: true, isHatchable: true } },
          },
        },
      },
    });

    return res.json(productions);
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
    const { batchId, typeId } = req.query as Record<string, string>;

    const where: any = {
      batch: { hatcheryOwnerId: ownerId },
    };
    if (batchId) where.batchId = batchId;
    if (typeId) where.eggTypeId = typeId;

    const stockRows = await prisma.hatcheryEggStock.findMany({
      where,
      include: {
        batch: { select: { id: true, code: true, name: true, status: true } },
        eggType: { select: { id: true, name: true, isHatchable: true } },
      },
      orderBy: [{ batch: { startDate: "desc" } }, { eggType: { isHatchable: "desc" } }],
    });

    return res.json(stockRows);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── Egg Sales ───────────────────────────────────────────────────────────────

export async function listEggSales(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId } = req.params;

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const sales = await prisma.hatcheryEggSale.findMany({
      where: { batchId },
      orderBy: { date: "desc" },
      include: { eggType: { select: { id: true, name: true, isHatchable: true } } },
    });

    return res.json(sales);
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

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const sales = await prisma.hatcheryParentSale.findMany({
      where: { batchId },
      orderBy: { date: "desc" },
    });

    return res.json(sales);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function addParentSale(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: batchId } = req.params;
    const { date, count, totalWeightKg, ratePerKg, partyId, note } = req.body;

    if (!date || !count || !totalWeightKg || !ratePerKg) {
      return res.status(400).json({
        error: "date, count, totalWeightKg, and ratePerKg are required",
      });
    }

    const batch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Batch not found" });

    const saleCount = parseInt(count);
    if ((batch.currentParents ?? 0) < saleCount) {
      return res.status(400).json({
        error: `Cannot sell ${saleCount} birds; only ${batch.currentParents} remaining`,
      });
    }

    const totalKg = parseFloat(totalWeightKg);
    const rate = parseFloat(ratePerKg);
    const avgWeightKg = saleCount > 0 ? Math.round((totalKg / saleCount) * 1000) / 1000 : 0;
    const amount = Math.round(totalKg * rate * 100) / 100;

    const sale = await prisma.$transaction(async (tx) => {
      const created = await tx.hatcheryParentSale.create({
        data: {
          batchId,
          date: new Date(date),
          count: saleCount,
          totalWeightKg: totalKg,
          avgWeightKg,
          ratePerKg: rate,
          amount,
          partyId: partyId || null,
          note,
        },
      });

      await tx.hatcheryBatch.update({
        where: { id: batchId },
        data: { currentParents: { decrement: saleCount } },
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

      await tx.hatcheryBatch.update({
        where: { id: batchId },
        data: { currentParents: { increment: sale.count } },
      });
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
