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
import { StaffPermission, UserRole } from "@prisma/client";
import { ACCOUNT_FEATURE_KEYS, isAccountFeatureEnabled } from "../services/accountFeatureService";
import { auditSuccessfulFarmerMutation } from "../middelware/farmerAuditMiddleware";

const router = Router();

// Only farmers (OWNER, MANAGER) can manage their listings
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER", "MANAGER"]);
});
router.use(requireStaffPermission(StaffPermission.FARMER_MANAGE_OPERATIONS));
// List for sale is an optional feature (Settings → Optional features), off by default.
router.use(async (req, res, next) => {
  try {
    if (req.role === UserRole.OWNER && !(await isAccountFeatureEnabled(req.userId!, ACCOUNT_FEATURE_KEYS.FARMER_LIST_FOR_SALE))) {
      return res.status(403).json({
        code: "FEATURE_DISABLED",
        message: "List for sale is turned off. Turn it on in Settings to use it.",
      });
    }
    return next();
  } catch (error) {
    return next(error);
  }
});
router.use(auditSuccessfulFarmerMutation);

router.get("/", getFarmerListForSale);
router.get("/:id", getFarmerListForSaleById);
router.post("/", createListForSale);
router.put("/:id", updateListForSale);
router.delete("/:id", deleteListForSale);
router.patch("/:id/archive", archiveListForSale);
router.patch("/:id/unarchive", unarchiveListForSale);

export default router;
