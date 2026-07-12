import { Router } from "express";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

const removedRouteHandler = (req: any, res: any) => {
  return res.status(410).json({
    success: false,
    message:
      "Dealer farmer account workflows have been removed. Use the normal customer ledger routes and manual customer flow instead.",
    route: req.originalUrl,
  });
};

// All routes require dealer authentication
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});

// List all farmer accounts for the authenticated dealer
router.get("/", removedRouteHandler);

// Get a specific farmer account
router.get("/:farmerId", removedRouteHandler);

// Set farmer balance limit
router.put("/:farmerId/balance-limit", removedRouteHandler);

// Check farmer balance limit (e.g. before creating sale)
router.post("/:farmerId/check-balance-limit", removedRouteHandler);

// Get account statement for a farmer
router.get("/:farmerId/statement", removedRouteHandler);

export default router;
