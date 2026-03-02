import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { CreateEggTypeSchema, UpdateEggTypeSchema } from "@myapp/shared-types";

export const getEggTypes = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId as string;
    const types = await prisma.eggType.findMany({
      where: { userId },
      orderBy: { displayOrder: "asc" },
    });
    return res.json({ success: true, data: types });
  } catch (error) {
    console.error("Get egg types error:", error);
    return res
      .status(500)
      .json({ message: (error as Error)?.message || "Internal server error" });
  }
};

export const createEggType = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId as string;
    const parsed = CreateEggTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    }
    const { name, code, displayOrder } = parsed.data;
    const codeUpper = code.toUpperCase().replace(/\s+/g, "_");
    const existing = await prisma.eggType.findUnique({
      where: { userId_code: { userId, code: codeUpper } },
    });
    if (existing) {
      return res.status(400).json({ message: "Egg type with this code already exists" });
    }
    const type = await prisma.eggType.create({
      data: {
        userId,
        name,
        code: codeUpper,
        displayOrder: displayOrder ?? 0,
      },
    });
    return res.status(201).json({ success: true, data: type });
  } catch (error) {
    console.error("Create egg type error:", error);
    return res
      .status(500)
      .json({ message: (error as Error)?.message || "Internal server error" });
  }
};

export const updateEggType = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId as string;
    const { id } = req.params;
    const parsed = UpdateEggTypeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    }
    const existing = await prisma.eggType.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return res.status(404).json({ message: "Egg type not found" });
    }
    const updateData: { name?: string; code?: string; displayOrder?: number } = {};
    if (parsed.data.name != null) updateData.name = parsed.data.name;
    if (parsed.data.code != null) {
      updateData.code = parsed.data.code.toUpperCase().replace(/\s+/g, "_");
      const conflict = await prisma.eggType.findFirst({
        where: { userId, code: updateData.code, id: { not: id } },
      });
      if (conflict) {
        return res.status(400).json({ message: "Egg type with this code already exists" });
      }
    }
    if (parsed.data.displayOrder != null) updateData.displayOrder = parsed.data.displayOrder;
    const type = await prisma.eggType.update({
      where: { id },
      data: updateData,
    });
    return res.json({ success: true, data: type });
  } catch (error) {
    console.error("Update egg type error:", error);
    return res
      .status(500)
      .json({ message: (error as Error)?.message || "Internal server error" });
  }
};

export const deleteEggType = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId as string;
    const { id } = req.params;
    const existing = await prisma.eggType.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: { inventories: true, batchEggInventories: true, productions: true, sales: true },
        },
      },
    });
    if (!existing) {
      return res.status(404).json({ message: "Egg type not found" });
    }
    const used =
      (existing._count.inventories ?? 0) +
      (existing._count.batchEggInventories ?? 0) +
      (existing._count.productions ?? 0) +
      (existing._count.sales ?? 0) >
      0;
    if (used) {
      return res
        .status(400)
        .json({ message: "Cannot delete egg type that has inventory, production, or sales" });
    }
    await prisma.eggType.delete({ where: { id } });
    return res.json({ success: true, message: "Egg type deleted" });
  } catch (error) {
    console.error("Delete egg type error:", error);
    return res
      .status(500)
      .json({ message: (error as Error)?.message || "Internal server error" });
  }
};
