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
import { authMiddleware } from "../middelware/middelware";

const router = Router();

// Only farmers (OWNER, MANAGER) can manage their listings
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER", "MANAGER"]);
});

router.get("/", getFarmerListForSale);
router.get("/:id", getFarmerListForSaleById);
router.post("/", createListForSale);
router.put("/:id", updateListForSale);
router.delete("/:id", deleteListForSale);
router.patch("/:id/archive", archiveListForSale);
router.patch("/:id/unarchive", unarchiveListForSale);

export default router;
