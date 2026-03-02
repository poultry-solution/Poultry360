import { Request, Response } from "express";
import prisma from "../utils/prisma";

/**
 * GET /egg-inventory
 * Returns current user's egg inventory by dynamic egg types.
 * data.quantities: { [eggTypeId]: quantity }
 * data.types: [{ id, name, code, quantity }] for UI
 */
export const getEggInventory = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId as string;

    const types = await prisma.eggType.findMany({
      where: { userId },
      orderBy: { displayOrder: "asc" },
      select: { id: true, name: true, code: true },
    });

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
