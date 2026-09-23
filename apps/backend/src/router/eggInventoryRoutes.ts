import { Router } from "express";
import { getEggInventory } from "../controller/eggInventoryController";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";

const router = Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]);
});
router.use(requireStaffPermission(StaffPermission.FARMER_MANAGE_OPERATIONS));

router.get("/", getEggInventory);

export default router;
