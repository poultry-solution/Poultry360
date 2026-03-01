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
exports.deleteEggProduction = exports.updateEggProduction = exports.createEggProduction = exports.getEggProductionByBatch = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const shared_types_1 = require("@myapp/shared-types");
const EGG_CATEGORIES = ["LARGE", "MEDIUM", "SMALL"];
function updateEggInventoryForProduction(tx, userId, delta) {
    return __awaiter(this, void 0, void 0, function* () {
        const keyMap = { LARGE: "large", MEDIUM: "medium", SMALL: "small" };
        for (const cat of EGG_CATEGORIES) {
            const count = delta[keyMap[cat]];
            if (count === 0)
                continue;
            const category = cat;
            if (count > 0) {
                yield tx.eggInventory.upsert({
                    where: {
                        userId_eggCategory: { userId, eggCategory: category },
                    },
                    create: {
                        userId,
                        eggCategory: category,
                        quantity: count,
                    },
                    update: {
                        quantity: { increment: count },
                    },
                });
            }
            else {
                const existing = yield tx.eggInventory.findUnique({
                    where: { userId_eggCategory: { userId, eggCategory: category } },
                });
                if (existing) {
                    yield tx.eggInventory.update({
                        where: { id: existing.id },
                        data: { quantity: { decrement: Math.abs(count) } },
                    });
                }
            }
        }
    });
}
// GET /batches/:id/egg-production
const getEggProductionByBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: batchId } = req.params;
        const { startDate, endDate } = req.query;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        const batch = yield prisma_1.default.batch.findUnique({
            where: { id: batchId },
            include: {
                farm: {
                    select: {
                        id: true,
                        ownerId: true,
                        managers: { select: { id: true } },
                    },
                },
            },
        });
        if (!batch) {
            return res.status(404).json({ message: "Batch not found" });
        }
        if (batch.batchType !== "LAYERS") {
            return res.status(400).json({
                message: "Egg production is only available for Layers batches",
            });
        }
        const hasAccess = batch.farm.ownerId === currentUserId ||
            batch.farm.managers.some((m) => m.id === currentUserId);
        if (!hasAccess) {
            return res.status(403).json({ message: "Access denied to this batch" });
        }
        const where = { batchId };
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = new Date(startDate);
            if (endDate)
                where.date.lte = new Date(endDate);
        }
        const records = yield prisma_1.default.eggProduction.findMany({
            where,
            orderBy: { date: "desc" },
        });
        return res.json({
            success: true,
            data: records,
        });
    }
    catch (error) {
        console.error("Get egg production error:", error);
        return res
            .status(500)
            .json({ message: (error === null || error === void 0 ? void 0 : error.message) || "Internal server error" });
    }
});
exports.getEggProductionByBatch = getEggProductionByBatch;
// POST /batches/:id/egg-production
const createEggProduction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: batchId } = req.params;
        const currentUserId = req.userId;
        const parsed = shared_types_1.CreateEggProductionSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: parsed.error.message });
        }
        const { date, largeCount, mediumCount, smallCount } = parsed.data;
        const record = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const batch = yield tx.batch.findUnique({
                where: { id: batchId },
                include: { farm: { select: { ownerId: true } } },
            });
            if (!batch)
                throw new Error("Batch not found");
            if (batch.batchType !== "LAYERS")
                throw new Error("Egg production is only for Layers batches");
            const hasAccess = batch.farm.ownerId === currentUserId;
            if (!hasAccess)
                throw new Error("Access denied");
            const existing = yield tx.eggProduction.findUnique({
                where: { batchId_date: { batchId, date: new Date(date) } },
            });
            if (existing) {
                throw new Error("A production record already exists for this batch and date");
            }
            const created = yield tx.eggProduction.create({
                data: {
                    batchId,
                    date: new Date(date),
                    largeCount: largeCount !== null && largeCount !== void 0 ? largeCount : 0,
                    mediumCount: mediumCount !== null && mediumCount !== void 0 ? mediumCount : 0,
                    smallCount: smallCount !== null && smallCount !== void 0 ? smallCount : 0,
                },
            });
            yield updateEggInventoryForProduction(tx, batch.farm.ownerId, {
                large: largeCount !== null && largeCount !== void 0 ? largeCount : 0,
                medium: mediumCount !== null && mediumCount !== void 0 ? mediumCount : 0,
                small: smallCount !== null && smallCount !== void 0 ? smallCount : 0,
            });
            return created;
        }));
        return res.status(201).json({ success: true, data: record });
    }
    catch (error) {
        console.error("Create egg production error:", error);
        return res.status(500).json({
            message: (error === null || error === void 0 ? void 0 : error.message) || "Internal server error",
        });
    }
});
exports.createEggProduction = createEggProduction;
// PUT /batches/:id/egg-production/:recordId
const updateEggProduction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: batchId, recordId } = req.params;
        const currentUserId = req.userId;
        const parsed = shared_types_1.UpdateEggProductionSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: parsed.error.message });
        }
        const updated = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c;
            const batch = yield tx.batch.findUnique({
                where: { id: batchId },
                include: { farm: { select: { ownerId: true } } },
            });
            if (!batch)
                throw new Error("Batch not found");
            if (batch.batchType !== "LAYERS")
                throw new Error("Egg production is only for Layers batches");
            if (batch.farm.ownerId !== currentUserId)
                throw new Error("Access denied");
            const existing = yield tx.eggProduction.findFirst({
                where: { id: recordId, batchId },
            });
            if (!existing)
                throw new Error("Egg production record not found");
            const newLarge = (_a = parsed.data.largeCount) !== null && _a !== void 0 ? _a : existing.largeCount;
            const newMedium = (_b = parsed.data.mediumCount) !== null && _b !== void 0 ? _b : existing.mediumCount;
            const newSmall = (_c = parsed.data.smallCount) !== null && _c !== void 0 ? _c : existing.smallCount;
            const delta = {
                large: newLarge - existing.largeCount,
                medium: newMedium - existing.mediumCount,
                small: newSmall - existing.smallCount,
            };
            const updatedRecord = yield tx.eggProduction.update({
                where: { id: recordId },
                data: Object.assign(Object.assign({}, (parsed.data.date && { date: new Date(parsed.data.date) })), { largeCount: newLarge, mediumCount: newMedium, smallCount: newSmall }),
            });
            yield updateEggInventoryForProduction(tx, batch.farm.ownerId, delta);
            return updatedRecord;
        }));
        return res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error("Update egg production error:", error);
        return res.status(500).json({
            message: (error === null || error === void 0 ? void 0 : error.message) || "Internal server error",
        });
    }
});
exports.updateEggProduction = updateEggProduction;
// DELETE /batches/:id/egg-production/:recordId
const deleteEggProduction = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id: batchId, recordId } = req.params;
        const currentUserId = req.userId;
        yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const batch = yield tx.batch.findUnique({
                where: { id: batchId },
                include: { farm: { select: { ownerId: true } } },
            });
            if (!batch)
                throw new Error("Batch not found");
            if (batch.batchType !== "LAYERS")
                throw new Error("Egg production is only for Layers batches");
            if (batch.farm.ownerId !== currentUserId)
                throw new Error("Access denied");
            const existing = yield tx.eggProduction.findFirst({
                where: { id: recordId, batchId },
            });
            if (!existing)
                throw new Error("Egg production record not found");
            yield updateEggInventoryForProduction(tx, batch.farm.ownerId, {
                large: -existing.largeCount,
                medium: -existing.mediumCount,
                small: -existing.smallCount,
            });
            yield tx.eggProduction.delete({ where: { id: recordId } });
        }));
        return res.json({ success: true, message: "Record deleted" });
    }
    catch (error) {
        console.error("Delete egg production error:", error);
        return res.status(500).json({
            message: (error === null || error === void 0 ? void 0 : error.message) || "Internal server error",
        });
    }
});
exports.deleteEggProduction = deleteEggProduction;
