import express from "express";
import { StaffPermission } from "@prisma/client";
import { authMiddleware, requireStaffAccountOwner, requireStaffPermission } from "../middelware/middelware";
import { auditSuccessfulFarmerMutation } from "../middelware/farmerAuditMiddleware";
import { getFcrSettings, updateFcrSettings } from "../controller/farmerFcrSettingsController";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]);
});
router.use(auditSuccessfulFarmerMutation);

// Staff with farm work access can see the standard; only the owner can change it.
router.get("/", requireStaffPermission(StaffPermission.FARMER_MANAGE_OPERATIONS), getFcrSettings);
router.put("/", requireStaffAccountOwner, updateFcrSettings);

export default router;
