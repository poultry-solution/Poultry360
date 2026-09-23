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

const router = Router();

// Farmer, Dealer, and Hatchery only
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER", "DEALER", "HATCHERY"] as any);
});

// Payroll records are sensitive. Owners retain access while staff must hold
// the permission configured for their account module.
router.use((req, res, next) => requireStaffPermission(
  req.role === UserRole.HATCHERY
    ? StaffPermission.HATCHERY_VIEW_STAFF_MANAGEMENT
    : StaffPermission.DEALER_VIEW_STAFF_MANAGEMENT
)(req, res, next));
router.use((req, res, next) => {
  if (req.role === UserRole.HATCHERY) return auditSuccessfulHatcheryMutation(req, res, next);
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
