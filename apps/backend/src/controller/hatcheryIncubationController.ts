import { Request, Response } from "express";
import { Prisma, HatcheryChickGrade } from "@prisma/client";
import prisma from "../utils/prisma";
import { HatcheryIncubationService } from "../services/hatcheryIncubationService";
import { HatcheryChickSalesService } from "../services/hatcheryChickSalesService";

function getOwnerId(req: Request): string {
  return (req as any).userId as string;
}

// ─── Incubation batch list/create/detail ─────────────────────────────────────

export async function listIncubationBatches(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { parentBatchId, stage, search, page = "1", limit = "20" } =
      req.query as Record<string, string>;

    const where: any = { hatcheryOwnerId: ownerId };
    if (parentBatchId) where.parentBatchId = parentBatchId;
    if (stage) where.stage = stage;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [batches, total] = await Promise.all([
      prisma.hatcheryIncubationBatch.findMany({
        where,
        orderBy: { startDate: "desc" },
        skip,
        take: parseInt(limit),
        include: {
          parentBatch: { select: { id: true, code: true, name: true } },
          _count: { select: { losses: true, hatchResults: true, chickSales: true } },
        },
      }),
      prisma.hatcheryIncubationBatch.count({ where }),
    ]);

    return res.json({ batches, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function createIncubationBatch(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { parentBatchId, startDate, eggsSetCount, notes, name } = req.body;

    if (!parentBatchId || !startDate || !eggsSetCount) {
      return res.status(400).json({ error: "parentBatchId, startDate, and eggsSetCount are required" });
    }

    const batch = await HatcheryIncubationService.createIncubationBatch({
      hatcheryOwnerId: ownerId,
      parentBatchId,
      startDate: new Date(startDate),
      eggsSetCount: parseInt(eggsSetCount),
      notes,
      name,
    });

    return res.status(201).json(batch);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function getIncubationBatch(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id } = req.params;

    const batch = await prisma.hatcheryIncubationBatch.findFirst({
      where: { id, hatcheryOwnerId: ownerId },
      include: {
        parentBatch: { select: { id: true, code: true, name: true } },
        eggMoves: { include: { eggType: true } },
        chickStocks: true,
      },
    });

    if (!batch) return res.status(404).json({ error: "Incubation batch not found" });

    // Build KPI summary
    const [losses, hatchResults, chickSalesAgg] = await Promise.all([
      prisma.hatcheryIncubationLoss.findMany({ where: { incubationBatchId: id } }),
      prisma.hatcheryHatchResult.findMany({ where: { incubationBatchId: id } }),
      prisma.hatcheryChickSale.aggregate({
        where: { incubationBatchId: id },
        _sum: { count: true, amount: true },
      }),
    ]);

    const totalCandlingLoss = losses
      .filter((l) => l.type === "INFERTILE" || l.type === "EARLY_DEAD")
      .reduce((s, l) => s + l.count, 0);

    const fertileEggs = batch.eggsSetCount - totalCandlingLoss;

    const totalHatchedA = hatchResults.reduce((s, r) => s + r.hatchedA, 0);
    const totalHatchedB = hatchResults.reduce((s, r) => s + r.hatchedB, 0);
    const totalCull = hatchResults.reduce((s, r) => s + r.cull, 0);
    const totalHatched = totalHatchedA + totalHatchedB + totalCull;

    const hatchability = fertileEggs > 0
      ? Math.round((totalHatched / fertileEggs) * 10000) / 100
      : 0;
    const hatchOfTotal = batch.eggsSetCount > 0
      ? Math.round((totalHatched / batch.eggsSetCount) * 10000) / 100
      : 0;

    return res.json({
      ...batch,
      summary: {
        eggsSet: batch.eggsSetCount,
        candlingLoss: totalCandlingLoss,
        fertileEggs,
        totalHatched,
        totalHatchedA,
        totalHatchedB,
        totalCull,
        hatchability,
        hatchOfTotal,
        totalSalesCount: chickSalesAgg._sum.count ?? 0,
        totalSalesRevenue: Number(chickSalesAgg._sum.amount ?? 0),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── Candling ────────────────────────────────────────────────────────────────

export async function recordCandling(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: incubationBatchId } = req.params;
    const { date, infertile = 0, earlyDead = 0, note } = req.body;

    if (!date) return res.status(400).json({ error: "date is required" });

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await HatcheryIncubationService.recordCandling(tx, {
        incubationBatchId,
        hatcheryOwnerId: ownerId,
        date: new Date(date),
        infertile: parseInt(infertile),
        earlyDead: parseInt(earlyDead),
        note,
      });
    });

    const losses = await prisma.hatcheryIncubationLoss.findMany({
      where: { incubationBatchId },
      orderBy: { date: "desc" },
    });

    return res.status(201).json(losses);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

// ─── Transfer to Hatcher ──────────────────────────────────────────────────────

export async function transferToHatcher(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: incubationBatchId } = req.params;
    const { date } = req.body;

    if (!date) return res.status(400).json({ error: "date is required" });

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await HatcheryIncubationService.transferToHatcher(tx, {
        incubationBatchId,
        hatcheryOwnerId: ownerId,
        date: new Date(date),
      });
    });

    const batch = await prisma.hatcheryIncubationBatch.findUnique({
      where: { id: incubationBatchId },
    });

    return res.json(batch);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

// ─── Hatch Results ────────────────────────────────────────────────────────────

export async function listHatchResults(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: incubationBatchId } = req.params;

    const batch = await prisma.hatcheryIncubationBatch.findFirst({
      where: { id: incubationBatchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Incubation batch not found" });

    const results = await prisma.hatcheryHatchResult.findMany({
      where: { incubationBatchId },
      orderBy: { date: "desc" },
    });

    return res.json(results);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function addHatchResult(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: incubationBatchId } = req.params;
    const { date, hatchedA = 0, hatchedB = 0, cull = 0, lateDead = 0, unhatched = 0, note } =
      req.body;

    if (!date) return res.status(400).json({ error: "date is required" });

    let result: any;
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      result = await HatcheryIncubationService.recordHatchResults(tx, {
        incubationBatchId,
        hatcheryOwnerId: ownerId,
        date: new Date(date),
        hatchedA: parseInt(hatchedA),
        hatchedB: parseInt(hatchedB),
        cull: parseInt(cull),
        lateDead: parseInt(lateDead),
        unhatched: parseInt(unhatched),
        note,
      });
    });

    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function deleteHatchResult(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { hatchResultId } = req.params;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await HatcheryIncubationService.deleteHatchResult(tx, hatchResultId, ownerId);
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

// ─── Losses list ─────────────────────────────────────────────────────────────

export async function listIncubationLosses(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: incubationBatchId } = req.params;

    const batch = await prisma.hatcheryIncubationBatch.findFirst({
      where: { id: incubationBatchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Incubation batch not found" });

    const losses = await prisma.hatcheryIncubationLoss.findMany({
      where: { incubationBatchId },
      orderBy: { date: "desc" },
    });

    return res.json(losses);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── Chick Sales ─────────────────────────────────────────────────────────────

export async function listChickSales(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: incubationBatchId } = req.params;

    const batch = await prisma.hatcheryIncubationBatch.findFirst({
      where: { id: incubationBatchId, hatcheryOwnerId: ownerId },
    });
    if (!batch) return res.status(404).json({ error: "Incubation batch not found" });

    const sales = await prisma.hatcheryChickSale.findMany({
      where: { incubationBatchId },
      orderBy: { date: "desc" },
    });

    return res.json(sales);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function addChickSale(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { id: incubationBatchId } = req.params;
    const { grade, date, count, unitPrice, partyId, note } = req.body;

    if (!grade || !date || !count || !unitPrice) {
      return res.status(400).json({ error: "grade, date, count, and unitPrice are required" });
    }

    if (!Object.values(HatcheryChickGrade).includes(grade as HatcheryChickGrade)) {
      return res.status(400).json({ error: "grade must be A, B, or CULL" });
    }

    const sale = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      return HatcheryChickSalesService.sellChicks(tx, {
        incubationBatchId,
        hatcheryOwnerId: ownerId,
        grade: grade as HatcheryChickGrade,
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

export async function deleteChickSale(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { saleId } = req.params;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await HatcheryChickSalesService.deleteChickSale(tx, saleId, ownerId);
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

// ─── Hatchable egg stock preview ─────────────────────────────────────────────

export async function getHatchableStockForBatch(req: Request, res: Response) {
  try {
    const ownerId = getOwnerId(req);
    const { batchId } = req.params;

    const parentBatch = await prisma.hatcheryBatch.findFirst({
      where: { id: batchId, hatcheryOwnerId: ownerId },
    });
    if (!parentBatch) return res.status(404).json({ error: "Parent batch not found" });

    const hatchableType = await prisma.hatcheryEggType.findFirst({
      where: { hatcheryOwnerId: ownerId, isHatchable: true },
    });

    if (!hatchableType) return res.json({ stock: 0, eggTypeName: null });

    const eggStock = await prisma.hatcheryEggStock.findUnique({
      where: {
        batchId_eggTypeId: { batchId, eggTypeId: hatchableType.id },
      },
    });

    return res.json({
      stock: eggStock?.currentStock ?? 0,
      eggTypeName: hatchableType.name,
      eggTypeId: hatchableType.id,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
