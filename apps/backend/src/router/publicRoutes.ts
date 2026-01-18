import { Router } from "express";
import { searchCompanies, searchDealers } from "../controller/publicController";

const router = Router();

// ==================== PUBLIC ROUTES (NO AUTH REQUIRED) ====================

// Search companies - used during dealer signup
router.get("/companies/search", searchCompanies);

// Search dealers - used when farmers want to connect
router.get("/dealers/search", searchDealers);

export default router;
