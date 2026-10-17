import { Router } from "express";
import {
  getFarmById,
  getUserFarms,
  createFarm,
  updateFarm,
  deleteFarm,
  getFarmSummary,
} from "../controller/farmController";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import { auditSuccessfulFarmerMutation } from "../middelware/farmerAuditMiddleware";

const farmRouter = Router();

// Farmer accounts (owner or staff with operations access).
farmRouter.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]);
});
farmRouter.use(requireStaffPermission(StaffPermission.FARMER_MANAGE_OPERATIONS));
farmRouter.use(auditSuccessfulFarmerMutation);

farmRouter.get("/my-farms", getUserFarms);
farmRouter.get("/:id", getFarmById);
farmRouter.get("/:id/summary", getFarmSummary);
farmRouter.post("/", createFarm);
farmRouter.put("/:id", updateFarm);
farmRouter.delete("/:id", deleteFarm);

export default farmRouter;
