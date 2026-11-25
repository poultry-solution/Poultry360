/**
 * Payment method is derived from the CashAccount a payment moves through —
 * CASH account → "CASH", BANK account → "BANK_TRANSFER". The dealer UI no
 * longer shows a separate Payment Method dropdown (it was redundant with the
 * AccountPicker); historical rows keep whatever paymentMethod they were
 * written with.
 *
 * `null` input (no account resolved — shouldn't happen in practice because
 * `ensureCashAccountId` always returns a Cash account) falls back to "CASH"
 * since that's the default account every dealer starts with.
 */
export function derivePaymentMethodFromAccountType(
  type: "CASH" | "BANK" | null | undefined,
): "CASH" | "BANK_TRANSFER" {
  return type === "BANK" ? "BANK_TRANSFER" : "CASH";
}
