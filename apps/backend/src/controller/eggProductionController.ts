import { Request, Response } from "express";
import prisma from "../utils/prisma";
import {
  CreateEggProductionSchema,
  UpdateEggProductionSchema,
} from "@myapp/shared-types";

/** Updates per-batch egg inventory (BatchEggInventory) for production create/update/delete. */
async function updateBatchEggInventoryForProduction(
  tx: any,
  batchId: string,
  delta: Record<string, number>
) {
  for (const [eggTypeId, count] of Object.entries(delta)) {
    if (count === 0) continue;
    if (count > 0) {
      const existing = await tx.batchEggInventory.findUnique({
        where: { batchId_eggTypeId: { batchId, eggTypeId } },
      });
      if (existing) {
        await tx.batchEggInventory.update({
          where: { id: existing.id },
          data: { quantity: { increment: count } },
        });
      } else {
        await tx.batchEggInventory.create({
          data: { batchId, eggTypeId, quantity: count },
        });
      }
    } else {
      const existing = await tx.batchEggInventory.findUnique({
        where: { batchId_eggTypeId: { batchId, eggTypeId } },
      });
      if (existing) {
        await tx.batchEggInventory.update({
          where: { id: existing.id },
          data: { quantity: { decrement: Math.abs(count) } },
        });
      }
    }
  }
}

// GET /batches/:id/egg-production
export const getEggProductionByBatch = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id: batchId } = req.params;
    const { startDate, endDate } = req.query;
    const currentUserId = req.userId as string;

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        farm: {
          select: {
            id: true,
            ownerId: true,
            managers: { select: { id: true } },
          },
        },
      },
    });

    if (!batch) {
      return res.status(404).json({ message: "Batch not found" });
    }
    if (batch.batchType !== "LAYERS") {
      return res.status(400).json({
        message: "Egg production is only available for Layers batches",
      });
    }

    const hasAccess =
      batch.farm.ownerId === currentUserId ||
      batch.farm.managers.some((m: { id: string }) => m.id === currentUserId);
    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied to this batch" });
    }

    const where: any = { batchId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const records = await prisma.eggProduction.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        entries: {
          include: { eggType: { select: { id: true, name: true, code: true } } },
        },
      },
    });

    return res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    console.error("Get egg production error:", error);
    return res
      .status(500)
      .json({ message: (error as Error)?.message || "Internal server error" });
  }
};

// POST /batches/:id/egg-production
export const createEggProduction = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id: batchId } = req.params;
    const currentUserId = req.userId as string;

    const parsed = CreateEggProductionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }
    const { date, countByType } = parsed.data;

    const record = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        include: { farm: { select: { ownerId: true } } },
      });
      if (!batch) throw new Error("Batch not found");
      if (batch.batchType !== "LAYERS")
        throw new Error("Egg production is only for Layers batches");

      const hasAccess = batch.farm.ownerId === currentUserId;
      if (!hasAccess) throw new Error("Access denied");

      const created = await tx.eggProduction.create({
        data: {
          batchId,
          date: new Date(date),
        },
      });

      const counts = countByType ?? {};
      for (const [eggTypeId, count] of Object.entries(counts)) {
        if (Number(count) > 0) {
          await tx.eggProductionEntry.create({
            data: {
              eggProductionId: created.id,
              eggTypeId,
              count: Number(count),
            },
          });
        }
      }

      await updateBatchEggInventoryForProduction(tx, batchId, {
        ...Object.fromEntries(
          Object.entries(counts).map(([k, v]) => [k, Number(v) || 0])
        ),
      });

      return tx.eggProduction.findUnique({
        where: { id: created.id },
        include: {
          entries: {
            include: { eggType: { select: { id: true, name: true, code: true } } },
          },
        },
      });
    });

    return res.status(201).json({ success: true, data: record });
  } catch (error: any) {
    console.error("Create egg production error:", error);
    return res.status(500).json({
      message: error?.message || "Internal server error",
    });
  }
};

// PUT /batches/:id/egg-production/:recordId
export const updateEggProduction = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id: batchId, recordId } = req.params;
    const currentUserId = req.userId as string;

    const parsed = UpdateEggProductionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.message });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        include: { farm: { select: { ownerId: true } } },
      });
      if (!batch) throw new Error("Batch not found");
      if (batch.batchType !== "LAYERS")
        throw new Error("Egg production is only for Layers batches");
      if (batch.farm.ownerId !== currentUserId) throw new Error("Access denied");

      const existing = await tx.eggProduction.findFirst({
        where: { id: recordId, batchId },
        include: { entries: true },
      });
      if (!existing) throw new Error("Egg production record not found");

      const oldByType: Record<string, number> = {};
      for (const e of existing.entries) {
        oldByType[e.eggTypeId] = e.count;
      }
      const newByType = parsed.data.countByType ?? oldByType;

      const allTypeIds = new Set([...Object.keys(oldByType), ...Object.keys(newByType)]);
      const delta: Record<string, number> = {};
      for (const tid of allTypeIds) {
        const oldVal = oldByType[tid] ?? 0;
        const newVal = newByType[tid] ?? 0;
        delta[tid] = newVal - oldVal;
      }

      if (parsed.data.date) {
        await tx.eggProduction.update({
          where: { id: recordId },
          data: { date: new Date(parsed.data.date) },
        });
      }

      await tx.eggProductionEntry.deleteMany({ where: { eggProductionId: recordId } });
      for (const [eggTypeId, count] of Object.entries(newByType)) {
        if (Number(count) > 0) {
          await tx.eggProductionEntry.create({
            data: {
              eggProductionId: recordId,
              eggTypeId,
              count: Number(count),
            },
          });
        }
      }

      await updateBatchEggInventoryForProduction(tx, batchId, delta);

      return tx.eggProduction.findUnique({
        where: { id: recordId },
        include: {
          entries: {
            include: { eggType: { select: { id: true, name: true, code: true } } },
          },
        },
      });
    });

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Update egg production error:", error);
    return res.status(500).json({
      message: error?.message || "Internal server error",
    });
  }
};

// DELETE /batches/:id/egg-production/:recordId
export const deleteEggProduction = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { id: batchId, recordId } = req.params;
    const currentUserId = req.userId as string;

    await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({
        where: { id: batchId },
        include: { farm: { select: { ownerId: true } } },
      });
      if (!batch) throw new Error("Batch not found");
      if (batch.batchType !== "LAYERS")
        throw new Error("Egg production is only for Layers batches");
      if (batch.farm.ownerId !== currentUserId) throw new Error("Access denied");

      const existing = await tx.eggProduction.findFirst({
        where: { id: recordId, batchId },
        include: { entries: true },
      });
      if (!existing) throw new Error("Egg production record not found");

      const delta: Record<string, number> = {};
      for (const e of existing.entries) {
        delta[e.eggTypeId] = -e.count;
      }
      await updateBatchEggInventoryForProduction(tx, batchId, delta);

      await tx.eggProduction.delete({ where: { id: recordId } });
    });

    return res.json({ success: true, message: "Record deleted" });
  } catch (error: any) {
    console.error("Delete egg production error:", error);
    return res.status(500).json({
      message: error?.message || "Internal server error",
    });
  }
};
