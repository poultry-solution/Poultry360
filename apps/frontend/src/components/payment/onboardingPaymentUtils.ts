export function formatAmount(amountNpr: number): string {
  return `NPR ${Number(amountNpr).toLocaleString("en-US")}`;
}
