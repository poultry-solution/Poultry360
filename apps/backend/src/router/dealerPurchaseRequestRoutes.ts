import { Request, Response, Router } from "express";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

const removedDealerPurchaseRequestRoute = (req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    message:
      "Dealer purchase request workflows have been removed. Use the manual customer and sales flow instead.",
    route: req.originalUrl,
  });
};

router.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});

router.get("/statistics", removedDealerPurchaseRequestRoute);
router.get("/", removedDealerPurchaseRequestRoute);
router.get("/:id", removedDealerPurchaseRequestRoute);
router.post("/:id/approve", removedDealerPurchaseRequestRoute);
router.post("/:id/reject", removedDealerPurchaseRequestRoute);

export default router;
