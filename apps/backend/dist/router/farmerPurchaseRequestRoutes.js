"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const farmerPurchaseRequestController_1 = require("../controller/farmerPurchaseRequestController");
const middelware_1 = require("../middelware/middelware");
const router = (0, express_1.Router)();
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["OWNER"]);
});
router.get("/statistics", farmerPurchaseRequestController_1.getFarmerPurchaseRequestStats);
router.get("/", farmerPurchaseRequestController_1.getFarmerPurchaseRequests);
router.get("/:id", farmerPurchaseRequestController_1.getFarmerPurchaseRequestById);
exports.default = router;
