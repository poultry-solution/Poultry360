import { Request, Response } from "express";
import prisma from "../utils/prisma";

const parsePage = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const listHatcheryProducts = async (req: Request, res: Response): Promise<any> => {
  try {
    const hatcheryOwnerId = req.userId!;
    const page = parsePage(req.query.page, 1);
    const limit = Math.min(parsePage(req.query.limit, 25), 100);
    const search = String(req.query.search ?? "").trim();
    const includeArchived = req.query.includeArchived === "true";

    const where = {
      hatcheryOwnerId,
      ...(includeArchived ? {} : { deletedAt: null }),
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    };

    const [products, total] = await Promise.all([
      prisma.hatcheryManufacturedProduct.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: "asc" },
        include: {
          inventoryLots: {
            where: { deletedAt: null },
            select: { id: true, currentStock: true, effectiveUnitCost: true, createdAt: true },
          },
        },
      }),
      prisma.hatcheryManufacturedProduct.count({ where }),
    ]);

    const data = products.map(({ inventoryLots, ...product }) => ({
      ...product,
      currentStock: inventoryLots.reduce((sum, lot) => sum + Number(lot.currentStock), 0),
      lotCount: inventoryLots.length,
      inventoryLots,
    }));

    return res.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("listHatcheryProducts:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createHatcheryProduct = async (req: Request, res: Response): Promise<any> => {
  try {
    const hatcheryOwnerId = req.userId!;
    const name = String(req.body.name ?? "").trim();
    const unit = String(req.body.unit ?? "kg").trim();
    const minStock = req.body.minStock;

    if (!name) return res.status(400).json({ message: "name is required" });
    if (!unit) return res.status(400).json({ message: "unit is required" });
    if (minStock !== undefined && minStock !== null && (!Number.isFinite(Number(minStock)) || Number(minStock) < 0)) {
      return res.status(400).json({ message: "minStock must be a non-negative number" });
    }

    const duplicate = await prisma.hatcheryManufacturedProduct.findFirst({
      where: { hatcheryOwnerId, name: { equals: name, mode: "insensitive" }, unit: { equals: unit, mode: "insensitive" } },
    });
    if (duplicate && !duplicate.deletedAt) return res.status(409).json({ message: "A Self Made product with this name and unit already exists" });
    if (duplicate?.deletedAt) {
      const restored = await prisma.hatcheryManufacturedProduct.update({
        where: { id: duplicate.id },
        data: { name, unit, minStock: minStock === undefined || minStock === null ? null : Number(minStock), deletedAt: null },
      });
      return res.status(201).json({ success: true, data: { ...restored, currentStock: 0, lotCount: 0 }, message: "Self Made product restored" });
    }

    const product = await prisma.hatcheryManufacturedProduct.create({
      data: {
        hatcheryOwnerId,
        name,
        unit,
        minStock: minStock === undefined || minStock === null ? null : Number(minStock),
      },
    });
    return res.status(201).json({ success: true, data: { ...product, currentStock: 0, lotCount: 0 } });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({ message: "A Self Made product with this name and unit already exists" });
    }
    console.error("createHatcheryProduct:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateHatcheryProduct = async (req: Request, res: Response): Promise<any> => {
  try {
    const hatcheryOwnerId = req.userId!;
    const product = await prisma.hatcheryManufacturedProduct.findFirst({
      where: { id: req.params.id, hatcheryOwnerId, deletedAt: null },
    });
    if (!product) return res.status(404).json({ message: "Self Made product not found" });

    const name = req.body.name === undefined ? product.name : String(req.body.name).trim();
    const unit = req.body.unit === undefined ? product.unit : String(req.body.unit).trim();
    const minStock = req.body.minStock;
    if (!name || !unit) return res.status(400).json({ message: "name and unit are required" });
    if (minStock !== undefined && minStock !== null && (!Number.isFinite(Number(minStock)) || Number(minStock) < 0)) {
      return res.status(400).json({ message: "minStock must be a non-negative number" });
    }
    if (unit !== product.unit) {
      const productionCount = await prisma.hatcheryProductionOutput.count({ where: { productId: product.id } });
      if (productionCount > 0) return res.status(409).json({ message: "Unit cannot be changed after this product has production history" });
    }

    const duplicate = await prisma.hatcheryManufacturedProduct.findFirst({
      where: { id: { not: product.id }, hatcheryOwnerId, name: { equals: name, mode: "insensitive" }, unit: { equals: unit, mode: "insensitive" }, deletedAt: null },
      select: { id: true },
    });
    if (duplicate) return res.status(409).json({ message: "A Self Made product with this name and unit already exists" });

    const updated = await prisma.hatcheryManufacturedProduct.update({
      where: { id: product.id },
      data: {
        name,
        unit,
        minStock: minStock === undefined ? product.minStock : minStock === null ? null : Number(minStock),
      },
    });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return res.status(409).json({ message: "A Self Made product with this name and unit already exists" });
    }
    console.error("updateHatcheryProduct:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const archiveHatcheryProduct = async (req: Request, res: Response): Promise<any> => {
  try {
    const hatcheryOwnerId = req.userId!;
    const product = await prisma.hatcheryManufacturedProduct.findFirst({
      where: { id: req.params.id, hatcheryOwnerId, deletedAt: null },
      include: { inventoryLots: { where: { deletedAt: null }, select: { currentStock: true } } },
    });
    if (!product) return res.status(404).json({ message: "Self Made product not found" });
    const stock = product.inventoryLots.reduce((sum, lot) => sum + Number(lot.currentStock), 0);
    if (stock > 0) {
      return res.status(409).json({ message: "Use all remaining stock before archiving this product" });
    }
    await prisma.hatcheryManufacturedProduct.update({ where: { id: product.id }, data: { deletedAt: new Date() } });
    return res.json({ success: true, message: "Self Made product archived" });
  } catch (error) {
    console.error("archiveHatcheryProduct:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
