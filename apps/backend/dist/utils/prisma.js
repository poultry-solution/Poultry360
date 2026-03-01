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
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabaseConnection = checkDatabaseConnection;
const client_1 = require("@prisma/client");
// Enhanced Prisma client configuration for Neon and connection resilience
const prisma = global.prisma || new client_1.PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    transactionOptions: {
        timeout: 10000, // 10 seconds instead of default 5 seconds
    },
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
});
// Handle connection errors gracefully
prisma.$on("error", (e) => {
    console.error("Prisma Client Error:", e);
});
// Connection health check helper
function checkDatabaseConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield prisma.$queryRaw `SELECT 1`;
            return true;
        }
        catch (error) {
            console.error("Database connection check failed:", error);
            return false;
        }
    });
}
if (process.env.NODE_ENV === "development") {
    global.prisma = prisma;
}
exports.default = prisma;
