interface UnitConversion {
  unitName: string;
  conversionFactor: number;
}

interface AvailableUnit {
  unitName: string;
  factor: number;
}

/**
 * Get all available units for a product (base unit + alternate units).
 * Base unit always has factor = 1.
 */
export function getAvailableUnits(
  baseUnit: string,
  conversions: UnitConversion[]
): AvailableUnit[] {
  const units: AvailableUnit[] = [{ unitName: baseUnit, factor: 1 }];
  for (const c of conversions) {
    units.push({ unitName: c.unitName, factor: Number(c.conversionFactor) });
  }
  return units;
}

/**
 * Convert a quantity in the given unit to the base unit quantity.
 * e.g. 2 Sacks where 1 Sack = 50 KG → returns 100
 * If unitName matches baseUnit, returns qty as-is.
 */
export function toBaseQuantity(
  qty: number,
  unitName: string,
  baseUnit: string,
  conversions: UnitConversion[]
): number {
  if (unitName === baseUnit) return qty;

  const conversion = conversions.find((c) => c.unitName === unitName);
  if (!conversion) {
    throw new Error(`Unknown unit "${unitName}" for product with base unit "${baseUnit}"`);
  }

  return qty * Number(conversion.conversionFactor);
}

/**
 * Convert a base unit quantity to the given unit.
 * e.g. 100 KG to Sacks where 1 Sack = 50 KG → returns 2
 * If unitName matches baseUnit, returns baseQty as-is.
 */
export function fromBaseQuantity(
  baseQty: number,
  unitName: string,
  baseUnit: string,
  conversions: UnitConversion[]
): number {
  if (unitName === baseUnit) return baseQty;

  const conversion = conversions.find((c) => c.unitName === unitName);
  if (!conversion) {
    throw new Error(`Unknown unit "${unitName}" for product with base unit "${baseUnit}"`);
  }

  const factor = Number(conversion.conversionFactor);
  if (factor === 0) {
    throw new Error(`Conversion factor for "${unitName}" cannot be zero`);
  }

  return baseQty / factor;
}
