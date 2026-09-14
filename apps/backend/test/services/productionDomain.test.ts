import { Prisma } from "@prisma/client";
import { allocateProductionCost, positiveDecimal } from "../../src/services/productionDomain";

describe("productionDomain", () => {
  it("allocates all input cost and puts the rounding remainder on the final output", () => {
    const allocations = allocateProductionCost(new Prisma.Decimal("100.01"), [
      { quantity: new Prisma.Decimal(3), percentage: new Prisma.Decimal("33.33") },
      { quantity: new Prisma.Decimal(7), percentage: new Prisma.Decimal("66.67") },
    ]);

    expect(allocations.map((row) => row.amount.toFixed(2))).toEqual(["33.33", "66.68"]);
    expect(allocations.reduce((sum, row) => sum.plus(row.amount), new Prisma.Decimal(0)).toFixed(2)).toBe("100.01");
    expect(allocations[0].unitCost.toFixed(4)).toBe("11.1100");
  });

  it("defaults are handled by callers but allocations must total exactly 100", () => {
    expect(() => allocateProductionCost(new Prisma.Decimal(10), [
      { quantity: new Prisma.Decimal(1), percentage: new Prisma.Decimal("99.99") },
    ])).toThrow("Output allocation percentages must total 100");
  });

  it("rejects zero, negative, NaN, and infinite quantities", () => {
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, undefined]) {
      expect(() => positiveDecimal(value, "quantity")).toThrow("quantity must be greater than 0");
    }
    expect(positiveDecimal("1.2500", "quantity").toFixed(4)).toBe("1.2500");
  });
});
