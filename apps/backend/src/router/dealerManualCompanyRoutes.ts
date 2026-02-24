import { Router } from "express";
import { authMiddleware } from "../middelware/middelware";
import {
    createManualCompany,
    getManualCompanies,
    updateManualCompany,
    deleteManualCompany,
    recordManualPurchase,
    recordManualCompanyPayment,
    getManualCompanyStatement,
    getDealerProfitSummary,
} from "../controller/dealerManualCompanyController";

const router = Router();

// All routes require dealer authentication
router.use((req, res, next) => {
    authMiddleware(req, res, next, ["DEALER"]);
});

// CRUD
router.post("/", createManualCompany);
router.get("/", getManualCompanies);
router.put("/:id", updateManualCompany);
router.delete("/:id", deleteManualCompany);

// Purchases & Payments
router.post("/:id/purchases", recordManualPurchase);
router.post("/:id/payments", recordManualCompanyPayment);
router.get("/:id/statement", getManualCompanyStatement);

// Profit
router.get("/profit/summary", getDealerProfitSummary);

export default router;
