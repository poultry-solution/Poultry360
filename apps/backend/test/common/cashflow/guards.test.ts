import { CashflowError } from "../../../src/common/cashflow/errors";
import {
  assertAccountActive,
  assertAccountOwner,
  assertPositiveAmount,
  assertValidBsDate,
  isPositiveAmount,
  isValidBsDate,
} from "../../../src/common/cashflow/guards";

describe("isPositiveAmount", () => {
  it("accepts finite positives", () => {
    expect(isPositiveAmount(1)).toBe(true);
    expect(isPositiveAmount(0.5)).toBe(true);
    expect(isPositiveAmount(1_000_000)).toBe(true);
  });

  it("rejects zero, negatives, non-finite, and non-numbers", () => {
    expect(isPositiveAmount(0)).toBe(false);
    expect(isPositiveAmount(-1)).toBe(false);
    expect(isPositiveAmount(Number.NaN)).toBe(false);
    expect(isPositiveAmount(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isPositiveAmount("10")).toBe(false);
    expect(isPositiveAmount(null)).toBe(false);
    expect(isPositiveAmount(undefined)).toBe(false);
  });
});

describe("isValidBsDate", () => {
  it("accepts YYYY-MM-DD strings", () => {
    expect(isValidBsDate("2083-04-10")).toBe(true);
    expect(isValidBsDate("2099-12-31")).toBe(true);
  });

  it("rejects other shapes", () => {
    expect(isValidBsDate("")).toBe(false);
    expect(isValidBsDate("2083-4-10")).toBe(false);
    expect(isValidBsDate("2083/04/10")).toBe(false);
    expect(isValidBsDate("04-10-2083")).toBe(false);
    expect(isValidBsDate(20830410)).toBe(false);
  });
});

function expectCashflowError(fn: () => void, status: number, messageRegex: RegExp) {
  try {
    fn();
    throw new Error("Expected function to throw CashflowError");
  } catch (err) {
    expect(err).toBeInstanceOf(CashflowError);
    expect((err as CashflowError).status).toBe(status);
    expect((err as CashflowError).message).toMatch(messageRegex);
  }
}

describe("assert* throw CashflowError with a meaningful status", () => {
  it("assertPositiveAmount → 400", () => {
    expectCashflowError(() => assertPositiveAmount(-1), 400, /positive/);
    expectCashflowError(() => assertPositiveAmount(0, "price"), 400, /price/);
    expect(() => assertPositiveAmount(5)).not.toThrow();
  });

  it("assertValidBsDate → 400", () => {
    expectCashflowError(() => assertValidBsDate(""), 400, /YYYY-MM-DD/);
    expectCashflowError(() => assertValidBsDate("not-a-date", "from"), 400, /from/);
    expect(() => assertValidBsDate("2083-04-10")).not.toThrow();
  });

  it("assertAccountActive → 409 for archived", () => {
    expectCashflowError(
      () => assertAccountActive({ archivedAt: new Date() }),
      409,
      /archived/,
    );
    expect(() => assertAccountActive({ archivedAt: null })).not.toThrow();
  });

  it("assertAccountOwner → 403 for cross-user access", () => {
    expectCashflowError(
      () => assertAccountOwner({ userId: "u1" }, "u2"),
      403,
      /does not belong/,
    );
    expect(() => assertAccountOwner({ userId: "u1" }, "u1")).not.toThrow();
  });
});
