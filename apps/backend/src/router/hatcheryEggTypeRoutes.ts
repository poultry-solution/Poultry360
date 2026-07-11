import express from "express";
import { authMiddleware } from "../middelware/middelware";
import { UserRole } from "@prisma/client";
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

router.get("/", listEggTypes);
router.post("/", createEggType);
router.put("/:id", updateEggType);
router.delete("/:id", deleteEggType);

export default router;
