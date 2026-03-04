import express from "express";
import { authMiddleware } from "../middelware/middelware";
import {
  createReminderHandler,
  listRemindersHandler,
  deleteReminderHandler,
} from "../controller/reminderController";

const router = express.Router();
router.use(authMiddleware);

router.post("/", createReminderHandler);
router.get("/", listRemindersHandler);
router.delete("/:id", deleteReminderHandler);

export default router;
