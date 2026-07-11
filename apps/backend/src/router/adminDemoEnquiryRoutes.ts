import { Router } from "express";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";
import { getDemoEnquiries } from "../controller/demoEnquiryController";

const router = Router();

// Apply authentication middleware to all routes - SUPER_ADMIN only
router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
});

router.get("/", getDemoEnquiries);

export default router;

