import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";
import { CashflowError } from "../common/cashflow/errors";
import { toNepalDayKey } from "../utils/nepalBsDate";
import {
  deleteCompanySupplierPaymentMovements,
  postCompanySupplierPaymentMovement,
  resolveCompanyPaymentAccount,
} from "../services/companyCashflowAutoPost";
import { assertDeletePassword } from "./companyCashflowController";

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

    // Payments go with the supplier (cascade), so remove their Cash & Bank
    // entries in the same transaction.
    await prisma.$transaction(async (tx) => {
      const payments = await tx.companySupplierPayment.findMany({
        where: { supplierId: id, companyId: company.id },
        select: { id: true },
      });
      await deleteCompanySupplierPaymentMovements(tx, userId as string, payments.map((p) => p.id));
      await tx.supplier.delete({
        where: { id },
      });
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
    const userId = req.userId as string;
    const { id: supplierId } = req.params;
    const { amount, accountId, paymentDate, notes, reference } = req.body;

    const value = Number(amount);
    if (amount == null || !Number.isFinite(value) || value <= 0) {
      return res.status(400).json({ message: "Amount is required and must be positive" });
    }
    let paidOn = new Date();
    if (paymentDate) {
      paidOn = new Date(paymentDate);
      if (Number.isNaN(paidOn.getTime())) {
        return res.status(400).json({ message: "Valid payment date is required" });
      }
      // Compare Nepal days, not UTC days.
      if (toNepalDayKey(paidOn) > toNepalDayKey(new Date())) {
        return res.status(400).json({ message: "Payment date cannot be in the future" });
      }
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

    // Payment + Cash & Bank entry together. Method follows the account.
    const payment = await prisma.$transaction(async (tx) => {
      const cash = await resolveCompanyPaymentAccount(
        tx,
        userId,
        typeof accountId === "string" && accountId ? accountId : null,
      );
      const created = await tx.companySupplierPayment.create({
        data: {
          companyId: company.id,
          supplierId,
          amount: new Prisma.Decimal(value),
          paymentMethod: cash.paymentMethod,
          paymentDate: paidOn,
          notes: notes?.trim() || null,
          reference: reference?.trim() || null,
          recordedById: userId,
        },
      });
      await postCompanySupplierPaymentMovement({
        tx,
        userId,
        paymentId: created.id,
        accountId: cash.accountId,
        amount: value,
        date: paidOn,
        partyName: supplier.name,
        notes: created.notes,
        recordedById: req.actorType === "STAFF" ? req.staffUserId ?? userId : userId,
      });
      return created;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return res.status(201).json({
      success: true,
      data: payment,
      message: "Payment recorded successfully",
    });
  } catch (error) {
    if (error instanceof CashflowError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Record supplier payment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ==================== DELETE PAYMENT TO SUPPLIER ====================
// Needs the password of the person signed in (owner or staff). Also removes
// the Cash & Bank entry. The supplier balance is worked out from sums, so
// nothing else changes.
export const deleteSupplierPayment = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.userId as string;
    const { id: supplierId, paymentId } = req.params;

    await assertDeletePassword(req);

    const company = await prisma.company.findUnique({
      where: { ownerId: userId },
      select: { id: true },
    });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    await prisma.$transaction(async (tx) => {
      const payment = await tx.companySupplierPayment.findFirst({
        where: { id: paymentId, supplierId, companyId: company.id },
        select: { id: true },
      });
      if (!payment) throw new CashflowError("Payment not found", 404);
      await deleteCompanySupplierPaymentMovements(tx, userId, [payment.id]);
      await tx.companySupplierPayment.delete({ where: { id: payment.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return res.status(200).json({ success: true, message: "Payment deleted" });
  } catch (error) {
    if (error instanceof CashflowError) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error("Delete supplier payment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
