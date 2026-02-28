import { Router } from "express";
import {
  getFarmerCart,
  addItemToFarmerCart,
  updateFarmerCartItem,
  removeFarmerCartItem,
  clearFarmerCart,
  checkoutFarmerCart,
  getDealerCatalogProducts,
} from "../controller/farmerPurchaseRequestController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

// All routes require farmer (OWNER) authentication
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["OWNER"]);
});

// Dealer catalog for farmers
router.get("/catalog/:dealerId/products", getDealerCatalogProducts);

// Cart operations
router.get("/:dealerId", getFarmerCart);
router.post("/items", addItemToFarmerCart);
router.put("/items/:itemId", updateFarmerCartItem);
router.delete("/items/:itemId", removeFarmerCartItem);
router.delete("/:dealerId", clearFarmerCart);
router.post("/:dealerId/checkout", checkoutFarmerCart);

export default router;
