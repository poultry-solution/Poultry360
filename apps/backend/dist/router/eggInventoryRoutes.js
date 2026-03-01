"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const eggInventoryController_1 = require("../controller/eggInventoryController");
const middelware_1 = require("../middelware/middelware");
const router = (0, express_1.Router)();
router.use((req, res, next) => {
    (0, middelware_1.authMiddleware)(req, res, next, ["OWNER"]);
});
router.get("/", eggInventoryController_1.getEggInventory);
exports.default = router;
