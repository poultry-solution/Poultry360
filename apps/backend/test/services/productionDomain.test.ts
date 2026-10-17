import { Prisma } from "@prisma/client";
import {
  allocateProductionCost,
  assertLotsBoughtByDate,
  positiveDecimal,
  ProductionValidationError,
} from "../../src/services/productionDomain";

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

describe("assertLotsBoughtByDate", () => {
  const lot = (firstPurchaseDate: Date | null) => ({ name: "Maize", firstPurchaseDate });

  it("allows a lot bought later on the same Nepal day", () => {
    // Run saved as UTC midnight of 2026-10-07; bought 2:30 pm Nepal time that day.
    expect(() =>
      assertLotsBoughtByDate(new Date("2026-10-07T00:00:00.000Z"), [lot(new Date("2026-10-07T08:45:00.000Z"))])
    ).not.toThrow();
  });

  it("refuses a lot bought on the next Nepal day even if it is the same UTC day", () => {
    // 23:00 UTC on 7 Oct is 4:45 am on 8 Oct in Nepal.
    expect(() =>
      assertLotsBoughtByDate(new Date("2026-10-07T00:00:00.000Z"), [lot(new Date("2026-10-07T23:00:00.000Z"))])
    ).toThrow(ProductionValidationError);
  });

  it("refuses a lot bought the day after and names it with the BS date", () => {
    expect(() =>
      assertLotsBoughtByDate(new Date("2026-10-07T00:00:00.000Z"), [lot(new Date("2026-10-08T00:00:00.000Z"))])
    ).toThrow("Maize was bought on 2083-06-22. Production date can't be before that.");
  });

  it("allows a lot bought the day before, or with no known date", () => {
    expect(() =>
      assertLotsBoughtByDate(new Date("2026-10-07T00:00:00.000Z"), [
        lot(new Date("2026-10-06T00:00:00.000Z")),
        lot(null),
      ])
    ).not.toThrow();
  });
});
