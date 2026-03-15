import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";

// ==================== CREATE PURCHASE ====================
export const createCompanyPurchase = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { supplierId, date, referenceNumber, notes, items } = req.body;

    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Supplier and at least one item are required",
      });
    }

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const supplier = await prisma.supplier.findFirst({
      where: { id: supplierId, companyId: company.id },
    });
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const purchaseDate = date ? new Date(date) : new Date();
    let totalAmount = 0;
    const validItems: { rawMaterialId: string; quantity: number; unitPrice: number; totalAmount: number }[] = [];

    for (const row of items) {
      const rawMaterialId = row.rawMaterialId;
      const quantity = Number(row.quantity);
      const unitPrice = Number(row.unitPrice ?? 0);
      if (!rawMaterialId || quantity <= 0) continue;
      const lineTotal = quantity * unitPrice;
      totalAmount += lineTotal;
      validItems.push({ rawMaterialId, quantity, unitPrice, totalAmount: lineTotal });
    }

    if (validItems.length === 0) {
      return res.status(400).json({ message: "At least one valid item (raw material, quantity > 0) is required" });
    }

    const rawMaterialIds = validItems.map((i) => i.rawMaterialId);
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: {
        id: { in: rawMaterialIds },
        companyId: company.id,
      },
      select: { id: true, name: true },
    });
    const rawMaterialIdSet = new Set(rawMaterials.map((r: { id: string }) => r.id));
    const missing = rawMaterialIds.filter((id) => !rawMaterialIdSet.has(id));
    if (missing.length > 0) {
      return res.status(400).json({
        message: `Raw materials not found or do not belong to your company: ${missing.join(", ")}`,
      });
    }

    const purchase = await prisma.$transaction(async (tx) => {
      const purchaseRecord = await tx.companyPurchase.create({
        data: {
          companyId: company.id,
          supplierId,
          date: purchaseDate,
          referenceNumber: referenceNumber?.trim() || null,
          notes: notes?.trim() || null,
          totalAmount: new Prisma.Decimal(totalAmount),
          createdById: userId,
        },
      });

      for (const item of validItems) {
        await tx.companyPurchaseItem.create({
          data: {
            purchaseId: purchaseRecord.id,
            rawMaterialId: item.rawMaterialId,
            quantity: new Prisma.Decimal(item.quantity),
            unitPrice: new Prisma.Decimal(item.unitPrice),
            totalAmount: new Prisma.Decimal(item.totalAmount),
          },
        });

        await tx.rawMaterial.update({
          where: { id: item.rawMaterialId },
          data: {
            currentStock: { increment: new Prisma.Decimal(item.quantity) },
          },
        });
      }

      return tx.companyPurchase.findUnique({
        where: { id: purchaseRecord.id },
        include: {
          supplier: true,
          items: {
            include: {
              rawMaterial: {
                select: { id: true, name: true, unit: true },
              },
            },
          },
        },
      });
    });

    return res.status(201).json({
      success: true,
      data: purchase,
      message: "Purchase recorded successfully",
    });
  } catch (error) {
    console.error("Create company purchase error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== LIST PURCHASES ====================
export const getCompanyPurchases = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 20, supplierId } = req.query;

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const where: Prisma.CompanyPurchaseWhereInput = { companyId: company.id };
    if (supplierId && typeof supplierId === "string") {
      where.supplierId = supplierId;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [purchases, total] = await Promise.all([
      prisma.companyPurchase.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          supplier: { select: { id: true, name: true } },
          items: {
            include: {
              rawMaterial: { select: { id: true, name: true, unit: true } },
            },
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.companyPurchase.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      data: purchases,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get company purchases error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET AGGREGATED PURCHASES (for list / production inventory) ====================
// One row per (rawMaterial + supplier + unit + unitPrice). totalQuantity/totalAmount = purchased;
// totalUsed = from production; remainingQuantity/remainingAmount = available for use.
export const getCompanyPurchasesAggregated = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const [items, productionInputs] = await Promise.all([
      prisma.companyPurchaseItem.findMany({
        where: { purchase: { companyId: company.id } },
        include: {
          rawMaterial: { select: { id: true, name: true, unit: true } },
          purchase: { select: { supplierId: true, supplier: { select: { id: true, name: true } } } },
        },
      }),
      prisma.productionInput.findMany({
        where: { production: { companyId: company.id } },
        select: { rawMaterialId: true, supplierId: true, unitPrice: true, quantity: true },
      }),
    ]);

    const map = new Map<
      string,
      {
        rawMaterialId: string;
        rawMaterial: { id: string; name: string; unit: string };
        supplierId: string;
        supplier: { id: string; name: string };
        unitPrice: number;
        totalQuantity: number;
        totalAmount: number;
        totalUsed: number;
        remainingQuantity: number;
        remainingAmount: number;
      }
    >();

    for (const item of items) {
      const key = `${item.rawMaterialId}|${item.purchase.supplierId}|${item.rawMaterial.unit}|${Number(item.unitPrice)}`;
      const existing = map.get(key);
      const qty = Number(item.quantity);
      const amt = Number(item.totalAmount);
      if (existing) {
        existing.totalQuantity += qty;
        existing.totalAmount += amt;
      } else {
        map.set(key, {
          rawMaterialId: item.rawMaterialId,
          rawMaterial: item.rawMaterial,
          supplierId: item.purchase.supplierId,
          supplier: item.purchase.supplier,
          unitPrice: Number(item.unitPrice),
          totalQuantity: qty,
          totalAmount: amt,
          totalUsed: 0,
          remainingQuantity: 0,
          remainingAmount: 0,
        });
      }
    }

    for (const pi of productionInputs) {
      for (const bucket of map.values()) {
        if (
          bucket.rawMaterialId === pi.rawMaterialId &&
          bucket.supplierId === pi.supplierId &&
          bucket.unitPrice === Number(pi.unitPrice)
        ) {
          bucket.totalUsed += Number(pi.quantity);
          break;
        }
      }
    }

    for (const bucket of map.values()) {
      bucket.remainingQuantity = Math.max(0, bucket.totalQuantity - bucket.totalUsed);
      bucket.remainingAmount = bucket.remainingQuantity * bucket.unitPrice;
    }

    const data = Array.from(map.values()).sort(
      (a, b) => a.rawMaterial.name.localeCompare(b.rawMaterial.name) || a.supplier.name.localeCompare(b.supplier.name)
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Get company purchases aggregated error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET PURCHASE BY ID ====================
export const getCompanyPurchaseById = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const purchase = await prisma.companyPurchase.findFirst({
      where: { id, companyId: company.id },
      include: {
        supplier: true,
        items: {
          include: {
            rawMaterial: {
              select: { id: true, name: true, unit: true },
            },
          },
        },
      },
    });

    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    return res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    console.error("Get company purchase error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
