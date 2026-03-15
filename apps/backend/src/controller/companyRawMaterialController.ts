import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";

// ==================== LIST RAW MATERIALS ====================
export const listRawMaterials = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const rawMaterials = await prisma.rawMaterial.findMany({
      where: { companyId: company.id },
      orderBy: [{ name: "asc" }, { unit: "asc" }],
    });

    return res.status(200).json({
      success: true,
      data: rawMaterials,
    });
  } catch (error) {
    console.error("List raw materials error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE RAW MATERIAL ====================
export const createRawMaterial = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { name, unit } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }
    if (!unit || typeof unit !== "string" || !unit.trim()) {
      return res.status(400).json({ message: "Unit is required" });
    }

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const existing = await prisma.rawMaterial.findUnique({
      where: {
        companyId_name_unit: {
          companyId: company.id,
          name: name.trim(),
          unit: unit.trim(),
        },
      },
    });
    if (existing) {
      return res.status(400).json({
        message: "A raw material with this name and unit already exists",
      });
    }

    const rawMaterial = await prisma.rawMaterial.create({
      data: {
        companyId: company.id,
        name: name.trim(),
        unit: unit.trim(),
        currentStock: new Prisma.Decimal(0),
      },
    });

    return res.status(201).json({
      success: true,
      data: rawMaterial,
      message: "Raw material added",
    });
  } catch (error) {
    console.error("Create raw material error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET BY ID ====================
export const getRawMaterialById = async (req: Request, res: Response): Promise<any> => {
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

    const rawMaterial = await prisma.rawMaterial.findFirst({
      where: { id, companyId: company.id },
    });
    if (!rawMaterial) {
      return res.status(404).json({ message: "Raw material not found" });
    }

    return res.status(200).json({
      success: true,
      data: rawMaterial,
    });
  } catch (error) {
    console.error("Get raw material error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE ====================
export const updateRawMaterial = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { name, unit } = req.body;

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const existing = await prisma.rawMaterial.findFirst({
      where: { id, companyId: company.id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Raw material not found" });
    }

    const rawMaterial = await prisma.rawMaterial.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(unit !== undefined && { unit: String(unit).trim() }),
      },
    });

    return res.status(200).json({
      success: true,
      data: rawMaterial,
      message: "Raw material updated",
    });
  } catch (error) {
    console.error("Update raw material error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE ====================
export const deleteRawMaterial = async (req: Request, res: Response): Promise<any> => {
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

    const existing = await prisma.rawMaterial.findFirst({
      where: { id, companyId: company.id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Raw material not found" });
    }

    await prisma.rawMaterial.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Raw material deleted",
    });
  } catch (error) {
    console.error("Delete raw material error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
