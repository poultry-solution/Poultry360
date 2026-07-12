import { Request, Response, Router } from "express";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

const removedFarmerCartRoute = (req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    message:
      "Farmer cart and dealer catalog workflows have been removed. Use the manual supplier purchase flow instead.",
    route: req.originalUrl,
  });
};

// All routes require farmer (OWNER) authentication
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]);
});

// Dealer catalog for farmers
router.get("/catalog/:dealerId/products", removedFarmerCartRoute);

// Cart operations
router.get("/:dealerId", removedFarmerCartRoute);
router.post("/items", removedFarmerCartRoute);
router.put("/items/:itemId", removedFarmerCartRoute);
router.delete("/items/:itemId", removedFarmerCartRoute);
router.delete("/:dealerId", removedFarmerCartRoute);
router.post("/:dealerId/checkout", removedFarmerCartRoute);

export default router;
