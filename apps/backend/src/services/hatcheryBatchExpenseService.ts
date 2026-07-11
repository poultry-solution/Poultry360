import {
  Prisma,
  HatcheryBatchExpenseType,
  HatcheryInventoryTxnType,
} from "@prisma/client";

export class HatcheryBatchExpenseService {
  /**
   * Create an inventory-backed expense:
   *  - Validates stock available.
   *  - Creates HatcheryInventoryTxn(USAGE).
   *  - Decrements inventory stock.
   *  - Creates HatcheryBatchExpense with link to inv txn.
   */
  static async createInventoryExpense(
    tx: Prisma.TransactionClient,
    data: {
      batchId: string;
      date: Date;
      category: string;
      inventoryItemId: string;
      quantity: number;
      note?: string;
    }
  ) {
    const { batchId, date, category, inventoryItemId, quantity, note } = data;

    const item = await tx.hatcheryInventoryItem.findUniqueOrThrow({
      where: { id: inventoryItemId },
    });

    if (Number(item.currentStock) < quantity) {
      throw new Error(
        `Insufficient stock for "${item.name}": have ${item.currentStock}, need ${quantity}`
      );
    }

    // Use effective (free-qty-adjusted) cost per unit so free birds are not over-charged
    const unitPrice = Number(item.effectiveUnitCost ?? item.unitPrice);
    const amount = Math.round(unitPrice * quantity * 100) / 100;

    // Create inventory usage txn
    const invTxn = await tx.hatcheryInventoryTxn.create({
      data: {
        itemId: inventoryItemId,
        type: HatcheryInventoryTxnType.USAGE,
        quantity,
        unitPrice,
        amount,
        date,
        note: `Batch expense: ${category}`,
      },
    });

    // Decrement stock
    await tx.hatcheryInventoryItem.update({
      where: { id: inventoryItemId },
      data: { currentStock: { decrement: quantity } },
    });

    // Create expense
    const expense = await tx.hatcheryBatchExpense.create({
      data: {
        batchId,
        date,
        type: HatcheryBatchExpenseType.INVENTORY,
        category,
        itemName: item.name,
        quantity,
        unit: item.unit,
        unitPrice,
        amount,
        note,
        inventoryItemId,
        inventoryTxnId: invTxn.id,
      },
    });

    return expense;
  }

  /**
   * Create a manual expense (no inventory linkage).
   */
  static async createManualExpense(
    tx: Prisma.TransactionClient,
    data: {
      batchId: string;
      date: Date;
      category: string;
      itemName: string;
      quantity?: number;
      unit?: string;
      unitPrice?: number;
      amount: number;
      note?: string;
    }
  ) {
    return tx.hatcheryBatchExpense.create({
      data: {
        batchId: data.batchId,
        date: data.date,
        type: HatcheryBatchExpenseType.MANUAL,
        category: data.category,
        itemName: data.itemName,
        quantity: data.quantity,
        unit: data.unit,
        unitPrice: data.unitPrice,
        amount: data.amount,
        note: data.note,
      },
    });
  }

  /**
   * Delete an expense and reverse inventory if it was inventory-backed.
   */
  static async deleteExpense(
    tx: Prisma.TransactionClient,
    expenseId: string
  ) {
    const expense = await tx.hatcheryBatchExpense.findUniqueOrThrow({
      where: { id: expenseId },
    });

    if (
      expense.type === HatcheryBatchExpenseType.INVENTORY &&
      expense.inventoryItemId &&
      expense.inventoryTxnId
    ) {
      // Restore inventory stock
      await tx.hatcheryInventoryItem.update({
        where: { id: expense.inventoryItemId },
        data: {
          currentStock: { increment: Number(expense.quantity ?? 0) },
        },
      });

      // Remove the inventory txn
      await tx.hatcheryInventoryTxn.delete({
        where: { id: expense.inventoryTxnId },
      });
    }

    await tx.hatcheryBatchExpense.delete({ where: { id: expenseId } });
  }
}
