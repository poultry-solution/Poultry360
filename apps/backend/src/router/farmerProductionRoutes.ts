import express from "express";
import { UserRole } from "@prisma/client";
import {
  createFarmerProduction,
  deleteFarmerProduction,
  getFarmerProduction,
  listFarmerProduction,
} from "../controller/farmerProductionController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();
router.use((req, res, next) =>
  authMiddleware(req, res, next, [UserRole.OWNER] as any)
);
router.get("/", listFarmerProduction);
router.post("/", createFarmerProduction);
router.get("/:id", getFarmerProduction);
router.delete("/:id", deleteFarmerProduction);

export default router;
