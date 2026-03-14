import { Router } from "express";
import {
  listStaff,
  getStaffById,
  createStaff,
  updateStaff,
  stopStaff,
  addPayment,
  getTransactions,
} from "../controller/staffController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

// Farmer and Dealer only
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER", "DEALER"]);
});

router.get("/", listStaff);
router.get("/:id", getStaffById);
router.post("/", createStaff);
router.put("/:id", updateStaff);
router.patch("/:id/stop", stopStaff);
router.post("/:id/payments", addPayment);
router.get("/:id/transactions", getTransactions);

export default router;
