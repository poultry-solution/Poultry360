import { Request, Response, Router } from "express";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

const removedFarmerPurchaseRequestRoute = (req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    message:
      "Farmer purchase request workflows have been removed. Use the manual supplier purchase flow instead.",
    route: req.originalUrl,
  });
};

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]);
});

router.get("/statistics", removedFarmerPurchaseRequestRoute);
router.get("/", removedFarmerPurchaseRequestRoute);
router.get("/:id", removedFarmerPurchaseRequestRoute);

export default router;
