import { Request, Response } from "express";
import prisma from "../utils/prisma";

/**
 * GET /egg-inventory
 * Returns current user's egg inventory by category (LARGE, MEDIUM, SMALL).
 */
export const getEggInventory = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId as string;

    const records = await prisma.eggInventory.findMany({
      where: { userId },
      select: { eggCategory: true, quantity: true },
    });

    const LARGE = records.find((r) => r.eggCategory === "LARGE")?.quantity ?? 0;
    const MEDIUM = records.find((r) => r.eggCategory === "MEDIUM")?.quantity ?? 0;
    const SMALL = records.find((r) => r.eggCategory === "SMALL")?.quantity ?? 0;

    return res.json({
      success: true,
      data: {
        LARGE: Number(LARGE),
        MEDIUM: Number(MEDIUM),
        SMALL: Number(SMALL),
      },
    });
  } catch (error) {
    console.error("Get egg inventory error:", error);
    return res
      .status(500)
      .json({ message: (error as Error)?.message || "Internal server error" });
  }
};
