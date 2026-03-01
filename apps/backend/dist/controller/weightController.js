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
exports.getGrowthChartData = exports.deleteBirdWeight = exports.updateBirdWeight = exports.getBirdWeights = exports.addBirdWeight = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
// ==================== ADD BIRD WEIGHT ====================
const addBirdWeight = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { batchId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        const { date, avgWeight, sampleCount, notes } = req.body;
        // Validate required fields
        if (!date || !avgWeight || !sampleCount) {
            return res.status(400).json({
                message: "date, avgWeight, and sampleCount are required",
            });
        }
        if (avgWeight <= 0 || sampleCount <= 0) {
            return res.status(400).json({
                message: "avgWeight and sampleCount must be positive numbers",
            });
        }
        // Check if batch exists and user has access
        const batch = yield prisma_1.default.batch.findUnique({
            where: { id: batchId },
            include: {
                farm: {
                    include: { managers: true },
                },
            },
        });
        if (!batch) {
            return res.status(404).json({ message: "Batch not found" });
        }
        // Check access permissions
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = batch.farm.ownerId === currentUserId ||
                batch.farm.managers.some((manager) => manager.id === currentUserId);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        // Create bird weight record and update batch's currentWeight
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Create the weight record
            const birdWeight = yield tx.birdWeight.create({
                data: {
                    batchId,
                    date: new Date(date),
                    avgWeight: Number(avgWeight),
                    sampleCount: Number(sampleCount),
                    source: client_1.WeightSource.MANUAL,
                    notes: notes || null,
                },
            });
            // Update batch's currentWeight to this new value
            yield tx.batch.update({
                where: { id: batchId },
                data: {
                    currentWeight: Number(avgWeight),
                },
            });
            return birdWeight;
        }));
        return res.status(201).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error("Add bird weight error:", error);
        return res.status(500).json({
            message: (error === null || error === void 0 ? void 0 : error.message) || "Failed to add bird weight",
        });
    }
});
exports.addBirdWeight = addBirdWeight;
// ==================== GET BIRD WEIGHTS ====================
const getBirdWeights = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { batchId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        const { startDate, endDate, source } = req.query;
        // Check if batch exists and user has access
        const batch = yield prisma_1.default.batch.findUnique({
            where: { id: batchId },
            include: {
                farm: {
                    include: { managers: true },
                },
            },
        });
        if (!batch) {
            return res.status(404).json({ message: "Batch not found" });
        }
        // Check access permissions
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = batch.farm.ownerId === currentUserId ||
                batch.farm.managers.some((manager) => manager.id === currentUserId);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        // Build where clause
        const where = { batchId };
        if (startDate) {
            where.date = Object.assign(Object.assign({}, where.date), { gte: new Date(startDate) });
        }
        if (endDate) {
            where.date = Object.assign(Object.assign({}, where.date), { lte: new Date(endDate) });
        }
        if (source) {
            where.source = source;
        }
        // Fetch weights
        const weights = yield prisma_1.default.birdWeight.findMany({
            where,
            orderBy: { date: "desc" },
            select: {
                id: true,
                date: true,
                avgWeight: true,
                sampleCount: true,
                source: true,
                notes: true,
                createdAt: true,
            },
        });
        // Calculate growth metrics
        let growthRate = null;
        let totalGrowth = null;
        let daysActive = null;
        if (weights.length >= 2) {
            const latestWeight = weights[0];
            const earliestWeight = weights[weights.length - 1];
            const days = Math.floor((new Date(latestWeight.date).getTime() -
                new Date(earliestWeight.date).getTime()) /
                (1000 * 60 * 60 * 24));
            if (days > 0) {
                totalGrowth = Number(latestWeight.avgWeight) - Number(earliestWeight.avgWeight);
                growthRate = totalGrowth / days;
                daysActive = days;
            }
        }
        return res.json({
            success: true,
            data: {
                weights,
                currentWeight: batch.currentWeight ? Number(batch.currentWeight) : null,
                growthMetrics: {
                    growthRate: growthRate ? Number(growthRate.toFixed(4)) : null,
                    totalGrowth: totalGrowth ? Number(totalGrowth.toFixed(3)) : null,
                    daysActive,
                    recordCount: weights.length,
                },
            },
        });
    }
    catch (error) {
        console.error("Get bird weights error:", error);
        return res.status(500).json({
            message: (error === null || error === void 0 ? void 0 : error.message) || "Failed to fetch bird weights",
        });
    }
});
exports.getBirdWeights = getBirdWeights;
// ==================== UPDATE BIRD WEIGHT ====================
const updateBirdWeight = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { batchId, weightId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        const { date, avgWeight, sampleCount, notes } = req.body;
        // Check if weight record exists
        const existingWeight = yield prisma_1.default.birdWeight.findUnique({
            where: { id: weightId },
            include: {
                batch: {
                    include: {
                        farm: {
                            include: { managers: true },
                        },
                    },
                },
            },
        });
        if (!existingWeight) {
            return res.status(404).json({ message: "Weight record not found" });
        }
        if (existingWeight.batchId !== batchId) {
            return res.status(400).json({ message: "Weight does not belong to this batch" });
        }
        // Only allow updating MANUAL entries
        if (existingWeight.source !== client_1.WeightSource.MANUAL) {
            return res.status(403).json({
                message: "Can only update manually entered weights. This weight was auto-generated from sales.",
            });
        }
        // Check access permissions
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = existingWeight.batch.farm.ownerId === currentUserId ||
                existingWeight.batch.farm.managers.some((manager) => manager.id === currentUserId);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        // Update the weight record
        const updateData = {};
        if (date)
            updateData.date = new Date(date);
        if (avgWeight)
            updateData.avgWeight = Number(avgWeight);
        if (sampleCount)
            updateData.sampleCount = Number(sampleCount);
        if (notes !== undefined)
            updateData.notes = notes;
        const result = yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Update the weight record
            const updatedWeight = yield tx.birdWeight.update({
                where: { id: weightId },
                data: updateData,
            });
            // Check if this was the latest weight - if so, update batch's currentWeight
            const latestWeight = yield tx.birdWeight.findFirst({
                where: { batchId },
                orderBy: { date: "desc" },
            });
            if (latestWeight && latestWeight.id === weightId) {
                yield tx.batch.update({
                    where: { id: batchId },
                    data: {
                        currentWeight: updatedWeight.avgWeight,
                    },
                });
            }
            return updatedWeight;
        }));
        return res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error("Update bird weight error:", error);
        return res.status(500).json({
            message: (error === null || error === void 0 ? void 0 : error.message) || "Failed to update bird weight",
        });
    }
});
exports.updateBirdWeight = updateBirdWeight;
// ==================== DELETE BIRD WEIGHT ====================
const deleteBirdWeight = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { batchId, weightId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Check if weight record exists
        const existingWeight = yield prisma_1.default.birdWeight.findUnique({
            where: { id: weightId },
            include: {
                batch: {
                    include: {
                        farm: {
                            include: { managers: true },
                        },
                    },
                },
            },
        });
        if (!existingWeight) {
            return res.status(404).json({ message: "Weight record not found" });
        }
        if (existingWeight.batchId !== batchId) {
            return res.status(400).json({ message: "Weight does not belong to this batch" });
        }
        // Only allow deleting MANUAL entries
        if (existingWeight.source !== client_1.WeightSource.MANUAL) {
            return res.status(403).json({
                message: "Can only delete manually entered weights. This weight was auto-generated from sales.",
            });
        }
        // Check access permissions
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = existingWeight.batch.farm.ownerId === currentUserId ||
                existingWeight.batch.farm.managers.some((manager) => manager.id === currentUserId);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        // Delete the weight record and recalculate currentWeight
        yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Delete the weight
            yield tx.birdWeight.delete({
                where: { id: weightId },
            });
            // Recalculate batch's currentWeight from remaining weights
            const latestWeight = yield tx.birdWeight.findFirst({
                where: { batchId },
                orderBy: { date: "desc" },
            });
            yield tx.batch.update({
                where: { id: batchId },
                data: {
                    currentWeight: latestWeight ? latestWeight.avgWeight : null,
                },
            });
        }));
        return res.json({
            success: true,
            message: "Weight record deleted successfully",
        });
    }
    catch (error) {
        console.error("Delete bird weight error:", error);
        return res.status(500).json({
            message: (error === null || error === void 0 ? void 0 : error.message) || "Failed to delete bird weight",
        });
    }
});
exports.deleteBirdWeight = deleteBirdWeight;
// ==================== GET GROWTH CHART DATA ====================
const getGrowthChartData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { batchId } = req.params;
        const currentUserId = req.userId;
        const currentUserRole = req.role;
        // Check if batch exists and user has access
        const batch = yield prisma_1.default.batch.findUnique({
            where: { id: batchId },
            include: {
                farm: {
                    include: { managers: true },
                },
            },
        });
        if (!batch) {
            return res.status(404).json({ message: "Batch not found" });
        }
        // Check access permissions
        if (currentUserRole === client_1.UserRole.MANAGER) {
            const hasAccess = batch.farm.ownerId === currentUserId ||
                batch.farm.managers.some((manager) => manager.id === currentUserId);
            if (!hasAccess) {
                return res.status(403).json({ message: "Access denied" });
            }
        }
        // Fetch all weights for charting
        const weights = yield prisma_1.default.birdWeight.findMany({
            where: { batchId },
            orderBy: { date: "asc" },
            select: {
                date: true,
                avgWeight: true,
                source: true,
            },
        });
        // Format for chart
        const chartData = weights.map((w) => ({
            date: w.date.toISOString(),
            weight: Number(w.avgWeight),
            source: w.source,
        }));
        console.log("Growth chart data", chartData);
        return res.json({
            success: true,
            data: chartData,
        });
    }
    catch (error) {
        console.error("Get growth chart data error:", error);
        return res.status(500).json({
            message: (error === null || error === void 0 ? void 0 : error.message) || "Failed to fetch growth chart data",
        });
    }
});
exports.getGrowthChartData = getGrowthChartData;
