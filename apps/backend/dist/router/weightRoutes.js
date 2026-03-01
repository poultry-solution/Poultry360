"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const weightController_1 = require("../controller/weightController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
// All routes require authentication
router.use(middelware_1.authMiddleware);
// Weight management routes
router.post("/:batchId/weights", weightController_1.addBirdWeight);
router.get("/:batchId/weights", weightController_1.getBirdWeights);
router.put("/:batchId/weights/:weightId", weightController_1.updateBirdWeight);
router.delete("/:batchId/weights/:weightId", weightController_1.deleteBirdWeight);
// Growth analytics
router.get("/:batchId/growth-chart", weightController_1.getGrowthChartData);
exports.default = router;
