import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";

// ==================== LIST SUPPLIERS ====================
export const listSuppliers = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const suppliers = await prisma.supplier.findMany({
      where: { companyId: company.id },
      orderBy: { name: "asc" },
    });

    return res.status(200).json({
      success: true,
      data: suppliers,
    });
  } catch (error) {
    console.error("List suppliers error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== CREATE SUPPLIER ====================
export const createSupplier = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { name, contact, address } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Supplier name is required" });
    }

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const supplier = await prisma.supplier.create({
      data: {
        companyId: company.id,
        name: name.trim(),
        contact: contact?.trim() || null,
        address: address?.trim() || null,
      },
    });

    return res.status(201).json({
      success: true,
      data: supplier,
      message: "Supplier created successfully",
    });
  } catch (error) {
    console.error("Create supplier error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== GET SUPPLIER BY ID ====================
export const getSupplierById = async (req: Request, res: Response): Promise<any> => {
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

    const supplier = await prisma.supplier.findFirst({
      where: { id, companyId: company.id },
    });
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    return res.status(200).json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error("Get supplier error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== UPDATE SUPPLIER ====================
export const updateSupplier = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { name, contact, address } = req.body;

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const existing = await prisma.supplier.findFirst({
      where: { id, companyId: company.id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(contact !== undefined && { contact: contact ? String(contact).trim() : null }),
        ...(address !== undefined && { address: address ? String(address).trim() : null }),
      },
    });

    return res.status(200).json({
      success: true,
      data: supplier,
      message: "Supplier updated successfully",
    });
  } catch (error) {
    console.error("Update supplier error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE SUPPLIER ====================
export const deleteSupplier = async (req: Request, res: Response): Promise<any> => {
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

    const existing = await prisma.supplier.findFirst({
      where: { id, companyId: company.id },
    });
    if (!existing) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    await prisma.supplier.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    console.error("Delete supplier error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== SUPPLIER LEDGER (balance + purchases + payments) ====================
export const getSupplierLedger = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { id: supplierId } = req.params;

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

    const [purchasesAgg, paymentsAgg, purchasesList, paymentsList] = await Promise.all([
      prisma.companyPurchase.aggregate({
        where: { supplierId, companyId: company.id },
        _sum: { totalAmount: true },
      }),
      prisma.companySupplierPayment.aggregate({
        where: { supplierId, companyId: company.id },
        _sum: { amount: true },
      }),
      prisma.companyPurchase.findMany({
        where: { supplierId, companyId: company.id },
        include: {
          items: {
            include: {
              rawMaterial: {
                select: { id: true, name: true, unit: true },
              },
            },
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.companySupplierPayment.findMany({
        where: { supplierId, companyId: company.id },
        orderBy: { paymentDate: "desc" },
      }),
    ]);

    const purchased = Number(purchasesAgg._sum.totalAmount ?? 0);
    const paid = Number(paymentsAgg._sum.amount ?? 0);
    const balance = purchased - paid;

    return res.status(200).json({
      success: true,
      data: {
        supplier,
        balance,
        purchased,
        paid,
        purchases: purchasesList,
        payments: paymentsList,
      },
    });
  } catch (error) {
    console.error("Get supplier ledger error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== RECORD PAYMENT TO SUPPLIER ====================
export const recordSupplierPayment = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId;
    const { id: supplierId } = req.params;
    const { amount, paymentMethod, paymentDate, notes, reference } = req.body;

    if (amount == null || Number(amount) <= 0) {
      return res.status(400).json({ message: "Amount is required and must be positive" });
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

    const payment = await prisma.companySupplierPayment.create({
      data: {
        companyId: company.id,
        supplierId,
        amount: new Prisma.Decimal(amount),
        paymentMethod: paymentMethod || "CASH",
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        notes: notes?.trim() || null,
        reference: reference?.trim() || null,
        recordedById: userId,
      },
    });

    return res.status(201).json({
      success: true,
      data: payment,
      message: "Payment recorded successfully",
    });
  } catch (error) {
    console.error("Record supplier payment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
