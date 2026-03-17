import express from "express";
import {
  getAllDealers,
  getDealerById,
  createDealer,
  updateDealer,
  deleteDealer,
  addDealerTransaction,
  setDealerOpeningBalance,
  getDealerStatistics,
  getDealerTransactions,
  deleteDealerTransaction,
} from "../controller/dealerController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware to all routes
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER", "COMPANY"]); // Allow owners and companies
});


// ==================== DEALER ROUTES ====================
// Get all dealers for the authenticated user
router.get("/", getAllDealers);

// Get dealer statistics
router.get("/statistics", getDealerStatistics);

// Get dealer by ID
router.get("/:id", getDealerById);

// Get dealer transactions
router.get("/:id/transactions", getDealerTransactions);

// Create new dealer
router.post("/", createDealer);

// Add transaction to dealer
router.post("/:id/transactions", addDealerTransaction);

// Set opening balance (manual suppliers only)
router.post("/:id/opening-balance", setDealerOpeningBalance);

// Delete a dealer transaction by transaction id
router.delete("/:id/transactions/:transactionId", deleteDealerTransaction);

// Update dealer
router.put("/:id", updateDealer);

// Delete dealer
router.delete("/:id", deleteDealer);

export default router;
