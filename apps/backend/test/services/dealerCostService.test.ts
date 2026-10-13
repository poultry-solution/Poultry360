import {
  computeLineCost,
  computeNetUnitCost,
  computeProductDiscountRate,
  computePurchaseDiscountRate,
  getNetUnitCost,
} from "../../src/services/dealerCostService";

describe("Dealer item cost", () => {
  describe("purchase discount rate", () => {
    it("is the discount share of the bill", () => {
      expect(computePurchaseDiscountRate(8000, 400)).toBeCloseTo(0.05);
    });

    it("is 0 with no discount or an empty bill", () => {
      expect(computePurchaseDiscountRate(8000, null)).toBe(0);
      expect(computePurchaseDiscountRate(0, 100)).toBe(0);
    });

    it("never goes above the bill or below 0", () => {
      expect(computePurchaseDiscountRate(1000, 5000)).toBe(1);
      expect(computePurchaseDiscountRate(1000, -50)).toBe(0);
    });
  });

  describe("product discount rate", () => {
    it("weights each purchase by its value", () => {
      // 6000 bought at 10% off, 2000 bought with no discount → 7.5% off overall
      expect(
        computeProductDiscountRate([
          { totalAmount: 6000, purchaseDiscountRate: 0.1 },
          { totalAmount: 2000, purchaseDiscountRate: 0 },
        ])
      ).toBeCloseTo(0.075);
    });

    it("is 0 when the product has no purchases", () => {
      expect(computeProductDiscountRate([])).toBe(0);
    });
  });

  it("lowers unit cost by the discount and rounds line cost to paisa", () => {
    expect(computeNetUnitCost(800, 0.05)).toBe(760);
    expect(computeLineCost(3338.5714, 18)).toBe(60094.29);
  });

  describe("getNetUnitCost", () => {
    function makeTx(product: unknown, purchaseItems: unknown[] | Error) {
      return {
        dealerProduct: { findUnique: jest.fn().mockResolvedValue(product) },
        dealerManualPurchaseItem: {
          findMany:
            purchaseItems instanceof Error
              ? jest.fn().mockRejectedValue(purchaseItems)
              : jest.fn().mockResolvedValue(purchaseItems),
        },
      } as any;
    }

    it("uses the trade discount of non-voided purchases", async () => {
      // One bill: this product 8000 + another item 2000, discount 500 → 5% off
      const tx = makeTx({ costPrice: 800 }, [
        {
          totalAmount: 8000,
          purchase: { tradeDiscountAmount: 500, items: [{ totalAmount: 8000 }, { totalAmount: 2000 }] },
        },
      ]);
      await expect(getNetUnitCost(tx, "p1")).resolves.toBe(760);
      expect(tx.dealerManualPurchaseItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { dealerProductId: "p1", purchase: { voidedAt: null } } })
      );
    });

    it("uses costPrice when there are no purchases (opening stock)", async () => {
      await expect(getNetUnitCost(makeTx({ costPrice: 640 }, []), "p1")).resolves.toBe(640);
    });

    it("returns null for a missing product and never throws", async () => {
      await expect(getNetUnitCost(makeTx(null, []), "gone")).resolves.toBeNull();
      await expect(getNetUnitCost(makeTx({ costPrice: 500 }, new Error("db")), "p1")).resolves.toBe(500);
    });
  });
});
