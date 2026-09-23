import express from "express";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission, UserRole } from "@prisma/client";
import { auditSuccessfulHatcheryMutation } from "../middelware/hatcheryAuditMiddleware";
import {
  listEggTypes,
  createEggType,
  updateEggType,
  deleteEggType,
} from "../controller/hatcheryBatchController";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, [UserRole.HATCHERY] as any);
});
router.use(requireStaffPermission(StaffPermission.HATCHERY_MANAGE_OPERATIONS));
router.use(auditSuccessfulHatcheryMutation);

router.get("/", listEggTypes);
router.post("/", createEggType);
router.put("/:id", updateEggType);
router.delete("/:id", deleteEggType);

export default router;
