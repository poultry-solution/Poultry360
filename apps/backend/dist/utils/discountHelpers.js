"use strict";
/**
 * Helpers for sale discount calculation and distribution.
 * Used for global (SALE-scope) discounts; extensible for item-wise (ITEM-scope) later.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeDiscountAmount = computeDiscountAmount;
exports.distributeDiscountToItems = distributeDiscountToItems;
/**
 * Compute discount amount from subtotal.
 * PERCENT: value is 0-100; FLAT: value is capped at subtotal.
 */
function computeDiscountAmount(subtotal, type, value) {
    if (subtotal <= 0 || value <= 0)
        return 0;
    if (type === "PERCENT") {
        const pct = Math.min(100, Math.max(0, value));
        return Math.round((subtotal * (pct / 100)) * 100) / 100;
    }
    return Math.min(value, subtotal);
}
/**
 * Distribute a discount amount across items proportionally.
 * Returns per-item final amounts (after discount) that sum exactly to (subtotal - discountAmount).
 * Uses rounding to 2 decimals and adjusts the last item to avoid drift.
 */
function distributeDiscountToItems(subtotal, discountAmount, items) {
    if (items.length === 0 || subtotal <= 0)
        return [];
    if (discountAmount <= 0) {
        return items.map((i) => Math.round(i.quantity * i.unitPrice * 100) / 100);
    }
    const targetTotal = Math.round((subtotal - discountAmount) * 100) / 100;
    const itemSubtotals = items.map((i) => Math.round(i.quantity * i.unitPrice * 100) / 100);
    const proportions = itemSubtotals.map((s) => s / subtotal);
    const rawFinal = proportions.map((p) => Math.round((p * targetTotal) * 100) / 100);
    const sumRaw = rawFinal.reduce((a, b) => a + b, 0);
    const diff = Math.round((targetTotal - sumRaw) * 100) / 100;
    if (diff !== 0 && rawFinal.length > 0) {
        rawFinal[rawFinal.length - 1] =
            Math.round((rawFinal[rawFinal.length - 1] + diff) * 100) / 100;
    }
    return rawFinal;
}
