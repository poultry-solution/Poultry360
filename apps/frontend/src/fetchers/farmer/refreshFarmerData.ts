import type { QueryClient } from "@tanstack/react-query";

/**
 * Data that changes when a batch or a sale changes: bird counts, stock, deaths,
 * weights, cash and totals. Only queries on screen re-fetch, so this is cheap.
 */
const FARMER_DATA_ROOTS = [
  "dashboard",
  "batches",
  "farms",
  "inventory",
  "mortalities",
  "weights",
  "sales",
  "expenses",
  "farmer-cash-in-hand",
  "farmer-analytics",
] as const;

export function refreshFarmerData(queryClient: QueryClient) {
  for (const root of FARMER_DATA_ROOTS) {
    queryClient.invalidateQueries({ queryKey: [root] });
  }
}
