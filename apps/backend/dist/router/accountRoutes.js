"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const accountController_1 = require("../controller/accountController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["OWNER", "MANAGER"]); // Allow OWNER and MANAGER roles
});
// ==================== ACCOUNT ROUTES ====================
// Get all account transactions
router.get("/transactions", accountController_1.getAllAccountTransactions);
exports.default = router;
