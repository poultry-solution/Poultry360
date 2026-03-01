"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const businessInsightsController_1 = require("../controller/businessInsightsController");
const middelware_1 = require("../middelware/middelware");
const router = express_1.default.Router();
router.use(middelware_1.authMiddleware);
// GET /api/company/insights/dealers
router.get("/dealers", businessInsightsController_1.getDealerInsights);
exports.default = router;
