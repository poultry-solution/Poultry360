import express from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../middelware/middelware";
import {
  archiveHatcheryProduct,
  createHatcheryProduct,
  listHatcheryProducts,
  updateHatcheryProduct,
} from "../controller/hatcheryProductController";

const router = express.Router();
router.use((req, res, next) => authMiddleware(req, res, next, [UserRole.HATCHERY] as any));
router.get("/", listHatcheryProducts);
router.post("/", createHatcheryProduct);
router.put("/:id", updateHatcheryProduct);
router.delete("/:id", archiveHatcheryProduct);

export default router;
