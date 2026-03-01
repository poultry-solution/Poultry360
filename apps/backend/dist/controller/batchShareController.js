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
exports.getBatchShareByToken = exports.createBatchShare = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const createBatchShare = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { batchId, title, description, isPublic = false, expiresIn, // '1d' | '7d' | '30d' | 'never'
        sharedWithId, conversationId, } = req.body || {};
        if (!batchId) {
            return res.status(400).json({ message: "batchId is required" });
        }
        // Load batch and related data to build a snapshot
        const batch = yield prisma_1.default.batch.findUnique({
            where: { id: batchId },
            include: {
                farm: true,
                feedConsumptions: { orderBy: { date: "asc" } },
                mortalities: { orderBy: { date: "asc" } },
                vaccinations: { orderBy: { scheduledDate: "asc" } },
                expenses: {
                    include: {
                        category: true,
                        inventoryUsages: {
                            include: {
                                item: true,
                            },
                        },
                    },
                },
            },
        });
        if (!batch) {
            return res.status(404).json({ message: "Batch not found" });
        }
        // Compute some simple aggregates for snapshot
        const totalMortality = batch.mortalities.reduce((sum, m) => sum + (m.count || 0), 0);
        const currentChicks = Math.max(0, batch.initialChicks - totalMortality);
        const totalFeed = batch.feedConsumptions.reduce((sum, f) => sum + Number(f.quantity || 0), 0);
        // Group expenses by category for non-financial activity feed
        const expenseGroups = (batch.expenses || []).reduce((acc, exp) => {
            var _a, _b;
            const rawName = ((_a = exp.category) === null || _a === void 0 ? void 0 : _a.name) || "Other";
            const key = rawName;
            if (!acc[key])
                acc[key] = [];
            const nameLower = rawName.toLowerCase();
            let unit = null;
            if (nameLower.includes("feed"))
                unit = "kg";
            else if (nameLower.includes("chick"))
                unit = "birds";
            else if (nameLower.includes("med"))
                unit = "units";
            // Get item name from inventory usages (non-financial)
            const itemNames = ((_b = exp.inventoryUsages) === null || _b === void 0 ? void 0 : _b.map((usage) => { var _a; return (_a = usage.item) === null || _a === void 0 ? void 0 : _a.name; }).filter(Boolean)) || [];
            // Fall back to category name if no inventory items are linked
            const itemName = itemNames.length > 0 ? itemNames.join(", ") : rawName;
            // Push structured, non-financial activity
            acc[key].push({
                date: exp.date,
                quantity: exp.quantity ? Number(exp.quantity) : null,
                unit,
                itemName, // Use item name instead of description
            });
            return acc;
        }, {});
        const expensesGrouped = Object.keys(expenseGroups).map((name) => ({
            category: name,
            items: expenseGroups[name]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((i) => ({ date: i.date, quantity: i.quantity, unit: i.unit, itemName: i.itemName })),
        }));
        // Mortality timeline with cumulative
        let cumulative = 0;
        const mortalityTimeline = (batch.mortalities || []).map((m) => {
            cumulative += m.count || 0;
            return { date: m.date, count: m.count || 0, cumulative };
        });
        const snapshotData = {
            batch: {
                id: batch.id,
                batchNumber: batch.batchNumber,
                startDate: batch.startDate,
                endDate: batch.endDate,
                status: batch.status,
                initialChicks: batch.initialChicks,
                currentChicks,
                ageDays: Math.max(0, Math.floor((new Date().getTime() - new Date(batch.startDate).getTime()) / (1000 * 60 * 60 * 24))),
            },
            farm: {
                id: batch.farm.id,
                name: batch.farm.name,
                capacity: batch.farm.capacity,
            },
            feed: {
                totalConsumption: totalFeed,
                timeline: batch.feedConsumptions.map((f) => ({
                    date: f.date,
                    quantity: Number(f.quantity),
                    feedType: f.feedType,
                })),
            },
            health: {
                totalMortality,
                mortalityRate: batch.initialChicks > 0
                    ? (totalMortality / batch.initialChicks) * 100
                    : 0,
                vaccinations: batch.vaccinations.map((v) => ({
                    name: v.vaccineName,
                    date: v.completedDate || v.scheduledDate,
                    status: v.status,
                    notes: v.notes,
                })),
                mortalityTimeline,
            },
            activities: {
                expensesGrouped, // textual, non-financial
            },
            meta: {
                snapshotDate: new Date().toISOString(),
                lastUpdated: batch.updatedAt,
            },
        };
        // compute expiration
        let expiresAt = null;
        if (expiresIn && expiresIn !== "never") {
            const now = new Date();
            const map = { "1d": 1, "7d": 7, "30d": 30 };
            const days = map[expiresIn] || 0;
            if (days > 0) {
                expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
            }
        }
        // Create share record
        const share = yield prisma_1.default.batchShare.create({
            data: {
                batchId: batch.id,
                farmerId: batch.farm.ownerId,
                sharedWithId: sharedWithId || null,
                conversationId: conversationId || null,
                snapshotData,
                title: title || null,
                description: description || null,
                isPublic: Boolean(isPublic),
                expiresAt: expiresAt || null,
            },
            select: {
                id: true,
                shareToken: true,
                expiresAt: true,
                isPublic: true,
            },
        });
        const shareUrl = `/share/batch/${share.shareToken}`;
        return res.status(201).json({
            shareId: share.id,
            shareToken: share.shareToken,
            shareUrl,
            expiresAt: share.expiresAt,
            isPublic: share.isPublic,
        });
    }
    catch (error) {
        console.error("createBatchShare error:", error);
        return res.status(500).json({ message: "Failed to create batch share" });
    }
});
exports.createBatchShare = createBatchShare;
const getBatchShareByToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.params;
        if (!token)
            return res.status(400).json({ message: "token is required" });
        const share = yield prisma_1.default.batchShare.findFirst({
            where: { shareToken: token },
            select: {
                id: true,
                title: true,
                description: true,
                isPublic: true,
                expiresAt: true,
                snapshotData: true,
                createdAt: true,
                viewCount: true,
            },
        });
        if (!share)
            return res.status(404).json({ message: "Share not found" });
        // No auth/security checks for now as requested
        // Increment view count (fire and forget)
        prisma_1.default.batchShare
            .update({
            where: { id: share.id },
            data: { viewCount: { increment: 1 } },
        })
            .catch(() => { });
        return res.json({
            share: {
                id: share.id,
                title: share.title,
                description: share.description,
                createdAt: share.createdAt,
                expiresAt: share.expiresAt,
                snapshotData: share.snapshotData,
                viewCount: share.viewCount,
            },
            canAddNotes: false,
        });
    }
    catch (error) {
        console.error("getBatchShareByToken error:", error);
        return res.status(500).json({ message: "Failed to load share" });
    }
});
exports.getBatchShareByToken = getBatchShareByToken;
