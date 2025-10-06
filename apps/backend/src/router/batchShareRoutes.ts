import { Router } from "express";
import {
  createBatchShare,
  getBatchShareByToken,
} from "../controller/batchShareController";

const router = Router();

// NOTE: No auth middleware for now as per request

router.post("/", createBatchShare);
router.get("/:token", getBatchShareByToken);

export default router;
