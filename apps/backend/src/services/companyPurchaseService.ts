import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";

export class CompanyPurchaseService {
  /**
   * Reverse a company purchase and the stock it added. Refuses when any of
   * the purchased raw materials has been partially consumed since — matches
   * hatcheryInventoryService.reverseInventoryForSupplierTxn and
   * dealerManualCompanyController.voidManualPurchase.
   *
   * No supplier balance to reverse (Supplier model has no balance field);
   * no CashMovement was posted on create. Cascades items via the Prisma
   * relation when the purchase row is deleted.
   */
  static async deletePurchase(data: { purchaseId: string; companyId: string }) {
    return await prisma.$transaction(async (tx) => {
      const purchase = await tx.companyPurchase.findUnique({
        where: { id: data.purchaseId },
        include: { items: { include: { rawMaterial: { select: { name: true } } } } },
      });

      if (!purchase) throw new Error("Purchase not found");
      if (purchase.companyId !== data.companyId) throw new Error("Unauthorized");

      for (const item of purchase.items) {
        const qty = new Prisma.Decimal(item.quantity);

        const decremented = await tx.rawMaterial.updateMany({
          where: {
            id: item.rawMaterialId,
            companyId: data.companyId,
            currentStock: { gte: qty },
          },
          data: { currentStock: { decrement: qty } },
        });

        if (decremented.count === 0) {
          const current = await tx.rawMaterial.findUnique({
            where: { id: item.rawMaterialId },
            select: { currentStock: true },
          });
          const available = Number(current?.currentStock ?? 0);
          throw new Error(
            `Cannot delete purchase: "${item.rawMaterial.name}" has been partially consumed. ` +
              `Available stock: ${available}, trying to reverse: ${Number(qty)}.`
          );
        }
      }

      await tx.companyPurchase.delete({ where: { id: data.purchaseId } });

      return { success: true };
    });
  }
}
