import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { ListForSaleCategory, ListForSaleStatus } from "@prisma/client";

const listForSaleSelectPublic = {
  id: true,
  companyName: true,
  category: true,
  phone: true,
  rate: true,
  quantity: true,
  unit: true,
  availabilityFrom: true,
  availabilityTo: true,
  avgWeightKg: true,
  eggVariants: true,
  typeVariants: true,
  createdAt: true,
};

// ==================== PUBLIC: GET LISTINGS (NO AUTH) ====================
export const getPublicListForSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const { category, limit = 50, offset = 0 } = req.query;
    const take = Math.min(Number(limit), 100);
    const skip = Number(offset);

    const where: { status: ListForSaleStatus; category?: ListForSaleCategory } = {
      status: ListForSaleStatus.ACTIVE,
    };
    if (category && typeof category === "string" && isValidCategory(category)) {
      where.category = category as ListForSaleCategory;
    }

    const [listings, total] = await Promise.all([
      prisma.listForSale.findMany({
        where,
        select: listForSaleSelectPublic,
        orderBy: { createdAt: "desc" },
        take,
        skip,
      }),
      prisma.listForSale.count({ where }),
    ]);

    return res.json({ success: true, data: listings, total });
  } catch (error) {
    console.error("Get public list for sale error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== FARMER: LIST OWN LISTINGS ====================
export const getFarmerListForSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { status, category } = req.query;
    const where: { userId: string; status?: ListForSaleStatus; category?: ListForSaleCategory } = { userId };
    if (status && (status === "ACTIVE" || status === "ARCHIVED")) where.status = status as ListForSaleStatus;
    if (category && typeof category === "string" && isValidCategory(category)) where.category = category as ListForSaleCategory;

    const listings = await prisma.listForSale.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, data: listings });
  } catch (error) {
    console.error("Get farmer list for sale error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== FARMER: GET ONE (for edit) ====================
export const getFarmerListForSaleById = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const listing = await prisma.listForSale.findFirst({
      where: { id, userId },
    });
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });
    return res.json({ success: true, data: listing });
  } catch (error) {
    console.error("Get farmer list for sale by id error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== FARMER: CREATE ====================
export const createListForSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { companyName: true } });
    const companyName = (user?.companyName ?? "").trim() || "N/A";

    const body = req.body;
    const { category, phone, rate, quantity, unit, availabilityFrom, availabilityTo, avgWeightKg, eggVariants, typeVariants } = body;

    if (!category || !isValidCategory(category)) {
      return res.status(400).json({ success: false, message: "Valid category is required (CHICKEN, EGGS, LAYERS, FISH, OTHER)" });
    }
    if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Phone is required" });
    }
    const qty = parseDecimal(quantity);
    if (qty === null || qty < 0) {
      return res.status(400).json({ success: false, message: "Valid quantity is required" });
    }
    if (!unit || typeof unit !== "string" || unit.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Unit is required" });
    }
    const from = parseDate(availabilityFrom);
    const to = parseDate(availabilityTo);
    if (!from || !to || from > to) {
      return res.status(400).json({ success: false, message: "Valid availability dates (from <= to) are required" });
    }

    if (category === "CHICKEN") {
      const avg = parseDecimal(avgWeightKg);
      if (avg === null || avg <= 0) {
        return res.status(400).json({ success: false, message: "Chicken requires average weight (avgWeightKg)" });
      }
    }
    let eggVariantsJson: unknown = null;
    let typeVariantsJson: unknown = null;
    if (category === "EGGS") {
      const variants = parseEggVariants(eggVariants);
      if (!variants || variants.length === 0) {
        return res.status(400).json({ success: false, message: "Eggs requires at least one size with quantity and rate" });
      }
      eggVariantsJson = variants;
    }
    if (category === "FISH" || category === "OTHER") {
      const variants = parseTypeVariants(typeVariants);
      if (!variants || variants.length === 0) {
        return res.status(400).json({ success: false, message: "Fish/Other requires at least one type with quantity and rate" });
      }
      typeVariantsJson = variants;
    }

    const rateVal = rate != null && rate !== "" ? parseDecimal(rate) : null;

    const created = await prisma.listForSale.create({
      data: {
        userId,
        companyName,
        category: category as ListForSaleCategory,
        phone: phone.trim(),
        rate: rateVal,
        quantity: qty,
        unit: unit.trim(),
        availabilityFrom: from,
        availabilityTo: to,
        avgWeightKg: category === "CHICKEN" && avgWeightKg != null ? (parseDecimal(avgWeightKg) ?? undefined) : undefined,
        eggVariants: eggVariantsJson as any,
        typeVariants: typeVariantsJson as any,
      },
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error("Create list for sale error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== FARMER: UPDATE (EDIT) ====================
export const updateListForSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const existing = await prisma.listForSale.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ success: false, message: "Listing not found" });

    const body = req.body;
    const { category, phone, rate, quantity, unit, availabilityFrom, availabilityTo, avgWeightKg, eggVariants, typeVariants, companyName } = body;

    const categoryVal = (category ?? existing.category) as ListForSaleCategory;
    if (category && !isValidCategory(category)) {
      return res.status(400).json({ success: false, message: "Valid category is required" });
    }
    const phoneVal = phone != null ? (typeof phone === "string" ? phone.trim() : "") : existing.phone;
    if (phoneVal.length === 0) {
      return res.status(400).json({ success: false, message: "Phone is required" });
    }
    const qty = quantity != null ? parseDecimal(quantity) : Number(existing.quantity);
    if (qty === null || qty < 0) {
      return res.status(400).json({ success: false, message: "Valid quantity is required" });
    }
    const unitVal = unit != null ? (typeof unit === "string" ? unit.trim() : "") : existing.unit;
    if (unitVal.length === 0) {
      return res.status(400).json({ success: false, message: "Unit is required" });
    }
    const from = availabilityFrom != null ? parseDate(availabilityFrom) : existing.availabilityFrom;
    const to = availabilityTo != null ? parseDate(availabilityTo) : existing.availabilityTo;
    if (!from || !to || from > to) {
      return res.status(400).json({ success: false, message: "Valid availability dates (from <= to) are required" });
    }

    if (categoryVal === "CHICKEN") {
      const avg = avgWeightKg != null ? parseDecimal(avgWeightKg) : Number(existing.avgWeightKg ?? 0);
      if (avg === null || avg <= 0) {
        return res.status(400).json({ success: false, message: "Chicken requires average weight (avgWeightKg)" });
      }
    }
    let eggVariantsJson: unknown = existing.eggVariants;
    let typeVariantsJson: unknown = existing.typeVariants;
    if (categoryVal === "EGGS") {
      const variants = parseEggVariants(eggVariants ?? existing.eggVariants);
      if (!variants || variants.length === 0) {
        return res.status(400).json({ success: false, message: "Eggs requires at least one size with quantity and rate" });
      }
      eggVariantsJson = variants;
    } else {
      eggVariantsJson = null;
    }
    if (categoryVal === "FISH" || categoryVal === "OTHER") {
      const variants = parseTypeVariants(typeVariants ?? existing.typeVariants);
      if (!variants || variants.length === 0) {
        return res.status(400).json({ success: false, message: "Fish/Other requires at least one type with quantity and rate" });
      }
      typeVariantsJson = variants;
    } else {
      typeVariantsJson = null;
    }

    const rateVal = rate !== undefined ? (rate == null || rate === "" ? null : parseDecimal(rate)) : (existing.rate != null ? Number(existing.rate) : null);

    const updated = await prisma.listForSale.update({
      where: { id },
      data: {
        category: categoryVal,
        phone: phoneVal,
        rate: rateVal,
        quantity: qty,
        unit: unitVal,
        availabilityFrom: from,
        availabilityTo: to,
        avgWeightKg: categoryVal === "CHICKEN"
          ? (avgWeightKg != null ? parseDecimal(avgWeightKg) : existing.avgWeightKg != null ? Number(existing.avgWeightKg) : null)
          : null,
        eggVariants: eggVariantsJson as any,
        typeVariants: typeVariantsJson as any,
      },
    });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update list for sale error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== FARMER: DELETE ====================
export const deleteListForSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const existing = await prisma.listForSale.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ success: false, message: "Listing not found" });

    await prisma.listForSale.delete({ where: { id } });
    return res.json({ success: true, message: "Listing deleted" });
  } catch (error) {
    console.error("Delete list for sale error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== FARMER: ARCHIVE ====================
export const archiveListForSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const existing = await prisma.listForSale.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ success: false, message: "Listing not found" });

    const updated = await prisma.listForSale.update({
      where: { id },
      data: { status: ListForSaleStatus.ARCHIVED },
    });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Archive list for sale error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== FARMER: UNARCHIVE ====================
