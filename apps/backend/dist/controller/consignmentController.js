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
exports.getConsignmentAuditLogs = exports.cancelDealerConsignment = exports.rejectDealerConsignment = exports.confirmDealerConsignmentReceipt = exports.acceptDealerConsignment = exports.getDealerConsignmentById = exports.getDealerConsignments = exports.createDealerConsignment = exports.cancelCompanyConsignment = exports.rejectCompanyConsignment = exports.dispatchCompanyConsignment = exports.approveCompanyConsignment = exports.getCompanyConsignmentById = exports.getCompanyConsignments = exports.createCompanyConsignment = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const consignmentService_1 = require("../services/consignmentService");
const client_1 = require("@prisma/client");
// ==================== COMPANY: CREATE CONSIGNMENT ====================
const createCompanyConsignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { dealerId, items, notes, overrideBalanceLimit, discount } = req.body;
        if (!dealerId || !items || items.length === 0) {
            return res.status(400).json({
                message: "Dealer ID and items are required",
            });
        }
        // Get company
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        // Validate dealer exists
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { id: dealerId },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const consignment = yield consignmentService_1.ConsignmentService.createConsignment({
            direction: client_1.ConsignmentDirection.COMPANY_TO_DEALER,
            fromCompanyId: company.id,
            toDealerId: dealerId,
            requestedById: userId,
            items: items.map((item) => ({
                companyProductId: item.productId,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
            })),
            notes,
            overrideBalanceLimit: !!overrideBalanceLimit,
            discount: (discount === null || discount === void 0 ? void 0 : discount.value) > 0
                ? { type: discount.type, value: Number(discount.value) }
                : undefined,
        });
        return res.status(201).json({
            success: true,
            data: consignment,
            message: "Consignment created successfully",
        });
    }
    catch (error) {
        console.error("Create company consignment error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.createCompanyConsignment = createCompanyConsignment;
// ==================== COMPANY: GET CONSIGNMENTS ====================
const getCompanyConsignments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { page = 1, limit = 50, status, direction, search } = req.query;
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const result = yield consignmentService_1.ConsignmentService.listConsignments({
            fromCompanyId: company.id,
            status: status,
            direction: direction,
            page: Number(page),
            limit: Number(limit),
            search: search,
        });
        return res.status(200).json({
            success: true,
            data: result.consignments,
            pagination: result.pagination,
        });
    }
    catch (error) {
        console.error("Get company consignments error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCompanyConsignments = getCompanyConsignments;
// ==================== COMPANY: GET CONSIGNMENT BY ID ====================
const getCompanyConsignmentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const consignment = yield consignmentService_1.ConsignmentService.getConsignmentById(id);
        if (!consignment) {
            return res.status(404).json({ message: "Consignment not found" });
        }
        if (consignment.fromCompanyId !== company.id) {
            return res.status(403).json({ message: "Unauthorized" });
        }
        return res.status(200).json({
            success: true,
            data: consignment,
        });
    }
    catch (error) {
        console.error("Get company consignment error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCompanyConsignmentById = getCompanyConsignmentById;
// ==================== COMPANY: APPROVE DEALER REQUEST ====================
const approveCompanyConsignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { items, notes, discount } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).json({
                message: "Items with accepted quantities are required",
            });
        }
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const discountParam = discount &&
            typeof discount.type === "string" &&
            typeof discount.value === "number" &&
            discount.value > 0
            ? { type: discount.type, value: Number(discount.value) }
            : undefined;
        const consignment = yield consignmentService_1.ConsignmentService.acceptConsignment({
            consignmentId: id,
            acceptedById: userId,
            items: items.map((item) => ({
                itemId: item.itemId,
                acceptedQuantity: Number(item.acceptedQuantity),
            })),
            notes,
            discount: discountParam,
        });
        return res.status(200).json({
            success: true,
            data: consignment,
            message: "Consignment approved successfully",
        });
    }
    catch (error) {
        console.error("Approve consignment error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.approveCompanyConsignment = approveCompanyConsignment;
// ==================== COMPANY: DISPATCH CONSIGNMENT ====================
const dispatchCompanyConsignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { dispatchRef, trackingInfo, notes } = req.body;
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const consignment = yield consignmentService_1.ConsignmentService.dispatchConsignment({
            consignmentId: id,
            dispatchedById: userId,
            dispatchRef,
            trackingInfo,
            notes,
        });
        return res.status(200).json({
            success: true,
            data: consignment,
            message: "Consignment dispatched successfully",
        });
    }
    catch (error) {
        console.error("Dispatch consignment error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.dispatchCompanyConsignment = dispatchCompanyConsignment;
// ==================== COMPANY: REJECT CONSIGNMENT ====================
const rejectCompanyConsignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { reason } = req.body;
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const consignment = yield consignmentService_1.ConsignmentService.rejectConsignment({
            consignmentId: id,
            rejectedById: userId,
            reason,
        });
        return res.status(200).json({
            success: true,
            data: consignment,
            message: "Consignment rejected",
        });
    }
    catch (error) {
        console.error("Reject consignment error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.rejectCompanyConsignment = rejectCompanyConsignment;
// ==================== COMPANY: CANCEL CONSIGNMENT ====================
const cancelCompanyConsignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { reason } = req.body;
        const company = yield prisma_1.default.company.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const consignment = yield consignmentService_1.ConsignmentService.cancelConsignment({
            consignmentId: id,
            cancelledById: userId,
            reason,
        });
        return res.status(200).json({
            success: true,
            data: consignment,
            message: "Consignment cancelled",
        });
    }
    catch (error) {
        console.error("Cancel consignment error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.cancelCompanyConsignment = cancelCompanyConsignment;
// ==================== DEALER: REQUEST CONSIGNMENT ====================
const createDealerConsignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { companyId, items, notes } = req.body;
        if (!companyId || !items || items.length === 0) {
            return res.status(400).json({
                message: "Company ID and items are required",
            });
        }
        // Get dealer
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        // Validate company exists
        const company = yield prisma_1.default.company.findUnique({
            where: { id: companyId },
        });
        if (!company) {
            return res.status(404).json({ message: "Company not found" });
        }
        const consignment = yield consignmentService_1.ConsignmentService.createConsignment({
            direction: client_1.ConsignmentDirection.DEALER_TO_COMPANY,
            fromDealerId: dealer.id,
            fromCompanyId: companyId,
            toDealerId: dealer.id,
            requestedById: userId,
            items: items.map((item) => ({
                companyProductId: item.productId,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
            })),
            notes,
        });
        return res.status(201).json({
            success: true,
            data: consignment,
            message: "Consignment request created successfully",
        });
    }
    catch (error) {
        console.error("Create dealer consignment error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.createDealerConsignment = createDealerConsignment;
// ==================== DEALER: GET CONSIGNMENTS ====================
const getDealerConsignments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { page = 1, limit = 50, status, direction, search } = req.query;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const result = yield consignmentService_1.ConsignmentService.listConsignments({
            toDealerId: dealer.id,
            status: status,
            direction: direction,
            page: Number(page),
            limit: Number(limit),
            search: search,
        });
        return res.status(200).json({
            success: true,
            data: result.consignments,
            pagination: result.pagination,
        });
    }
    catch (error) {
        console.error("Get dealer consignments error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerConsignments = getDealerConsignments;
// ==================== DEALER: GET CONSIGNMENT BY ID ====================
const getDealerConsignmentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const consignment = yield consignmentService_1.ConsignmentService.getConsignmentById(id);
        if (!consignment) {
            return res.status(404).json({ message: "Consignment not found" });
        }
        if (consignment.toDealerId !== dealer.id) {
            return res.status(403).json({ message: "Unauthorized" });
        }
        return res.status(200).json({
            success: true,
            data: consignment,
        });
    }
    catch (error) {
        console.error("Get dealer consignment error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getDealerConsignmentById = getDealerConsignmentById;
// ==================== DEALER: ACCEPT CONSIGNMENT ====================
const acceptDealerConsignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { items, notes } = req.body;
        if (!items || items.length === 0) {
            return res.status(400).json({
                message: "Items with accepted quantities are required",
            });
        }
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const consignment = yield consignmentService_1.ConsignmentService.acceptConsignment({
            consignmentId: id,
            acceptedById: userId,
            items: items.map((item) => ({
                itemId: item.itemId,
                acceptedQuantity: Number(item.acceptedQuantity),
            })),
            notes,
        });
        return res.status(200).json({
            success: true,
            data: consignment,
            message: "Consignment accepted successfully",
        });
    }
    catch (error) {
        console.error("Accept consignment error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.acceptDealerConsignment = acceptDealerConsignment;
// ==================== DEALER: CONFIRM RECEIPT ====================
const confirmDealerConsignmentReceipt = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { grnRef, notes, items } = req.body;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const consignment = yield consignmentService_1.ConsignmentService.confirmReceipt({
            consignmentId: id,
            receivedById: userId,
            grnRef,
            notes,
            items: items === null || items === void 0 ? void 0 : items.map((item) => ({
                itemId: item.itemId,
                sellingPrice: item.sellingPrice
                    ? Number(item.sellingPrice)
                    : undefined,
            })),
        });
        return res.status(200).json({
            success: true,
            data: consignment,
            message: "Consignment received successfully. Sale created and inventory updated.",
        });
    }
    catch (error) {
        console.error("Confirm consignment receipt error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.confirmDealerConsignmentReceipt = confirmDealerConsignmentReceipt;
// ==================== DEALER: REJECT CONSIGNMENT ====================
const rejectDealerConsignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { reason } = req.body;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const consignment = yield consignmentService_1.ConsignmentService.rejectConsignment({
            consignmentId: id,
            rejectedById: userId,
            reason,
        });
        return res.status(200).json({
            success: true,
            data: consignment,
            message: "Consignment rejected",
        });
    }
    catch (error) {
        console.error("Reject consignment error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.rejectDealerConsignment = rejectDealerConsignment;
// ==================== DEALER: CANCEL CONSIGNMENT ====================
const cancelDealerConsignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.userId;
        const { id } = req.params;
        const { reason } = req.body;
        const dealer = yield prisma_1.default.dealer.findUnique({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (!dealer) {
            return res.status(404).json({ message: "Dealer not found" });
        }
        const consignment = yield consignmentService_1.ConsignmentService.cancelConsignment({
            consignmentId: id,
            cancelledById: userId,
            reason,
        });
        return res.status(200).json({
            success: true,
            data: consignment,
            message: "Consignment cancelled",
        });
    }
    catch (error) {
        console.error("Cancel consignment error:", error);
        return res
            .status(400)
            .json({ message: error.message || "Internal server error" });
    }
});
exports.cancelDealerConsignment = cancelDealerConsignment;
// ==================== SHARED: GET AUDIT LOGS ====================
const getConsignmentAuditLogs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const auditLogs = yield consignmentService_1.ConsignmentService.getAuditLogs(id);
        return res.status(200).json({
            success: true,
            data: auditLogs,
        });
    }
    catch (error) {
        console.error("Get audit logs error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getConsignmentAuditLogs = getConsignmentAuditLogs;
