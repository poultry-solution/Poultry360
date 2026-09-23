import express from "express";
import { getAllAccountTransactions } from "../controller/accountController";
import { authMiddleware, requireStaffAccountOwner } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware to all routes
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER", "MANAGER"]); // Allow OWNER and MANAGER roles
});
router.use(requireStaffAccountOwner);

// ==================== ACCOUNT ROUTES ====================
// Get all account transactions
router.get("/transactions", getAllAccountTransactions);

export default router;
