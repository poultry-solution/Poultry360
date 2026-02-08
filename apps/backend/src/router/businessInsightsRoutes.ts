import express from "express";
import { getDealerInsights } from "../controller/businessInsightsController";
import { authMiddleware } from "../middelware/middelware";

const router = express.Router();

router.use(authMiddleware);

// GET /api/company/insights/dealers
router.get("/dealers", getDealerInsights);

export default router;
