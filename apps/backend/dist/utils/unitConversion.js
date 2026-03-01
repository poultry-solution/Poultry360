"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableUnits = getAvailableUnits;
exports.toBaseQuantity = toBaseQuantity;
exports.fromBaseQuantity = fromBaseQuantity;
/**
 * Get all available units for a product (base unit + alternate units).
 * Base unit always has factor = 1.
 */
function getAvailableUnits(baseUnit, conversions) {
    const units = [{ unitName: baseUnit, factor: 1 }];
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
function toBaseQuantity(qty, unitName, baseUnit, conversions) {
    if (unitName === baseUnit)
        return qty;
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
function fromBaseQuantity(baseQty, unitName, baseUnit, conversions) {
    if (unitName === baseUnit)
        return baseQty;
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
