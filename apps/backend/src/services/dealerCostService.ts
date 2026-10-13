/**
 * Cost of dealer stock, used to save what each sold item cost.
 *
 * A DealerProduct row has one costPrice (a purchase at a new price makes a new
 * row). The trade discount is stored on the whole purchase, so it is spread
 * over that purchase's items by value. A product's net unit cost is its
 * costPrice lowered by the weighted discount of its non-voided purchases.
 *
 * The same formula is used by the backfill in migration
 * 20261013090000_add_dealer_sale_item_cost.
 */

import type { Prisma } from "@prisma/client";

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** Share of a purchase taken off by its trade discount, from 0 to 1. */
export function computePurchaseDiscountRate(gross: number, discount: number | null | undefined): number {
  if (!(gross > 0)) return 0;
  const safeDiscount = Math.min(Math.max(Number(discount) || 0, 0), gross);
  return safeDiscount / gross;
}

/** Discount rate for one product, weighted by the value of each purchase item. */
export function computeProductDiscountRate(
  items: Array<{ totalAmount: number; purchaseDiscountRate: number }>
): number {
  const gross = items.reduce((sum, item) => sum + item.totalAmount, 0);
  if (!(gross > 0)) return 0;
  const discount = items.reduce((sum, item) => sum + item.totalAmount * item.purchaseDiscountRate, 0);
  return discount / gross;
}

export function computeNetUnitCost(costPrice: number, discountRate: number): number {
  return round4(costPrice * (1 - discountRate));
}

/** Cost of one sale line: net unit cost × the stock quantity it cut. */
export function computeLineCost(unitCost: number, stockQuantity: number): number {
  return round2(unitCost * stockQuantity);
}

/**
 * Net unit cost of a product, or null when it can't be found. Never throws,
 * so a sale is never blocked by cost; a missing cost only shows as a note in
 * profit.
 */
export async function getNetUnitCost(
  tx: Prisma.TransactionClient,
  productId: string
): Promise<number | null> {
  try {
    const product = await tx.dealerProduct.findUnique({
      where: { id: productId },
      select: { costPrice: true },
    });
    if (!product) return null;
    const costPrice = Number(product.costPrice);

    try {
      const purchaseItems = await tx.dealerManualPurchaseItem.findMany({
        where: { dealerProductId: productId, purchase: { voidedAt: null } },
        select: {
          totalAmount: true,
          purchase: {
            select: {
              tradeDiscountAmount: true,
              items: { select: { totalAmount: true } },
            },
          },
        },
      });

      const rate = computeProductDiscountRate(
        purchaseItems.map((item) => {
          const purchaseGross = item.purchase.items.reduce((sum, i) => sum + Number(i.totalAmount), 0);
          return {
            totalAmount: Number(item.totalAmount),
            purchaseDiscountRate: computePurchaseDiscountRate(
              purchaseGross,
              item.purchase.tradeDiscountAmount === null ? null : Number(item.purchase.tradeDiscountAmount)
            ),
          };
        })
      );
      return computeNetUnitCost(costPrice, rate);
    } catch {
      return computeNetUnitCost(costPrice, 0);
    }
  } catch {
    return null;
  }
}

/** Net unit cost for each distinct product id. */
export async function getNetUnitCosts(
  tx: Prisma.TransactionClient,
  productIds: Array<string | null | undefined>
): Promise<Map<string, number | null>> {
  const costs = new Map<string, number | null>();
  for (const id of new Set(productIds.filter((id): id is string => Boolean(id)))) {
    costs.set(id, await getNetUnitCost(tx, id));
  }
  return costs;
}
