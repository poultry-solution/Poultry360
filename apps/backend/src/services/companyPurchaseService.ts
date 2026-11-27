import prisma from "../utils/prisma";
import { Prisma } from "@prisma/client";

export class CompanyPurchaseService {
  /**
   * Reverse a company purchase and the stock it added. The "already consumed"
   * check runs per `(rawMaterial, supplier, unitPrice)` bucket — the same unit
   * production runs consume against — not against the aggregate
   * `RawMaterial.currentStock`. An aggregate check can be fooled by a second
   * untouched purchase of the same material: its stock masks the shortfall
   * in the bucket of the purchase being deleted. See
   * `companyProductionController.ts:6` for how buckets are read on the create
   * path.
   *
   * No supplier balance to reverse (Supplier has no balance field); no
   * CashMovement was posted on create. Cascades drop CompanyPurchaseItem
   * rows automatically when the purchase row is deleted.
   */
  static async deletePurchase(data: { purchaseId: string; companyId: string }) {
    return await prisma.$transaction(async (tx) => {
      const purchase = await tx.companyPurchase.findUnique({
        where: { id: data.purchaseId },
        select: {
          id: true,
          companyId: true,
          supplierId: true,
          items: {
            select: {
              rawMaterialId: true,
              quantity: true,
              unitPrice: true,
              rawMaterial: { select: { name: true } },
            },
          },
        },
      });

      if (!purchase) throw new Error("Purchase not found");
      if (purchase.companyId !== data.companyId) throw new Error("Unauthorized");

      for (const item of purchase.items) {
        const qty = Number(item.quantity);

        const [purchasedAgg, usedAgg] = await Promise.all([
          tx.companyPurchaseItem.aggregate({
            where: {
              rawMaterialId: item.rawMaterialId,
              unitPrice: item.unitPrice,
              purchase: {
                companyId: data.companyId,
                supplierId: purchase.supplierId,
              },
            },
            _sum: { quantity: true },
          }),
          tx.productionInput.aggregate({
            where: {
              rawMaterialId: item.rawMaterialId,
              supplierId: purchase.supplierId,
              unitPrice: item.unitPrice,
              production: { companyId: data.companyId },
            },
            _sum: { quantity: true },
          }),
        ]);

        const purchased = Number(purchasedAgg._sum.quantity ?? 0);
        const used = Number(usedAgg._sum.quantity ?? 0);
        const bucketRemaining = purchased - used;

        if (bucketRemaining < qty) {
          throw new Error(
            `Cannot delete purchase: "${item.rawMaterial.name}" at this supplier/rate ` +
              `has been partially consumed. Remaining in this bucket: ${bucketRemaining}, ` +
              `trying to reverse: ${qty}.`
          );
        }

        // Defence in depth: decrement the aggregate with the same `gte` guard
        // we started with. Should always succeed once the bucket check passed,
        // but a mismatched aggregate (e.g. legacy data drift) still gets
        // caught here rather than driving stock negative.
        const decremented = await tx.rawMaterial.updateMany({
          where: {
            id: item.rawMaterialId,
            companyId: data.companyId,
            currentStock: { gte: new Prisma.Decimal(qty) },
          },
          data: { currentStock: { decrement: new Prisma.Decimal(qty) } },
        });

        if (decremented.count === 0) {
          const current = await tx.rawMaterial.findUnique({
            where: { id: item.rawMaterialId },
            select: { currentStock: true },
          });
          const available = Number(current?.currentStock ?? 0);
          throw new Error(
            `Cannot delete purchase: "${item.rawMaterial.name}" aggregate stock ` +
              `is out of sync with its buckets. Available: ${available}, ` +
              `trying to reverse: ${qty}.`
          );
        }
      }

      await tx.companyPurchase.delete({ where: { id: data.purchaseId } });

      return { success: true };
    });
  }
}
