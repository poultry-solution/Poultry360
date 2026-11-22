/**
 * Shared error type for the cashflow module. Lives here (not in the service)
 * so pure validators in `guards.ts` can throw it with an HTTP-meaningful status
 * without the service wrapping every pure call in try/catch just to re-tag.
 *
 * Status conventions:
 *   400 — malformed input (amount, bsDate, name, body shape)
 *   403 — cross-tenant access (accountId belongs to another user)
 *   404 — resource not found
 *   409 — operation refused by a business rule (archived, non-zero balance, etc.)
 *   500 — internal (reserved; prefer not throwing CashflowError at 500 — let it fall through)
 */
export class CashflowError extends Error {
  constructor(
    message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = "CashflowError";
  }
}
