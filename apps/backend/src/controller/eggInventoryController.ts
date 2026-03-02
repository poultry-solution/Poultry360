import { Request, Response } from "express";
import prisma from "../utils/prisma";

/**
 * GET /egg-inventory?batchId=xxx
 * - If batchId: returns that batch's egg inventory (BatchEggInventory). Verifies user has access to the batch.
 * - If no batchId: returns user-level egg inventory (EggInventory) for backward compatibility.
 * data.quantities: { [eggTypeId]: quantity }
 * data.types: [{ id, name, code, quantity }] for UI
 */
export const getEggInventory = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId as string;
    const batchId = typeof req.query.batchId === "string" ? req.query.batchId : undefined;

    const types = await prisma.eggType.findMany({
      where: { userId },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, code: true },
    });

    if (batchId) {
      const batch = await prisma.batch.findUnique({
        where: { id: batchId },
        include: { farm: { select: { ownerId: true }, include: { managers: { select: { id: true } } } } },
      });
      if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
      }
      const hasAccess =
        batch.farm.ownerId === userId ||
        batch.farm.managers.some((m: { id: string }) => m.id === userId);
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied to this batch" });
      }

      const inventories = await prisma.batchEggInventory.findMany({
        where: { batchId },
        select: { eggTypeId: true, quantity: true },
      });

      const quantities: Record<string, number> = {};
      const typesWithQty = types.map((t) => {
        const qty = inventories.find((i) => i.eggTypeId === t.id)?.quantity ?? 0;
        quantities[t.id] = Number(qty);
        return { ...t, quantity: Number(qty) };
      });

      return res.json({
        success: true,
        data: {
          quantities,
          types: typesWithQty,
          batchId,
        },
      });
    }

    const inventories = await prisma.eggInventory.findMany({
      where: { userId },
      select: { eggTypeId: true, quantity: true },
    });

    const quantities: Record<string, number> = {};
    const typesWithQty = types.map((t) => {
      const qty = inventories.find((i) => i.eggTypeId === t.id)?.quantity ?? 0;
      quantities[t.id] = Number(qty);
      return { ...t, quantity: Number(qty) };
    });

    return res.json({
      success: true,
      data: {
        quantities,
        types: typesWithQty,
      },
    });
  } catch (error) {
    console.error("Get egg inventory error:", error);
    return res
      .status(500)
      .json({ message: (error as Error)?.message || "Internal server error" });
  }
};
