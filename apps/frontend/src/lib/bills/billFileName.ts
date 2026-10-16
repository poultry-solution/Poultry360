/** "Bill-INV-031-Ram-Traders": safe for phones and WhatsApp (letters, digits, dashes). */
export function billFileName(invoiceNumber: string, partyName?: string | null): string {
  const clean = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  return ["Bill", clean(invoiceNumber || ""), clean(partyName || "")].filter(Boolean).join("-");
}
