import express from "express";
import {
  createCompanySale,
  getCompanySales,
  getCompanySaleById,
  addCompanySalePayment,
  getCompanySalesStatistics,
  searchDealersForCompany,
} from "../controller/companySaleController";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import { auditSuccessfulCompanyMutation } from "../middelware/companyAuditMiddleware";

const router = express.Router();

// Apply authentication middleware to all routes - only companies can access
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["COMPANY"]);
});
router.use(auditSuccessfulCompanyMutation);

// ==================== COMPANY SALE ROUTES ====================
// Search dealers for company (must be before "/" to avoid conflict)
router.get("/search-dealers", requireStaffPermission(StaffPermission.COMPANY_MANAGE_OPERATIONS), searchDealersForCompany);

// Create company sale
router.post("/", requireStaffPermission(StaffPermission.COMPANY_MANAGE_OPERATIONS), createCompanySale);

// Get all company sales with pagination and filters
router.get("/", requireStaffPermission(StaffPermission.COMPANY_MANAGE_OPERATIONS), getCompanySales);

// Get sales statistics
router.get("/statistics", requireStaffPermission(StaffPermission.COMPANY_VIEW_FINANCIAL_SUMMARIES), getCompanySalesStatistics);

// Get company sale by ID
router.get("/:id", requireStaffPermission(StaffPermission.COMPANY_MANAGE_OPERATIONS), getCompanySaleById);

// Add payment to sale
router.post("/:id/payments", requireStaffPermission(StaffPermission.COMPANY_MANAGE_OPERATIONS), addCompanySalePayment);

export default router;
