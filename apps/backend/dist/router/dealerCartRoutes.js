"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dealerCartController_1 = require("../controller/dealerCartController");
const middelware_1 = require("../middelware/middelware");
const router = (0, express_1.Router)();
// All routes require dealer authentication
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["DEALER"]);
});
// Get or create cart for a company
router.get("/:companyId", dealerCartController_1.getDealerCart);
// Add item to cart
router.post("/items", dealerCartController_1.addItemToCart);
// Update cart item quantity
router.put("/items/:itemId", dealerCartController_1.updateCartItem);
// Remove item from cart
router.delete("/items/:itemId", dealerCartController_1.removeCartItem);
// Clear entire cart
router.delete("/:companyId", dealerCartController_1.clearCart);
// Checkout cart (create consignment)
router.post("/:companyId/checkout", dealerCartController_1.checkoutCart);
exports.default = router;
