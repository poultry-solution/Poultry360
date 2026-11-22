import { CashflowError } from "./errors";

const BS_YMD = /^\d{4}-\d{2}-\d{2}$/;

export function isPositiveAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function isValidBsDate(value: unknown): value is string {
  return typeof value === "string" && BS_YMD.test(value);
}

export function assertPositiveAmount(
  value: unknown,
  label = "amount",
): asserts value is number {
  if (!isPositiveAmount(value)) {
    throw new CashflowError(`${label} must be a positive number`, 400);
  }
}

export function assertValidBsDate(
  value: unknown,
  label = "bsDate",
): asserts value is string {
  if (!isValidBsDate(value)) {
    throw new CashflowError(
      `${label} must be a BS date string in YYYY-MM-DD format`,
      400,
    );
  }
}

export function assertAccountActive(account: {
  archivedAt: Date | null;
}): void {
  if (account.archivedAt !== null) {
    throw new CashflowError("Account is archived", 409);
  }
}

export function assertAccountOwner(
  account: { userId: string },
  userId: string,
): void {
  if (account.userId !== userId) {
    throw new CashflowError("Account does not belong to this user", 403);
  }
}
