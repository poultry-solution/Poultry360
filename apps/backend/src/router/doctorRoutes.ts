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

// Get online doctors (for farmer dashboard)
router.get("/online", async (req, res) => {
  try {
    const prisma = require("../utils/prisma").default;
    const onlineDoctors = await prisma.user.findMany({
      where: {
        role: 'DOCTOR',
        isOnline: true,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        isOnline: true,
        lastSeen: true
      },
      orderBy: {
        lastSeen: 'desc'
      }
    });

    return res.status(200).json({
      success: true,
      doctors: onlineDoctors,
      total: onlineDoctors.length
    });
  } catch (error) {
    console.error("Error getting online doctors:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

export default router;