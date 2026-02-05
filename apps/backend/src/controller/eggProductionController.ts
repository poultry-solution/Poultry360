import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { UserRole } from "@prisma/client";
import {
  CreateEggProductionSchema,
  UpdateEggProductionSchema,
} from "@myapp/shared-types";

const EGG_CATEGORIES = ["LARGE", "MEDIUM", "SMALL"] as const;

async function updateEggInventoryForProduction(
  tx: any,
  userId: string,
  delta: { large: number; medium: number; small: number }
) {
  const keyMap = { LARGE: "large", MEDIUM: "medium", SMALL: "small" } as const;
  for (const cat of EGG_CATEGORIES) {
    const count = delta[keyMap[cat]];
    if (count === 0) continue;
    const category = cat as "LARGE" | "MEDIUM" | "SMALL";
    if (count > 0) {
      await tx.eggInventory.upsert({
        where: {
          userId_eggCategory: { userId, eggCategory: category },
        },
        create: {
          userId,
          eggCategory: category,
          quantity: count,
        },
        update: {
          quantity: { increment: count },
        },
      });
    } else {
      const existing = await tx.eggInventory.findUnique({
        where: { userId_eggCategory: { userId, eggCategory: category } },
      });
      if (existing) {
        await tx.eggInventory.update({
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
    const currentUserRole = req.role;

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
      batch.farm.managers.some((m) => m.id === currentUserId);
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
    const { date, largeCount, mediumCount, smallCount } = parsed.data;

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

      const existing = await tx.eggProduction.findUnique({
        where: { batchId_date: { batchId, date: new Date(date) } },
      });
      if (existing) {
        throw new Error("A production record already exists for this batch and date");
      }

      const created = await tx.eggProduction.create({
        data: {
          batchId,
          date: new Date(date),
          largeCount: largeCount ?? 0,
          mediumCount: mediumCount ?? 0,
          smallCount: smallCount ?? 0,
        },
      });

      await updateEggInventoryForProduction(tx, batch.farm.ownerId, {
        large: largeCount ?? 0,
        medium: mediumCount ?? 0,
        small: smallCount ?? 0,
      });

      return created;
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
      });
      if (!existing) throw new Error("Egg production record not found");

      const newLarge = parsed.data.largeCount ?? existing.largeCount;
      const newMedium = parsed.data.mediumCount ?? existing.mediumCount;
      const newSmall = parsed.data.smallCount ?? existing.smallCount;

      const delta = {
        large: newLarge - existing.largeCount,
        medium: newMedium - existing.mediumCount,
        small: newSmall - existing.smallCount,
      };

      const updatedRecord = await tx.eggProduction.update({
        where: { id: recordId },
        data: {
          ...(parsed.data.date && { date: new Date(parsed.data.date) }),
          largeCount: newLarge,
          mediumCount: newMedium,
          smallCount: newSmall,
        },
      });

      await updateEggInventoryForProduction(tx, batch.farm.ownerId, delta);
      return updatedRecord;
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
      });
      if (!existing) throw new Error("Egg production record not found");

      await updateEggInventoryForProduction(tx, batch.farm.ownerId, {
        large: -existing.largeCount,
        medium: -existing.mediumCount,
        small: -existing.smallCount,
      });

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
