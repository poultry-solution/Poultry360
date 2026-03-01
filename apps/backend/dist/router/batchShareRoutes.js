"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const batchShareController_1 = require("../controller/batchShareController");
const router = (0, express_1.Router)();
// NOTE: No auth middleware for now as per request
router.post("/", batchShareController_1.createBatchShare);
router.get("/:token", batchShareController_1.getBatchShareByToken);
exports.default = router;
