import express from "express";
import { UserRole } from "@prisma/client";
import {
  archiveFarmerProduct,
  createFarmerProduct,
  listFarmerProducts,
  updateFarmerProduct,
} from "../controller/farmerProductController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();
router.use((req, res, next) =>
  authMiddleware(req, res, next, [UserRole.OWNER] as any)
);
router.get("/", listFarmerProducts);
router.post("/", createFarmerProduct);
router.put("/:id", updateFarmerProduct);
router.delete("/:id", archiveFarmerProduct);

export default router;
