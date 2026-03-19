import express from "express";
import {
  createCompanyPurchase,
  getCompanyPurchases,
  getCompanyPurchasesAggregated,
  getCompanyPurchaseById,
} from "../controller/companyPurchaseController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["COMPANY"]);
});

router.post("/", createCompanyPurchase);
router.get("/", getCompanyPurchases);
router.get("/aggregated", getCompanyPurchasesAggregated);
router.get("/:id", getCompanyPurchaseById);

export default router;
