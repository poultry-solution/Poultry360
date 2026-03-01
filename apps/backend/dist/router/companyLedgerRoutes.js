"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const companyLedgerController_1 = require("../controller/companyLedgerController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// Apply authentication middleware - only companies can access
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["COMPANY"]);
});
// ==================== COMPANY LEDGER ROUTES ====================
// Get ledger entries
router.get("/", companyLedgerController_1.getCompanyLedgerEntries);
// Get ledger parties (dealers with balances)
router.get("/parties", companyLedgerController_1.getCompanyLedgerParties);
// Get ledger summary
router.get("/summary", companyLedgerController_1.getCompanyLedgerSummary);
// Add payment
router.post("/payments", companyLedgerController_1.addCompanyPayment);
exports.default = router;
