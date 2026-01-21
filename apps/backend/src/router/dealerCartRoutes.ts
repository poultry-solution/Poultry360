import { Router } from "express";
import {
  getDealerCart,
  addItemToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  checkoutCart,
} from "../controller/dealerCartController";
import { authMiddleware } from "../middelware/middelware";

const router = Router();

// All routes require dealer authentication
router.use((req, res, next) => {
  authMiddleware(req, res, next, ["DEALER"]);
});

// Get or create cart for a company
router.get("/:companyId", getDealerCart);

// Add item to cart
router.post("/items", addItemToCart);

// Update cart item quantity
router.put("/items/:itemId", updateCartItem);

// Remove item from cart
router.delete("/items/:itemId", removeCartItem);

// Clear entire cart
router.delete("/:companyId", clearCart);

// Checkout cart (create consignment)
router.post("/:companyId/checkout", checkoutCart);

export default router;
