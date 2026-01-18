import { Router } from "express";
import { searchCompanies } from "../controller/publicController";

const router = Router();

// ==================== PUBLIC ROUTES (NO AUTH REQUIRED) ====================

// Search companies - used during dealer signup
router.get("/companies/search", searchCompanies);

export default router;
