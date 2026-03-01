"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const farmerPurchaseRequestController_1 = require("../controller/farmerPurchaseRequestController");
const middelware_1 = require("../middelware/middelware");
const router = (0, express_1.Router)();
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["DEALER"]);
});
router.get("/statistics", farmerPurchaseRequestController_1.getDealerPurchaseRequestStats);
router.get("/", farmerPurchaseRequestController_1.getDealerPurchaseRequests);
router.get("/:id", farmerPurchaseRequestController_1.getDealerPurchaseRequestById);
router.post("/:id/approve", farmerPurchaseRequestController_1.approvePurchaseRequest);
router.post("/:id/reject", farmerPurchaseRequestController_1.rejectPurchaseRequest);
exports.default = router;
