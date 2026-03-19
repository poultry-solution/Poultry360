import { Router } from "express";
import { authMiddleware } from "../middelware/middelware";
import {
    createManualCompany,
    getManualCompanies,
    updateManualCompany,
    deleteManualCompany,
    archiveManualCompany,
    unarchiveManualCompany,
    setManualCompanyOpeningBalance,
    recordManualPurchase,
    recordManualCompanyPayment,
    voidManualPurchase,
    voidManualCompanyPayment,
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
router.post("/:id/archive", archiveManualCompany);
router.post("/:id/unarchive", unarchiveManualCompany);

// Purchases & Payments
router.post("/:id/purchases", recordManualPurchase);
router.post("/:id/payments", recordManualCompanyPayment);
router.delete("/:companyId/purchases/:purchaseId", voidManualPurchase);
router.delete("/:companyId/payments/:paymentId", voidManualCompanyPayment);
router.post("/:id/opening-balance", setManualCompanyOpeningBalance);
router.get("/:id/statement", getManualCompanyStatement);

// Profit
router.get("/profit/summary", getDealerProfitSummary);

export default router;
