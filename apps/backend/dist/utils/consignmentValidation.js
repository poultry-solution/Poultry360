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
exports.validateStateTransition = validateStateTransition;
exports.validateInventoryAvailability = validateInventoryAvailability;
exports.validateUserPermission = validateUserPermission;
exports.validateQuantities = validateQuantities;
exports.canCancelConsignment = canCancelConsignment;
exports.canRejectConsignment = canRejectConsignment;
exports.canDispatchConsignment = canDispatchConsignment;
exports.canRecordAdvancePayment = canRecordAdvancePayment;
const prisma_1 = __importDefault(require("./prisma"));
const client_1 = require("@prisma/client");
/**
 * Validate state transition according to state machine rules
 */
function validateStateTransition(from, to) {
    var _a, _b;
    const validTransitions = {
        CREATED: [
            client_1.ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
            client_1.ConsignmentStatus.REJECTED,
            client_1.ConsignmentStatus.CANCELLED,
        ],
        ACCEPTED_PENDING_DISPATCH: [
            client_1.ConsignmentStatus.DISPATCHED,
            client_1.ConsignmentStatus.REJECTED,
            client_1.ConsignmentStatus.CANCELLED,
        ],
        DISPATCHED: [client_1.ConsignmentStatus.RECEIVED],
        RECEIVED: [client_1.ConsignmentStatus.SETTLED],
        SETTLED: [],
        REJECTED: [],
        CANCELLED: [],
    };
    if (!((_a = validTransitions[from]) === null || _a === void 0 ? void 0 : _a.includes(to))) {
        throw new Error(`Invalid state transition from ${from} to ${to}. Valid transitions: ${((_b = validTransitions[from]) === null || _b === void 0 ? void 0 : _b.join(", ")) || "none"}`);
    }
}
/**
 * Validate inventory availability for company products
 */
function validateInventoryAvailability(companyId, items) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const item of items) {
            const product = yield prisma_1.default.product.findUnique({
                where: { id: item.productId },
                select: { currentStock: true, name: true },
            });
            if (!product) {
                throw new Error(`Product ${item.productId} not found`);
            }
            const availableStock = Number(product.currentStock || 0);
            if (availableStock < item.quantity) {
                throw new Error(`Insufficient stock for ${product.name}. Available: ${availableStock}, Requested: ${item.quantity}`);
            }
        }
    });
}
/**
 * Validate user permission for consignment action
 */
function validateUserPermission(userId, consignmentId, action) {
    return __awaiter(this, void 0, void 0, function* () {
        const consignment = yield prisma_1.default.consignmentRequest.findUnique({
            where: { id: consignmentId },
            select: {
                fromCompanyId: true,
                fromDealerId: true,
                toDealerId: true,
                toFarmerId: true,
                direction: true,
            },
        });
        if (!consignment) {
            return {
                isAuthorized: false,
                role: null,
                reason: "Consignment not found",
            };
        }
        // Check if user is company owner
        const company = yield prisma_1.default.company.findFirst({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (company && consignment.fromCompanyId === company.id) {
            return { isAuthorized: true, role: "COMPANY" };
        }
        // Check if user is dealer owner
        const dealer = yield prisma_1.default.dealer.findFirst({
            where: { ownerId: userId },
            select: { id: true },
        });
        if (dealer) {
            if (consignment.toDealerId === dealer.id ||
                consignment.fromDealerId === dealer.id) {
                return { isAuthorized: true, role: "DEALER" };
            }
        }
        // Check if user is farmer
        if (consignment.toFarmerId === userId) {
            return { isAuthorized: true, role: "FARMER" };
        }
        return {
            isAuthorized: false,
            role: null,
            reason: "User is not authorized to perform this action on this consignment",
        };
    });
}
/**
 * Validate quantities (approved <= requested, received <= dispatched, etc.)
 */
function validateQuantities(items) {
    for (const item of items) {
        if (item.approved !== undefined && item.requested !== undefined) {
            if (item.approved > item.requested) {
                throw new Error(`Approved quantity (${item.approved}) cannot exceed requested quantity (${item.requested})`);
            }
            if (item.approved < 0) {
                throw new Error("Approved quantity cannot be negative");
            }
        }
        if (item.dispatched !== undefined && item.approved !== undefined) {
            if (item.dispatched > item.approved) {
                throw new Error(`Dispatched quantity (${item.dispatched}) cannot exceed approved quantity (${item.approved})`);
            }
        }
        if (item.received !== undefined && item.dispatched !== undefined) {
            if (item.received > item.dispatched) {
                throw new Error(`Received quantity (${item.received}) cannot exceed dispatched quantity (${item.dispatched})`);
            }
        }
    }
}
/**
 * Check if consignment can be cancelled
 */
function canCancelConsignment(status) {
    const cancellableStatuses = [
        client_1.ConsignmentStatus.CREATED,
        client_1.ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
    ];
    return cancellableStatuses.includes(status);
}
/**
 * Check if consignment can be rejected
 */
function canRejectConsignment(status) {
    const rejectableStatuses = [
        client_1.ConsignmentStatus.CREATED,
        client_1.ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
    ];
    return rejectableStatuses.includes(status);
}
/**
 * Check if consignment can be dispatched
 */
function canDispatchConsignment(status) {
    return status === client_1.ConsignmentStatus.ACCEPTED_PENDING_DISPATCH;
}
/**
 * Check if consignment can receive advance payment
 */
function canRecordAdvancePayment(status) {
    const advancePaymentStatuses = [
        client_1.ConsignmentStatus.CREATED,
        client_1.ConsignmentStatus.ACCEPTED_PENDING_DISPATCH,
        client_1.ConsignmentStatus.DISPATCHED,
    ];
    return advancePaymentStatuses.includes(status);
}
