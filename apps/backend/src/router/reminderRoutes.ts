import express from "express";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import { auditSuccessfulFarmerMutation } from "../middelware/farmerAuditMiddleware";
import {
  createReminderHandler,
  listRemindersHandler,
  deleteReminderHandler,
} from "../controller/reminderController";

const router = express.Router();
router.use(authMiddleware);
router.use(requireStaffPermission(StaffPermission.FARMER_MANAGE_OPERATIONS));
router.use(auditSuccessfulFarmerMutation);

router.post("/", createReminderHandler);
router.get("/", listRemindersHandler);
router.delete("/:id", deleteReminderHandler);

export default router;
