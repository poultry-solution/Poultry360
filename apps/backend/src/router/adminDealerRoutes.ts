import { Router } from "express";
import {
  getAllDealers,
  getDealerById,
  createDealer,
  updateDealer,
  deleteDealer,
} from "../controller/adminDealerController";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";

const router = Router();

// Apply authentication middleware to all routes - SUPER_ADMIN only
router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
});

// ==================== ADMIN DEALER ROUTES ====================

// Get all dealers with pagination, search, and filtering
router.get("/", getAllDealers);

// Get dealer by ID
router.get("/:id", getDealerById);

// Create new dealer
router.post("/", createDealer);

// Update dealer
router.put("/:id", updateDealer);

// Delete dealer
router.delete("/:id", deleteDealer);

export default router;
