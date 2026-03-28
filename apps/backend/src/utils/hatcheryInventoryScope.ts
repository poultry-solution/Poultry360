/**
 * Produced (hatched) chick stock lives in hatcheryChickStock + Produced Chicks UI only.
 * Legacy data may still have hatcheryInventoryItem rows with supplierKey INCUBATION_BATCH:...
 * Those must not appear on the purchased-goods Inventory page.
 */
export const PRODUCED_CHICK_LOT_KEY_PREFIX = "INCUBATION_BATCH:";

export const excludeProducedChickInventoryLots = {
  NOT: { supplierKey: { startsWith: PRODUCED_CHICK_LOT_KEY_PREFIX } },
} as const;
