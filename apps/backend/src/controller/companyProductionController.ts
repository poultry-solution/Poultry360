import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";

// Helper: get remaining per bucket (rawMaterialId, supplierId, unitPrice) for company
async function getBucketRemaining(companyId: string) {
  const [items, used] = await Promise.all([
    prisma.companyPurchaseItem.findMany({
      where: { purchase: { companyId } },
      select: { rawMaterialId: true, quantity: true, unitPrice: true, purchase: { select: { supplierId: true } } },
    }),
    prisma.productionInput.findMany({
      where: { production: { companyId } },
      select: { rawMaterialId: true, supplierId: true, unitPrice: true, quantity: true },
    }),
  ]);
  const purchased = new Map<string, number>();
  for (const i of items) {
    const key = `${i.rawMaterialId}|${i.purchase.supplierId}|${Number(i.unitPrice)}`;
    purchased.set(key, (purchased.get(key) ?? 0) + Number(i.quantity));
  }
  const usedMap = new Map<string, number>();
  for (const u of used) {
    const key = `${u.rawMaterialId}|${u.supplierId}|${Number(u.unitPrice)}`;
    usedMap.set(key, (usedMap.get(key) ?? 0) + Number(u.quantity));
  }
  const remaining = new Map<string, number>();
  for (const [key, qty] of purchased) {
    remaining.set(key, Math.max(0, qty - (usedMap.get(key) ?? 0)));
  }
  return remaining;
}

// ==================== CREATE PRODUCTION RUN ====================
// Inputs must be buckets from purchases list: rawMaterialId, supplierId, unitPrice, quantity.
export const createProductionRun = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { date, referenceNumber, notes, inputs, outputs } = req.body;

    if (!inputs || !Array.isArray(inputs) || inputs.length === 0) {
      return res.status(400).json({ message: "At least one input (bucket + quantity) is required" });
    }
    if (!outputs || !Array.isArray(outputs) || outputs.length === 0) {
      return res.status(400).json({ message: "At least one output (name + quantity) is required" });
    }

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const validInputs: { rawMaterialId: string; supplierId: string; unitPrice: number; quantity: number }[] = [];
    for (const row of inputs) {
      const rawMaterialId = row.rawMaterialId;
      const supplierId = row.supplierId;
      const unitPrice = Number(row.unitPrice ?? 0);
      const quantity = Number(row.quantity);
      if (!rawMaterialId || !supplierId || quantity <= 0) continue;
      validInputs.push({ rawMaterialId, supplierId, unitPrice, quantity });
    }
    if (validInputs.length === 0) {
      return res.status(400).json({
        message: "At least one valid input (item + supplier + rate + quantity > 0) is required",
      });
    }

    const validOutputs: { productName: string; quantity: number; unit?: string }[] = [];
    for (const row of outputs) {
      const productName = String(row.productName ?? "").trim();
      const quantity = Number(row.quantity);
      if (!productName || quantity <= 0) continue;
      validOutputs.push({
        productName,
        quantity,
        unit: row.unit ? String(row.unit).trim() || undefined : undefined,
      });
    }
    if (validOutputs.length === 0) {
      return res.status(400).json({ message: "At least one valid output (name, quantity > 0) is required" });
    }

    const remaining = await getBucketRemaining(company.id);
    const rawMaterials = await prisma.rawMaterial.findMany({
      where: { id: { in: validInputs.map((i) => i.rawMaterialId) }, companyId: company.id },
      select: { id: true, name: true },
    });
    const rawMaterialSet = new Set(rawMaterials.map((r) => r.id));

    for (const inp of validInputs) {
      if (!rawMaterialSet.has(inp.rawMaterialId)) {
        return res.status(400).json({
          message: `Raw material not found or does not belong to your company: ${inp.rawMaterialId}`,
        });
      }
      const key = `${inp.rawMaterialId}|${inp.supplierId}|${inp.unitPrice}`;
      const avail = remaining.get(key) ?? 0;
      if (avail < inp.quantity) {
        const rm = rawMaterials.find((r) => r.id === inp.rawMaterialId);
        return res.status(400).json({
          message: `Insufficient quantity for ${rm?.name ?? inp.rawMaterialId} (this supplier/rate). Available: ${avail}, required: ${inp.quantity}`,
        });
      }
      remaining.set(key, avail - inp.quantity);
    }

    const runDate = date ? new Date(date) : new Date();

    const run = await prisma.$transaction(async (tx) => {
      const productionRecord = await tx.productionRun.create({
        data: {
          companyId: company.id,
          date: runDate,
          referenceNumber: referenceNumber?.trim() || null,
          notes: notes?.trim() || null,
          createdById: userId,
        },
      });

      for (const inp of validInputs) {
        await tx.productionInput.create({
          data: {
            productionId: productionRecord.id,
            rawMaterialId: inp.rawMaterialId,
            supplierId: inp.supplierId,
            unitPrice: new Prisma.Decimal(inp.unitPrice),
            quantity: new Prisma.Decimal(inp.quantity),
          },
        });
        await tx.rawMaterial.update({
          where: { id: inp.rawMaterialId },
          data: { currentStock: { decrement: new Prisma.Decimal(inp.quantity) } },
        });
      }

      for (const out of validOutputs) {
        await tx.productionOutput.create({
          data: {
            productionId: productionRecord.id,
            productName: out.productName,
            quantity: new Prisma.Decimal(out.quantity),
            unit: out.unit ?? "kg",
          },
        });
      }

      return tx.productionRun.findUnique({
        where: { id: productionRecord.id },
        include: {
          inputs: {
            include: {
              rawMaterial: { select: { id: true, name: true, unit: true } },
              supplier: { select: { id: true, name: true } },
            },
          },
          outputs: true,
        },
      });
    });

    return res.status(201).json({
      success: true,
      data: run,
      message: "Production run recorded successfully",
    });
  } catch (error) {
    console.error("Create production run error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== LIST PRODUCTION RUNS ====================
export const getProductionRuns = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { page = 1, limit = 50 } = req.query;

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [runs, total] = await Promise.all([
      prisma.productionRun.findMany({
        where: { companyId: company.id },
        skip,
        take: Number(limit),
        orderBy: { date: "desc" },
        include: {
          inputs: {
            include: {
              rawMaterial: { select: { id: true, name: true, unit: true } },
              supplier: { select: { id: true, name: true } },
            },
          },
          outputs: true,
        },
      }),
      prisma.productionRun.count({ where: { companyId: company.id } }),
    ]);

    return res.status(200).json({
      success: true,
      data: runs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Get production runs error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET PRODUCTION RUN BY ID ====================
export const getProductionRunById = async (req: Request, res: Response): Promise<any> => {
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

    const run = await prisma.productionRun.findFirst({
      where: { id, companyId: company.id },
      include: {
        inputs: {
          include: {
            rawMaterial: { select: { id: true, name: true, unit: true } },
            supplier: { select: { id: true, name: true } },
          },
        },
        outputs: true,
      },
    });

    if (!run) {
      return res.status(404).json({ message: "Production run not found" });
    }

    return res.status(200).json({
      success: true,
      data: run,
    });
  } catch (error) {
    console.error("Get production run error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
