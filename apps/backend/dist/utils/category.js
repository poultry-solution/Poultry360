"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalesCategoryIdForItemType = getSalesCategoryIdForItemType;
const prisma_1 = __importDefault(require("../utils/prisma"));
// Map SalesItemType to default SALES category names
const ITEMTYPE_TO_CATEGORY_NAME = {
    Chicken_Meat: "Chicken Sales",
    CHICKS: "Chick Sales",
    FEED: "Feed Sales",
    MEDICINE: "Medicine Sales",
    OTHER: "Other Sales",
    EGGS: "Egg Sales",
    EQUIPMENT: "Equipment Sales",
};
/**
 * Return the SALES category id for a given user and SalesItemType.
 * - Finds an existing category by mapped name; if missing, creates it.
 */
function getSalesCategoryIdForItemType(userId, itemType) {
    return __awaiter(this, void 0, void 0, function* () {
        const categoryName = ITEMTYPE_TO_CATEGORY_NAME[itemType] || "Other Sales";
        // Try to find existing category
        const existing = yield prisma_1.default.category.findFirst({
            where: {
                userId,
                type: "SALES",
                name: categoryName,
            },
            select: { id: true },
        });
        if (existing === null || existing === void 0 ? void 0 : existing.id)
            return existing.id;
        // Create if not found
        const created = yield prisma_1.default.category.create({
            data: {
                name: categoryName,
                type: "SALES",
                description: null,
                userId,
            },
            select: { id: true },
        });
        return created.id;
    });
}
