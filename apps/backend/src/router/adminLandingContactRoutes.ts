import { Router } from "express";
import { authMiddleware, auditSuccessfulAdminMutation } from "../middelware/middelware";
import { UserRole } from "@prisma/client";
import { landingContactAdmin } from "../controller/adminEnquiryController";

const router = Router();

// Landing page contact form messages - SUPER_ADMIN only
router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.SUPER_ADMIN]);
});
router.use(auditSuccessfulAdminMutation("LandingContact"));

// ?status=new|contacted|all (default new)
router.get("/", landingContactAdmin.list);
router.patch("/:id/contacted", landingContactAdmin.markContacted);
router.patch("/:id/new", landingContactAdmin.markNew);

export default router;
