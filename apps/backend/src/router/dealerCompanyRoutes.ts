import { Router } from "express";
import { getCompanyProducts } from "../controller/dealerController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();    

// All routes require dealer authentication
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});

// Get products from a specific company (for catalog view)
router.get("/:companyId/products", getCompanyProducts);

export default router;
