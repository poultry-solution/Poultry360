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
exports.searchDealers = exports.searchCompanies = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const client_1 = require("@prisma/client");
// ==================== PUBLIC COMPANY SEARCH ====================
// This endpoint allows unauthenticated users to search for companies
// Used during dealer signup to link dealer with a company
const searchCompanies = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search, limit = 20 } = req.query;
        // Require at least 2 characters for search (privacy/security)
        if (!search || search.length < 2) {
            return res.json({
                success: true,
                data: [],
                message: "Please enter at least 2 characters to search",
            });
        }
        // Search for active companies only
        const companies = yield prisma_1.default.company.findMany({
            where: {
                owner: {
                    role: client_1.UserRole.COMPANY,
                    status: client_1.UserStatus.ACTIVE, // Only show active companies
                },
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { address: { contains: search, mode: "insensitive" } },
                ],
            },
            take: Math.min(Number(limit), 50), // Max 50 results
            select: {
                id: true,
                name: true,
                address: true,
                owner: {
                    select: {
                        name: true,
                        phone: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });
        return res.json({
            success: true,
            data: companies,
        });
    }
    catch (error) {
        console.error("Public company search error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
exports.searchCompanies = searchCompanies;
// ==================== PUBLIC DEALER SEARCH ====================
// This endpoint allows farmers to search for dealers
// Used when farmers want to connect with dealers
const searchDealers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { search, limit = 20 } = req.query;
        // Require at least 2 characters for search (privacy/security)
        if (!search || search.length < 2) {
            return res.json({
                success: true,
                data: [],
                message: "Please enter at least 2 characters to search",
            });
        }
        // Search for active dealers with owners only (authenticated dealers)
        const dealers = yield prisma_1.default.dealer.findMany({
            where: {
                ownerId: { not: null }, // Only dealers with authentication
                owner: {
                    role: client_1.UserRole.DEALER,
                    status: client_1.UserStatus.ACTIVE, // Only show active dealers
                },
                OR: [
                    { name: { contains: search, mode: "insensitive" } },
                    { contact: { contains: search, mode: "insensitive" } },
                    { address: { contains: search, mode: "insensitive" } },
                ],
            },
            take: Math.min(Number(limit), 50), // Max 50 results
            select: {
                id: true,
                name: true,
                contact: true,
                address: true,
                owner: {
                    select: {
                        name: true,
                        phone: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });
        return res.json({
            success: true,
            data: dealers,
        });
    }
    catch (error) {
        console.error("Public dealer search error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
exports.searchDealers = searchDealers;
