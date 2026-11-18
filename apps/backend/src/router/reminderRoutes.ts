import express, { NextFunction, Request, Response } from "express";
import { StaffPermission, UserRole } from "@prisma/client";
import { authMiddleware, requireStaffPermissionForAccountRole } from "../middelware/middelware";
import { auditSuccessfulFarmerMutation } from "../middelware/farmerAuditMiddleware";
import { auditSuccessfulHatcheryMutation } from "../middelware/hatcheryAuditMiddleware";
import { auditSuccessfulDealerReminderMutation } from "../middelware/dealerStaffAuditMiddleware";
import { moduleForRole } from "../services/reminderService";
import {
  createReminderHandler,
  listRemindersHandler,
  listReminderPeopleHandler,
  updateReminderHandler,
  doneReminderHandler,
  undoReminderHandler,
  snoozeReminderHandler,
  deleteReminderHandler,
} from "../controller/reminderController";

const router = express.Router();
router.use(authMiddleware);

// Reminders are shared by the farmer, hatchery and feed dealer modules.
router.use((req: Request, res: Response, next: NextFunction) => {
  if (!moduleForRole(req.role)) {
    return res.status(403).json({ success: false, message: "Reminders are not on for this account yet." });
  }
  return next();
});

const staffPermissionCheck = requireStaffPermissionForAccountRole({
  [UserRole.OWNER]: StaffPermission.FARMER_MANAGE_OPERATIONS,
  [UserRole.HATCHERY]: StaffPermission.HATCHERY_MANAGE_OPERATIONS,
});
// Dealer staff have no "manage" permission; any active dealer staff login may
// use reminders (their login already needs the dealer staff feature on).
router.use((req: Request, res: Response, next: NextFunction) =>
  req.role === UserRole.DEALER ? next() : staffPermissionCheck(req, res, next)
);

// Write to the right module's activity log.
router.use((req: Request, res: Response, next: NextFunction) =>
  req.role === UserRole.HATCHERY
    ? auditSuccessfulHatcheryMutation(req, res, next)
    : req.role === UserRole.DEALER
      ? auditSuccessfulDealerReminderMutation(req, res, next)
      : auditSuccessfulFarmerMutation(req, res, next)
);

router.get("/", listRemindersHandler);
router.get("/people", listReminderPeopleHandler);
router.post("/", createReminderHandler);
router.patch("/:id", updateReminderHandler);
router.post("/:id/done", doneReminderHandler);
router.post("/:id/undo", undoReminderHandler);
router.post("/:id/snooze", snoozeReminderHandler);
router.delete("/:id", deleteReminderHandler);

export default router;
