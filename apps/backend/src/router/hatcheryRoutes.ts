import express from "express";
import {
  getAllHatcheries,
  getHatcheryById,
  createHatchery,
  updateHatchery,
  deleteHatchery,
  addHatcheryTransaction,
  getHatcheryStatistics,
  getHatcheryTransactions,
} from "../controller/hatcherController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// ==================== HATCHERY ROUTES ====================

// GET /api/v1/hatcheries - Get all hatcheries for the user
router.get("/", getAllHatcheries);

// GET /api/v1/hatcheries/statistics - Get hatchery statistics
router.get("/statistics", getHatcheryStatistics);

// GET /api/v1/hatcheries/:id - Get hatchery by ID
router.get("/:id", getHatcheryById);

// GET /api/v1/hatcheries/:id/transactions - Get hatchery transactions
router.get("/:id/transactions", getHatcheryTransactions);

// POST /api/v1/hatcheries - Create new hatchery
router.post("/", createHatchery);

// PUT /api/v1/hatcheries/:id - Update hatchery
router.put("/:id", updateHatchery);

// DELETE /api/v1/hatcheries/:id - Delete hatchery
router.delete("/:id", deleteHatchery);

// POST /api/v1/hatcheries/:id/transactions - Add transaction to hatchery
router.post("/:id/transactions", addHatcheryTransaction);

export default router;
