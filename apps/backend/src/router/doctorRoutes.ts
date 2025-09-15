import { Router } from "express";
import {
  updateOnlineStatus,
  getDoctorStatus,
} from "../controller/doctorController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

// All routes require authentication
router.use((req, res, next) => {
  authMiddleware(req, res, next, []); // Only allow DOCTOR role
});

// Doctor status operations
router.put("/online-status", updateOnlineStatus);
router.get("/status", getDoctorStatus);

export default router;
