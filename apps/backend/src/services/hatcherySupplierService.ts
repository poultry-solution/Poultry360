import prisma from "../utils/prisma";
import {
  HatcherySupplierTxnType,
  HatcheryPurchaseCategory,
} from "@prisma/client";
import { HatcheryInventoryService } from "./hatcheryInventoryService";

export class HatcherySupplierService {
  // ==================== BALANCE HELPERS ====================

  static balanceDelta(
    type: HatcherySupplierTxnType,
    amount: number
  ): number {
    // PURCHASE / ADJUSTMENT / OPENING_BALANCE → owe more (positive)
    // PAYMENT → owe less (negative)
    if (
      type === HatcherySupplierTxnType.PURCHASE ||
      type === HatcherySupplierTxnType.ADJUSTMENT ||
      type === HatcherySupplierTxnType.OPENING_BALANCE
    ) {
      return amount;
    }
    return -amount;
  }

  // ==================== SET OPENING BALANCE ====================

  static async setOpeningBalance(data: {
    supplierId: string;
    hatcheryOwnerId: string;
    amount: number;
    date: Date;
    note?: string;
  }) {
    const { supplierId, hatcheryOwnerId, amount, date, note } = data;

    return prisma.$transaction(async (tx) => {
      const supplier = await tx.hatcherySupplier.findFirst({
        where: { id: supplierId, hatcheryOwnerId },
      });
      if (!supplier) throw new Error("Supplier not found");

      // Remove existing opening balance txns
      await tx.hatcherySupplierTxn.deleteMany({
        where: { supplierId, type: HatcherySupplierTxnType.OPENING_BALANCE },
      });

      const newBalance = Number(supplier.balance) - Number(supplier.openingBalance) + amount;

      const txn = await tx.hatcherySupplierTxn.create({
        data: {
          supplierId,
          type: HatcherySupplierTxnType.OPENING_BALANCE,
          amount,
          balanceAfter: newBalance,
          date,
          note: note ?? "Opening balance",
        },
      });

      await tx.hatcherySupplier.update({
        where: { id: supplierId },
        data: {
          openingBalance: amount,
          balance: newBalance,
        },
      });

      return txn;
    });
  }

  // ==================== ADD PURCHASE ====================

  static async addPurchaseTxn(data: {
    supplierId: string;
    hatcheryOwnerId: string;
    category: HatcheryPurchaseCategory;
    items: Array<{
      itemName: string;
      quantity: number;
      freeQuantity?: number;
      unit: string;
      unitPrice: number;
      totalAmount: number;
    }>;
    date: Date;
    note?: string;
  }) {
    const { supplierId, hatcheryOwnerId, category, items, date, note } = data;

    const totalPurchaseAmount = items.reduce((s, i) => s + i.totalAmount, 0);

    return prisma.$transaction(
      async (tx) => {
        const supplier = await tx.hatcherySupplier.findFirst({
          where: { id: supplierId, hatcheryOwnerId },
        });
        if (!supplier) throw new Error("Supplier not found");

        const newBalance = Number(supplier.balance) + totalPurchaseAmount;

        const txn = await tx.hatcherySupplierTxn.create({
          data: {
            supplierId,
            type: HatcherySupplierTxnType.PURCHASE,
            amount: totalPurchaseAmount,
            balanceAfter: newBalance,
            date,
            note,
            purchaseCategory: category,
            items: {
              create: items.map((item) => ({
                itemName: item.itemName,
                quantity: item.quantity,
                freeQuantity: item.freeQuantity ?? 0,
                unit: item.unit,
                unitPrice: item.unitPrice,
                totalAmount: item.totalAmount,
              })),
            },
          },
          include: { items: true },
        });

        await tx.hatcherySupplier.update({
          where: { id: supplierId },
          data: { balance: newBalance },
        });

        // Update inventory for each line item
        for (const item of items) {
          await HatcheryInventoryService.upsertItemAndApplyPurchase(tx, {
            hatcheryOwnerId,
            supplierId,
            category,
            itemName: item.itemName,
            quantity: item.quantity,
            freeQuantity: item.freeQuantity ?? 0,
            unitPrice: item.unitPrice,
            totalAmount: item.totalAmount,
            unit: item.unit,
            date,
            supplierTxnId: txn.id,
          });
        }

        return txn;
      },
      { timeout: 20000 }
    );
  }

  // ==================== ADD PAYMENT ====================

  static async addPaymentTxn(data: {
    supplierId: string;
    hatcheryOwnerId: string;
    amount: number;
    date: Date;
    note?: string;
    reference?: string;
    receiptImageUrl?: string;
  }) {
    const {
      supplierId,
      hatcheryOwnerId,
      amount,
      date,
      note,
      reference,
      receiptImageUrl,
    } = data;

    return prisma.$transaction(async (tx) => {
      const supplier = await tx.hatcherySupplier.findFirst({
        where: { id: supplierId, hatcheryOwnerId },
      });
      if (!supplier) throw new Error("Supplier not found");

      const newBalance = Number(supplier.balance) - amount;

      const txn = await tx.hatcherySupplierTxn.create({
        data: {
          supplierId,
          type: HatcherySupplierTxnType.PAYMENT,
          amount,
          balanceAfter: newBalance,
          date,
          note,
          reference,
          receiptImageUrl,
        },
      });

      await tx.hatcherySupplier.update({
        where: { id: supplierId },
        data: { balance: newBalance },
      });

      return txn;
    });
  }

  // ==================== DELETE TRANSACTION ====================

  static async deleteTxn(data: {
    txnId: string;
    supplierId: string;
    hatcheryOwnerId: string;
  }) {
    const { txnId, supplierId, hatcheryOwnerId } = data;

    return prisma.$transaction(
      async (tx) => {
        const supplier = await tx.hatcherySupplier.findFirst({
          where: { id: supplierId, hatcheryOwnerId },
        });
        if (!supplier) throw new Error("Supplier not found");

        const txnToDelete = await tx.hatcherySupplierTxn.findFirst({
          where: { id: txnId, supplierId },
        });
        if (!txnToDelete) throw new Error("Transaction not found");

        // For PURCHASE: reverse inventory
        if (txnToDelete.type === HatcherySupplierTxnType.PURCHASE) {
          await HatcheryInventoryService.reverseInventoryForSupplierTxn(
            tx,
            txnId
          );
        }

        // Recompute balance by removing this txn's delta
        const delta = HatcherySupplierService.balanceDelta(
          txnToDelete.type,
          Number(txnToDelete.amount)
        );
        const newBalance = Number(supplier.balance) - delta;

        await tx.hatcherySupplierTxn.delete({ where: { id: txnId } });

        await tx.hatcherySupplier.update({
          where: { id: supplierId },
          data: { balance: newBalance },
        });

        return { deleted: txnId, newBalance };
      },
      { timeout: 20000 }
    );
  }
}
