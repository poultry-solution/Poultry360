import { Router } from "express";
import { authMiddleware, auditSuccessfulAdminMutation } from "../middelware/middelware";
import { UserRole } from "@prisma/client";
import { demoEnquiryAdmin } from "../controller/adminEnquiryController";

const router = Router();

// Apply authentication middleware to all routes - SUPER_ADMIN only
router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
});
router.use(auditSuccessfulAdminMutation("DemoEnquiry"));

// ?status=new|contacted|all (default new)
router.get("/", demoEnquiryAdmin.list);
router.patch("/:id/contacted", demoEnquiryAdmin.markContacted);
router.patch("/:id/new", demoEnquiryAdmin.markNew);

export default router;
