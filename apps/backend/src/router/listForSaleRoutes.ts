import { Router } from "express";
import {
  getFarmerListForSale,
  getFarmerListForSaleById,
  createListForSale,
  updateListForSale,
  deleteListForSale,
  archiveListForSale,
  unarchiveListForSale,
} from "../controller/listForSaleController";
import { authMiddleware, requireStaffPermission } from "../middelware/middelware";
import { StaffPermission } from "@prisma/client";
import { auditSuccessfulFarmerMutation } from "../middelware/farmerAuditMiddleware";

const router = Router();

// Only farmers (OWNER, MANAGER) can manage their listings
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER", "MANAGER"]);
});
router.use(requireStaffPermission(StaffPermission.FARMER_MANAGE_OPERATIONS));
router.use(auditSuccessfulFarmerMutation);

router.get("/", getFarmerListForSale);
router.get("/:id", getFarmerListForSaleById);
router.post("/", createListForSale);
router.put("/:id", updateListForSale);
router.delete("/:id", deleteListForSale);
router.patch("/:id/archive", archiveListForSale);
router.patch("/:id/unarchive", unarchiveListForSale);

export default router;
