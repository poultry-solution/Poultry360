import prisma from "../utils/prisma";
import {
  HatcherySupplierTxnType,
  HatcheryPurchaseCategory,
  HatcherySex,
} from "@prisma/client";
import { HatcheryInventoryService } from "./hatcheryInventoryService";
import { cleanupUploadedImage } from "../utils/cloudinary";

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
      // Serialise concurrent `setOpeningBalance` calls with each other for
      // this supplier. "Set opening" is a replace, not an increment, so it
      // cannot be made correct with an atomic delta alone — if two users
      // set an opening at the same time the deltas would both apply and
      // the final balance would be wrong.
      //
      // Scope note: this lock protects only against *other setOpeningBalance
      // calls*. Purchase / payment / delete paths do not acquire it because
      // (a) each is a true accumulator safe under atomic `{ increment }` /
      // `{ decrement }` and (b) they never write `supplier.openingBalance`
      // — only this function does, so there is nothing for them to collide
      // with. A purchase that commits mid-way through this function would
      // move `balance` under us atomically; our `increment: delta` still
      // applies correctly on top of the fresh value.
      await (tx as any).$queryRawUnsafe(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))::text AS l`,
        `hatchery-supplier-balance:${supplierId}`
      );

      const supplier = await tx.hatcherySupplier.findFirst({
        where: { id: supplierId, hatcheryOwnerId },
      });
      if (!supplier) throw new Error("Supplier not found");

      // Remove existing opening balance txns
      await tx.hatcherySupplierTxn.deleteMany({
        where: { supplierId, type: HatcherySupplierTxnType.OPENING_BALANCE },
      });

      // Atomic delta on balance; absolute set on openingBalance. Under the
      // advisory lock the delta is safe because `supplier.openingBalance`
      // cannot change between read and write for this supplier.
      const delta = amount - Number(supplier.openingBalance);
      const updated = await tx.hatcherySupplier.update({
        where: { id: supplierId },
        data: {
          openingBalance: amount,
          balance: { increment: delta },
        },
        select: { balance: true },
      });

      const txn = await tx.hatcherySupplierTxn.create({
        data: {
          supplierId,
          type: HatcherySupplierTxnType.OPENING_BALANCE,
          amount,
          balanceAfter: updated.balance,
          date,
          note: note ?? "Opening balance",
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
      sex: HatcherySex;
    }>;
    date: Date;
    note?: string;
    receiptImageUrl?: string;
  }) {
    const { supplierId, hatcheryOwnerId, category, items, date, note, receiptImageUrl } = data;

    const totalPurchaseAmount = items.reduce((s, i) => s + i.totalAmount, 0);

    return prisma.$transaction(
      async (tx) => {
        const supplier = await tx.hatcherySupplier.findFirst({
          where: { id: supplierId, hatcheryOwnerId },
          select: { id: true },
        });
        if (!supplier) throw new Error("Supplier not found");

        // Atomic balance update. Postgres serialises row-level writes so
        // two concurrent purchases cannot both read a stale balance and
        // write the same new value (fixes bug §1 HIGH "balance lost on
        // same-time saves"). The `balanceAfter` we write on the txn below
        // is read from this same update's return, so the two writes are
        // transactionally consistent — any payment that commits after this
        // tx will observe both the new balance AND the matching txn row.
        const updated = await tx.hatcherySupplier.update({
          where: { id: supplierId },
          data: { balance: { increment: totalPurchaseAmount } },
          select: { balance: true },
        });

        const txn = await tx.hatcherySupplierTxn.create({
          data: {
            supplierId,
            type: HatcherySupplierTxnType.PURCHASE,
            amount: totalPurchaseAmount,
            balanceAfter: updated.balance,
            date,
            note,
            purchaseCategory: category,
            receiptImageUrl:
              typeof receiptImageUrl === "string" && receiptImageUrl.trim()
                ? receiptImageUrl.trim()
                : null,
            items: {
              create: items.map((item) => ({
                itemName: item.itemName,
                quantity: item.quantity,
                freeQuantity: item.freeQuantity ?? 0,
                unit: item.unit,
                unitPrice: item.unitPrice,
                totalAmount: item.totalAmount,
                sex: item.sex,
              })),
            },
          },
          include: { items: true },
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
            sex: item.sex,
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
        select: { id: true },
      });
      if (!supplier) throw new Error("Supplier not found");

      // Atomic decrement — see addPurchaseTxn for the same reasoning.
      const updated = await tx.hatcherySupplier.update({
        where: { id: supplierId },
        data: { balance: { decrement: amount } },
        select: { balance: true },
      });

      const txn = await tx.hatcherySupplierTxn.create({
        data: {
          supplierId,
          type: HatcherySupplierTxnType.PAYMENT,
          amount,
          balanceAfter: updated.balance,
          date,
          note,
          reference,
          receiptImageUrl,
        },
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

    let purgedReceipt: string | null = null;
    const result = await prisma.$transaction(
      async (tx) => {
        const supplier = await tx.hatcherySupplier.findFirst({
          where: { id: supplierId, hatcheryOwnerId },
          select: { id: true },
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

        // Atomically reverse the txn's effect. `balanceDelta` is positive
        // for PURCHASE/ADJUSTMENT/OPENING and negative for PAYMENT, so we
        // subtract it to undo. Prisma inlines a signed number into
        // `balance = balance - <delta>`, which handles both directions.
        const delta = HatcherySupplierService.balanceDelta(
          txnToDelete.type,
          Number(txnToDelete.amount)
        );

        purgedReceipt = txnToDelete.receiptImageUrl;
        await tx.hatcherySupplierTxn.delete({ where: { id: txnId } });

        // Fixes bug §1 MEDIUM "Deleting the opening balance row breaks the
        // next one". `supplier.openingBalance` is a cached field read by
        // setOpeningBalance to compute `delta = amount - oldOpening`. If
        // we delete the OPENING_BALANCE txn without zeroing this field,
        // the next setOpeningBalance subtracts a stale old value and
        // double-counts. We only reset it for the OPENING_BALANCE type;
        // PURCHASE / PAYMENT / ADJUSTMENT deletes don't touch it.
        const supplierUpdate: {
          balance: { decrement: number };
          openingBalance?: number;
        } = { balance: { decrement: delta } };
        if (txnToDelete.type === HatcherySupplierTxnType.OPENING_BALANCE) {
          supplierUpdate.openingBalance = 0;
        }

        const updated = await tx.hatcherySupplier.update({
          where: { id: supplierId },
          data: supplierUpdate,
          select: { balance: true },
        });

        return { deleted: txnId, newBalance: Number(updated.balance) };
      },
      { timeout: 20000 }
    );

    cleanupUploadedImage(purgedReceipt, hatcheryOwnerId);
    return result;
  }
}
