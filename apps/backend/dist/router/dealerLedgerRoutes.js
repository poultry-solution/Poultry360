"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dealerLedgerController_1 = require("../controller/dealerLedgerController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// Apply authentication middleware to all routes
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["DEALER"]);
});
// ==================== DEALER LEDGER ROUTES ====================
// Get ledger entries with filters
router.get("/", dealerLedgerController_1.getLedgerEntries);
// Get current balance
router.get("/balance", dealerLedgerController_1.getCurrentBalance);
// Get ledger summary
router.get("/summary", dealerLedgerController_1.getLedgerSummary);
// Get parties (customers/farmers) with balances
router.get("/parties", dealerLedgerController_1.getDealerLedgerParties);
// Export ledger
router.get("/export", dealerLedgerController_1.exportLedger);
// Get party-specific ledger
router.get("/party/:partyId", dealerLedgerController_1.getPartyLedger);
// Add payment
router.post("/payments", dealerLedgerController_1.addDealerPayment);
// Create manual adjustment
router.post("/adjustment", dealerLedgerController_1.createAdjustment);
exports.default = router;
