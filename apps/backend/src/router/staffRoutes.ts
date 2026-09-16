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
import { StaffPermission } from "@prisma/client";

const router = Router();

// Farmer, Dealer, and Hatchery only
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER", "DEALER", "HATCHERY"] as any);
});

// Payroll records are sensitive. This only affects login-capable Dealer staff;
// owners and the existing farmer/hatchery flows continue unchanged.
router.use(requireStaffPermission(StaffPermission.DEALER_VIEW_STAFF_MANAGEMENT));

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
