import { Router } from "express";
import {
  listStaff,
  getStaffSummary,
  getStaffById,
  createStaff,
  updateStaff,
  stopStaff,
  addPayment,
  archiveStaff,
  getTransactions,
} from "../controller/staffController";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission, UserRole } from "@prisma/client";
import { auditSuccessfulHatcheryMutation } from "../middelware/hatcheryAuditMiddleware";
import { auditSuccessfulFarmerMutation } from "../middelware/farmerAuditMiddleware";
import { auditSuccessfulCompanyMutation } from "../middelware/companyAuditMiddleware";
import { auditSuccessfulDealerStaffMutation } from "../middelware/dealerStaffAuditMiddleware";

const router = Router();

const payrollPermissionByRole: Partial<Record<UserRole, StaffPermission>> = {
  [UserRole.DEALER]: StaffPermission.DEALER_VIEW_STAFF_MANAGEMENT,
  [UserRole.HATCHERY]: StaffPermission.HATCHERY_VIEW_STAFF_MANAGEMENT,
  [UserRole.OWNER]: StaffPermission.FARMER_VIEW_STAFF_MANAGEMENT,
  [UserRole.COMPANY]: StaffPermission.COMPANY_VIEW_STAFF_MANAGEMENT,
};

// Payroll records are shared by all account modules that support staff.
router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.OWNER, UserRole.DEALER, UserRole.HATCHERY, UserRole.COMPANY]);
});

// Payroll records are sensitive. Owners retain access while staff must hold
// the permission configured for their account module.
router.use((req, res, next) => {
  const permission = req.role ? payrollPermissionByRole[req.role] : undefined;
  if (!permission) return res.status(403).json({ error: "Access denied for this role" });
  return requireStaffPermission(permission)(req, res, next);
});
router.use((req, res, next) => {
  if (req.role === UserRole.HATCHERY) return auditSuccessfulHatcheryMutation(req, res, next);
  if (req.role === UserRole.OWNER) return auditSuccessfulFarmerMutation(req, res, next);
  if (req.role === UserRole.COMPANY) return auditSuccessfulCompanyMutation(req, res, next);
  if (req.role === UserRole.DEALER) return auditSuccessfulDealerStaffMutation(req, res, next);
  return next();
});

router.get("/", listStaff);
router.get("/summary", getStaffSummary);
router.get("/:id", getStaffById);
router.post("/", createStaff);
router.put("/:id", updateStaff);
router.patch("/:id/stop", stopStaff);
router.patch("/:id/archive", archiveStaff);
router.post("/:id/payments", addPayment);
router.get("/:id/transactions", getTransactions);

export default router;
