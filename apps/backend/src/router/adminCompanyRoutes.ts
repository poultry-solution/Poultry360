import { Router } from "express";
import {
  getAllCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
} from "../controller/adminCompanyController";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";

const router = Router();

// Apply authentication middleware to all routes - SUPER_ADMIN only
router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
});

// ==================== ADMIN COMPANY ROUTES ====================

// Get all companies with pagination, search, and filtering
router.get("/", getAllCompanies);

// Get company by ID
router.get("/:id", getCompanyById);

// Create new company
router.post("/", createCompany);

// Update company
router.put("/:id", updateCompany);

// Delete company
router.delete("/:id", deleteCompany);

export default router;
