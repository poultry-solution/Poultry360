"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const farmerPurchaseRequestController_1 = require("../controller/farmerPurchaseRequestController");
const middelware_1 = require("../middelware/middelware");
const router = (0, express_1.Router)();
// All routes require farmer (OWNER) authentication
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["OWNER"]);
});
// Dealer catalog for farmers
router.get("/catalog/:dealerId/products", farmerPurchaseRequestController_1.getDealerCatalogProducts);
// Cart operations
router.get("/:dealerId", farmerPurchaseRequestController_1.getFarmerCart);
router.post("/items", farmerPurchaseRequestController_1.addItemToFarmerCart);
router.put("/items/:itemId", farmerPurchaseRequestController_1.updateFarmerCartItem);
router.delete("/items/:itemId", farmerPurchaseRequestController_1.removeFarmerCartItem);
router.delete("/:dealerId", farmerPurchaseRequestController_1.clearFarmerCart);
router.post("/:dealerId/checkout", farmerPurchaseRequestController_1.checkoutFarmerCart);
exports.default = router;
