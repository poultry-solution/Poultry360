import express from "express";
import { UserRole } from "@prisma/client";
import { authMiddleware } from "../middelware/middelware";
import {
  createHatcheryProduction,
  deleteHatcheryProduction,
  getHatcheryProduction,
  listHatcheryProduction,
} from "../controller/hatcheryProductionController";

const router = express.Router();
router.use((req, res, next) => authMiddleware(req, res, next, [UserRole.HATCHERY] as any));
router.get("/", listHatcheryProduction);
router.post("/", createHatcheryProduction);
router.get("/:id", getHatcheryProduction);
router.delete("/:id", deleteHatcheryProduction);

export default router;
