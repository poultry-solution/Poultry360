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
exports.getEggInventory = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
/**
 * GET /egg-inventory
 * Returns current user's egg inventory by category (LARGE, MEDIUM, SMALL).
 */
const getEggInventory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const userId = req.userId;
        const records = yield prisma_1.default.eggInventory.findMany({
            where: { userId },
            select: { eggCategory: true, quantity: true },
        });
        const LARGE = (_b = (_a = records.find((r) => r.eggCategory === "LARGE")) === null || _a === void 0 ? void 0 : _a.quantity) !== null && _b !== void 0 ? _b : 0;
        const MEDIUM = (_d = (_c = records.find((r) => r.eggCategory === "MEDIUM")) === null || _c === void 0 ? void 0 : _c.quantity) !== null && _d !== void 0 ? _d : 0;
        const SMALL = (_f = (_e = records.find((r) => r.eggCategory === "SMALL")) === null || _e === void 0 ? void 0 : _e.quantity) !== null && _f !== void 0 ? _f : 0;
        return res.json({
            success: true,
            data: {
                LARGE: Number(LARGE),
                MEDIUM: Number(MEDIUM),
                SMALL: Number(SMALL),
            },
        });
    }
    catch (error) {
        console.error("Get egg inventory error:", error);
        return res
            .status(500)
            .json({ message: (error === null || error === void 0 ? void 0 : error.message) || "Internal server error" });
    }
});
exports.getEggInventory = getEggInventory;