export const unarchiveListForSale = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const existing = await prisma.listForSale.findFirst({ where: { id, userId } });
    if (!existing) return res.status(404).json({ success: false, message: "Listing not found" });

    const updated = await prisma.listForSale.update({
      where: { id },
      data: { status: ListForSaleStatus.ACTIVE },
    });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Unarchive list for sale error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// ==================== HELPERS ====================
function isValidCategory(c: string): boolean {
  return ["CHICKEN", "EGGS", "LAYERS", "FISH", "OTHER"].includes(c);
}

function parseDecimal(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function parseDate(v: any): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function parseEggVariants(v: any): Array<{ size: string; quantity: number; rate: number }> | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const out: Array<{ size: string; quantity: number; rate: number }> = [];
  for (const row of v) {
    const size = row?.size != null ? String(row.size).trim() : "";
    const q = parseDecimal(row?.quantity);
    const r = parseDecimal(row?.rate);
    if (size && q !== null && q >= 0 && r !== null && r >= 0) out.push({ size, quantity: q, rate: r });
  }
  return out.length > 0 ? out : null;
}

function parseTypeVariants(v: any): Array<{ type: string; quantity: number; rate: number }> | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const out: Array<{ type: string; quantity: number; rate: number }> = [];
  for (const row of v) {
    const type = row?.type != null ? String(row.type).trim() : "";
    const q = parseDecimal(row?.quantity);
    const r = parseDecimal(row?.rate);
    if (type && q !== null && q >= 0 && r !== null && r >= 0) out.push({ type, quantity: q, rate: r });
  }
  return out.length > 0 ? out : null;
}
