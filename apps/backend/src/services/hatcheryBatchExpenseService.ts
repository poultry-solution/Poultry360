import {
  Prisma,
  HatcheryBatchExpenseType,
  HatcheryInventoryTxnType,
  HatcheryFeedTarget,
} from "@prisma/client";
import {
  deleteHatcheryBatchExpenseMovement,
  ensureCashAccountId,
  postHatcheryBatchExpenseMovement,
} from "./hatcheryCashflowAutoPost";
import { toNepalDayKey } from "../utils/nepalBsDate";

// Feed attribution recorded alongside an expense. Validated by the caller;
// null throughout for non-feed expenses, including the initial CHICKS
// placement expense created during batch creation.
type FeedAttribution = {
  feedTarget?: HatcheryFeedTarget | null;
  maleFeedQuantity?: number | null;
  femaleFeedQuantity?: number | null;
};

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
      hatcheryOwnerId: string;
      date: Date;
      category: string;
      inventoryItemId: string;
      quantity: number;
      note?: string;
    } & FeedAttribution
  ) {
    const { batchId, hatcheryOwnerId, date, category, inventoryItemId, quantity, note } = data;

    if (toNepalDayKey(date) > toNepalDayKey(new Date())) {
      throw new Error("Expense date cannot be in the future");
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error("quantity must be greater than 0");
    }

    const item = await tx.hatcheryInventoryItem.findFirst({
      where: { id: inventoryItemId, hatcheryOwnerId, deletedAt: null },
    });
    if (!item) throw new Error("Inventory item not found");
    if (category.toUpperCase() !== item.itemType) {
      throw new Error("Selected inventory item does not match the chosen category");
    }

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
    const updated = await tx.hatcheryInventoryItem.updateMany({
      where: { id: inventoryItemId, hatcheryOwnerId, currentStock: { gte: quantity }, deletedAt: null },
      data: { currentStock: { decrement: quantity } },
    });
    if (updated.count !== 1) throw new Error(`Insufficient stock for "${item.name}"`);

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
        feedTarget: data.feedTarget ?? null,
        maleFeedQuantity: data.maleFeedQuantity ?? null,
        femaleFeedQuantity: data.femaleFeedQuantity ?? null,
      },
    });

    return expense;
  }

  /**
   * Create a manual expense (no inventory linkage). MANUAL expenses are real
   * cash out, so Cashflow v2 mirrors them to the owner's cashbook here. The
   * caller (controller or batch-create path) is responsible for passing
   * `hatcheryOwnerId` so the mirror writes into the right tenant's accounts.
   *
   * INVENTORY-type expenses live in `createInventoryExpense` and never fire
   * autoPost — cash moved earlier at the HatcherySupplierTxn.PAYMENT that
   * bought the inventory.
   */
  static async createManualExpense(
    tx: Prisma.TransactionClient,
    data: {
      batchId: string;
      /** Owner `User.id`. Required so autoPost + ensureCashAccountId run against the right tenant. */
      hatcheryOwnerId: string;
      date: Date;
      category: string;
      itemName: string;
      quantity?: number;
      unit?: string;
      unitPrice?: number;
      amount: number;
      note?: string;
      /** Cashflow v2: CashAccount the cash left from. Omit to default to system Cash. */
      accountId?: string;
      /** Cashflow v2: raw actor id (owner User.id or staff StaffUser.id). */
      recordedById?: string;
    } & FeedAttribution
  ) {
    if (toNepalDayKey(data.date) > toNepalDayKey(new Date())) {
      throw new Error("Expense date cannot be in the future");
    }

    const resolvedAccountId =
      data.accountId && data.accountId.trim()
        ? data.accountId.trim()
        : await ensureCashAccountId(tx, data.hatcheryOwnerId);

    const expense = await tx.hatcheryBatchExpense.create({
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
        accountId: resolvedAccountId,
        feedTarget: data.feedTarget ?? null,
        maleFeedQuantity: data.maleFeedQuantity ?? null,
        femaleFeedQuantity: data.femaleFeedQuantity ?? null,
      },
    });

    // Cashflow v2 mirror. MANUAL expenses move real cash — this is the sole
    // mirror call for the batch-expense flow; INVENTORY never fires one.
    await postHatcheryBatchExpenseMovement({
      tx,
      userId: data.hatcheryOwnerId,
      hatcheryBatchExpenseId: expense.id,
      accountId: resolvedAccountId,
      amount: data.amount,
      date: data.date,
      partyName:
        data.itemName?.trim() || `${data.category} expense`,
      recordedById: data.recordedById ?? data.hatcheryOwnerId,
      notes: data.note ?? null,
    });

    return expense;
  }

  /**
   * Delete an expense and reverse inventory if it was inventory-backed. For
   * MANUAL expenses also removes the Cashflow v2 mirror so the cashbook
   * re-converges with the ledger.
   *
   * `hatcheryOwnerId` is needed to scope the mirror delete to the right
   * tenant. Callers pass the ownerId they already resolved via the auth
   * middleware (`req.userId`).
   */
  static async deleteExpense(
    tx: Prisma.TransactionClient,
    hatcheryOwnerId: string,
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

    // Only MANUAL expenses ever had a cash mirror; INVENTORY never did (see
    // invariant: inventory consumption is not a cash event).
    if (expense.type === HatcheryBatchExpenseType.MANUAL) {
      await deleteHatcheryBatchExpenseMovement(tx, hatcheryOwnerId, expenseId);
    }

    await tx.hatcheryBatchExpense.delete({ where: { id: expenseId } });
  }
}
