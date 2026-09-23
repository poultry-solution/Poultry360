import { Router } from "express";
import {
  getEggTypes,
  createEggType,
  updateEggType,
  deleteEggType,
} from "../controller/eggTypeController";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import { auditSuccessfulFarmerMutation } from "../middelware/farmerAuditMiddleware";

const router = Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]);
});
router.use(requireStaffPermission(StaffPermission.FARMER_MANAGE_OPERATIONS));
router.use(auditSuccessfulFarmerMutation);

router.get("/", getEggTypes);
router.post("/", createEggType);
router.put("/:id", updateEggType);
router.delete("/:id", deleteEggType);

export default router;
